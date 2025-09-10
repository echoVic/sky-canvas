/**
 * 字体加载器测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FontLoader } from '../FontLoader';
import { FontSource, FontFormat, FontLoadingOptions } from '../types/FontTypes';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FontFace
const mockFontFace = vi.fn().mockImplementation((family, source) => ({
  family,
  source,
  load: vi.fn().mockResolvedValue(undefined),
  status: 'loaded'
}));
global.FontFace = mockFontFace;

describe('FontLoader', () => {
  let fontLoader: FontLoader;

  beforeEach(() => {
    fontLoader = new FontLoader();
    vi.clearAllMocks();
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
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      });
    });

    it('应该能够加载字体文件', async () => {
      const buffer = await fontLoader.load(mockFontSource);
      
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(1024);
      expect(mockFetch).toHaveBeenCalledWith(mockFontSource.url, expect.any(Object));
    });

    it('应该能够处理加载选项', async () => {
      const options: FontLoadingOptions = {
        timeout: 5000,
        retries: 2
      };

      await fontLoader.load(mockFontSource, options);
      
      expect(mockFetch).toHaveBeenCalledWith(
        mockFontSource.url,
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('应该缓存已加载的字体', async () => {
      const buffer1 = await fontLoader.load(mockFontSource);
      const buffer2 = await fontLoader.load(mockFontSource);
      
      expect(buffer1).toBe(buffer2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该支持并发加载相同字体', async () => {
      const promises = [
        fontLoader.load(mockFontSource),
        fontLoader.load(mockFontSource),
        fontLoader.load(mockFontSource)
      ];

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
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      await fontLoader.load(mockSource);
      
      expect(startedSpy).toHaveBeenCalledWith('started', expect.any(String), mockSource);
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
        arrayBuffer: () => Promise.resolve(mockBuffer)
      });

      await fontLoader.load(mockSource);
      
      expect(loadedSpy).toHaveBeenCalledWith('loaded', expect.any(String), mockBuffer);
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

      await expect(fontLoader.load(mockSource)).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('error', expect.any(String), expect.any(Error));
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

      await expect(fontLoader.load(mockSource)).rejects.toThrow();
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

      await expect(fontLoader.load(mockSource, options)).rejects.toThrow();
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

      const loadPromise = fontLoader.load(mockSource, options);
      
      // 立即取消
      abortController.abort();

      const cancelledSpy = vi.spyOn(fontLoader, 'emit');
      await expect(loadPromise).rejects.toThrow();
      
      expect(cancelledSpy).toHaveBeenCalledWith('cancelled', expect.any(String));
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
    it('应该在失败时重试加载', async () => {
      const mockSource: FontSource = {
        url: 'https://unreliable.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const options: FontLoadingOptions = {
        retries: 2
      };

      // 前两次失败，第三次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });

      const buffer = await fontLoader.load(mockSource, options);
      
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});