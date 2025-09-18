import { describe, it, expect, beforeEach } from 'vitest';
import { BidiProcessor } from '../../i18n/BidiProcessor';
import { TextDirection, BidiConfig, CharacterClass } from '../../types/I18nTextTypes';

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

    it('应该能够获取字符分类', () => {
      // 测试英文字符
      expect(processor.getCharacterClass(65)).toBe(CharacterClass.LEFT_TO_RIGHT); // 'A'
      expect(processor.getCharacterClass(97)).toBe(CharacterClass.LEFT_TO_RIGHT); // 'a'
      
      // 测试数字
      expect(processor.getCharacterClass(48)).toBe(CharacterClass.EUROPEAN_NUMBER); // '0'
      
      // 测试空格
      expect(processor.getCharacterClass(32)).toBe(CharacterClass.WHITESPACE); // ' '
    });
  });

  describe('方向检测', () => {
    it('应该能够检测英文文本方向', () => {
      const text = 'Hello World';
      const result = processor.detectBaseDirection(text);
      
      expect(result).toBeDefined();
      expect(result.direction).toBe(TextDirection.LTR);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('应该能够检测混合文本方向', () => {
      const text = 'Hello 123';
      const result = processor.detectBaseDirection(text);
      
      expect(result).toBeDefined();
      expect(result.direction).toBe(TextDirection.LTR);
    });
  });

  describe('双向文本处理', () => {
    it('应该能够处理纯英文文本', () => {
      const text = 'Hello World';
      const config: BidiConfig = { baseDirection: TextDirection.LTR };
      const result = processor.processBidiText(text, config);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该能够处理简单文本', () => {
      const text = 'Test';
      const config: BidiConfig = { baseDirection: TextDirection.LTR };
      const result = processor.processBidiText(text, config);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('应该能够处理空文本', () => {
      const text = '';
      const config: BidiConfig = { baseDirection: TextDirection.LTR };
      const result = processor.processBidiText(text, config);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('显示文本生成', () => {
    it('应该能够生成显示文本', () => {
      const originalText = 'Hello';
      const runs = [
        {
          text: 'Hello',
          startIndex: 0,
          endIndex: 5,
          direction: TextDirection.LTR,
          characterClass: CharacterClass.LEFT_TO_RIGHT,
          level: 0
        }
      ];
      
      const displayText = processor.getDisplayText(originalText, runs);
      expect(displayText).toBe('Hello');
    });
  });
});