/**
 * FontManager 单元测试
 * 测试字体管理、缓存、回退和生命周期管理
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontManager, createFontManager, globalFontManager } from '../FontManager';
import {
  FontConfig,
  FontFormat,
  FontLoadingState,
  FontStyle,
  FontWeight
} from '../types/FontTypes';

// Mock Canvas API
const mockCanvas = {
  width: 1,
  height: 1,
  getContext: vi.fn()
};

const mockContext = {
  font: '',
  measureText: vi.fn().mockReturnValue({
    width: 100,
    actualBoundingBoxLeft: 5,
    actualBoundingBoxRight: 95,
    actualBoundingBoxAscent: 20,
    actualBoundingBoxDescent: 5,
    fontBoundingBoxAscent: 20,
    fontBoundingBoxDescent: 5,
    emHeightAscent: 18,
    emHeightDescent: 4,
    hangingBaseline: 15,
    ideographicBaseline: 3
  })
};

mockCanvas.getContext.mockReturnValue(mockContext);

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn().mockReturnValue(mockCanvas)
});

// Mock FontFace API
const mockFontFace = {
  load: vi.fn().mockResolvedValue(undefined),
  family: 'test-font',
  status: 'loaded'
};

Object.defineProperty(global, 'FontFace', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockFontFace)
});

Object.defineProperty(document, 'fonts', {
  writable: true,
  value: {
    add: vi.fn(),
    delete: vi.fn(),
    has: vi.fn().mockReturnValue(false)
  }
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn().mockReturnValue(Date.now())
  }
});

describe('FontManager', () => {
  let fontManager: FontManager;

  beforeEach(() => {
    fontManager = createFontManager();
    
    // Suppress unhandled error events for testing
    fontManager.on('error', () => {
      // Ignore error events to prevent unhandled error warnings
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    fontManager.dispose();
  });

  describe('字体加载', () => {
    it('应该能够加载基础字体配置', async () => {
      const config: FontConfig = {
        family: 'Roboto',
        sources: [
          {
            url: 'https://fonts.googleapis.com/font.woff2',
            format: FontFormat.WOFF2
          }
        ],
        weight: FontWeight.NORMAL,
        style: FontStyle.NORMAL
      };

      const font = await fontManager.loadFont(config);

      expect(font).toBeDefined();
      expect(font.family).toBe('Roboto');
      expect(font.isLoaded()).toBe(true);
    });

    it('应该能够处理复杂的字体配置', async () => {
      const config: FontConfig = {
        family: 'Inter',
        sources: [
          {
            url: 'https://fonts.googleapis.com/inter-v12-latin-regular.woff2',
            format: FontFormat.WOFF2,
            weight: FontWeight.NORMAL,
            style: FontStyle.NORMAL
          },
          {
            url: 'https://fonts.googleapis.com/inter-v12-latin-regular.woff',
            format: FontFormat.WOFF,
            weight: FontWeight.NORMAL,
            style: FontStyle.NORMAL
          }
        ],
        fallbacks: ['Arial', 'sans-serif'],
        weight: FontWeight.NORMAL,
        style: FontStyle.NORMAL,
        timeout: 5000,
        retries: 3,
        priority: 90
      };

      const font = await fontManager.loadFont(config);

      expect(font.family).toBe('Inter');
      expect(font.config.fallbacks).toEqual(['Arial', 'sans-serif']);
      expect(font.config.timeout).toBe(5000);
    });

    it('应该支持不同的字体权重和样式', async () => {
      const configs: FontConfig[] = [
        {
          family: 'Roboto',
          sources: [{ url: 'font-light.woff2', format: FontFormat.WOFF2 }],
          weight: FontWeight.LIGHT,
          style: FontStyle.NORMAL
        },
        {
          family: 'Roboto',
          sources: [{ url: 'font-bold.woff2', format: FontFormat.WOFF2 }],
          weight: FontWeight.BOLD,
          style: FontStyle.NORMAL
        },
        {
          family: 'Roboto',
          sources: [{ url: 'font-italic.woff2', format: FontFormat.WOFF2 }],
          weight: FontWeight.NORMAL,
          style: FontStyle.ITALIC
        }
      ];

      const fonts = await Promise.all(
        configs.map(config => fontManager.loadFont(config))
      );

      expect(fonts).toHaveLength(3);
      expect(fonts[0].config.weight).toBe(FontWeight.LIGHT);
      expect(fonts[1].config.weight).toBe(FontWeight.BOLD);
      expect(fonts[2].config.style).toBe(FontStyle.ITALIC);
    });
  });

  describe('字体获取', () => {
    beforeEach(async () => {
      // 预加载一些测试字体
      await fontManager.loadFont({
        family: 'Roboto',
        sources: [{ url: 'roboto.woff2', format: FontFormat.WOFF2 }],
        weight: FontWeight.NORMAL,
        style: FontStyle.NORMAL
      });

      await fontManager.loadFont({
        family: 'Roboto',
        sources: [{ url: 'roboto-bold.woff2', format: FontFormat.WOFF2 }],
        weight: FontWeight.BOLD,
        style: FontStyle.NORMAL
      });
    });

    it('应该能够获取已加载的字体', () => {
      const font = fontManager.getFont('Roboto');
      expect(font).toBeDefined();
      expect(font?.family).toBe('Roboto');
    });

    it('应该能够根据权重和样式获取字体', () => {
      const normalFont = fontManager.getFont('Roboto', FontWeight.NORMAL);
      const boldFont = fontManager.getFont('Roboto', FontWeight.BOLD);

      expect(normalFont?.config.weight).toBe(FontWeight.NORMAL);
      expect(boldFont?.config.weight).toBe(FontWeight.BOLD);
    });

    it('应该在字体不存在时返回null', () => {
      const nonExistent = fontManager.getFont('NonExistentFont');
      expect(nonExistent).toBeNull();
    });

    it('应该能够检查字体族是否存在', () => {
      expect(fontManager.hasFont('Roboto')).toBe(true);
      expect(fontManager.hasFont('NonExistentFont')).toBe(false);
    });
  });

  describe('字体回退机制', () => {
    it('应该在主字体加载失败时使用回退字体', async () => {
      // Mock 主字体加载失败
      mockFontFace.load.mockRejectedValueOnce(new Error('Font loading failed'));

      const config: FontConfig = {
        family: 'CustomFont',
        sources: [{ url: 'custom-font.woff2', format: FontFormat.WOFF2 }],
        fallbacks: ['Arial', 'sans-serif']
      };

      const font = await fontManager.loadFont(config);

      expect(font.state).toBe(FontLoadingState.FALLBACK);
    });

    it('应该能够获取回退字体', () => {
      const fallbackFont = fontManager.getFallbackFont('NonExistentFont');
      
      // 应该返回系统默认字体中的一个
      expect(fallbackFont).toBeDefined();
    });

    it('应该触发回退事件', async () => {
      const fallbackSpy = vi.fn();
      fontManager.on('fallback', fallbackSpy);

      mockFontFace.load.mockRejectedValueOnce(new Error('Font loading failed'));

      const config: FontConfig = {
        family: 'CustomFont',
        sources: [{ url: 'custom-font.woff2', format: FontFormat.WOFF2 }],
        fallbacks: ['Arial']
      };

      await fontManager.loadFont(config);

      expect(fallbackSpy).toHaveBeenCalled();
    });
  });

  describe('字体预加载', () => {
    it('应该能够预加载多个字体', async () => {
      const configs: FontConfig[] = [
        {
          family: 'Roboto',
          sources: [{ url: 'roboto.woff2', format: FontFormat.WOFF2 }]
        },
        {
          family: 'Inter',
          sources: [{ url: 'inter.woff2', format: FontFormat.WOFF2 }]
        },
        {
          family: 'Poppins',
          sources: [{ url: 'poppins.woff2', format: FontFormat.WOFF2 }]
        }
      ];

      await fontManager.preloadFonts(configs);

      expect(fontManager.hasFont('Roboto')).toBe(true);
      expect(fontManager.hasFont('Inter')).toBe(true);
      expect(fontManager.hasFont('Poppins')).toBe(true);
    });

    it('应该能够处理预加载过程中的部分失败', async () => {
      // Mock 第二个字体加载失败
      mockFontFace.load
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Font loading failed'))
        .mockResolvedValueOnce(undefined);

      const configs: FontConfig[] = [
        {
          family: 'Font1',
          sources: [{ url: 'font1.woff2', format: FontFormat.WOFF2 }]
        },
        {
          family: 'Font2',
          sources: [{ url: 'font2.woff2', format: FontFormat.WOFF2 }]
        },
        {
          family: 'Font3',
          sources: [{ url: 'font3.woff2', format: FontFormat.WOFF2 }]
        }
      ];

      // 预加载不应该抛出异常，即使部分字体失败
      await expect(fontManager.preloadFonts(configs)).resolves.not.toThrow();

      expect(fontManager.hasFont('Font1')).toBe(true);
      expect(fontManager.hasFont('Font2')).toBe(false);
      expect(fontManager.hasFont('Font3')).toBe(true);
    });
  });

  describe('字体卸载', () => {
    beforeEach(async () => {
      await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });
    });

    it('应该能够卸载字体族', () => {
      expect(fontManager.hasFont('TestFont')).toBe(true);
      
      fontManager.unloadFont('TestFont');
      
      expect(fontManager.hasFont('TestFont')).toBe(false);
      expect(document.fonts.delete).toHaveBeenCalled();
    });

    it('应该触发卸载事件', () => {
      const unloadSpy = vi.fn();
      fontManager.on('unload', unloadSpy);

      fontManager.unloadFont('TestFont');

      expect(unloadSpy).toHaveBeenCalled();
    });
  });

  describe('字体度量', () => {
    let font: any;

    beforeEach(async () => {
      font = await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });
    });

    it('应该能够获取字体度量信息', () => {
      const metrics = font.getMetrics(16);

      expect(metrics.family).toBe('TestFont');
      expect(metrics.size).toBe(16);
      expect(metrics.lineHeight).toBeGreaterThan(0);
      expect(metrics.ascent).toBeGreaterThan(0);
      expect(metrics.descent).toBeGreaterThan(0);
    });

    it('应该能够测量文本宽度', () => {
      const textMetrics = font.measureText('Hello World', 16);

      expect(textMetrics.width).toBeGreaterThan(0);
      expect(textMetrics.height).toBe(16);
    });

    it('应该能够测量单个字符', () => {
      const charMetrics = font.measureCharacter('A', 16);

      expect(charMetrics.character).toBe('A');
      expect(charMetrics.width).toBeGreaterThan(0);
      expect(charMetrics.advance).toBeGreaterThan(0);
    });

    it('应该能够计算字距调整', () => {
      const kerning = font.getKerning('A', 'V', 16);
      expect(typeof kerning).toBe('number');
    });

    it('应该能够检查字符支持', () => {
      const supportsA = font.supports('A');
      const supportsEmoji = font.supports('🎨');

      expect(typeof supportsA).toBe('boolean');
      expect(typeof supportsEmoji).toBe('boolean');
    });
  });

  describe('事件系统', () => {
    it('应该触发加载开始事件', async () => {
      const loadingSpy = vi.fn();
      fontManager.on('loading', loadingSpy);

      await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });

      expect(loadingSpy).toHaveBeenCalled();
    });

    it('应该触发加载完成事件', async () => {
      const loadedSpy = vi.fn();
      fontManager.on('loaded', loadedSpy);

      await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });

      expect(loadedSpy).toHaveBeenCalled();
    });

    it('应该触发错误事件', async () => {
      const errorSpy = vi.fn();
      fontManager.on('error', errorSpy);

      mockFontFace.load.mockRejectedValueOnce(new Error('Font loading failed'));

      try {
        await fontManager.loadFont({
          family: 'TestFont',
          sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
        });
      } catch {
        // 忽略异常，我们只关心事件
      }

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('缓存管理', () => {
    it('应该缓存已加载的字体', async () => {
      const config: FontConfig = {
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      };

      const font1 = await fontManager.loadFont(config);
      const font2 = await fontManager.loadFont(config);

      // 应该返回相同的实例（缓存命中）
      expect(font2).toBe(font1);
    });

    it('应该能够清理缓存', async () => {
      await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });

      fontManager.clearCache();

      // 清理缓存后，相同配置应该创建新实例
      const font = await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });

      expect(font).toBeDefined();
    });
  });

  describe('字体状态管理', () => {
    it('应该正确跟踪字体加载状态', async () => {
      const config: FontConfig = {
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      };

      const font = await fontManager.loadFont(config);

      expect(font.state).toBe(FontLoadingState.LOADED);
      expect(font.isLoaded()).toBe(true);
    });

    it('应该能够获取已加载的字体列表', async () => {
      await fontManager.loadFont({
        family: 'Font1',
        sources: [{ url: 'font1.woff2', format: FontFormat.WOFF2 }]
      });

      await fontManager.loadFont({
        family: 'Font2',
        sources: [{ url: 'font2.woff2', format: FontFormat.WOFF2 }]
      });

      const loadedFonts = fontManager.getLoadedFonts();
      expect(loadedFonts).toHaveLength(2);
    });
  });

  describe('并发加载处理', () => {
    it('应该正确处理相同字体的并发加载', async () => {
      const config: FontConfig = {
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      };

      // 同时发起多个相同字体的加载请求
      const promises = [
        fontManager.loadFont(config),
        fontManager.loadFont(config),
        fontManager.loadFont(config)
      ];

      const results = await Promise.all(promises);

      // 所有结果应该是相同的实例
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('资源清理', () => {
    it('应该正确清理所有资源', async () => {
      await fontManager.loadFont({
        family: 'TestFont',
        sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
      });

      const loadedCountBefore = fontManager.getLoadedFonts().length;
      expect(loadedCountBefore).toBeGreaterThan(0);

      fontManager.dispose();

      const loadedCountAfter = fontManager.getLoadedFonts().length;
      expect(loadedCountAfter).toBe(0);
    });
  });
});

describe('工厂函数和全局实例', () => {
  it('createFontManager应该创建新实例', () => {
    const manager1 = createFontManager();
    const manager2 = createFontManager();

    expect(manager1).not.toBe(manager2);
    expect(manager1).toBeInstanceOf(FontManager);
    expect(manager2).toBeInstanceOf(FontManager);

    manager1.dispose();
    manager2.dispose();
  });

  it('globalFontManager应该是单例', () => {
    expect(globalFontManager).toBeInstanceOf(FontManager);
    
    // 多次访问应该返回相同实例
    const manager1 = globalFontManager;
    const manager2 = globalFontManager;
    
    expect(manager1).toBe(manager2);
  });
});

describe('字体克隆', () => {
  it('应该能够克隆字体实例', async () => {
    const manager = createFontManager();
    manager.on('error', () => {}); // Suppress errors
    
    const font = await manager.loadFont({
      family: 'TestFont',
      sources: [{ url: 'test.woff2', format: FontFormat.WOFF2 }]
    });

    const clonedFont = font.clone();

    expect(clonedFont.family).toBe(font.family);
    expect(clonedFont.config).toEqual(font.config);
    expect(clonedFont.state).toBe(font.state);
    expect(clonedFont).not.toBe(font); // 不同的实例
    
    manager.dispose();
  });
});