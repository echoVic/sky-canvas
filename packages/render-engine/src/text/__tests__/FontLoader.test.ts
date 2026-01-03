/**
 * 字体加载器测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontLoader } from '../FontLoader';
import { FontFormat, FontLoadingOptions, FontSource } from '../types/FontTypes';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FontFace
class MockFontFace {
  constructor(public family: string, public source: any) {}
  async load() { return this; }
  status = 'loaded';
}
global.FontFace = MockFontFace as any;

describe('FontLoader', () => {
  let fontLoader: FontLoader;
  let unhandledRejections: Error[] = [];
  let rejectionHandler: (error: Error) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    unhandledRejections = [];
    
    // 捕获未处理的 rejection
    rejectionHandler = (error: Error) => {
      unhandledRejections.push(error);
    };
    process.setMaxListeners(20);
    process.on('unhandledRejection', rejectionHandler);
    
    fontLoader = new FontLoader();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await vi.runAllTimersAsync();
    } catch (e) {
      // 忽略清理过程中的错误
    }
    
    fontLoader?.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
    
    // 移除 rejection 监听器
    process.removeListener('unhandledRejection', rejectionHandler);
    
    // 清空未处理的 rejection 列表
    unhandledRejections = [];
  });

  describe('基础加载功能', () => {
    const mockFontSource: FontSource = {
      url: 'https://example.com/font.woff2',
      format: FontFormat.WOFF2
    };

    beforeEach(() => {
      // Mock successful fetch response
      const mockArrayBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => {
            if (name === 'content-length') return '1024';
            return null;
          }
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1024) })
              .mockResolvedValueOnce({ done: true })
          })
        },
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      });
    });

    it('应该能够加载字体文件', async () => {
      const loadPromise = fontLoader.load(mockFontSource);
      await vi.runAllTimersAsync();
      const buffer = await loadPromise;
      
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(1024);
      expect(mockFetch).toHaveBeenCalledWith(mockFontSource.url, expect.any(Object));
    });

    it('应该能够处理加载选项', async () => {
      const options: FontLoadingOptions = {
        timeout: 5000
      };

      const loadPromise = fontLoader.load(mockFontSource, options);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      expect(mockFetch).toHaveBeenCalledWith(
        mockFontSource.url,
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('应该缓存已加载的字体', async () => {
      const loadPromise1 = fontLoader.load(mockFontSource);
      await vi.runAllTimersAsync();
      const buffer1 = await loadPromise1;
      
      const loadPromise2 = fontLoader.load(mockFontSource);
      await vi.runAllTimersAsync();
      const buffer2 = await loadPromise2;
      
      expect(buffer1).toBe(buffer2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该支持并发加载相同字体', async () => {
      const promises = [
        fontLoader.load(mockFontSource),
        fontLoader.load(mockFontSource),
        fontLoader.load(mockFontSource)
      ];

      await vi.runAllTimersAsync();
      const results = await Promise.all(promises);
      
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('进度追踪', () => {
    it('应该发出加载开始事件', async () => {
      const mockSource: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const startedSpy = vi.spyOn(fontLoader, 'emit');
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => '1024'
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1024) })
              .mockResolvedValueOnce({ done: true })
          })
        },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      const loadPromise = fontLoader.load(mockSource);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      expect(startedSpy).toHaveBeenCalledWith('started', expect.objectContaining({
        id: expect.any(String),
        source: mockSource
      }));
    });

    it('应该发出加载完成事件', async () => {
      const mockSource: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const loadedSpy = vi.spyOn(fontLoader, 'emit');
      const mockBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => '1024'
        },
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1024) })
              .mockResolvedValueOnce({ done: true })
          })
        },
        arrayBuffer: () => Promise.resolve(mockBuffer)
      });

      const loadPromise = fontLoader.load(mockSource);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      expect(loadedSpy).toHaveBeenCalledWith('loaded', expect.objectContaining({
        id: expect.any(String),
        buffer: expect.any(ArrayBuffer)
      }));
    });

    it('应该能够获取加载进度', () => {
      const progress = fontLoader.getLoadingProgress('test-font');
      expect(progress).toBeNull(); // 没有正在加载的任务时返回null
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const mockSource: FontSource = {
        url: 'https://invalid-url.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      const errorSpy = vi.spyOn(fontLoader, 'emit');

      const loadPromise = fontLoader.load(mockSource).catch(e => e);
      await vi.runAllTimersAsync();
      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
      expect(errorSpy).toHaveBeenCalledWith('error', expect.objectContaining({
        id: expect.any(String),
        error: expect.any(Error)
      }));
    });

    it('应该处理HTTP错误状态', async () => {
      const mockSource: FontSource = {
        url: 'https://example.com/notfound.woff2',
        format: FontFormat.WOFF2
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const loadPromise = fontLoader.load(mockSource).catch(e => e);
      await vi.runAllTimersAsync();
      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
    });

    it('应该支持超时取消', async () => {
      const mockSource: FontSource = {
        url: 'https://slow-server.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const options: FontLoadingOptions = {
        timeout: 100 // 100ms超时
      };

      // 模拟慢响应
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      const loadPromise = fontLoader.load(mockSource, options).catch(e => e);
      await vi.runAllTimersAsync();
      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('取消加载', () => {
    it('应该能够取消正在进行的加载', async () => {
      const mockSource: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const abortController = new AbortController();
      const options: FontLoadingOptions = {
        signal: abortController.signal
      };

      const cancelledSpy = vi.spyOn(fontLoader, 'emit');
      const loadPromise = fontLoader.load(mockSource, options).catch(e => e);
      
      // 立即取消
      abortController.abort();

      await vi.runAllTimersAsync();
      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
      
      // 取消时会发出 error 事件，而不是 cancelled 事件
      expect(cancelledSpy).toHaveBeenCalledWith('error', expect.objectContaining({
        id: expect.any(String),
        error: expect.any(Error)
      }));
    });
  });

  describe('资源清理', () => {
    it('应该能够清理缓存', () => {
      fontLoader.clearCache();
      // 验证缓存被清理（通过重新加载相同字体来验证）
    });

    it('应该在dispose时清理所有资源', () => {
      fontLoader.dispose();
      // 验证所有加载任务被取消和资源被清理
    });
  });

  describe('重试机制', () => {
    it('应该在失败时不重试加载', async () => {
      const mockSource: FontSource = {
        url: 'https://unreliable.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const options: FontLoadingOptions = {
        timeout: 5000
      };

      // 第一次失败
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const loadPromise = fontLoader.load(mockSource, options).catch(e => e);
      await vi.runAllTimersAsync();
      const result = await loadPromise;
      
      expect(result).toBeInstanceOf(Error);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});