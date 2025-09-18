/**
 * 富文本渲染类型定义
 * 支持多样式混合文本的渲染和布局
 */

import { FontWeight, FontStyle } from './FontTypes';

// 重新导出字体相关枚举，供外部使用
export { FontWeight, FontStyle };

/**
 * 文本对齐方式
 */
export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  JUSTIFY = 'justify'
}

/**
 * 垂直对齐方式
 */
export enum VerticalAlign {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom',
  BASELINE = 'baseline'
}

/**
 * 文本装饰类型
 */
export enum TextDecoration {
  NONE = 'none',
  UNDERLINE = 'underline',
  OVERLINE = 'overline',
  LINE_THROUGH = 'line-through'
}

/**
 * 文本装饰样式
 */
export enum TextDecorationStyle {
  SOLID = 'solid',
  DOUBLE = 'double',
  DOTTED = 'dotted',
  DASHED = 'dashed',
  WAVY = 'wavy'
}

/**
 * 文本变换
 */
export enum TextTransform {
  NONE = 'none',
  CAPITALIZE = 'capitalize',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase'
}

/**
 * 颜色值
 */
export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

/**
 * 渐变停止点
 */
export interface GradientStop {
  offset: number; // 0-1
  color: Color;
}

/**
 * 线性渐变
 */
export interface LinearGradient {
  type: 'linear';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: GradientStop[];
}

/**
 * 径向渐变
 */
export interface RadialGradient {
  type: 'radial';
  x0: number;
  y0: number;
  r0: number;
  x1: number;
  y1: number;
  r1: number;
  stops: GradientStop[];
}

/**
 * 填充样式
 */
export type FillStyle = Color | LinearGradient | RadialGradient;

/**
 * 描边样式
 */
export interface StrokeStyle {
  color: Color;
  width: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'round' | 'bevel' | 'miter';
  miterLimit?: number;
  dashArray?: number[];
  dashOffset?: number;
}

/**
 * 阴影样式
 */
export interface ShadowStyle {
  color: Color;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
}

/**
 * 文本样式配置
 */
export interface TextStyle {
  // 字体相关
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight | string;
  fontStyle?: FontStyle;
  lineHeight?: number;

  // 颜色和填充
  color?: Color;
  fillStyle?: FillStyle;
  strokeStyle?: StrokeStyle;

  // 文本装饰
  textDecoration?: TextDecoration;
  textDecorationColor?: Color;
  textDecorationStyle?: TextDecorationStyle;
  textDecorationThickness?: number;

  // 文本变换和对齐
  textTransform?: TextTransform;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;

  // 间距
  letterSpacing?: number;
  wordSpacing?: number;

  // 效果
  shadow?: ShadowStyle;
  opacity?: number;

  // 背景
  backgroundColor?: Color;
  backgroundFillStyle?: FillStyle;

  // 边距和内边距
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * 文本片段
 * 具有统一样式的连续文本
 */
export interface TextFragment {
  text: string;
  style: TextStyle;
  startIndex: number;
  endIndex: number;
}

/**
 * 文本行信息
 */
export interface TextLine {
  fragments: TextFragment[];
  width: number;
  height: number;
  baselineY: number;
  startIndex: number;
  endIndex: number;
}

/**
 * 富文本文档
 */
export interface RichTextDocument {
  content: string;
  fragments: TextFragment[];
  defaultStyle: TextStyle;
  width?: number;
  height?: number;
}

/**
 * 文本测量结果
 */
export interface RichTextMetrics {
  width: number;
  height: number;
  lines: TextLine[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 文本布局选项
 */
export interface TextLayoutOptions {
  maxWidth?: number;
  maxHeight?: number;
  wordWrap?: boolean;
  breakWord?: boolean;
  ellipsis?: boolean;
  maxLines?: number;
}

/**
 * 文本渲染上下文
 */
export interface TextRenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  devicePixelRatio: number;
  antialiasing: boolean;
}

/**
 * 富文本渲染器接口
 */
export interface IRichTextRenderer {
  /**
   * 测量富文本尺寸
   */
  measureText(document: RichTextDocument, options?: TextLayoutOptions): RichTextMetrics;

  /**
   * 渲染富文本
   */
  renderText(
    document: RichTextDocument,
    x: number,
    y: number,
    context: TextRenderContext,
    options?: TextLayoutOptions
  ): void;

  /**
   * 获取文本在指定位置的字符索引
   */
  getCharacterIndexAtPoint(
    document: RichTextDocument,
    x: number,
    y: number,
    options?: TextLayoutOptions
  ): number;

  /**
   * 获取字符在文本中的位置
   */
  getCharacterPosition(
    document: RichTextDocument,
    index: number,
    options?: TextLayoutOptions
  ): { x: number; y: number };
}

/**
 * 富文本解析器接口
 */
export interface IRichTextParser {
  /**
   * 解析HTML文本
   */
  parseHTML(html: string, defaultStyle: TextStyle): RichTextDocument;

  /**
   * 解析Markdown文本
   */
  parseMarkdown(markdown: string, defaultStyle: TextStyle): RichTextDocument;

  /**
   * 从纯文本和样式数组创建文档
   */
  createDocument(
    text: string,
    styles: Array<{ start: number; end: number; style: TextStyle }>,
    defaultStyle: TextStyle
  ): RichTextDocument;
}

/**
 * HTML样式标签支持
 */
export interface HTMLTag {
  name: string;
  style: Partial<TextStyle>;
  isBlockElement: boolean;
}

/**
 * 预定义的HTML标签样式
 */
export const HTML_TAGS: Record<string, HTMLTag> = {
  b: {
    name: 'b',
    style: { fontWeight: FontWeight.BOLD },
    isBlockElement: false
  },
  strong: {
    name: 'strong',
    style: { fontWeight: FontWeight.BOLD },
    isBlockElement: false
  },
  i: {
    name: 'i',
    style: { fontStyle: FontStyle.ITALIC },
    isBlockElement: false
  },
  em: {
    name: 'em',
    style: { fontStyle: FontStyle.ITALIC },
    isBlockElement: false
  },
  u: {
    name: 'u',
    style: { textDecoration: TextDecoration.UNDERLINE },
    isBlockElement: false
  },
  s: {
    name: 's',
    style: { textDecoration: TextDecoration.LINE_THROUGH },
    isBlockElement: false
  },
  strike: {
    name: 'strike',
    style: { textDecoration: TextDecoration.LINE_THROUGH },
    isBlockElement: false
  },
  del: {
    name: 'del',
    style: { textDecoration: TextDecoration.LINE_THROUGH },
    isBlockElement: false
  },
  sup: {
    name: 'sup',
    style: { 
      fontSize: 0.8,
      verticalAlign: VerticalAlign.TOP
    },
    isBlockElement: false
  },
  sub: {
    name: 'sub',
    style: { 
      fontSize: 0.8,
      verticalAlign: VerticalAlign.BOTTOM
    },
    isBlockElement: false
  },
  small: {
    name: 'small',
    style: { fontSize: 0.85 },
    isBlockElement: false
  },
  big: {
    name: 'big',
    style: { fontSize: 1.2 },
    isBlockElement: false
  },
  p: {
    name: 'p',
    style: {
      margin: { top: 16, bottom: 16 }
    },
    isBlockElement: true
  },
  h1: {
    name: 'h1',
    style: {
      fontSize: 32,
      fontWeight: FontWeight.BOLD,
      margin: { top: 21, bottom: 21 }
    },
    isBlockElement: true
  },
  h2: {
    name: 'h2',
    style: {
      fontSize: 24,
      fontWeight: FontWeight.BOLD,
      margin: { top: 19, bottom: 19 }
    },
    isBlockElement: true
  },
  h3: {
    name: 'h3',
    style: {
      fontSize: 19,
      fontWeight: FontWeight.BOLD,
      margin: { top: 16, bottom: 16 }
    },
    isBlockElement: true
  },
  h4: {
    name: 'h4',
    style: {
      fontSize: 16,
      fontWeight: FontWeight.BOLD,
      margin: { top: 14, bottom: 14 }
    },
    isBlockElement: true
  },
  h5: {
    name: 'h5',
    style: {
      fontSize: 13,
      fontWeight: FontWeight.BOLD,
      margin: { top: 12, bottom: 12 }
    },
    isBlockElement: true
  },
  h6: {
    name: 'h6',
    style: {
      fontSize: 11,
      fontWeight: FontWeight.BOLD,
      margin: { top: 10, bottom: 10 }
    },
    isBlockElement: true
  }
};

/**
 * 颜色工具函数
 */
export class ColorUtils {
  /**
   * 从十六进制字符串创建颜色
   */
  static fromHex(hex: string): Color {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const a = cleanHex.length === 8 ? 
      parseInt(cleanHex.substring(6, 8), 16) / 255 : 1;
    
    return { r, g, b, a };
  }

  /**
   * 从RGB值创建颜色
   */
  static fromRGB(r: number, g: number, b: number, a: number = 1): Color {
    return { r, g, b, a };
  }

  /**
   * 从HSL值创建颜色
   */
  static fromHSL(h: number, s: number, l: number, a: number = 1): Color {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a
    };
  }

  /**
   * 转换为CSS颜色字符串
   */
  static toCSSColor(color: Color): string {
    if (color.a === 1) {
      return `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  /**
   * 混合两个颜色
   */
  static blend(color1: Color, color2: Color, ratio: number): Color {
    const r1 = ratio;
    const r2 = 1 - ratio;

    return {
      r: Math.round(color1.r * r1 + color2.r * r2),
      g: Math.round(color1.g * r1 + color2.g * r2),
      b: Math.round(color1.b * r1 + color2.b * r2),
      a: color1.a * r1 + color2.a * r2
    };
  }
}

/**
 * 常用颜色预设
 */
export const Colors = {
  BLACK: ColorUtils.fromRGB(0, 0, 0),
  WHITE: ColorUtils.fromRGB(255, 255, 255),
  RED: ColorUtils.fromRGB(255, 0, 0),
  GREEN: ColorUtils.fromRGB(0, 255, 0),
  BLUE: ColorUtils.fromRGB(0, 0, 255),
  YELLOW: ColorUtils.fromRGB(255, 255, 0),
  CYAN: ColorUtils.fromRGB(0, 255, 255),
  MAGENTA: ColorUtils.fromRGB(255, 0, 255),
  TRANSPARENT: ColorUtils.fromRGB(0, 0, 0, 0),

  // 灰度
  GRAY_100: ColorUtils.fromRGB(245, 245, 245),
  GRAY_200: ColorUtils.fromRGB(229, 229, 229),
  GRAY_300: ColorUtils.fromRGB(209, 213, 219),
  GRAY_400: ColorUtils.fromRGB(156, 163, 175),
  GRAY_500: ColorUtils.fromRGB(107, 114, 128),
  GRAY_600: ColorUtils.fromRGB(75, 85, 99),
  GRAY_700: ColorUtils.fromRGB(55, 65, 81),
  GRAY_800: ColorUtils.fromRGB(31, 41, 55),
  GRAY_900: ColorUtils.fromRGB(17, 24, 39)
};