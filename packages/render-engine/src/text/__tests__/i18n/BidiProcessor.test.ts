import { describe, it, expect, beforeEach } from 'vitest';
import { BidiProcessor } from '../../i18n/BidiProcessor';
import { TextDirection } from '../../types/I18nTextTypes';

describe('BidiProcessor', () => {
  let processor: BidiProcessor;

  beforeEach(() => {
    processor = new BidiProcessor();
  });

  describe('基础功能', () => {
    it('应该能够创建 BidiProcessor 实例', () => {
      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(BidiProcessor);
    });
  });

  describe('双向文本处理', () => {
    it('应该能够处理纯英文文本', () => {
      const text = 'Hello World';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toBe(text);
      expect(result.direction).toBe(TextDirection.LTR);
      expect(result.runs).toBeDefined();
      expect(result.runs.length).toBeGreaterThan(0);
    });

    it('应该能够处理纯阿拉伯文文本', () => {
      const text = 'مرحبا بالعالم';
      const result = processor.processBidiText(text, TextDirection.RTL);
      
      expect(result).toBeDefined();
      expect(result.direction).toBe(TextDirection.RTL);
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理混合方向文本', () => {
      const text = 'Hello مرحبا World';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.runs.length).toBeGreaterThan(1);
      
      // 应该有不同方向的文本段
      const directions = result.runs.map(run => run.direction);
      expect(directions).toContain(TextDirection.LTR);
      expect(directions).toContain(TextDirection.RTL);
    });

    it('应该能够处理包含数字的文本', () => {
      const text = 'Price: 123 USD';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toContain('123');
    });

    it('应该能够处理包含标点符号的文本', () => {
      const text = 'Hello, World!';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toContain(',');
      expect(result.visualText).toContain('!');
    });
  });

  describe('文本方向检测', () => {
    it('应该能够检测英文文本方向', () => {
      const text = 'This is English text';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.LTR);
    });

    it('应该能够检测阿拉伯文文本方向', () => {
      const text = 'هذا نص عربي';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.RTL);
    });

    it('应该能够检测希伯来文文本方向', () => {
      const text = 'זה טקסט עברי';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.RTL);
    });

    it('应该能够处理混合文本的主要方向', () => {
      const text = 'Mostly English with some عربي text';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.LTR);
    });

    it('应该能够处理空文本', () => {
      const text = '';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.LTR); // 默认方向
    });

    it('应该能够处理只包含数字和符号的文本', () => {
      const text = '123 + 456 = 579';
      const direction = processor.detectTextDirection(text);
      
      expect(direction).toBe(TextDirection.LTR); // 默认方向
    });
  });

  describe('文本分段', () => {
    it('应该能够将文本分解为双向文本段', () => {
      const text = 'English عربي English';
      const runs = processor.analyzeTextRuns(text);
      
      expect(runs).toBeDefined();
      expect(runs.length).toBe(3);
      
      expect(runs[0].direction).toBe(TextDirection.LTR);
      expect(runs[0].text).toBe('English ');
      
      expect(runs[1].direction).toBe(TextDirection.RTL);
      expect(runs[1].text).toBe('عربي');
      
      expect(runs[2].direction).toBe(TextDirection.LTR);
      expect(runs[2].text).toBe(' English');
    });

    it('应该能够处理嵌套的双向文本', () => {
      const text = 'English (عربي nested) text';
      const runs = processor.analyzeTextRuns(text);
      
      expect(runs).toBeDefined();
      expect(runs.length).toBeGreaterThan(1);
    });

    it('应该能够正确处理文本段的索引', () => {
      const text = 'ABC عربي 123';
      const runs = processor.analyzeTextRuns(text);
      
      let totalLength = 0;
      runs.forEach(run => {
        expect(run.startIndex).toBe(totalLength);
        expect(run.endIndex).toBe(totalLength + run.text.length);
        totalLength += run.text.length;
      });
      
      expect(totalLength).toBe(text.length);
    });
  });

  describe('Unicode 双向算法', () => {
    it('应该能够处理 Unicode 双向控制字符', () => {
      const text = 'LTR\u202DRTL\u202C';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.runs).toBeDefined();
    });

    it('应该能够处理 Unicode 双向覆盖', () => {
      const text = 'Normal \u202Eoverride\u202C normal';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
    });

    it('应该能够处理弱字符类型', () => {
      const text = 'Text with spaces and 123 numbers';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toContain(' ');
      expect(result.visualText).toContain('123');
    });
  });

  describe('性能测试', () => {
    it('应该能够高效处理长文本', () => {
      const longText = 'This is a very long text '.repeat(100) + 'عربي '.repeat(50);
      
      const startTime = performance.now();
      const result = processor.processBidiText(longText, TextDirection.LTR);
      const endTime = performance.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能够处理大量短文本', () => {
      const texts = [];
      for (let i = 0; i < 1000; i++) {
        texts.push(`Text ${i} عربي`);
      }
      
      const startTime = performance.now();
      texts.forEach(text => {
        processor.detectTextDirection(text);
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });
  });

  describe('边界情况', () => {
    it('应该能够处理只包含空格的文本', () => {
      const text = '   ';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toBe(text);
    });

    it('应该能够处理单个字符', () => {
      const text = 'A';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toBe(text);
      expect(result.runs).toHaveLength(1);
    });

    it('应该能够处理特殊 Unicode 字符', () => {
      const text = '🌍🚀💻';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toContain('🌍');
    });

    it('应该能够处理换行符', () => {
      const text = 'Line 1\nLine 2\nعربي';
      const result = processor.processBidiText(text, TextDirection.LTR);
      
      expect(result).toBeDefined();
      expect(result.visualText).toContain('\n');
    });
  });

  describe('错误处理', () => {
    it('应该能够处理 null 或 undefined 输入', () => {
      expect(() => {
        processor.processBidiText(null as any, TextDirection.LTR);
      }).not.toThrow();
      
      expect(() => {
        processor.processBidiText(undefined as any, TextDirection.LTR);
      }).not.toThrow();
    });

    it('应该能够处理无效的方向参数', () => {
      const text = 'Test text';
      
      expect(() => {
        processor.processBidiText(text, 'invalid' as any);
      }).not.toThrow();
    });

    it('应该能够处理极长的文本', () => {
      const veryLongText = 'A'.repeat(100000);
      
      expect(() => {
        processor.processBidiText(veryLongText, TextDirection.LTR);
      }).not.toThrow();
    });
  });
});