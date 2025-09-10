/**
 * FontLoader 单元测试
 * 测试字体加载、进度追踪、错误处理和缓存功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontLoader, FontLoadingUtils } from '../FontLoader';
import {
  FontFormat,
  FontSource,
  FontLoadingOptions,
  FontErrorCode,
  FontError,
  FontDisplayStrategy
} from '../types/FontTypes';

// Mock Web APIs
const mockFontFace = {
  load: vi.fn().mockResolvedValue(undefined),
  family: 'test-font',
  status: 'loaded'
};

const mockFetch = vi.fn();
const mockArrayBuffer = new ArrayBuffer(1024);

// Mock global APIs
Object.defineProperty(global, 'FontFace', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockFontFace)
});

Object.defineProperty(global, 'fetch', {
  writable: true,
  value: mockFetch
});

Object.defineProperty(global, 'btoa', {
  writable: true,
  value: (str: string) => Buffer.from(str, 'binary').toString('base64')
});

describe('FontLoader', () => {
  let loader: FontLoader;
  let mockResponse: any;
  let mockReader: any;

  beforeEach(() => {
    loader = new FontLoader();
    
    // Suppress unhandled error events for testing
    loader.on('error', () => {
      // Ignore error events to prevent unhandled error warnings
    });
    
    // Mock fetch response
    mockReader = {
      read: vi.fn()
    };

    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-length', '1024']]),
      body: {
        getReader: () => mockReader
      }
    };

    mockFetch.mockResolvedValue(mockResponse);
    
    // 重置 FontFace mock
    mockFontFace.load.mockResolvedValue(undefined);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    loader.dispose();
  });

  describe('基础字体加载', () => {
    it('应该能够加载WOFF2字体', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      // Mock 流数据读取
      const chunks = [
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([5, 6, 7, 8])
      ];
      
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: chunks[0] })
        .mockResolvedValueOnce({ done: false, value: chunks[1] })
        .mockResolvedValueOnce({ done: true });

      const buffer = await loader.load(source);
      
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(8);
      expect(mockFontFace.load).toHaveBeenCalled();
    });

    it('应该能够处理TTF字体', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.ttf',
        format: FontFormat.TTF,
        weight: 'bold',
        style: 'italic'
      };

      mockReader.read.mockResolvedValueOnce({ done: true });

      await loader.load(source);
      
      expect(global.FontFace).toHaveBeenCalledWith(
        'temp-font',
        'url(https://example.com/font.ttf)',
        expect.objectContaining({
          weight: 'bold',
          style: 'italic'
        })
      );
    });

    it('应该正确处理字体权重和样式', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff',
        format: FontFormat.WOFF,
        weight: 600,
        style: 'oblique'
      };

      mockReader.read.mockResolvedValueOnce({ done: true });

      await loader.load(source, {
        display: FontDisplayStrategy.SWAP
      });
      
      expect(global.FontFace).toHaveBeenCalledWith(
        'temp-font',
        'url(https://example.com/font.woff)',
        expect.objectContaining({
          weight: '600',
          style: 'oblique',
          display: 'swap'
        })
      );
    });
  });

  describe('缓存机制', () => {
    it('应该缓存已加载的字体', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockReader.read.mockResolvedValue({ done: true });

      // 第一次加载
      const buffer1 = await loader.load(source);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // 第二次加载应该使用缓存
      const buffer2 = await loader.load(source);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(buffer2).toBe(buffer1);
    });

    it('应该能够清理缓存', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockReader.read.mockResolvedValue({ done: true });

      await loader.load(source);
      expect(loader.getCacheStats().size).toBe(1);
      
      loader.clearCache();
      expect(loader.getCacheStats().size).toBe(0);
      
      // 清理缓存后再次加载应该重新请求
      await loader.load(source);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('应该在缓存大小超限时自动清理', async () => {
      // 创建一个小缓存大小的加载器用于测试
      const smallLoader = new FontLoader();
      (smallLoader as any).maxCacheSize = 100; // 设置很小的缓存限制

      const sources = [
        { url: 'https://example.com/font1.woff2', format: FontFormat.WOFF2 },
        { url: 'https://example.com/font2.woff2', format: FontFormat.WOFF2 }
      ];

      // Mock 较大的字体文件
      const bigChunk = new Uint8Array(80);
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: bigChunk })
        .mockResolvedValueOnce({ done: true })
        .mockResolvedValueOnce({ done: false, value: bigChunk })
        .mockResolvedValueOnce({ done: true });

      await smallLoader.load(sources[0]);
      expect(smallLoader.getCacheStats().size).toBe(1);
      
      await smallLoader.load(sources[1]);
      // 第二个字体加载后，第一个应该被清理
      expect(smallLoader.getCacheStats().size).toBe(1);
      
      smallLoader.dispose();
    });
  });

  describe('进度追踪', () => {
    it('应该正确报告加载进度', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const progressEvents: any[] = [];
      const options: FontLoadingOptions = {
        onProgress: (progress) => {
          progressEvents.push({ ...progress });
        }
      };

      // Mock 分段数据传输
      const chunks = [
        new Uint8Array(256),
        new Uint8Array(256),
        new Uint8Array(256),
        new Uint8Array(256)
      ];

      mockReader.read
        .mockResolvedValueOnce({ done: false, value: chunks[0] })
        .mockResolvedValueOnce({ done: false, value: chunks[1] })
        .mockResolvedValueOnce({ done: false, value: chunks[2] })
        .mockResolvedValueOnce({ done: false, value: chunks[3] })
        .mockResolvedValueOnce({ done: true });

      await loader.load(source, options);
      
      expect(progressEvents).toHaveLength(4);
      expect(progressEvents[0].percentage).toBeCloseTo(25, 1);
      expect(progressEvents[3].percentage).toBeCloseTo(100, 1);
      expect(progressEvents[3].speed).toBeGreaterThan(0);
    });

    it('应该能够获取加载进度状态', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      // 延迟mock以便测试进度状态
      mockReader.read.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ done: true }), 100)
        )
      );

      const loadPromise = loader.load(source);
      
      // 在加载过程中检查进度
      await new Promise(resolve => setTimeout(resolve, 50));
      const progress = loader.getLoadingProgress(source.url);
      
      await loadPromise;
      
      // 加载完成后进度应该被清理
      const finalProgress = loader.getLoadingProgress(source.url);
      expect(finalProgress).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(loader.load(source)).rejects.toThrow(FontError);
    });

    it('应该处理HTTP错误状态', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockResponse.ok = false;
      mockResponse.status = 404;
      mockResponse.statusText = 'Not Found';

      await expect(loader.load(source)).rejects.toThrow(FontError);
    });

    it('应该处理FontFace加载失败', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockFontFace.load.mockRejectedValue(new Error('Invalid font'));
      mockReader.read.mockResolvedValue({ done: true });

      await expect(loader.load(source)).rejects.toThrow(FontError);
    });

    it('应该处理加载超时', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const options: FontLoadingOptions = {
        timeout: 100 // 100ms超时
      };

      // Mock 长时间延迟
      mockReader.read.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ done: true }), 200)
        )
      );

      await expect(loader.load(source, options)).rejects.toThrow(FontError);
    });

    it('应该处理加载取消', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const abortController = new AbortController();
      const options: FontLoadingOptions = {
        signal: abortController.signal
      };

      mockReader.read.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ done: true }), 100)
        )
      );

      const loadPromise = loader.load(source, options);
      
      // 50ms后取消
      setTimeout(() => abortController.abort(), 50);

      await expect(loadPromise).rejects.toThrow(FontError);
    });

    it('应该能够取消特定URL的加载', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockReader.read.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ done: true }), 100)
        )
      );

      const loadPromise = loader.load(source);
      
      // 取消加载
      loader.cancel(source.url);

      await expect(loadPromise).rejects.toThrow(FontError);
    });
  });

  describe('格式支持检查', () => {
    it('应该正确检查WOFF2支持', () => {
      expect(loader.supports(FontFormat.WOFF2)).toBe(true);
    });

    it('应该正确检查WOFF支持', () => {
      expect(loader.supports(FontFormat.WOFF)).toBe(true);
    });

    it('应该正确检查TTF支持', () => {
      expect(loader.supports(FontFormat.TTF)).toBe(true);
    });

    it('应该正确拒绝不支持的格式', () => {
      expect(loader.supports(FontFormat.EOT)).toBe(false);
      expect(loader.supports(FontFormat.SVG)).toBe(false);
    });
  });

  describe('并发加载', () => {
    it('应该正确处理相同字体的并发加载', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      mockReader.read.mockResolvedValue({ done: true });

      // 同时发起多个相同字体的加载请求
      const promises = [
        loader.load(source),
        loader.load(source),
        loader.load(source)
      ];

      const results = await Promise.all(promises);
      
      // 应该只发起一次网络请求
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // 所有结果应该相同
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it('应该正确处理不同字体的并发加载', async () => {
      const sources: FontSource[] = [
        { url: 'https://example.com/font1.woff2', format: FontFormat.WOFF2 },
        { url: 'https://example.com/font2.woff2', format: FontFormat.WOFF2 },
        { url: 'https://example.com/font3.woff2', format: FontFormat.WOFF2 }
      ];

      mockReader.read.mockResolvedValue({ done: true });

      const promises = sources.map(source => loader.load(source));
      await Promise.all(promises);
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('事件系统', () => {
    it('应该触发加载开始事件', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const startedSpy = vi.fn();
      loader.on('started', startedSpy);

      mockReader.read.mockResolvedValue({ done: true });

      await loader.load(source);
      
      expect(startedSpy).toHaveBeenCalledWith(
        expect.any(String),
        source
      );
    });

    it('应该触发加载完成事件', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const loadedSpy = vi.fn();
      loader.on('loaded', loadedSpy);

      mockReader.read.mockResolvedValue({ done: true });

      await loader.load(source);
      
      expect(loadedSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(ArrayBuffer)
      );
    });

    it('应该触发错误事件', async () => {
      const source: FontSource = {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2
      };

      const errorSpy = vi.fn();
      loader.on('error', errorSpy);

      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await loader.load(source);
      } catch {
        // 忽略异常，我们只关心事件
      }
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(FontError)
      );
    });
  });
});

describe('FontLoadingUtils', () => {
  beforeEach(() => {
    // Mock document
    Object.defineProperty(document, 'body', {
      writable: true,
      value: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    });

    Object.defineProperty(document, 'createElement', {
      writable: true,
      value: vi.fn().mockReturnValue({
        style: {},
        offsetWidth: 100,
        textContent: ''
      })
    });
  });

  describe('系统字体检测', () => {
    it('应该能够检测系统字体可用性', async () => {
      // Mock document.body methods
      const mockElement = {
        style: {},
        offsetWidth: 100,
        textContent: ''
      };
      
      let callCount = 0;
      document.createElement = vi.fn(() => {
        const element = { ...mockElement };
        // 第一次调用返回100（fallback），第二次返回120（target）
        Object.defineProperty(element, 'offsetWidth', {
          get: () => callCount++ === 0 ? 100 : 120
        });
        return element;
      });

      const isAvailable = await FontLoadingUtils.detectSystemFont('Arial');
      expect(isAvailable).toBe(true);
    });

    it('应该正确识别不可用的系统字体', async () => {
      // Mock相同的宽度值来模拟字体不可用
      const mockElement = {
        style: {},
        offsetWidth: 100,
        textContent: ''
      };

      document.createElement = vi.fn()
        .mockReturnValue({ ...mockElement, offsetWidth: 100 });

      const isAvailable = await FontLoadingUtils.detectSystemFont('NonExistentFont');
      expect(isAvailable).toBe(false);
    });
  });

  describe('最佳字体格式选择', () => {
    it('应该选择WOFF2作为最佳格式', () => {
      const sources: FontSource[] = [
        { url: 'font.ttf', format: FontFormat.TTF },
        { url: 'font.woff', format: FontFormat.WOFF },
        { url: 'font.woff2', format: FontFormat.WOFF2 }
      ];

      const best = FontLoadingUtils.getBestFontFormat(sources);
      expect(best?.format).toBe(FontFormat.WOFF2);
    });

    it('应该在没有WOFF2时选择WOFF', () => {
      const sources: FontSource[] = [
        { url: 'font.ttf', format: FontFormat.TTF },
        { url: 'font.woff', format: FontFormat.WOFF },
        { url: 'font.otf', format: FontFormat.OTF }
      ];

      const best = FontLoadingUtils.getBestFontFormat(sources);
      expect(best?.format).toBe(FontFormat.WOFF);
    });

    it('应该在没有Web字体时选择TTF', () => {
      const sources: FontSource[] = [
        { url: 'font.otf', format: FontFormat.OTF },
        { url: 'font.ttf', format: FontFormat.TTF }
      ];

      const best = FontLoadingUtils.getBestFontFormat(sources);
      expect(best?.format).toBe(FontFormat.TTF);
    });

    it('应该在没有源时返回null', () => {
      const best = FontLoadingUtils.getBestFontFormat([]);
      expect(best).toBeNull();
    });
  });

  describe('字体服务器预连接', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'head', {
        writable: true,
        value: {
          appendChild: vi.fn()
        }
      });

      Object.defineProperty(document, 'querySelector', {
        writable: true,
        value: vi.fn().mockReturnValue(null)
      });

      Object.defineProperty(document, 'createElement', {
        writable: true,
        value: vi.fn().mockReturnValue({
          rel: '',
          href: '',
          crossOrigin: ''
        })
      });
    });

    it('应该为Google Fonts创建预连接', () => {
      const url = 'https://fonts.googleapis.com/css2?family=Roboto';
      
      FontLoadingUtils.preconnectToFontServer(url);
      
      expect(document.createElement).toHaveBeenCalledWith('link');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('应该避免重复的预连接', () => {
      // Mock已存在的预连接
      document.querySelector = vi.fn().mockReturnValue({});
      
      const url = 'https://fonts.googleapis.com/css2?family=Roboto';
      
      FontLoadingUtils.preconnectToFontServer(url);
      
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('应该处理无效的URL', () => {
      expect(() => {
        FontLoadingUtils.preconnectToFontServer('invalid-url');
      }).not.toThrow();
    });
  });
});