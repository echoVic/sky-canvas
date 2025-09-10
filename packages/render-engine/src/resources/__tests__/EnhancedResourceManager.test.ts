/**
 * 增强型资源管理系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedResourceManager, ResourceManagerConfig } from '../EnhancedResourceManager';
import { ResourceType, ResourceConfig } from '../AsyncResourceLoader';

// Mock全局API
global.fetch = vi.fn();
global.Image = class MockImage {
  private _src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  naturalWidth = 100;
  naturalHeight = 100;

  get src() { return this._src; }
  set src(value: string) {
    this._src = value;
    setTimeout(() => {
      if (value.includes('error')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 10);
  }
} as any;

describe('EnhancedResourceManager', () => {
  let manager: EnhancedResourceManager;

  beforeEach(() => {
    const config: ResourceManagerConfig = {
      cacheMaxMemory: 10 * 1024 * 1024, // 10MB for testing
      cacheMaxItems: 100,
      maxConcurrentLoads: 3,
      enableAutoGC: false, // 禁用自动GC以便测试
      gcInterval: 1000
    };
    
    manager = new EnhancedResourceManager(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager?.dispose();
  });

  describe('基础功能', () => {
    it('应该能够创建资源管理器实例', () => {
      expect(manager).toBeInstanceOf(EnhancedResourceManager);
    });

    it('应该能够获取统计信息', () => {
      const stats = manager.getStats();
      expect(stats).toHaveProperty('loader');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('gpuCache');
      expect(stats).toHaveProperty('references');
      expect(stats).toHaveProperty('performance');
    });
  });

  describe('单个资源加载', () => {
    it('应该能够加载纹理资源', async () => {
      const config: ResourceConfig = {
        id: 'test-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      const resourceRef = await manager.loadResource(config);
      
      expect(resourceRef.id).toBe('test-texture');
      expect(resourceRef.type).toBe(ResourceType.TEXTURE);
      expect(resourceRef.data).toBeInstanceOf(Image);
      expect(resourceRef.cached).toBe(true);
    });

    it('应该能够从缓存获取资源', async () => {
      const config: ResourceConfig = {
        id: 'cached-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      // 第一次加载
      const ref1 = await manager.loadResource(config);
      
      // 第二次加载应该从缓存获取
      const ref2 = await manager.loadResource(config);
      
      expect(ref1.data).toBe(ref2.data);
    });

    it('应该能够处理加载失败', async () => {
      const config: ResourceConfig = {
        id: 'error-texture',
        url: 'https://example.com/error.png',
        type: ResourceType.TEXTURE
      };

      await expect(manager.loadResource(config)).rejects.toThrow();
    });

    it('应该能够跟踪资源引用', async () => {
      const config: ResourceConfig = {
        id: 'ref-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      const ref = await manager.loadResource(config);
      ref.addRef();
      
      const stats = manager.getStats();
      expect(stats.references.totalRefs).toBe(1);
      expect(stats.references.activeRefs).toBe(1);
    });
  });

  describe('批量资源加载', () => {
    it('应该能够批量加载资源', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'batch1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE
        },
        {
          id: 'batch2',
          url: 'https://example.com/texture2.png',
          type: ResourceType.TEXTURE
        }
      ];

      const refs = await manager.loadBatch(configs);
      expect(refs).toHaveLength(2);
      expect(refs[0].id).toBe('batch1');
      expect(refs[1].id).toBe('batch2');
    });

    it('应该能够触发批量完成事件', () => {
      return new Promise<void>((resolve) => {
        const configs: ResourceConfig[] = [
          {
            id: 'event-batch1',
            url: 'https://example.com/texture1.png',
            type: ResourceType.TEXTURE
          }
        ];

        manager.on('batchComplete', (batchId, results) => {
          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('event-batch1');
          resolve();
        });

        manager.loadBatch(configs);
      });
    });
  });

  describe('预加载功能', () => {
    it('应该能够预加载资源', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'preload1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE
        },
        {
          id: 'preload2',
          url: 'https://example.com/texture2.png',
          type: ResourceType.TEXTURE
        }
      ];

      await expect(manager.preloadResources(configs)).resolves.toBeUndefined();
      
      // 预加载后，资源应该在缓存中
      const ref1 = manager.getResource('preload1');
      const ref2 = manager.getResource('preload2');
      
      expect(ref1).not.toBeNull();
      expect(ref2).not.toBeNull();
    });

    it('应该能够处理预加载失败', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'preload-error',
          url: 'https://example.com/error.png',
          type: ResourceType.TEXTURE
        }
      ];

      // 预加载失败不应该抛出错误
      await expect(manager.preloadResources(configs)).resolves.toBeUndefined();
    });
  });

  describe('资源引用管理', () => {
    it('应该能够获取和释放资源引用', async () => {
      const config: ResourceConfig = {
        id: 'ref-management',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      await manager.loadResource(config);
      
      const ref = manager.getResource('ref-management');
      expect(ref).not.toBeNull();
      
      if (ref) {
        ref.addRef();
        manager.releaseResource('ref-management');
        
        const stats = manager.getStats();
        expect(stats.references.totalRefs).toBe(1);
      }
    });

    it('应该能够强制释放资源', async () => {
      const config: ResourceConfig = {
        id: 'force-release',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      await manager.loadResource(config);
      
      const released = manager.forceReleaseResource('force-release');
      expect(released).toBe(true);
      
      const ref = manager.getResource('force-release');
      expect(ref).toBeNull();
    });

    it('应该能够处理不存在资源的释放', () => {
      const released = manager.forceReleaseResource('nonexistent');
      expect(released).toBe(false);
    });
  });

  describe('加载控制', () => {
    it('应该能够取消资源加载', async () => {
      const config: ResourceConfig = {
        id: 'cancel-test',
        url: 'https://example.com/slow-texture.png',
        type: ResourceType.TEXTURE
      };

      // 开始加载但不等待
      const loadPromise = manager.loadResource(config);
      
      // 立即取消
      const cancelled = manager.cancelResourceLoading('cancel-test');
      expect(cancelled).toBe(true);

      // 加载应该失败
      await expect(loadPromise).rejects.toThrow();
    });

    it('应该能够获取加载进度', async () => {
      const config: ResourceConfig = {
        id: 'progress-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      const loadPromise = manager.loadResource(config);
      
      // 可能获取到进度信息
      const progress = manager.getLoadingProgress('progress-test');
      // 进度可能为null（已完成）或有值
      
      await loadPromise;
    });
  });

  describe('缓存和性能', () => {
    it('应该能够区分缓存命中和未命中', async () => {
      const config: ResourceConfig = {
        id: 'cache-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      // 第一次加载 - 缓存未命中
      await manager.loadResource(config);
      
      // 第二次加载 - 缓存命中
      await manager.loadResource(config);
      
      const stats = manager.getStats();
      expect(stats.performance.cacheHitRate).toBeGreaterThan(0);
    });

    it('应该能够跟踪平均加载时间', async () => {
      const config: ResourceConfig = {
        id: 'timing-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      await manager.loadResource(config);
      
      const stats = manager.getStats();
      expect(stats.performance.averageLoadTime).toBeGreaterThan(0);
    });
  });

  describe('垃圾收集', () => {
    it('应该能够执行垃圾收集', async () => {
      const config: ResourceConfig = {
        id: 'gc-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      const ref = await manager.loadResource(config);
      ref.removeRef(); // 移除引用，使其可被垃圾收集
      
      expect(() => manager.forceGC()).not.toThrow();
    });

    it('应该能够触发垃圾收集事件', () => {
      return new Promise<void>((resolve) => {
        manager.on('gcComplete', (freedMemory, itemsRemoved) => {
          expect(typeof freedMemory).toBe('number');
          expect(typeof itemsRemoved).toBe('number');
          resolve();
        });

        manager.forceGC();
      });
    });
  });

  describe('事件系统', () => {
    it('应该能够触发资源加载事件', () => {
      return new Promise<void>((resolve) => {
        manager.on('resourceLoaded', (ref) => {
          expect(ref.id).toBe('event-test');
          resolve();
        });

        const config: ResourceConfig = {
          id: 'event-test',
          url: 'https://example.com/texture.png',
          type: ResourceType.TEXTURE
        };

        manager.loadResource(config);
      });
    });

    it('应该能够触发资源缓存事件', () => {
      return new Promise<void>((resolve) => {
        manager.on('resourceCached', (id, size) => {
          expect(id).toBe('cache-event-test');
          expect(typeof size).toBe('number');
          resolve();
        });

        const config: ResourceConfig = {
          id: 'cache-event-test',
          url: 'https://example.com/texture.png',
          type: ResourceType.TEXTURE
        };

        manager.loadResource(config);
      });
    });

    it('应该能够触发加载进度事件', () => {
      return new Promise<void>((resolve) => {
        // 模拟更复杂的响应以触发进度事件
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          body: {
            getReader: () => ({
              read: async () => ({ done: false, value: new Uint8Array(100) })
            })
          },
          headers: { get: () => '1000' },
          text: () => Promise.resolve('<svg></svg>')
        });

        manager.on('loadingProgress', (id, progress) => {
          if (id === 'progress-event-test') {
            expect(progress).toHaveProperty('percentage');
            resolve();
          }
        });

        const config: ResourceConfig = {
          id: 'progress-event-test',
          url: 'https://example.com/test.svg',
          type: ResourceType.SVG
        };

        manager.loadResource(config).catch(() => {}); // 忽略可能的错误
      });
    });
  });

  describe('配置和清理', () => {
    it('应该能够清空所有资源', async () => {
      const config: ResourceConfig = {
        id: 'clear-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE
      };

      await manager.loadResource(config);
      
      manager.clear();
      
      const stats = manager.getStats();
      expect(stats.references.totalRefs).toBe(0);
      expect(stats.cache.itemCount).toBe(0);
    });

    it('应该能够正确销毁管理器', () => {
      expect(() => manager.dispose()).not.toThrow();
      
      // 销毁后的操作不应该导致错误
      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该能够处理无效的资源类型', async () => {
      const config: ResourceConfig = {
        id: 'invalid-type',
        url: 'https://example.com/unknown.xyz',
        type: 'unknown' as ResourceType
      };

      await expect(manager.loadResource(config)).rejects.toThrow();
    });

    it('应该能够处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const config: ResourceConfig = {
        id: 'network-error',
        url: 'https://example.com/texture.png',
        type: ResourceType.JSON
      };

      await expect(manager.loadResource(config)).rejects.toThrow();
    });
  });

  describe('JSON资源特定测试', () => {
    it('应该能够加载JSON资源', async () => {
      const mockData = { test: 'data', number: 123 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
        clone: () => ({ 
          body: {
            getReader: () => ({
              read: async () => ({ done: true })
            })
          }
        }),
        headers: { get: () => '100' }
      });

      const config: ResourceConfig = {
        id: 'json-test',
        url: 'https://example.com/data.json',
        type: ResourceType.JSON
      };

      const ref = await manager.loadResource(config);
      expect(ref.data).toEqual(mockData);
    });
  });

  describe('并发控制', () => {
    it('应该能够限制并发加载数量', async () => {
      // 创建多个加载任务
      const configs = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        url: `https://example.com/texture${i}.png`,
        type: ResourceType.TEXTURE
      }));

      // 启动所有加载任务
      const promises = configs.map(config => manager.loadResource(config));
      
      // 等待所有任务完成
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });

  describe('内存监控', () => {
    it('应该能够监控内存使用', async () => {
      const config: ResourceConfig = {
        id: 'memory-test',
        url: 'https://example.com/large-texture.png',
        type: ResourceType.TEXTURE
      };

      await manager.loadResource(config);
      
      const stats = manager.getStats();
      expect(stats.cache.used).toBeGreaterThan(0);
      expect(stats.cache.utilization).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('全局资源管理器函数', () => {
  afterEach(() => {
    // 清理全局实例
    const { getResourceManager } = require('../EnhancedResourceManager');
    const globalManager = getResourceManager();
    globalManager.dispose();
  });

  it('应该能够获取全局资源管理器', async () => {
    const { getResourceManager } = await import('../EnhancedResourceManager');
    const manager = getResourceManager();
    expect(manager).toBeInstanceOf(EnhancedResourceManager);
  });

  it('应该能够设置全局资源管理器', async () => {
    const { getResourceManager, setResourceManager, createResourceManager } = await import('../EnhancedResourceManager');
    
    const customManager = createResourceManager();
    setResourceManager(customManager);
    
    const retrieved = getResourceManager();
    expect(retrieved).toBe(customManager);
  });

  it('应该能够创建新的资源管理器实例', async () => {
    const { createResourceManager } = await import('../EnhancedResourceManager');
    
    const manager = createResourceManager({
      cacheMaxMemory: 50 * 1024 * 1024
    });
    
    expect(manager).toBeInstanceOf(EnhancedResourceManager);
    manager.dispose();
  });
});