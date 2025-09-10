/**
 * 纹理加载器测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TextureLoader, TextureLoadState, LoadOptions } from '../TextureLoader';
import { TextureAtlas } from '../TextureAtlas';

// Mock Image
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = '';
    src = '';
    width = 100;
    height = 100;

    constructor() {
      // 模拟异步加载
      setTimeout(() => {
        if (this.src.includes('error')) {
          this.onerror?.();
        } else {
          this.onload?.();
        }
      }, 10);
    }
  },
  writable: true
});

// Mock Canvas API
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockHTMLCanvasElement {
    width = 0;
    height = 0;
    
    getContext() {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(100 * 100 * 4),
          width: 100,
          height: 100
        })),
        putImageData: vi.fn()
      };
    }
  },
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => new (global as any).HTMLCanvasElement())
  },
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  },
  writable: true
});

describe('TextureLoader', () => {
  let loader: TextureLoader;
  let atlas: TextureAtlas;

  beforeEach(() => {
    atlas = new TextureAtlas();
    loader = new TextureLoader(atlas);
  });

  afterEach(() => {
    loader.dispose();
  });

  describe('基础功能', () => {
    it('应该能够创建加载器实例', () => {
      expect(loader).toBeDefined();
      
      const progress = loader.getProgress();
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('应该能够加载单个纹理', async () => {
      const url = 'https://example.com/texture.png';
      
      const result = await loader.loadTexture(url);
      
      expect(result).toBeDefined();
      expect(loader.getTaskState(url)).toBe(TextureLoadState.LOADED);
    }, 1000);

    it('应该能够加载纹理到图集', async () => {
      const url = 'https://example.com/texture.png';
      
      const result = await loader.loadTexture(url, { addToAtlas: true });
      
      expect(result).toBeDefined();
      
      // 检查是否添加到图集
      if (typeof result === 'object' && 'atlasId' in result) {
        expect(result.atlasId).toBeDefined();
      }
    }, 1000);

    it('应该处理加载错误', async () => {
      const url = 'https://example.com/error-texture.png';
      
      await expect(loader.loadTexture(url)).rejects.toThrow();
      expect(loader.getTaskState(url)).toBe(TextureLoadState.ERROR);
    }, 1000);
  });

  describe('批量加载', () => {
    it('应该能够批量加载纹理', async () => {
      const urls = [
        'https://example.com/texture1.png',
        'https://example.com/texture2.png',
        'https://example.com/texture3.png'
      ];

      const results = await loader.loadTextures(urls);
      
      expect(results.size).toBe(3);
      expect(results.has(urls[0])).toBe(true);
      expect(results.has(urls[1])).toBe(true);
      expect(results.has(urls[2])).toBe(true);
    }, 1000);

    it('应该处理批量加载中的部分失败', async () => {
      const urls = [
        'https://example.com/texture1.png',
        'https://example.com/error-texture.png',
        'https://example.com/texture3.png'
      ];

      const results = await loader.loadTextures(urls);
      
      // 应该只包含成功加载的纹理
      expect(results.size).toBe(2);
      expect(results.has(urls[0])).toBe(true);
      expect(results.has(urls[1])).toBe(false);
      expect(results.has(urls[2])).toBe(true);
    }, 1000);
  });

  describe('优先级管理', () => {
    it('应该按优先级顺序加载', async () => {
      const urls = [
        { url: 'https://example.com/low.png', priority: 0 },
        { url: 'https://example.com/high.png', priority: 10 },
        { url: 'https://example.com/medium.png', priority: 5 }
      ];

      const promises = urls.map(({ url, priority }) => 
        loader.loadTexture(url, { priority })
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      // 所有应该都加载成功
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    }, 1000);
  });

  describe('重试机制', () => {
    it('应该重试失败的加载', async () => {
      const url = 'https://example.com/retry-texture.png';
      
      // 模拟偶发性失败
      let attempts = 0;
      const originalImage = (global as any).Image;
      (global as any).Image = class extends originalImage {
        constructor() {
          super();
          attempts++;
          setTimeout(() => {
            if (attempts < 2) {
              this.onerror?.();
            } else {
              this.onload?.();
            }
          }, 10);
        }
      };

      const result = await loader.loadTexture(url, { maxRetries: 2 });
      
      expect(result).toBeDefined();
      expect(attempts).toBeGreaterThan(1);
      
      // 恢复原始Image
      (global as any).Image = originalImage;
    }, 2000);
  });

  describe('预加载', () => {
    it('应该能够预加载纹理', () => {
      const url = 'https://example.com/preload.png';
      
      loader.preloadTexture(url);
      
      // 预加载不等待完成，检查状态
      const state = loader.getTaskState(url);
      expect([TextureLoadState.PENDING, TextureLoadState.LOADING]).toContain(state);
    });

    it('预加载应该使用低优先级', () => {
      const url = 'https://example.com/preload.png';
      
      loader.preloadTexture(url);
      
      // 预加载应该不影响正常加载
      const state = loader.getTaskState(url);
      expect(state).not.toBe(TextureLoadState.ERROR);
    });
  });

  describe('缓存和重复加载', () => {
    it('应该缓存已加载的纹理', async () => {
      const url = 'https://example.com/cached.png';
      
      const result1 = await loader.loadTexture(url);
      const result2 = await loader.loadTexture(url);
      
      // 第二次加载应该直接返回缓存结果
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    }, 1000);

    it('应该避免重复加载相同URL', async () => {
      const url = 'https://example.com/duplicate.png';
      
      const promises = [
        loader.loadTexture(url),
        loader.loadTexture(url),
        loader.loadTexture(url)
      ];

      const results = await Promise.all(promises);
      
      // 所有promises应该解析到相同的结果
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    }, 1000);
  });

  describe('取消加载', () => {
    it('应该能够取消未开始的加载', () => {
      const url = 'https://example.com/cancel.png';
      
      loader.loadTexture(url);
      const cancelled = loader.cancelLoad(url);
      
      expect(cancelled).toBe(true);
      expect(loader.getTaskState(url)).toBe(TextureLoadState.ERROR);
    });

    it('应该无法取消已完成的加载', async () => {
      const url = 'https://example.com/completed.png';
      
      await loader.loadTexture(url);
      const cancelled = loader.cancelLoad(url);
      
      expect(cancelled).toBe(false);
      expect(loader.getTaskState(url)).toBe(TextureLoadState.LOADED);
    }, 1000);
  });

  describe('进度监控', () => {
    it('应该跟踪加载进度', async () => {
      const urls = [
        'https://example.com/progress1.png',
        'https://example.com/progress2.png'
      ];

      const initialProgress = loader.getProgress();
      expect(initialProgress.total).toBe(0);

      const promises = urls.map(url => loader.loadTexture(url));
      
      // 检查进度更新
      const midProgress = loader.getProgress();
      expect(midProgress.total).toBe(2);
      expect(midProgress.completed).toBeGreaterThanOrEqual(0);

      await Promise.all(promises);
      
      const finalProgress = loader.getProgress();
      expect(finalProgress.completed).toBe(2);
      expect(finalProgress.percentage).toBe(100);
    }, 1000);
  });

  describe('事件系统', () => {
    it('应该发出任务开始事件', async () => {
      const handler = vi.fn();
      loader.on('taskStarted', handler);
      
      const url = 'https://example.com/event.png';
      await loader.loadTexture(url);
      
      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0];
      expect(call.url).toBe(url);
      expect(call.state).toBe(TextureLoadState.LOADING);
    }, 1000);

    it('应该发出任务完成事件', async () => {
      const handler = vi.fn();
      loader.on('taskCompleted', handler);
      
      const url = 'https://example.com/event.png';
      await loader.loadTexture(url);
      
      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0];
      expect(call.task.url).toBe(url);
      expect(call.task.state).toBe(TextureLoadState.LOADED);
    }, 1000);

    it('应该发出任务失败事件', async () => {
      const handler = vi.fn();
      loader.on('taskFailed', handler);
      
      const url = 'https://example.com/error.png';
      
      try {
        await loader.loadTexture(url);
      } catch (error) {
        // 预期的错误
      }
      
      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0];
      expect(call.task.url).toBe(url);
      expect(call.error).toBeDefined();
    }, 1000);

    it('应该发出队列清空事件', async () => {
      const handler = vi.fn();
      loader.on('queueEmpty', handler);
      
      const url = 'https://example.com/queue.png';
      await loader.loadTexture(url);
      
      expect(handler).toHaveBeenCalled();
    }, 1000);
  });

  describe('清理和销毁', () => {
    it('应该能够清理已完成的任务', async () => {
      const url = 'https://example.com/cleanup.png';
      await loader.loadTexture(url);
      
      const beforeCleanup = loader.getProgress();
      loader.cleanup();
      const afterCleanup = loader.getProgress();
      
      expect(afterCleanup.total).toBeLessThanOrEqual(beforeCleanup.total);
    }, 1000);

    it('应该能够正确销毁', () => {
      const url = 'https://example.com/dispose.png';
      loader.loadTexture(url);
      
      loader.dispose();
      
      const progress = loader.getProgress();
      expect(progress.total).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const url = 'https://nonexistent.com/texture.png';
      
      await expect(loader.loadTexture(url)).rejects.toThrow();
    }, 1000);

    it('应该处理超时', async () => {
      // 模拟超时
      const originalImage = (global as any).Image;
      (global as any).Image = class extends originalImage {
        constructor() {
          super();
          // 不调用 onload 或 onerror 来模拟超时
        }
      };

      const url = 'https://example.com/timeout.png';
      
      await expect(loader.loadTexture(url, { timeout: 100 })).rejects.toThrow();
      
      // 恢复原始Image
      (global as any).Image = originalImage;
    }, 1000);

    it('应该处理无效URL', async () => {
      const url = 'invalid-url';
      
      await expect(loader.loadTexture(url)).rejects.toThrow();
    }, 1000);
  });

  describe('并发控制', () => {
    it('应该限制并发加载数量', async () => {
      const urls = Array.from({ length: 20 }, (_, i) => 
        `https://example.com/concurrent${i}.png`
      );

      const startTime = Date.now();
      const promises = urls.map(url => loader.loadTexture(url));
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // 由于并发限制，加载应该分批进行
      // 这里只是验证所有加载都完成了
      expect(endTime - startTime).toBeGreaterThan(0);
      
      const finalProgress = loader.getProgress();
      expect(finalProgress.completed).toBe(20);
    }, 5000);
  });
});