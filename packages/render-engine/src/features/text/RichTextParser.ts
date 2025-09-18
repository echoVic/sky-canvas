/**
 * 富文本解析器
 * 支持HTML和Markdown格式的富文本解析
 */

import {
  IRichTextParser,
  RichTextDocument,
  TextFragment,
  TextStyle,
  HTML_TAGS,
  HTMLTag,
  ColorUtils,
  TextDecoration,
  TextAlign,
  VerticalAlign,
  TextTransform,
  FontWeight,
  FontStyle
} from './types/RichTextTypes';

/**
 * 解析节点
 */
interface ParseNode {
  type: 'text' | 'element';
  text?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  children?: ParseNode[];
  style?: Partial<TextStyle>;
}

/**
 * 样式解析器
 */
class StyleParser {
  /**
   * 解析CSS样式字符串
   */
  static parseStyle(styleString: string): Partial<TextStyle> {
    const style: Partial<TextStyle> = {};
    
    if (!styleString) return style;

    const declarations = styleString.split(';').map(d => d.trim()).filter(d => d);
    
    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;
      
      const property = declaration.substring(0, colonIndex).trim();
      const value = declaration.substring(colonIndex + 1).trim();
      
      this.parseStyleProperty(property, value, style);
    }

    return style;
  }

  /**
   * 解析单个CSS属性
   */
  private static parseStyleProperty(property: string, value: string, style: Partial<TextStyle>): void {
    switch (property.toLowerCase()) {
      case 'color':
        style.color = this.parseColor(value);
        break;
        
      case 'font-family':
        style.fontFamily = value.replace(/['"]/g, '').trim();
        break;
        
      case 'font-size':
        style.fontSize = this.parseSize(value);
        break;
        
      case 'font-weight':
        style.fontWeight = this.parseFontWeight(value);
        break;
        
      case 'font-style':
        style.fontStyle = this.parseFontStyle(value);
        break;
        
      case 'line-height':
        style.lineHeight = this.parseLineHeight(value);
        break;
        
      case 'text-decoration':
        style.textDecoration = this.parseTextDecoration(value);
        break;
        
      case 'text-decoration-color':
        style.textDecorationColor = this.parseColor(value);
        break;
        
      case 'text-align':
        style.textAlign = this.parseTextAlign(value);
        break;
        
      case 'vertical-align':
        style.verticalAlign = this.parseVerticalAlign(value);
        break;
        
      case 'text-transform':
        style.textTransform = this.parseTextTransform(value);
        break;
        
      case 'letter-spacing':
        style.letterSpacing = this.parseSize(value);
        break;
        
      case 'word-spacing':
        style.wordSpacing = this.parseSize(value);
        break;
        
      case 'opacity':
        style.opacity = parseFloat(value);
        break;
        
      case 'background-color':
        style.backgroundColor = this.parseColor(value);
        break;
        
      case 'text-shadow':
        style.shadow = this.parseTextShadow(value);
        break;
    }
  }

  /**
   * 解析颜色值
   */
  private static parseColor(value: string): any {
    value = value.trim();
    
    // 十六进制颜色
    if (value.startsWith('#')) {
      return ColorUtils.fromHex(value);
    }
    
    // RGB/RGBA
    const rgbMatch = value.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(',').map(v => v.trim());
      const r = parseInt(values[0]);
      const g = parseInt(values[1]);
      const b = parseInt(values[2]);
      const a = values[3] ? parseFloat(values[3]) : 1;
      return ColorUtils.fromRGB(r, g, b, a);
    }
    
    // HSL/HSLA
    const hslMatch = value.match(/hsla?\(([^)]+)\)/);
    if (hslMatch) {
      const values = hslMatch[1].split(',').map(v => v.trim());
      const h = parseFloat(values[0]);
      const s = parseFloat(values[1].replace('%', '')) / 100;
      const l = parseFloat(values[2].replace('%', '')) / 100;
      const a = values[3] ? parseFloat(values[3]) : 1;
      return ColorUtils.fromHSL(h, s, l, a);
    }
    
    // 命名颜色
    return this.parseNamedColor(value);
  }

  /**
   * 解析命名颜色
   */
  private static parseNamedColor(name: string): any {
    const namedColors: Record<string, string> = {
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      green: '#008000',
      blue: '#0000ff',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      gray: '#808080',
      orange: '#ffa500',
      purple: '#800080',
      brown: '#a52a2a',
      pink: '#ffc0cb',
      lime: '#00ff00',
      navy: '#000080',
      maroon: '#800000',
      olive: '#808000',
      teal: '#008080',
      silver: '#c0c0c0',
      gold: '#ffd700'
    };
    
    const hex = namedColors[name.toLowerCase()];
    return hex ? ColorUtils.fromHex(hex) : ColorUtils.fromRGB(0, 0, 0);
  }

  /**
   * 解析尺寸值
   */
  private static parseSize(value: string): number {
    const match = value.match(/^([+-]?\d*\.?\d+)(px|pt|em|rem|%)?$/);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const unit = match[2] || 'px';
    
    switch (unit) {
      case 'px':
        return num;
      case 'pt':
        return num * 1.333; // 1pt = 1.333px
      case 'em':
      case 'rem':
        return num * 16; // 假设基础字号为16px
      case '%':
        return num / 100; // 返回比例值
      default:
        return num;
    }
  }

  /**
   * 解析字体权重
   */
  private static parseFontWeight(value: string): FontWeight | string {
    const weightMap: Record<string, FontWeight> = {
      'normal': FontWeight.NORMAL,
      'bold': FontWeight.BOLD,
      'bolder': FontWeight.BOLD,
      'lighter': FontWeight.LIGHT,
      '100': FontWeight.THIN,
      '200': FontWeight.EXTRA_LIGHT,
      '300': FontWeight.LIGHT,
      '400': FontWeight.NORMAL,
      '500': FontWeight.MEDIUM,
      '600': FontWeight.SEMI_BOLD,
      '700': FontWeight.BOLD,
      '800': FontWeight.EXTRA_BOLD,
      '900': FontWeight.BLACK
    };
    
    return weightMap[value.toLowerCase()] || value;
  }

  /**
   * 解析字体样式
   */
  private static parseFontStyle(value: string): FontStyle {
    switch (value.toLowerCase()) {
      case 'italic':
        return FontStyle.ITALIC;
      case 'oblique':
        return FontStyle.OBLIQUE;
      default:
        return FontStyle.NORMAL;
    }
  }

  /**
   * 解析行高
   */
  private static parseLineHeight(value: string): number {
    if (value === 'normal') return 1.2;
    
    // 数字倍数
    const numMatch = value.match(/^(\d*\.?\d+)$/);
    if (numMatch) {
      return parseFloat(numMatch[1]);
    }
    
    // 带单位的值
    return this.parseSize(value);
  }

  /**
   * 解析文本装饰
   */
  private static parseTextDecoration(value: string): TextDecoration {
    if (value.includes('underline')) return TextDecoration.UNDERLINE;
    if (value.includes('overline')) return TextDecoration.OVERLINE;
    if (value.includes('line-through')) return TextDecoration.LINE_THROUGH;
    return TextDecoration.NONE;
  }

  /**
   * 解析文本对齐
   */
  private static parseTextAlign(value: string): TextAlign {
    switch (value.toLowerCase()) {
      case 'center':
        return TextAlign.CENTER;
      case 'right':
        return TextAlign.RIGHT;
      case 'justify':
        return TextAlign.JUSTIFY;
      default:
        return TextAlign.LEFT;
    }
  }

  /**
   * 解析垂直对齐
   */
  private static parseVerticalAlign(value: string): VerticalAlign {
    switch (value.toLowerCase()) {
      case 'top':
        return VerticalAlign.TOP;
      case 'middle':
        return VerticalAlign.MIDDLE;
      case 'bottom':
        return VerticalAlign.BOTTOM;
      default:
        return VerticalAlign.BASELINE;
    }
  }

  /**
   * 解析文本变换
   */
  private static parseTextTransform(value: string): TextTransform {
    switch (value.toLowerCase()) {
      case 'uppercase':
        return TextTransform.UPPERCASE;
      case 'lowercase':
        return TextTransform.LOWERCASE;
      case 'capitalize':
        return TextTransform.CAPITALIZE;
      default:
        return TextTransform.NONE;
    }
  }

  /**
   * 解析文本阴影
   */
  private static parseTextShadow(value: string): any {
    // 简单的文本阴影解析：offsetX offsetY blurRadius color
    const parts = value.trim().split(/\s+/);
    if (parts.length < 3) return undefined;
    
    const offsetX = this.parseSize(parts[0]);
    const offsetY = this.parseSize(parts[1]);
    const blurRadius = this.parseSize(parts[2]);
    const color = parts[3] ? this.parseColor(parts[3]) : ColorUtils.fromRGB(0, 0, 0, 0.5);
    
    return {
      offsetX,
      offsetY,
      blurRadius,
      color
    };
  }
}

/**
 * HTML解析器
 */
class HTMLParser {
  private static readonly VOID_ELEMENTS = new Set([
    'br', 'hr', 'img', 'input', 'area', 'base', 'col', 'embed', 
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  /**
   * 解析HTML字符串
   */
  static parseHTML(html: string): ParseNode[] {
    // 简化的HTML解析器
    const nodes: ParseNode[] = [];
    const stack: ParseNode[] = [];
    let currentIndex = 0;

    while (currentIndex < html.length) {
      const tagStart = html.indexOf('<', currentIndex);
      
      // 处理文本内容
      if (tagStart === -1 || tagStart > currentIndex) {
        const textEnd = tagStart === -1 ? html.length : tagStart;
        const textContent = html.substring(currentIndex, textEnd);
        if (textContent.trim()) {
          const textNode: ParseNode = {
            type: 'text',
            text: textContent
          };
          
          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            parent.children = parent.children || [];
            parent.children.push(textNode);
          } else {
            nodes.push(textNode);
          }
        }
        
        if (tagStart === -1) break;
        currentIndex = tagStart;
      }
      
      // 处理标签
      const tagEnd = html.indexOf('>', currentIndex);
      if (tagEnd === -1) break;
      
      const tagString = html.substring(currentIndex + 1, tagEnd);
      currentIndex = tagEnd + 1;
      
      // 解析标签
      if (tagString.startsWith('/')) {
        // 结束标签
        stack.pop();
      } else {
        // 开始标签
        const elementNode = this.parseTag(tagString);
        
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children = parent.children || [];
          parent.children.push(elementNode);
        } else {
          nodes.push(elementNode);
        }
        
        // 自闭合标签不需要入栈
        if (!this.VOID_ELEMENTS.has(elementNode.tagName || '') && !tagString.endsWith('/')) {
          stack.push(elementNode);
        }
      }
    }

    return nodes;
  }

  /**
   * 解析单个标签
   */
  private static parseTag(tagString: string): ParseNode {
    const spaceIndex = tagString.indexOf(' ');
    const tagName = spaceIndex === -1 ? 
      tagString.replace('/', '') : 
      tagString.substring(0, spaceIndex);
    
    const attributes: Record<string, string> = {};
    
    if (spaceIndex !== -1) {
      const attrString = tagString.substring(spaceIndex + 1).replace('/', '');
      const attrMatches = attrString.matchAll(/(\w+)(?:=["']([^"']*)["'])?/g);
      
      for (const match of attrMatches) {
        attributes[match[1]] = match[2] || '';
      }
    }
    
    return {
      type: 'element',
      tagName: tagName.toLowerCase(),
      attributes,
      children: []
    };
  }
}

/**
 * 富文本解析器实现
 */
export class RichTextParser implements IRichTextParser {
  /**
   * 解析HTML文本
   */
  parseHTML(html: string, defaultStyle: TextStyle): RichTextDocument {
    const nodes = HTMLParser.parseHTML(html);
    const fragments: TextFragment[] = [];
    const contentArray: string[] = [];
    
    this.processNodes(nodes, defaultStyle, fragments, contentArray, 0);
    
    return {
      content: contentArray.join(''),
      fragments,
      defaultStyle
    };
  }

  /**
   * 解析Markdown文本
   */
  parseMarkdown(markdown: string, defaultStyle: TextStyle): RichTextDocument {
    // 简化的Markdown解析，将常见语法转换为HTML
    let html = markdown;
    
    // 标题
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    html = html.replace(/__(.*?)__/g, '<b>$1</b>');
    html = html.replace(/_(.*?)_/g, '<i>$1</i>');
    
    // 删除线
    html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 换行
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // 包装段落
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return this.parseHTML(html, defaultStyle);
  }

  /**
   * 从纯文本和样式数组创建文档
   */
  createDocument(
    text: string,
    styles: Array<{ start: number; end: number; style: TextStyle }>,
    defaultStyle: TextStyle
  ): RichTextDocument {
    if (!text || text.length === 0) {
      return { content: '', fragments: [], defaultStyle };
    }
    
    if (!styles || styles.length === 0) {
      return {
        content: text,
        fragments: [{
          text,
          style: defaultStyle,
          startIndex: 0,
          endIndex: text.length
        }],
        defaultStyle
      };
    }
    
    // 创建所有分割点的集合
    const breakPoints = new Set<number>([0, text.length]);
    
    // 添加所有样式的起始和结束点
    for (const style of styles) {
      if (style.start >= 0 && style.start <= text.length) {
        breakPoints.add(style.start);
      }
      if (style.end >= 0 && style.end <= text.length) {
        breakPoints.add(style.end);
      }
    }
    
    // 排序分割点
    const sortedBreakPoints = Array.from(breakPoints).sort((a, b) => a - b);
    
    const fragments: TextFragment[] = [];
    
    // 为每个区间创建片段
    for (let i = 0; i < sortedBreakPoints.length - 1; i++) {
      const start = sortedBreakPoints[i];
      const end = sortedBreakPoints[i + 1];
      
      if (start === end) continue; // 跳过空区间
      
      // 计算当前区间的合并样式
      let mergedStyle = { ...defaultStyle };
      
      for (const style of styles) {
        // 检查样式是否覆盖当前区间
        if (style.start <= start && style.end >= end) {
          mergedStyle = { ...mergedStyle, ...style.style };
        }
      }
      
      fragments.push({
        text: text.substring(start, end),
        style: mergedStyle,
        startIndex: start,
        endIndex: end
      });
    }
    
    return {
      content: text,
      fragments,
      defaultStyle
    };
  }

  /**
   * 处理解析节点
   */
  private processNodes(
    nodes: ParseNode[],
    currentStyle: TextStyle,
    fragments: TextFragment[],
    contentArray: string[],
    startIndex: number
  ): number {
    let index = startIndex;
    
    for (const node of nodes) {
      if (node.type === 'text') {
        const text = node.text || '';
        if (text.trim()) {
          fragments.push({
            text,
            style: { ...currentStyle },
            startIndex: index,
            endIndex: index + text.length
          });
          contentArray.push(text);
          index += text.length;
        }
      } else if (node.type === 'element') {
        const elementStyle = this.getElementStyle(node, currentStyle);
        
        if (node.children && node.children.length > 0) {
          index = this.processNodes(
            node.children,
            elementStyle,
            fragments,
            contentArray,
            index
          );
        }
      }
    }
    
    return index;
  }

  /**
   * 获取元素样式
   */
  private getElementStyle(node: ParseNode, baseStyle: TextStyle): TextStyle {
    let style = { ...baseStyle };
    
    // 应用HTML标签默认样式
    if (node.tagName && HTML_TAGS[node.tagName]) {
      const tagStyle = HTML_TAGS[node.tagName].style;
      style = { ...style, ...tagStyle };
    }
    
    // 应用style属性
    if (node.attributes?.style) {
      const inlineStyle = StyleParser.parseStyle(node.attributes.style);
      style = { ...style, ...inlineStyle };
    }
    
    // 应用其他属性
    if (node.attributes?.color) {
      style.color = StyleParser['parseColor'](node.attributes.color);
    }
    
    return style;
  }
}

/**
 * 创建默认富文本解析器
 */
export function createRichTextParser(): RichTextParser {
  return new RichTextParser();
}