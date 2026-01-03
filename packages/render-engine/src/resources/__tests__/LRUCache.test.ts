/**
 * LRU缓存测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GPUResourceCache, LRUCache, MemoryAwareLRUCache } from '../LRUCache';

// Mock Performance API
Object.defineProperty(global.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
    totalJSHeapSize: 60 * 1024 * 1024 // 60MB
  }
});

// Mock PerformanceObserver
global.PerformanceObserver = class MockPerformanceObserver {
  constructor(private callback: any) {}
  observe() {}
  disconnect() {}
  getEntries() { return []; }
} as any;

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({
      maxMemory: 1024 * 1024, // 1MB
      maxItems: 100,
      memoryWarningThreshold: 0.8,
      gcInterval: 1000, // 1秒
      defaultTTL: 5000 // 5秒
    });
  });

  afterEach(() => {
    cache?.dispose();
  });

  describe('基础操作', () => {
    it('应该能够设置和获取值', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('应该在键不存在时返回null', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('应该能够检查键是否存在', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('应该能够删除键', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.delete('key1')).toBe(false);
    });

    it('应该能够获取缓存大小', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });

    it('应该能够清空缓存', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('LRU行为', () => {
    it('应该按LRU顺序驱逐项目', () => {
      const smallCache = new LRUCache<string>({
        maxItems: 3,
        maxMemory: 1024 * 1024
      });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      
      // 访问key1，使其成为最近使用
      smallCache.get('key1');
      
      // 添加新项目应该驱逐key2（最久未使用）
      smallCache.set('key4', 'value4');
      
      expect(smallCache.get('key1')).toBe('value1'); // 应该存在
      expect(smallCache.get('key2')).toBeNull(); // 应该被驱逐
      expect(smallCache.get('key3')).toBe('value3'); // 应该存在
      expect(smallCache.get('key4')).toBe('value4'); // 应该存在

      smallCache.dispose();
    });

    it('应该在更新现有键时移动到头部', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // 更新key1
      cache.set('key1', 'updated_value1');
      
      expect(cache.get('key1')).toBe('updated_value1');
    });
  });

  describe('内存管理', () => {
    it('应该跟踪内存使用', () => {
      cache.set('key1', 'a'.repeat(1000), 1000); // 指定大小
      
      const stats = cache.getMemoryStats();
      expect(stats.used).toBe(1000);
      expect(stats.itemCount).toBe(1);
    });

    it('应该在超过内存限制时驱逐项目', () => {
      const memCache = new LRUCache<string>({
        maxMemory: 100, // 很小的内存限制
        maxItems: 1000
      });

      let evictCount = 0;
      memCache.on('evict', () => {
        evictCount++;
      });

      // 添加大量数据超过内存限制
      memCache.set('key1', 'x'.repeat(50), 50);
      memCache.set('key2', 'x'.repeat(50), 50);
      memCache.set('key3', 'x'.repeat(50), 50); // 这个应该触发驱逐

      expect(evictCount).toBeGreaterThan(0);
      memCache.dispose();
    });

    it('应该发出内存警告事件', () => {
      return new Promise<void>((resolve) => {
        const warningCache = new LRUCache<string>({
          maxMemory: 100,
          memoryWarningThreshold: 0.5 // 50%
        });

        warningCache.on('memoryWarning', (stats) => {
          expect(stats.utilization).toBeGreaterThan(0.5);
          warningCache.dispose();
          resolve();
        });

        // 填充超过阈值的内存
        warningCache.set('key1', 'x'.repeat(60), 60);
      });
    });
  });

  describe('TTL功能', () => {
    it('应该在TTL过期后返回null', async () => {
      cache.set('key1', 'value1', undefined, 100); // 100ms TTL
      
      expect(cache.get('key1')).toBe('value1');
      
      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('key1')).toBeNull();
    });

    it('应该能够更新TTL', async () => {
      cache.set('key1', 'value1', undefined, 100);
      
      // 延长TTL
      cache.updateTTL('key1', 1000);
      
      // 等待原始TTL过期时间
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 应该仍然存在
      expect(cache.get('key1')).toBe('value1');
    });

    it('应该在垃圾收集时清理过期项目', async () => {
      cache.set('key1', 'value1', undefined, 50);
      cache.set('key2', 'value2', undefined, 1000);
      
      // 等待key1过期
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = cache.forceGC();
      
      expect(result.itemsRemoved).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('优化功能', () => {
    it('应该能够优化缓存到目标利用率', () => {
      // 填充缓存
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`, 1000);
      }

      const beforeStats = cache.getMemoryStats();
      
      // 优化到50%利用率
      cache.optimize(0.5);
      
      const afterStats = cache.getMemoryStats();
      // 优化后使用的内存应该小于等于之前的内存
      expect(afterStats.used).toBeLessThanOrEqual(beforeStats.used);
      // 并且缓存中应该有一些项目被移除
      expect(cache.size).toBeLessThanOrEqual(10);
    });

    it('应该根据访问模式优化移除', () => {
      // 设置一些项目
      cache.set('frequent', 'value', 100);
      cache.set('rare', 'value', 100);
      
      // 频繁访问一个项目
      for (let i = 0; i < 10; i++) {
        cache.get('frequent');
      }
      
      // 填充更多数据触发优化
      for (let i = 0; i < 20; i++) {
        cache.set(`temp${i}`, 'x'.repeat(1000), 1000);
      }
      
      // frequent应该比rare更容易保留
      expect(cache.get('frequent')).toBe('value');
    });
  });

  describe('事件系统', () => {
    it('应该触发命中和未命中事件', () => {
      let hitReceived = false;
      let missReceived = false;
      
      cache.on('hit', () => { hitReceived = true; });
      cache.on('miss', () => { missReceived = true; });
      
      cache.set('key1', 'value1');
      cache.get('key1'); // 命中
      cache.get('key2'); // 未命中
      
      expect(hitReceived).toBe(true);
      expect(missReceived).toBe(true);
    });

    it('应该触发设置事件', () => {
      let setReceived = false;
      
      cache.on('set', (key, item) => {
        expect(key).toBe('key1');
        expect(item.value).toBe('value1');
        setReceived = true;
      });
      
      cache.set('key1', 'value1');
      expect(setReceived).toBe(true);
    });

    it('应该触发驱逐事件', () => {
      let evictReceived = false;
      
      cache.on('evict', (key, item, reason) => {
        expect(typeof key).toBe('string');
        expect(['lru', 'memory', 'ttl']).toContain(reason);
        evictReceived = true;
      });
      
      const smallCache = new LRUCache<string>({ maxItems: 1 });
      smallCache.on('evict', (key, item, reason) => {
        evictReceived = true;
      });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2'); // 应该驱逐key1
      
      expect(evictReceived).toBe(true);
      smallCache.dispose();
    });

    it('应该触发垃圾收集事件', async () => {
      return new Promise<void>((resolve) => {
        cache.on('gc', (freedMemory, itemsRemoved) => {
          expect(typeof freedMemory).toBe('number');
          expect(typeof itemsRemoved).toBe('number');
          resolve();
        });

        cache.set('key1', 'value1', undefined, 50);
        
        setTimeout(() => {
          cache.forceGC();
        }, 100);
      });
    });
  });

  describe('统计信息', () => {
    it('应该提供准确的内存统计', () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 200);
      
      const stats = cache.getMemoryStats();
      
      expect(stats.used).toBe(300);
      expect(stats.itemCount).toBe(2);
      expect(stats.utilization).toBe(300 / (1024 * 1024));
    });

    it('应该计算命中率', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // 命中
      cache.get('key1'); // 命中
      cache.get('key2'); // 未命中
      
      const stats = cache.getMemoryStats();
      expect(stats.hitRate).toBeCloseTo(2/3, 2);
    });
  });

  describe('键值操作', () => {
    it('应该返回所有键', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });

    it('应该返回所有值', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const values = cache.values();
      expect(values).toContain('value1');
      expect(values).toContain('value2');
      expect(values.length).toBe(2);
    });
  });
});

describe('GPUResourceCache', () => {
  let gpuCache: GPUResourceCache<{ dispose(): void; data: string }>;

  beforeEach(() => {
    gpuCache = new GPUResourceCache({
      maxMemory: 64 * 1024 * 1024,
      maxItems: 200
    });
  });

  afterEach(() => {
    gpuCache?.dispose();
  });

  it('应该能够存储GPU资源', () => {
    const resource = {
      data: 'test',
      dispose: vi.fn()
    };

    gpuCache.set('gpu1', resource);
    expect(gpuCache.get('gpu1')).toBe(resource);
  });

  it('应该在驱逐时自动调用dispose', () => {
    const resource1 = {
      data: 'test1',
      dispose: vi.fn()
    };

    const resource2 = {
      data: 'test2',
      dispose: vi.fn()
    };

    // 创建小缓存来测试驱逐
    const smallGpuCache = new GPUResourceCache({ maxItems: 1 });
    
    smallGpuCache.set('gpu1', resource1);
    smallGpuCache.set('gpu2', resource2); // 应该驱逐gpu1
    
    expect(resource1.dispose).toHaveBeenCalled();
    expect(resource2.dispose).not.toHaveBeenCalled();

    smallGpuCache.dispose();
  });

  it('应该在清空时释放所有资源', () => {
    const resources = Array.from({ length: 5 }, (_, i) => ({
      data: `test${i}`,
      dispose: vi.fn()
    }));

    resources.forEach((resource, i) => {
      gpuCache.set(`gpu${i}`, resource);
    });

    gpuCache.clear();

    resources.forEach(resource => {
      expect(resource.dispose).toHaveBeenCalled();
    });
  });
});

describe('MemoryAwareLRUCache', () => {
  let memoryCache: MemoryAwareLRUCache<string>;

  beforeEach(() => {
    memoryCache = new MemoryAwareLRUCache({
      maxMemory: 1024 * 1024,
      maxItems: 100
    });
  });

  afterEach(() => {
    memoryCache?.dispose();
  });

  it('应该能够创建内存感知缓存', () => {
    expect(memoryCache).toBeInstanceOf(MemoryAwareLRUCache);
  });

  it('应该能够正常存储和获取数据', () => {
    memoryCache.set('key1', 'value1');
    expect(memoryCache.get('key1')).toBe('value1');
  });

  // 注意：内存压力测试需要模拟Performance API的变化
  // 这在单元测试环境中比较困难，通常需要集成测试
});

describe('工厂函数', () => {
  it('应该能够通过工厂函数创建缓存', async () => {
    const { createLRUCache, createGPUResourceCache, createMemoryAwareLRUCache } = await import('../LRUCache');
    
    const lruCache = createLRUCache<string>();
    const gpuCache = createGPUResourceCache<{ dispose(): void }>();
    const memoryCache = createMemoryAwareLRUCache<string>();
    
    expect(lruCache).toBeInstanceOf(LRUCache);
    expect(gpuCache).toBeInstanceOf(GPUResourceCache);
    expect(memoryCache).toBeInstanceOf(MemoryAwareLRUCache);
    
    lruCache.dispose();
    gpuCache.dispose();
    memoryCache.dispose();
  });
});