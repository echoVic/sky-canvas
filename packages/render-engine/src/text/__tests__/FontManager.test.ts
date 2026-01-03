/**
 * 字体管理器测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontManager, createFontManager, globalFontManager } from '../FontManager';
import { FontConfig, FontFormat, FontWeight, FontStyle } from '../types/FontTypes';

// Mock Canvas
class MockCanvasRenderingContext2D {
  font = '';
  measureText(text: string) {
    return {
      width: text.length * 10,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
      emHeightAscent: 8,
      emHeightDescent: 2,
      hangingBaseline: 8,
      ideographicBaseline: 2
    };
  }
}

class MockCanvas {
  width = 1;
  height = 1;
  getContext(type: string) {
    if (type === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return null;
  }
}

// Mock FontFace
class MockFontFace {
  constructor(public family: string, public source: any, public descriptors?: any) {}
  async load() { return this; }
  status = 'loaded';
}

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock document
const mockDocumentFonts = {
  add: vi.fn(),
  delete: vi.fn(),
  has: vi.fn().mockReturnValue(false),
  check: vi.fn().mockReturnValue(false)
};

const mockDocument = {
  fonts: mockDocumentFonts,
  createElement: (tagName: string) => {
    if (tagName === 'canvas') {
      return new MockCanvas();
    }
    return {};
  }
};

global.FontFace = MockFontFace as any;
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

describe('FontManager', () => {
  let fontManager: FontManager;
  let unhandledRejections: Error[] = [];
  let rejectionHandler: (error: Error) => void;

  const mockFontConfig: FontConfig = {
    family: 'TestFont',
    weight: FontWeight.NORMAL,
    style: FontStyle.NORMAL,
    sources: [{
      url: 'https://example.com/font.woff2',
      format: FontFormat.WOFF2
    }],
    fallbacks: ['Arial', 'sans-serif']
  };

  beforeEach(() => {
    vi.useFakeTimers();
    unhandledRejections = [];
    
    rejectionHandler = (error: Error) => {
      unhandledRejections.push(error);
    };
    process.setMaxListeners(20);
    process.on('unhandledRejection', rejectionHandler);
    
    // Setup fetch mock
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
    
    fontManager = new FontManager();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await vi.runAllTimersAsync();
    } catch (e) {
      // 忽略清理过程中的错误
    }
    
    fontManager?.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
    
    process.removeListener('unhandledRejection', rejectionHandler);
    unhandledRejections = [];
  });

  describe('基础功能', () => {
    it('应该能够创建字体管理器实例', () => {
      expect(fontManager).toBeDefined();
      expect(fontManager).toBeInstanceOf(FontManager);
    });

    it('应该能够使用工厂函数创建实例', () => {
      const manager = createFontManager();
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(FontManager);
    });

    it('应该提供全局字体管理器实例', () => {
      expect(globalFontManager).toBeDefined();
      expect(globalFontManager).toBeInstanceOf(FontManager);
    });
  });

  describe('字体加载', () => {

    it('应该能够加载字体', async () => {
      const loadingSpy = vi.spyOn(fontManager, 'emit');
      
      const loadPromise = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      const font = await loadPromise;
      
      expect(font).toBeDefined();
      expect(font.family).toBe('TestFont');
      expect(loadingSpy).toHaveBeenCalledWith('loading', { font });
      expect(loadingSpy).toHaveBeenCalledWith('loaded', { font });
    });

    it('应该缓存已加载的字体', async () => {
      const loadPromise1 = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      const font1 = await loadPromise1;
      
      const loadPromise2 = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      const font2 = await loadPromise2;
      
      expect(font1).toBe(font2);
    });

    it('应该能够获取已加载的字体', async () => {
      const loadPromise = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      const retrievedFont = fontManager.getFont('TestFont', FontWeight.NORMAL, FontStyle.NORMAL);
      expect(retrievedFont).toBeDefined();
      expect(retrievedFont?.family).toBe('TestFont');
    });

    it('应该能够检查字体是否存在', async () => {
      expect(fontManager.hasFont('TestFont')).toBe(false);
      
      const loadPromise = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      expect(fontManager.hasFont('TestFont')).toBe(true);
    });

    it('应该能够预加载多个字体', async () => {
      const configs: FontConfig[] = [
        { ...mockFontConfig, family: 'Font1' },
        { ...mockFontConfig, family: 'Font2' },
        { ...mockFontConfig, family: 'Font3' }
      ];

      const preloadPromise = fontManager.preloadFonts(configs);
      await vi.runAllTimersAsync();
      await preloadPromise;

      expect(fontManager.hasFont('Font1')).toBe(true);
      expect(fontManager.hasFont('Font2')).toBe(true);
      expect(fontManager.hasFont('Font3')).toBe(true);
    });
  });

  describe('字体回退', () => {
    it('应该在字体加载失败时使用回退字体', async () => {
      const configWithFallback: FontConfig = {
        family: 'FailedFont',
        weight: FontWeight.NORMAL,
        style: FontStyle.NORMAL,
        sources: [{
          url: 'invalid-url',
          format: FontFormat.WOFF2
        }],
        fallbacks: ['Arial']
      };

      const loadingSpy = vi.spyOn(fontManager, 'emit');
      
      // 模拟字体加载失败
      mockFetch.mockReset();
      mockFetch.mockRejectedValue(new Error('Font load failed'));

      const loadPromise = fontManager.loadFont(configWithFallback);
      await vi.runAllTimersAsync();
      const font = await loadPromise;
      
      expect(font).toBeDefined();
      expect(font.state).toBe('fallback');
      expect(loadingSpy).toHaveBeenCalledWith('loading', expect.objectContaining({
        font: expect.any(Object)
      }));
      expect(loadingSpy).toHaveBeenCalledWith('loaded', expect.objectContaining({
        font: expect.any(Object)
      }));
    });

    it('应该能够获取回退字体', () => {
      const fallbackFont = fontManager.getFallbackFont('NonExistentFont');
      expect(fallbackFont).toBeNull();
    });
  });

  describe('字体卸载', () => {
    it('应该能够卸载指定字体', async () => {
      const loadPromise = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise;
      
      expect(fontManager.hasFont('TestFont')).toBe(true);
      
      const unloadSpy = vi.spyOn(fontManager, 'emit');
      fontManager.unloadFont('TestFont');
      
      expect(fontManager.hasFont('TestFont')).toBe(false);
      expect(unloadSpy).toHaveBeenCalledWith('unload', expect.objectContaining({
        font: expect.any(Object)
      }));
    });

    it('应该在dispose时卸载所有字体', async () => {
      const loadPromise1 = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise1;
      
      const loadPromise2 = fontManager.loadFont({ ...mockFontConfig, family: 'AnotherFont' });
      await vi.runAllTimersAsync();
      await loadPromise2;

      expect(fontManager.getLoadedFonts()).toHaveLength(2);

      fontManager.dispose();
      expect(fontManager.getLoadedFonts()).toHaveLength(0);
    });
  });

  describe('缓存管理', () => {
    it('应该能够清理缓存', async () => {
      const loadPromise1 = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise1;
      
      fontManager.clearCache();
      
      // 清理后重新加载应该触发实际加载
      const loadingSpy = vi.spyOn(fontManager, 'emit');
      const loadPromise2 = fontManager.loadFont(mockFontConfig);
      await vi.runAllTimersAsync();
      await loadPromise2;
      
      expect(loadingSpy).toHaveBeenCalledWith('loading', expect.objectContaining({
        font: expect.any(Object)
      }));
    });
  });

  describe('加载进度', () => {
    it('应该能够获取加载进度', async () => {
      const progress = fontManager.getLoadingProgress('TestFont');
      expect(progress).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该在加载失败时发出错误事件', async () => {
      const errorSpy = vi.spyOn(fontManager, 'emit');
      
      const invalidConfig: FontConfig = {
        family: 'InvalidFont',
        sources: [{
          url: 'invalid://url',
          format: FontFormat.WOFF2
        }]
      };

      // 模拟字体加载错误
      mockFetch.mockRejectedValueOnce(new Error('Invalid font source'));

      const loadPromise = fontManager.loadFont(invalidConfig).catch(e => e);
      await vi.runAllTimersAsync();
      const result = await loadPromise;
      
      expect(result).toBeInstanceOf(Error);
      expect(errorSpy).toHaveBeenCalledWith('error', expect.objectContaining({
        font: null,
        error: expect.any(Error)
      }));
    });
  });
});