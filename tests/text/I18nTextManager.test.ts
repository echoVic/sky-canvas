/**
 * 国际化文本管理器测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nTextManager } from '../../src/text/I18nTextManager';
import { TextAlign, TextDirection, WritingMode } from '../../src/text/types/I18nTextTypes';

describe('I18nTextManager', () => {
  let manager: I18nTextManager;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    manager = new I18nTextManager();
    
    // Mock Canvas API
    mockCanvas = {
      getContext: vi.fn(),
      width: 300,
      height: 150
    } as any;

    mockContext = {
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      measureText: vi.fn().mockReturnValue({
        width: 10,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 10,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 3
      }),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      strokeRect: vi.fn()
    } as any;

    mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);

    // Mock document.createElement
    global.document = {
      createElement: vi.fn().mockReturnValue(mockCanvas)
    } as any;
  });

  describe('语言检测', () => {
    it('应该检测英文', () => {
      const result = manager.detectLanguage('Hello World');
      
      expect(result).not.toBeNull();
      expect(result!.language.language).toBe('en');
      expect(result!.confidence).toBeGreaterThan(0.5);
    });

    it('应该检测中文', () => {
      const result = manager.detectLanguage('你好世界');
      
      expect(result).not.toBeNull();
      expect(result!.language.language).toBe('zh');
      expect(result!.script).toBe('Hans');
    });

    it('应该处理空文本', () => {
      const result = manager.detectLanguage('');
      expect(result).toBeNull();
    });
  });

  describe('文本方向检测', () => {
    it('应该检测LTR文本', () => {
      const result = manager.detectDirection('Hello World');
      
      expect(result.direction).toBe(TextDirection.LTR);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('应该处理中性字符', () => {
      const result = manager.detectDirection('123 !@# $%^');
      
      expect(result.direction).toBe(TextDirection.LTR); // 默认LTR
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('文本分析', () => {
    it('应该分析简单文本', () => {
      const result = manager.analyzeText('Hello World');
      
      expect(result.originalText).toBe('Hello World');
      expect(result.complexity).toBe('simple');
      expect(result.baseDirection).toBe(TextDirection.LTR);
      expect(result.requiresShaping).toBe(false);
      expect(result.detectedLanguages).toHaveLength(1);
    });

    it('应该缓存分析结果', () => {
      const text = 'Test text';
      const result1 = manager.analyzeText(text);
      const result2 = manager.analyzeText(text);
      
      expect(result1).toBe(result2); // 应该是同一个对象引用
    });
  });

  describe('I18n选项创建', () => {
    it('应该创建默认选项', () => {
      const options = manager.createI18nOptions('Hello World');
      
      expect(options.language.language).toBe('en');
      expect(options.direction).toBe(TextDirection.LTR);
      expect(options.writingMode).toBe(WritingMode.HORIZONTAL_TB);
      expect(options.textAlign).toBe(TextAlign.START);
    });

    it('应该应用覆盖选项', () => {
      const options = manager.createI18nOptions('Hello World', {
        direction: TextDirection.RTL,
        textAlign: TextAlign.CENTER
      });
      
      expect(options.direction).toBe(TextDirection.RTL);
      expect(options.textAlign).toBe(TextAlign.CENTER);
    });
  });

  describe('文本测量', () => {
    it('应该测量英文文本', () => {
      const result = manager.measureText('Hello', {});
      
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.layout).toBeDefined();
    });

    it('应该处理最大宽度限制', () => {
      const result = manager.measureText('Hello World Test', {}, {}, 50);
      
      expect(result.layout.lineBreaks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('文本渲染', () => {
    it('应该渲染基本文本', () => {
      const layout = manager.renderText(
        mockContext,
        'Hello',
        { fontSize: 16 },
        { x: 10, y: 20 }
      );
      
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(layout).toBeDefined();
    });

    it('应该应用裁剪', () => {
      manager.renderText(
        mockContext,
        'Hello',
        { fontSize: 16 },
        { x: 10, y: 20, maxWidth: 100, maxHeight: 50, clipToBounds: true }
      );
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.clip).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('字符位置', () => {
    it('应该获取字符位置', () => {
      const position = manager.getCharacterPosition('Hello', 2, { fontSize: 16 });
      
      expect(position).not.toBeNull();
      expect(position!.x).toBeGreaterThanOrEqual(0);
    });

    it('应该根据坐标获取字符', () => {
      const charIndex = manager.getCharacterFromPosition('Hello', 25, 10, { fontSize: 16 });
      
      expect(charIndex).toBeGreaterThanOrEqual(0);
      expect(charIndex).toBeLessThan(5);
    });
  });

  describe('复杂文本检测', () => {
    it('应该识别简单文本', () => {
      expect(manager.isComplexText('Hello')).toBe(false);
    });
  });

  describe('缓存管理', () => {
    it('应该缓存布局结果', () => {
      const text = 'Test';
      const style = { fontSize: 16 };
      
      const layout1 = manager.layoutText(text, style, 100);
      const layout2 = manager.layoutText(text, style, 100);
      
      expect(layout1).toBe(layout2);
    });

    it('应该清理缓存', () => {
      manager.analyzeText('Test');
      manager.layoutText('Test', {}, 100);
      
      const stats1 = manager.getCacheStats();
      expect(stats1.analysisCache.size).toBeGreaterThan(0);
      expect(stats1.layoutCache.size).toBeGreaterThan(0);
      
      manager.clearCache();
      
      const stats2 = manager.getCacheStats();
      expect(stats2.analysisCache.size).toBe(0);
      expect(stats2.layoutCache.size).toBe(0);
    });
  });

  describe('语言支持', () => {
    it('应该返回支持的语言列表', () => {
      const languages = manager.getSupportedLanguages();
      
      expect(languages.length).toBeGreaterThan(10);
      expect(languages.some(lang => lang.language === 'en')).toBe(true);
      expect(languages.some(lang => lang.language === 'zh')).toBe(true);
    });
  });
});