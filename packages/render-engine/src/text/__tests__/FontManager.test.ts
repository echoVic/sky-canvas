/**
 * 字体管理器测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FontManager, createFontManager, globalFontManager } from '../FontManager';
import { FontConfig, FontFormat, FontWeight, FontStyle } from '../types/FontTypes';

// Mock FontFace and document.fonts
const mockFontFace = vi.fn().mockImplementation((family, source, descriptors) => ({
  family,
  source,
  descriptors,
  load: vi.fn().mockResolvedValue(undefined),
  status: 'loaded'
}));

const mockDocumentFonts = {
  add: vi.fn(),
  delete: vi.fn(),
  has: vi.fn().mockReturnValue(false)
};

Object.defineProperty(global, 'FontFace', { value: mockFontFace });
Object.defineProperty(global, 'document', {
  value: { fonts: mockDocumentFonts }
});

describe('FontManager', () => {
  let fontManager: FontManager;

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
    fontManager = new FontManager();
    vi.clearAllMocks();
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
      
      const font = await fontManager.loadFont(mockFontConfig);
      
      expect(font).toBeDefined();
      expect(font.family).toBe('TestFont');
      expect(loadingSpy).toHaveBeenCalledWith('loading', font);
      expect(loadingSpy).toHaveBeenCalledWith('loaded', font);
    });

    it('应该缓存已加载的字体', async () => {
      const font1 = await fontManager.loadFont(mockFontConfig);
      const font2 = await fontManager.loadFont(mockFontConfig);
      
      expect(font1).toBe(font2);
    });

    it('应该能够获取已加载的字体', async () => {
      await fontManager.loadFont(mockFontConfig);
      
      const retrievedFont = fontManager.getFont('TestFont');
      expect(retrievedFont).toBeDefined();
      expect(retrievedFont?.family).toBe('TestFont');
    });

    it('应该能够检查字体是否存在', async () => {
      expect(fontManager.hasFont('TestFont')).toBe(false);
      
      await fontManager.loadFont(mockFontConfig);
      expect(fontManager.hasFont('TestFont')).toBe(true);
    });

    it('应该能够预加载多个字体', async () => {
      const configs: FontConfig[] = [
        { ...mockFontConfig, family: 'Font1' },
        { ...mockFontConfig, family: 'Font2' },
        { ...mockFontConfig, family: 'Font3' }
      ];

      await fontManager.preloadFonts(configs);

      expect(fontManager.hasFont('Font1')).toBe(true);
      expect(fontManager.hasFont('Font2')).toBe(true);
      expect(fontManager.hasFont('Font3')).toBe(true);
    });
  });

  describe('字体回退', () => {
    it('应该在字体加载失败时使用回退字体', async () => {
      const configWithFallback: FontConfig = {
        ...mockFontConfig,
        sources: [{
          url: 'invalid-url',
          format: FontFormat.WOFF2
        }],
        fallbacks: ['Arial']
      };

      const fallbackSpy = vi.spyOn(fontManager, 'emit');
      
      // 模拟字体加载失败
      mockFontFace.mockImplementationOnce(() => {
        throw new Error('Font load failed');
      });

      const font = await fontManager.loadFont(configWithFallback);
      
      expect(font).toBeDefined();
      expect(fallbackSpy).toHaveBeenCalledWith('fallback', expect.any(Object), expect.any(Object));
    });

    it('应该能够获取回退字体', () => {
      const fallbackFont = fontManager.getFallbackFont('NonExistentFont');
      expect(fallbackFont).toBeDefined();
    });
  });

  describe('字体卸载', () => {
    it('应该能够卸载指定字体', async () => {
      await fontManager.loadFont(mockFontConfig);
      expect(fontManager.hasFont('TestFont')).toBe(true);
      
      const unloadSpy = vi.spyOn(fontManager, 'emit');
      fontManager.unloadFont('TestFont');
      
      expect(fontManager.hasFont('TestFont')).toBe(false);
      expect(unloadSpy).toHaveBeenCalledWith('unload', expect.any(Object));
    });

    it('应该在dispose时卸载所有字体', async () => {
      await fontManager.loadFont(mockFontConfig);
      await fontManager.loadFont({ ...mockFontConfig, family: 'AnotherFont' });

      expect(fontManager.getLoadedFonts()).toHaveLength(2);

      fontManager.dispose();
      expect(fontManager.getLoadedFonts()).toHaveLength(0);
    });
  });

  describe('缓存管理', () => {
    it('应该能够清理缓存', async () => {
      await fontManager.loadFont(mockFontConfig);
      
      fontManager.clearCache();
      
      // 清理后重新加载应该触发实际加载
      const loadingSpy = vi.spyOn(fontManager, 'emit');
      await fontManager.loadFont(mockFontConfig);
      
      expect(loadingSpy).toHaveBeenCalledWith('loading', expect.any(Object));
    });
  });

  describe('加载进度', () => {
    it('应该能够获取加载进度', async () => {
      const progress = fontManager.getLoadingProgress('TestFont');
      // 由于我们没有真实的加载器，这里可能返回null
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
      mockFontFace.mockImplementationOnce(() => {
        throw new Error('Invalid font source');
      });

      try {
        await fontManager.loadFont(invalidConfig);
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorSpy).toHaveBeenCalledWith('error', null, expect.any(Error));
      }
    });
  });
});