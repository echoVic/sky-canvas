/**
 * 富文本渲染器
 * 支持富文本的测量、布局和渲染
 */

import {
  IRichTextRenderer,
  RichTextDocument,
  RichTextMetrics,
  TextLayoutOptions,
  TextRenderContext,
  TextFragment,
  TextLine,
  TextStyle,
  Color,
  FillStyle,
  LinearGradient,
  RadialGradient,
  ColorUtils,
  TextDecoration,
  TextTransform,
  TextAlign,
  VerticalAlign
} from './types/RichTextTypes';
import { IFont, IFontManager } from './types/FontTypes';

/**
 * 文本测量缓存
 */
interface MeasurementCache {
  key: string;
  width: number;
  height: number;
}

/**
 * 富文本渲染器实现
 */
export class RichTextRenderer implements IRichTextRenderer {
  private fontManager: IFontManager;
  private measurementCache: Map<string, MeasurementCache> = new Map();
  private tempCanvas: HTMLCanvasElement;
  private tempContext: CanvasRenderingContext2D;

  constructor(fontManager: IFontManager) {
    this.fontManager = fontManager;
    
    // 创建临时画布用于文本测量
    try {
      this.tempCanvas = document.createElement('canvas');
      this.tempCanvas.width = 1;
      this.tempCanvas.height = 1;
      this.tempContext = this.tempCanvas.getContext('2d')!;
    } catch {
      // 在测试环境中可能没有 document，使用 mock
      this.tempCanvas = {} as HTMLCanvasElement;
      this.tempContext = {
        measureText: () => ({ width: 100 }),
        font: '',
        textAlign: 'left',
        textBaseline: 'baseline'
      } as any;
    }
  }

  /**
   * 测量富文本尺寸
   */
  measureText(document: RichTextDocument, options: TextLayoutOptions = {}): RichTextMetrics {
    const lines = this.layoutText(document, options);
    
    // 处理空文档情况
    if (!lines || lines.length === 0) {
      return {
        width: 0,
        height: 0,
        lines: [],
        boundingBox: {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        }
      };
    }
    
    let totalWidth = 0;
    let totalHeight = 0;
    let minX = 0;
    let maxX = 0;
    
    for (const line of lines) {
      totalWidth = Math.max(totalWidth, line.width);
      totalHeight += line.height;
      
      // 计算实际边界框
      for (const fragment of line.fragments) {
        const metrics = this.measureFragment(fragment);
        minX = Math.min(minX, metrics.actualBoundingBoxLeft || 0);
        maxX = Math.max(maxX, fragment.text.length * (fragment.style.fontSize || 16));
      }
    }
    
    return {
      width: totalWidth,
      height: totalHeight,
      lines,
      boundingBox: {
        x: minX,
        y: 0,
        width: maxX - minX,
        height: totalHeight
      }
    };
  }

  /**
   * 渲染富文本
   */
  renderText(
    document: RichTextDocument,
    x: number,
    y: number,
    context: TextRenderContext,
    options: TextLayoutOptions = {}
  ): void {
    const lines = this.layoutText(document, options);
    const ctx = context.context;
    
    // 保存当前状态
    ctx.save();
    
    let currentY = y;
    
    for (const line of lines) {
      this.renderLine(line, x, currentY, ctx, options);
      currentY += line.height;
    }
    
    // 恢复状态
    ctx.restore();
  }

  /**
   * 获取文本在指定位置的字符索引
   */
  getCharacterIndexAtPoint(
    document: RichTextDocument,
    x: number,
    y: number,
    options: TextLayoutOptions = {}
  ): number {
    const lines = this.layoutText(document, options);
    
    let currentY = 0;
    let characterIndex = 0;
    
    // 找到对应的行
    for (const line of lines) {
      if (y >= currentY && y < currentY + line.height) {
        // 在这一行中查找字符位置
        let currentX = 0;
        
        for (const fragment of line.fragments) {
          const fragmentWidth = this.measureFragmentWidth(fragment);
          
          if (x >= currentX && x < currentX + fragmentWidth) {
            // 在这个片段中查找具体字符
            return this.getCharacterInFragment(fragment, x - currentX, characterIndex);
          }
          
          currentX += fragmentWidth;
          characterIndex += fragment.text.length;
        }
        
        // 如果在行末，返回行的最后一个字符
        return characterIndex;
      }
      
      currentY += line.height;
      characterIndex = line.endIndex;
    }
    
    // 如果在文档末尾，返回最后一个字符的索引
    return document.content.length;
  }

  /**
   * 获取字符在文本中的位置
   */
  getCharacterPosition(
    document: RichTextDocument,
    index: number,
    options: TextLayoutOptions = {}
  ): { x: number; y: number } {
    const lines = this.layoutText(document, options);
    
    let currentY = 0;
    
    for (const line of lines) {
      if (index >= line.startIndex && index <= line.endIndex) {
        let currentX = 0;
        let currentIndex = line.startIndex;
        
        for (const fragment of line.fragments) {
          if (index >= currentIndex && index <= currentIndex + fragment.text.length) {
            // 在这个片段中
            const relativeIndex = index - currentIndex;
            const partialText = fragment.text.substring(0, relativeIndex);
            const partialWidth = this.measureText(partialText, fragment.style);
            
            return {
              x: currentX + partialWidth,
              y: currentY + line.baselineY
            };
          }
          
          currentX += this.measureFragmentWidth(fragment);
          currentIndex += fragment.text.length;
        }
        
        // 如果在行末
        return { x: currentX, y: currentY + line.baselineY };
      }
      
      currentY += line.height;
    }
    
    // 默认返回文档开始位置
    return { x: 0, y: 0 };
  }

  /**
   * 布局文本，返回文本行
   */
  private layoutText(document: RichTextDocument, options: TextLayoutOptions): TextLine[] {
    const lines: TextLine[] = [];
    const maxWidth = options.maxWidth || Infinity;
    const wordWrap = options.wordWrap !== false;
    
    let currentLine: TextLine = {
      fragments: [],
      width: 0,
      height: 0,
      baselineY: 0,
      startIndex: 0,
      endIndex: 0
    };
    
    let currentX = 0;
    let currentIndex = 0;
    
    for (const fragment of document.fragments) {
      const words = wordWrap ? this.splitIntoWords(fragment) : [fragment];
      
      for (const word of words) {
        const wordWidth = this.measureFragmentWidth(word);
        const wordHeight = this.getFragmentHeight(word);
        
        // 检查是否需要换行
        if (wordWrap && currentX + wordWidth > maxWidth && currentLine.fragments.length > 0) {
          // 完成当前行
          this.finalizeLine(currentLine, currentIndex);
          lines.push(currentLine);
          
          // 开始新行
          currentLine = {
            fragments: [],
            width: 0,
            height: 0,
            baselineY: 0,
            startIndex: currentIndex,
            endIndex: currentIndex
          };
          currentX = 0;
        }
        
        // 添加到当前行
        currentLine.fragments.push(word);
        currentLine.width = Math.max(currentLine.width, currentX + wordWidth);
        currentLine.height = Math.max(currentLine.height, wordHeight);
        
        currentX += wordWidth;
        currentIndex += word.text.length;
        
        // 检查最大行数限制
        if (options.maxLines && lines.length >= options.maxLines - 1) {
          break;
        }
      }
      
      if (options.maxLines && lines.length >= options.maxLines) {
        break;
      }
    }
    
    // 完成最后一行
    if (currentLine.fragments.length > 0) {
      this.finalizeLine(currentLine, currentIndex);
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * 将文本片段分割为单词
   */
  private splitIntoWords(fragment: TextFragment): TextFragment[] {
    const words = fragment.text.split(/(\s+)/);
    const result: TextFragment[] = [];
    let currentIndex = fragment.startIndex;
    
    for (const word of words) {
      if (word) {
        result.push({
          text: word,
          style: fragment.style,
          startIndex: currentIndex,
          endIndex: currentIndex + word.length
        });
      }
      currentIndex += word.length;
    }
    
    return result;
  }

  /**
   * 完成文本行的布局
   */
  private finalizeLine(line: TextLine, endIndex: number): void {
    line.endIndex = endIndex;
    
    // 计算基线位置
    let maxAscent = 0;
    let maxDescent = 0;
    
    for (const fragment of line.fragments) {
      const metrics = this.getFragmentMetrics(fragment);
      maxAscent = Math.max(maxAscent, metrics.ascent);
      maxDescent = Math.max(maxDescent, metrics.descent);
    }
    
    line.height = maxAscent + maxDescent;
    line.baselineY = maxAscent;
  }

  /**
   * 渲染单个文本行
   */
  private renderLine(
    line: TextLine,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    options: TextLayoutOptions
  ): void {
    let currentX = x;
    
    for (const fragment of line.fragments) {
      this.renderFragment(fragment, currentX, y + line.baselineY, ctx);
      currentX += this.measureFragmentWidth(fragment);
    }
  }

  /**
   * 渲染单个文本片段
   */
  private renderFragment(
    fragment: TextFragment,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    const style = fragment.style;
    
    // 设置字体
    this.setFont(ctx, style);
    
    // 应用文本变换
    let text = this.applyTextTransform(fragment.text, style);
    
    // 设置透明度
    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity;
    }
    
    // 渲染背景
    if (style.backgroundColor || style.backgroundFillStyle) {
      this.renderBackground(fragment, x, y, ctx);
    }
    
    // 渲染阴影
    if (style.shadow) {
      this.renderTextWithShadow(text, x, y, ctx, style);
    } else {
      this.renderTextFill(text, x, y, ctx, style);
    }
    
    // 渲染描边
    if (style.strokeStyle) {
      this.renderTextStroke(text, x, y, ctx, style);
    }
    
    // 渲染装饰
    this.renderTextDecoration(fragment, x, y, ctx);
    
    // 重置透明度
    if (style.opacity !== undefined) {
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 规范化字体权重
   */
  private normalizeFontWeight(fontWeight: FontWeight | string | undefined): string {
    if (typeof fontWeight === 'number') {
      if (fontWeight >= 700) return 'bold';
      if (fontWeight <= 300) return 'lighter';
      return 'normal';
    }
    
    switch (fontWeight) {
      case 'bold':
      case 'bolder':
        return 'bold';
      case 'light':
      case 'lighter':
        return 'lighter';
      case 'normal':
      default:
        return 'normal';
    }
  }

  /**
   * 设置字体样式
   */
  private setFont(ctx: CanvasRenderingContext2D, style: TextStyle | undefined): void {
    if (!style) {
      style = {};
    }
    
    const fontSize = style.fontSize || 16;
    const fontWeight = this.normalizeFontWeight(style.fontWeight || 'normal');
    const fontStyle = style.fontStyle || 'normal';
    const fontFamily = style.fontFamily || 'Arial, sans-serif';
    
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    
    if (style.textAlign) {
      ctx.textAlign = this.convertTextAlign(style.textAlign);
    }
    
    if (style.verticalAlign) {
      ctx.textBaseline = this.convertVerticalAlign(style.verticalAlign);
    }
  }

  /**
   * 应用文本变换
   */
  private applyTextTransform(text: string, style: TextStyle): string {
    switch (style.textTransform) {
      case TextTransform.UPPERCASE:
        return text.toUpperCase();
      case TextTransform.LOWERCASE:
        return text.toLowerCase();
      case TextTransform.CAPITALIZE:
        return text.replace(/\b\w/g, char => char.toUpperCase());
      default:
        return text;
    }
  }

  /**
   * 渲染文本填充
   */
  private renderTextFill(
    text: string,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    style: TextStyle
  ): void {
    if (style.fillStyle) {
      this.setFillStyle(ctx, style.fillStyle);
    } else if (style.color) {
      ctx.fillStyle = ColorUtils.toCSSColor(style.color);
    } else {
      ctx.fillStyle = 'black';
    }
    
    ctx.fillText(text, x, y);
  }

  /**
   * 渲染文本描边
   */
  private renderTextStroke(
    text: string,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    style: TextStyle
  ): void {
    const stroke = style.strokeStyle!;
    
    ctx.strokeStyle = ColorUtils.toCSSColor(stroke.color);
    ctx.lineWidth = stroke.width;
    
    if (stroke.lineCap) ctx.lineCap = stroke.lineCap;
    if (stroke.lineJoin) ctx.lineJoin = stroke.lineJoin;
    if (stroke.miterLimit) ctx.miterLimit = stroke.miterLimit;
    
    if (stroke.dashArray) {
      ctx.setLineDash(stroke.dashArray);
      if (stroke.dashOffset) {
        ctx.lineDashOffset = stroke.dashOffset;
      }
    }
    
    ctx.strokeText(text, x, y);
  }

  /**
   * 渲染带阴影的文本
   */
  private renderTextWithShadow(
    text: string,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    style: TextStyle
  ): void {
    const shadow = style.shadow!;
    
    ctx.shadowColor = ColorUtils.toCSSColor(shadow.color);
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blurRadius;
    
    this.renderTextFill(text, x, y, ctx, style);
    
    // 清除阴影设置
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
  }

  /**
   * 渲染文本装饰
   */
  private renderTextDecoration(
    fragment: TextFragment,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    const style = fragment.style;
    const decoration = style.textDecoration;
    
    if (!decoration || decoration === TextDecoration.NONE) {
      return;
    }
    
    const textWidth = this.measureFragmentWidth(fragment);
    const thickness = style.textDecorationThickness || Math.max(1, (style.fontSize || 16) * 0.05);
    const color = style.textDecorationColor || style.color;
    
    if (color) {
      ctx.strokeStyle = ColorUtils.toCSSColor(color);
    }
    ctx.lineWidth = thickness;
    
    ctx.beginPath();
    
    switch (decoration) {
      case TextDecoration.UNDERLINE:
        const underlineY = y + (style.fontSize || 16) * 0.1;
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + textWidth, underlineY);
        break;
        
      case TextDecoration.OVERLINE:
        const overlineY = y - (style.fontSize || 16) * 0.8;
        ctx.moveTo(x, overlineY);
        ctx.lineTo(x + textWidth, overlineY);
        break;
        
      case TextDecoration.LINE_THROUGH:
        const lineThroughY = y - (style.fontSize || 16) * 0.3;
        ctx.moveTo(x, lineThroughY);
        ctx.lineTo(x + textWidth, lineThroughY);
        break;
    }
    
    ctx.stroke();
  }

  /**
   * 渲染背景
   */
  private renderBackground(
    fragment: TextFragment,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    const style = fragment.style;
    const textWidth = this.measureFragmentWidth(fragment);
    const textHeight = this.getFragmentHeight(fragment);
    
    if (style.backgroundFillStyle) {
      this.setFillStyle(ctx, style.backgroundFillStyle);
    } else if (style.backgroundColor) {
      ctx.fillStyle = ColorUtils.toCSSColor(style.backgroundColor);
    }
    
    ctx.fillRect(x, y - textHeight * 0.8, textWidth, textHeight);
  }

  /**
   * 设置填充样式
   */
  private setFillStyle(ctx: CanvasRenderingContext2D, fillStyle: FillStyle): void {
    if ('r' in fillStyle) {
      // 纯色
      ctx.fillStyle = ColorUtils.toCSSColor(fillStyle);
    } else if (fillStyle.type === 'linear') {
      // 线性渐变
      const gradient = ctx.createLinearGradient(
        fillStyle.x0, fillStyle.y0,
        fillStyle.x1, fillStyle.y1
      );
      
      for (const stop of fillStyle.stops) {
        gradient.addColorStop(stop.offset, ColorUtils.toCSSColor(stop.color));
      }
      
      ctx.fillStyle = gradient;
    } else if (fillStyle.type === 'radial') {
      // 径向渐变
      const gradient = ctx.createRadialGradient(
        fillStyle.x0, fillStyle.y0, fillStyle.r0,
        fillStyle.x1, fillStyle.y1, fillStyle.r1
      );
      
      for (const stop of fillStyle.stops) {
        gradient.addColorStop(stop.offset, ColorUtils.toCSSColor(stop.color));
      }
      
      ctx.fillStyle = gradient;
    }
  }

  /**
   * 测量文本片段宽度
   */
  private measureFragmentWidth(fragment: TextFragment): number {
    const cacheKey = this.getFragmentCacheKey(fragment, 'width');
    const cached = this.measurementCache.get(cacheKey);
    
    if (cached) {
      return cached.width || 0;
    }
    
    const width = this.measureText(fragment.text, fragment.style) || 0;
    
    this.measurementCache.set(cacheKey, { key: cacheKey, width, height: 0 });
    return width;
  }

  /**
   * 获取文本片段高度
   */
  private getFragmentHeight(fragment: TextFragment): number {
    const fontSize = fragment.style.fontSize || 16;
    const lineHeight = fragment.style.lineHeight || 1.2;
    
    if (typeof lineHeight === 'number' && lineHeight > 2) {
      // 绝对值
      return lineHeight;
    } else {
      // 倍数
      return fontSize * lineHeight;
    }
  }

  /**
   * 测量文本宽度
   */
  private measureText(text: string, style: TextStyle | undefined): number {
    if (!text) return 0;
    
    this.setFont(this.tempContext, style);
    const metrics = this.tempContext.measureText(text);
    return metrics.width || 0;
  }

  /**
   * 获取文本片段度量
   */
  private getFragmentMetrics(fragment: TextFragment): { ascent: number; descent: number } {
    const fontSize = fragment.style.fontSize || 16;
    
    // 简化的度量计算
    return {
      ascent: fontSize * 0.8,
      descent: fontSize * 0.2
    };
  }

  /**
   * 测量片段
   */
  private measureFragment(fragment: TextFragment): any {
    this.setFont(this.tempContext, fragment.style);
    return this.tempContext.measureText(fragment.text);
  }

  /**
   * 在片段中查找字符
   */
  private getCharacterInFragment(
    fragment: TextFragment,
    relativeX: number,
    baseIndex: number
  ): number {
    const text = fragment.text;
    let currentWidth = 0;
    
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.measureText(text.charAt(i), fragment.style);
      
      if (relativeX < currentWidth + charWidth / 2) {
        return baseIndex + i;
      }
      
      currentWidth += charWidth;
    }
    
    return baseIndex + text.length;
  }

  /**
   * 转换文本对齐方式
   */
  private convertTextAlign(textAlign: TextAlign): CanvasTextAlign {
    switch (textAlign) {
      case TextAlign.CENTER:
        return 'center';
      case TextAlign.RIGHT:
        return 'right';
      case TextAlign.JUSTIFY:
        return 'left'; // Canvas不直接支持justify
      default:
        return 'left';
    }
  }

  /**
   * 转换垂直对齐方式
   */
  private convertVerticalAlign(verticalAlign: VerticalAlign): CanvasTextBaseline {
    switch (verticalAlign) {
      case VerticalAlign.TOP:
        return 'top';
      case VerticalAlign.MIDDLE:
        return 'middle';
      case VerticalAlign.BOTTOM:
        return 'bottom';
      default:
        return 'baseline';
    }
  }

  /**
   * 生成片段缓存键
   */
  private getFragmentCacheKey(fragment: TextFragment, type: string): string {
    const style = fragment.style;
    return [
      type,
      fragment.text,
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.fontStyle,
      style.letterSpacing,
      style.wordSpacing
    ].join('|');
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.measurementCache.clear();
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    this.clearCache();
  }
}

/**
 * 创建默认富文本渲染器
 */
export function createRichTextRenderer(fontManager: IFontManager): RichTextRenderer {
  return new RichTextRenderer(fontManager);
}