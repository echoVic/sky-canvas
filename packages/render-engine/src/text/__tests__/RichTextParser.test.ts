import { describe, it, expect, beforeEach } from 'vitest';
import { RichTextParser } from '../RichTextParser';
import { 
  TextStyle, 
  TextDecoration, 
  TextAlign, 
  FontWeight, 
  FontStyle,
  Colors
} from '../types/RichTextTypes';

// 注意：StyleParser 是 RichTextParser 内部的私有类，无法直接测试
// 我们通过测试 RichTextParser 的公共方法来间接测试样式解析功能

describe('RichTextParser', () => {
  let parser: RichTextParser;
  let defaultStyle: TextStyle;

  beforeEach(() => {
    parser = new RichTextParser();
    defaultStyle = {
      fontFamily: 'Arial',
      fontSize: 16,
      color: Colors.BLACK
    };
  });

  describe('HTML解析', () => {
    it('应该能够解析基本HTML标签', () => {
      const html = '<p>Hello <b>world</b>!</p>';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toBe('Hello world!');
      expect(result.fragments).toHaveLength(3);
      expect(result.fragments[1].style.fontWeight).toBe(FontWeight.BOLD);
    });

    it('应该能够解析嵌套HTML标签', () => {
      const html = '<p>Text with <b>bold and <i>italic</i></b> content</p>';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toBe('Text with bold and italic content');
      expect(result.fragments.length).toBeGreaterThan(1);
    });

    it('应该能够解析带样式的HTML', () => {
      const html = '<span style="color: red; font-size: 18px;">Styled text</span>';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.fragments[0].style.color).toEqual(expect.objectContaining({
        r: 255,
        g: 0,
        b: 0
      }));
      expect(result.fragments[0].style.fontSize).toBe(18);
    });

    it('应该处理自闭合标签', () => {
      const html = 'Line 1<br/>Line 2';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toContain('Line 1');
      expect(result.content).toContain('Line 2');
    });
  });

  describe('Markdown解析', () => {
    it('应该能够解析基本Markdown语法', () => {
      const markdown = 'Hello **world**!';
      const result = parser.parseMarkdown(markdown, defaultStyle);
      
      expect(result.content).toBe('Hello world!');
      expect(result.fragments).toHaveLength(3);
      expect(result.fragments[1].style.fontWeight).toBe(FontWeight.BOLD);
    });

    it('应该能够解析斜体文本', () => {
      const markdown = 'Text with *italic* content';
      const result = parser.parseMarkdown(markdown, defaultStyle);
      
      expect(result.content).toBe('Text with italic content');
      expect(result.fragments[1].style.fontStyle).toBe(FontStyle.ITALIC);
    });
  });

  describe('文档创建', () => {
    it('应该能够创建富文本文档', () => {
      const text = 'Hello world!';
      const styles = [
        {
          start: 0,
          end: 5,
          style: { ...defaultStyle, fontWeight: FontWeight.BOLD }
        },
        {
          start: 6,
          end: 11,
          style: { ...defaultStyle, fontStyle: FontStyle.ITALIC }
        }
      ];
      
      const result = parser.createDocument(text, styles, defaultStyle);
      
      expect(result.content).toBe(text);
      expect(result.fragments).toHaveLength(3);
      expect(result.fragments[0].style.fontWeight).toBe(FontWeight.BOLD);
      expect(result.fragments[1].style.fontStyle).toBe(FontStyle.ITALIC);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效HTML', () => {
      const html = '<invalid>content</invalid>';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toBe('content');
      expect(result.fragments).toHaveLength(1);
    });

    it('应该处理未闭合的标签', () => {
      const html = '<b>Bold text without closing tag';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toBe('Bold text without closing tag');
    });

    it('应该处理空HTML字符串', () => {
      const result = parser.parseHTML('', defaultStyle);
      
      expect(result.content).toBe('');
      expect(result.fragments).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理只包含空白字符的HTML', () => {
      const html = '   \n\t   ';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content.trim()).toBe('');
    });

    it('应该处理特殊字符', () => {
      const html = '<p>&lt;script&gt;alert("test")&lt;/script&gt;</p>';
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toContain('<script>');
      expect(result.content).toContain('</script>');
    });

    it('应该处理非常长的文本', () => {
      const longText = 'A'.repeat(1000);
      const html = `<p>${longText}</p>`;
      const result = parser.parseHTML(html, defaultStyle);
      
      expect(result.content).toBe(longText);
      expect(result.fragments[0].text).toBe(longText);
    });
  });
});