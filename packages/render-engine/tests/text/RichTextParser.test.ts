/**
 * RichTextParser 单元测试
 * 测试富文本解析、HTML解析和Markdown解析功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RichTextParser, createRichTextParser } from '../RichTextParser';
import {
  TextStyle,
  TextDecoration,
  TextAlign,
  FontWeight,
  FontStyle,
  ColorUtils,
  Colors
} from '../types/RichTextTypes';

describe('RichTextParser', () => {
  let parser: RichTextParser;
  let defaultStyle: TextStyle;

  beforeEach(() => {
    parser = createRichTextParser();
    defaultStyle = {
      fontFamily: 'Arial',
      fontSize: 16,
      color: Colors.BLACK
    };
  });

  describe('HTML解析', () => {
    it('应该解析基础HTML标签', () => {
      const html = '<b>粗体</b>和<i>斜体</i>文本';
      const document = parser.parseHTML(html, defaultStyle);
      
      expect(document.content).toBe('粗体和斜体文本');
      expect(document.fragments).toHaveLength(4);
      
      // 检查粗体样式
      expect(document.fragments[0].text).toBe('粗体');
      expect(document.fragments[0].style.fontWeight).toBe(FontWeight.BOLD);
      
      // 检查普通文本 - "和"
      expect(document.fragments[1].text).toBe('和');
      expect(document.fragments[1].style.fontWeight).toBe(defaultStyle.fontWeight);
      
      // 检查斜体样式
      expect(document.fragments[2].text).toBe('斜体');
      expect(document.fragments[2].style.fontStyle).toBe(FontStyle.ITALIC);
      
      // 检查普通文本 - "文本"
      expect(document.fragments[3].text).toBe('文本');
      expect(document.fragments[3].style.fontWeight).toBe(defaultStyle.fontWeight);
    });

    it('应该解析嵌套的HTML标签', () => {
      const html = '<b><i>粗斜体</i></b>文本';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments).toHaveLength(2);
      
      const boldItalic = document.fragments[0];
      expect(boldItalic.text).toBe('粗斜体');
      expect(boldItalic.style.fontWeight).toBe(FontWeight.BOLD);
      expect(boldItalic.style.fontStyle).toBe(FontStyle.ITALIC);
    });

    it('应该解析下划线和删除线', () => {
      const html = '<u>下划线</u>和<s>删除线</s>';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments[0].style.textDecoration).toBe(TextDecoration.UNDERLINE);
      expect(document.fragments[2].style.textDecoration).toBe(TextDecoration.LINE_THROUGH);
    });

    it('应该解析标题标签', () => {
      const html = '<h1>标题1</h1><h2>标题2</h2>';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments[0].style.fontSize).toBe(32);
      expect(document.fragments[0].style.fontWeight).toBe(FontWeight.BOLD);
      
      expect(document.fragments[1].style.fontSize).toBe(24);
      expect(document.fragments[1].style.fontWeight).toBe(FontWeight.BOLD);
    });

    it('应该解析内联样式', () => {
      const html = '<span style="color: red; font-size: 20px">红色大字</span>';
      const document = parser.parseHTML(html, defaultStyle);

      const fragment = document.fragments[0];
      expect(fragment.style.color).toEqual(ColorUtils.fromRGB(255, 0, 0));
      expect(fragment.style.fontSize).toBe(20);
    });

    it('应该解析颜色属性', () => {
      const html = '<font color="#ff0000">红色</font>';
      const document = parser.parseHTML(html, defaultStyle);

      const fragment = document.fragments[0];
      expect(fragment.style.color).toEqual(ColorUtils.fromHex('#ff0000'));
    });

    it('应该处理自闭合标签', () => {
      const html = '第一行<br/>第二行';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.content).toBe('第一行第二行');
      expect(document.fragments).toHaveLength(2);
    });

    it('应该处理不匹配的标签', () => {
      const html = '<b>未闭合的粗体标签';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments).toHaveLength(1);
      expect(document.fragments[0].style.fontWeight).toBe(FontWeight.BOLD);
    });

    it('应该解析复杂的嵌套结构', () => {
      const html = `
        <p>
          这是一个<b>包含<i>多种</i>样式</b>的
          <span style="color: blue">复杂</span>示例
        </p>
      `;
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments.length).toBeGreaterThan(1);
      
      // 检查是否正确解析了各种样式
      const hasBlue = document.fragments.some(f => 
        f.style.color && f.style.color.b === 255
      );
      expect(hasBlue).toBe(true);
    });
  });

  describe('Markdown解析', () => {
    it('应该解析Markdown粗体和斜体', () => {
      const markdown = '这是**粗体**和*斜体*文本';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      expect(document.content).toContain('粗体');
      expect(document.content).toContain('斜体');
      
      const hasBold = document.fragments.some(f => 
        f.style.fontWeight === FontWeight.BOLD
      );
      const hasItalic = document.fragments.some(f => 
        f.style.fontStyle === FontStyle.ITALIC
      );
      
      expect(hasBold).toBe(true);
      expect(hasItalic).toBe(true);
    });

    it('应该解析Markdown标题', () => {
      const markdown = '# 一级标题\n## 二级标题\n### 三级标题';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      const hasH1 = document.fragments.some(f => f.style.fontSize === 32);
      const hasH2 = document.fragments.some(f => f.style.fontSize === 24);
      const hasH3 = document.fragments.some(f => f.style.fontSize === 19);
      
      expect(hasH1).toBe(true);
      expect(hasH2).toBe(true);
      expect(hasH3).toBe(true);
    });

    it('应该解析Markdown删除线', () => {
      const markdown = '这是~~删除~~的文本';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      const hasStrikethrough = document.fragments.some(f => 
        f.style.textDecoration === TextDecoration.LINE_THROUGH
      );
      expect(hasStrikethrough).toBe(true);
    });

    it('应该解析下划线语法', () => {
      const markdown = '这是__粗体__和_斜体_';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      const hasBold = document.fragments.some(f => 
        f.style.fontWeight === FontWeight.BOLD
      );
      const hasItalic = document.fragments.some(f => 
        f.style.fontStyle === FontStyle.ITALIC
      );
      
      expect(hasBold).toBe(true);
      expect(hasItalic).toBe(true);
    });

    it('应该解析组合样式', () => {
      const markdown = '这是***粗斜体***文本';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      const hasBothStyles = document.fragments.some(f => 
        f.style.fontWeight === FontWeight.BOLD && 
        f.style.fontStyle === FontStyle.ITALIC
      );
      expect(hasBothStyles).toBe(true);
    });

    it('应该解析行内代码', () => {
      const markdown = '这是`代码`文本';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      expect(document.content).toContain('代码');
    });

    it('应该处理换行', () => {
      const markdown = '第一段\n\n第二段';
      const document = parser.parseMarkdown(markdown, defaultStyle);

      expect(document.content).toBe('第一段第二段');
    });
  });

  describe('样式数组文档创建', () => {
    it('应该从文本和样式数组创建文档', () => {
      const text = '这是一个测试文本';
      const styles = [
        {
          start: 2,
          end: 4,
          style: { fontWeight: FontWeight.BOLD }
        },
        {
          start: 6,
          end: 8,
          style: { fontStyle: FontStyle.ITALIC }
        }
      ];

      const document = parser.createDocument(text, styles, defaultStyle);

      expect(document.content).toBe(text);
      expect(document.fragments).toHaveLength(4); // 默认+粗体+默认+斜体
      
      expect(document.fragments[1].style.fontWeight).toBe(FontWeight.BOLD);
      expect(document.fragments[3].style.fontStyle).toBe(FontStyle.ITALIC);
    });

    it('应该处理重叠的样式范围', () => {
      const text = '重叠样式测试';
      const styles = [
        {
          start: 0,
          end: 4,
          style: { fontWeight: FontWeight.BOLD }
        },
        {
          start: 2,
          end: 6,
          style: { fontStyle: FontStyle.ITALIC }
        }
      ];

      const document = parser.createDocument(text, styles, defaultStyle);

      expect(document.fragments.length).toBeGreaterThan(0);
      
      // 应该有合并了两种样式的片段
      const hasOverlap = document.fragments.some(f => 
        f.style.fontWeight === FontWeight.BOLD && 
        f.style.fontStyle === FontStyle.ITALIC
      );
      expect(hasOverlap).toBe(true);
    });

    it('应该保持原有的默认样式', () => {
      const text = '纯文本';
      const styles: Array<{ start: number; end: number; style: TextStyle }> = [];

      const document = parser.createDocument(text, styles, defaultStyle);

      expect(document.fragments).toHaveLength(1);
      expect(document.fragments[0].style.fontFamily).toBe(defaultStyle.fontFamily);
      expect(document.fragments[0].style.fontSize).toBe(defaultStyle.fontSize);
    });

    it('应该正确处理空文本', () => {
      const text = '';
      const styles: Array<{ start: number; end: number; style: TextStyle }> = [];

      const document = parser.createDocument(text, styles, defaultStyle);

      expect(document.content).toBe('');
      expect(document.fragments).toHaveLength(0);
    });

    it('应该处理边界情况的样式范围', () => {
      const text = '边界测试';
      const styles = [
        {
          start: 0,
          end: 0, // 空范围
          style: { fontWeight: FontWeight.BOLD }
        },
        {
          start: 0,
          end: text.length, // 全文范围
          style: { fontStyle: FontStyle.ITALIC }
        }
      ];

      const document = parser.createDocument(text, styles, defaultStyle);

      expect(document.fragments.length).toBeGreaterThan(0);
      expect(document.fragments[0].style.fontStyle).toBe(FontStyle.ITALIC);
    });
  });

  describe('样式解析', () => {
    it('应该解析CSS颜色值', () => {
      const tests = [
        { input: '#ff0000', expected: { r: 255, g: 0, b: 0, a: 1 } },
        { input: 'rgb(255, 0, 0)', expected: { r: 255, g: 0, b: 0, a: 1 } },
        { input: 'rgba(255, 0, 0, 0.5)', expected: { r: 255, g: 0, b: 0, a: 0.5 } },
        { input: 'red', expected: { r: 255, g: 0, b: 0, a: 1 } }
      ];

      for (const test of tests) {
        const html = `<span style="color: ${test.input}">测试</span>`;
        const document = parser.parseHTML(html, defaultStyle);
        
        expect(document.fragments[0].style.color).toEqual(test.expected);
      }
    });

    it('应该解析字体大小单位', () => {
      const tests = [
        { input: '20px', expected: 20 },
        { input: '15pt', expected: 15 * 1.333 },
        { input: '1.5em', expected: 1.5 * 16 }
      ];

      for (const test of tests) {
        const html = `<span style="font-size: ${test.input}">测试</span>`;
        const document = parser.parseHTML(html, defaultStyle);
        
        expect(document.fragments[0].style.fontSize).toBeCloseTo(test.expected, 1);
      }
    });

    it('应该解析字体权重', () => {
      const tests = [
        { input: 'bold', expected: FontWeight.BOLD },
        { input: '700', expected: FontWeight.BOLD },
        { input: 'normal', expected: FontWeight.NORMAL },
        { input: '400', expected: FontWeight.NORMAL }
      ];

      for (const test of tests) {
        const html = `<span style="font-weight: ${test.input}">测试</span>`;
        const document = parser.parseHTML(html, defaultStyle);
        
        expect(document.fragments[0].style.fontWeight).toBe(test.expected);
      }
    });

    it('应该解析复合CSS属性', () => {
      const html = '<span style="color: blue; font-size: 18px; font-weight: bold; text-decoration: underline">复合样式</span>';
      const document = parser.parseHTML(html, defaultStyle);

      const fragment = document.fragments[0];
      expect(fragment.style.color).toEqual(ColorUtils.fromRGB(0, 0, 255));
      expect(fragment.style.fontSize).toBe(18);
      expect(fragment.style.fontWeight).toBe(FontWeight.BOLD);
      expect(fragment.style.textDecoration).toBe(TextDecoration.UNDERLINE);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的HTML', () => {
      const html = '<invalid-tag>内容</invalid-tag>';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments).toHaveLength(1);
      expect(document.fragments[0].text).toBe('内容');
    });

    it('应该处理空输入', () => {
      const emptyHTML = '';
      const emptyMarkdown = '';

      const htmlDoc = parser.parseHTML(emptyHTML, defaultStyle);
      const mdDoc = parser.parseMarkdown(emptyMarkdown, defaultStyle);

      expect(htmlDoc.content).toBe('');
      expect(htmlDoc.fragments).toHaveLength(0);
      expect(mdDoc.content).toBe('');
      expect(mdDoc.fragments).toHaveLength(0);
    });

    it('应该处理畸形的样式字符串', () => {
      const html = '<span style="color:; font-size: invalid;">测试</span>';
      const document = parser.parseHTML(html, defaultStyle);

      // 应该能够解析，即使样式无效
      expect(document.fragments).toHaveLength(1);
      expect(document.fragments[0].text).toBe('测试');
    });

    it('应该处理未闭合的标签', () => {
      const html = '<b>粗体<i>斜体';
      const document = parser.parseHTML(html, defaultStyle);

      expect(document.fragments.length).toBeGreaterThan(0);
      
      // 应该应用了粗体样式
      const hasBold = document.fragments.some(f => 
        f.style.fontWeight === FontWeight.BOLD
      );
      expect(hasBold).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大型文档', () => {
      // 创建一个大型HTML文档
      const largeHTML = Array(1000).fill('<b>测试</b>文本').join('');
      
      const startTime = performance.now();
      const document = parser.parseHTML(largeHTML, defaultStyle);
      const endTime = performance.now();

      expect(document.fragments.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够处理深层嵌套', () => {
      // 创建深层嵌套的HTML
      const deepHTML = '<b><i><u><s>深层嵌套</s></u></i></b>';
      const document = parser.parseHTML(deepHTML, defaultStyle);

      expect(document.fragments).toHaveLength(1);
      
      const fragment = document.fragments[0];
      expect(fragment.style.fontWeight).toBe(FontWeight.BOLD);
      expect(fragment.style.fontStyle).toBe(FontStyle.ITALIC);
      expect(fragment.style.textDecoration).toBe(TextDecoration.LINE_THROUGH);
    });
  });
});