import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTextLayout, I18nTextLayoutOptions } from '../../i18n/I18nTextLayout';
import { TextDirection, WritingMode, LanguageTag } from '../../types/I18nTextTypes';
import { TextStyle, TextAlign } from '../../types/RichTextTypes';

describe('I18nTextLayout', () => {
  let layout: I18nTextLayout;
  let defaultStyle: TextStyle;
  let defaultI18nOptions: any;

  beforeEach(() => {
    layout = new I18nTextLayout();
    defaultStyle = {
      fontSize: 16,
      fontFamily: 'Arial',
      color: { r: 0, g: 0, b: 0, a: 1 }
    };
    defaultI18nOptions = {
      language: { language: 'en' } as LanguageTag,
      direction: TextDirection.LTR,
      writingMode: WritingMode.HORIZONTAL_TB,
      textAlign: TextAlign.LEFT
    };
  });

  describe('基础功能', () => {
    it('应该能够创建实例', () => {
      expect(layout).toBeInstanceOf(I18nTextLayout);
    });
  });

  describe('基础布局', () => {
    it('应该能够处理简单的布局', () => {
      const options: I18nTextLayoutOptions = {
        language: 'en',
        direction: 'ltr',
        wordWrap: false
      };
      const result = layout.layout('Hello world', options);
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('应该能够处理从右到左的文本', () => {
      const options: I18nTextLayoutOptions = {
        language: 'ar',
        direction: 'rtl',
        wordWrap: false
      };
      const result = layout.layout('مرحبا بالعالم', options);
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
    });

    it('应该能够处理垂直文本', () => {
      const options: I18nTextLayoutOptions = {
        language: 'ja',
        direction: 'ttb',
        wordWrap: false
      };
      const result = layout.layout('こんにちは', options);
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
    });

    it('应该能够处理自动换行', () => {
      const options: I18nTextLayoutOptions = {
        language: 'en',
        direction: 'ltr',
        wordWrap: true,
        maxWidth: 100
      };
      const result = layout.layout('This is a very long text that should wrap', options);
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
    });
  });

  describe('复杂文本布局', () => {
    it('应该能够处理复杂文本布局', () => {
      const result = layout.layoutText(
        'Hello world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
      expect(result.runs.length).toBeGreaterThan(0);
      expect(result.totalWidth).toBeGreaterThan(0);
      expect(result.totalHeight).toBeGreaterThan(0);
    });

    it('应该能够处理从右到左的复杂文本', () => {
      const rtlOptions = {
        language: { language: 'ar', script: 'Arab' } as LanguageTag,
        direction: TextDirection.RTL,
        writingMode: WritingMode.HORIZONTAL_TB,
        textAlign: TextAlign.LEFT
      };
      const result = layout.layoutText(
        'مرحبا بالعالم',
        defaultStyle,
        200,
        rtlOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
      expect(result.runs[0].direction).toBe(TextDirection.RTL);
    });

    it('应该能够处理混合方向的文本', () => {
      const result = layout.layoutText(
        'Hello مرحبا World',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理空字符串', () => {
      const result = layout.layoutText(
        '',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });
  });

  describe('文本对齐', () => {
    it('应该能够应用左对齐', () => {
      const complexLayout = layout.layoutText(
        'Hello world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      expect(() => {
        layout.applyTextAlignment(complexLayout, TextAlign.LEFT, 200);
      }).not.toThrow();
    });

    it('应该能够应用右对齐', () => {
      const complexLayout = layout.layoutText(
        'Hello world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      expect(() => {
        layout.applyTextAlignment(complexLayout, TextAlign.RIGHT, 200);
      }).not.toThrow();
    });

    it('应该能够应用居中对齐', () => {
      const complexLayout = layout.layoutText(
        'Hello world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      expect(() => {
        layout.applyTextAlignment(complexLayout, TextAlign.CENTER, 200);
      }).not.toThrow();
    });

    it('应该能够应用两端对齐', () => {
      const complexLayout = layout.layoutText(
        'Hello world test',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      expect(() => {
        layout.applyTextAlignment(complexLayout, TextAlign.JUSTIFY, 200);
      }).not.toThrow();
    });
  });

  describe('视觉顺序', () => {
    it('应该能够获取视觉顺序', () => {
      const complexLayout = layout.layoutText(
        'Hello world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      const visualOrder = layout.getVisualOrder(complexLayout);
      expect(visualOrder).toBeDefined();
      expect(typeof visualOrder).toBe('string');
      expect(visualOrder).toBe('Hello world');
    });

    it('应该能够处理从右到左文本的视觉顺序', () => {
      const rtlOptions = {
        language: { language: 'ar', script: 'Arab' } as LanguageTag,
        direction: TextDirection.RTL,
        writingMode: WritingMode.HORIZONTAL_TB,
        textAlign: TextAlign.LEFT
      };
      const complexLayout = layout.layoutText(
        'مرحبا',
        defaultStyle,
        200,
        rtlOptions
      );
      
      const visualOrder = layout.getVisualOrder(complexLayout);
      expect(visualOrder).toBeDefined();
      expect(typeof visualOrder).toBe('string');
    });

    it('应该能够处理混合文本的视觉顺序', () => {
      const complexLayout = layout.layoutText(
        'Hello مرحبا World',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      const visualOrder = layout.getVisualOrder(complexLayout);
      expect(visualOrder).toBeDefined();
      expect(typeof visualOrder).toBe('string');
    });
  });

  describe('边界情况', () => {
    it('应该能够处理非常长的文本', () => {
      const longText = 'Hello world '.repeat(100);
      const result = layout.layoutText(
        longText,
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理特殊字符', () => {
      const result = layout.layoutText(
        'Hello\n\t\r world',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理Unicode字符', () => {
      const result = layout.layoutText(
        'Hello 🌍 World 😀',
        defaultStyle,
        200,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理零宽度', () => {
      const result = layout.layoutText(
        'Hello world',
        defaultStyle,
        0,
        defaultI18nOptions
      );
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该能够快速处理中等长度文本', () => {
      const text = 'Hello world test '.repeat(50);
      const start = performance.now();
      
      const result = layout.layoutText(
        text,
        defaultStyle,
        200,
        defaultI18nOptions
      );
      
      const end = performance.now();
      
      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能够快速处理多次布局调用', () => {
      const texts = [
        'Hello world',
        'مرحبا بالعالم',
        'こんにちは世界',
        'Bonjour le monde',
        'Hola mundo'
      ];
      
      const start = performance.now();
      
      texts.forEach(text => {
        layout.layoutText(
          text,
          defaultStyle,
          200,
          defaultI18nOptions
        );
      });
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});