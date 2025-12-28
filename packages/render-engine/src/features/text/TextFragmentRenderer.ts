/**
 * 文本片段渲染器
 */

import type {
  TextFragment,
  TextStyle,
  FillStyle,
  TextDecoration,
  TextTransform,
  TextAlign,
  VerticalAlign,
  ColorUtils
} from './types/RichTextTypes';
import { TextMeasurement } from './TextMeasurement';

// 导入 ColorUtils
import { ColorUtils as ColorUtilsImpl } from './types/RichTextTypes';

/**
 * 文本片段渲染器
 */
export class TextFragmentRenderer {
  private measurement: TextMeasurement;

  constructor(measurement: TextMeasurement) {
    this.measurement = measurement;
  }

  /**
   * 渲染单个文本片段
   */
  renderFragment(
    fragment: TextFragment,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    const style = fragment.style;

    this.setFont(ctx, style);

    let text = this.applyTextTransform(fragment.text, style);

    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity;
    }

    if (style.backgroundColor || style.backgroundFillStyle) {
      this.renderBackground(fragment, x, y, ctx);
    }

    if (style.shadow) {
      this.renderTextWithShadow(text, x, y, ctx, style);
    } else {
      this.renderTextFill(text, x, y, ctx, style);
    }

    if (style.strokeStyle) {
      this.renderTextStroke(text, x, y, ctx, style);
    }

    this.renderTextDecoration(fragment, x, y, ctx);

    if (style.opacity !== undefined) {
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 设置字体样式
   */
  setFont(ctx: CanvasRenderingContext2D, style: TextStyle | undefined): void {
    if (!style) {
      style = {};
    }

    const fontSize = style.fontSize || 16;
    const fontWeight = this.measurement.normalizeFontWeight(style.fontWeight || 'normal');
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
    const transform = style.textTransform;
    if (transform === 'uppercase') {
      return text.toUpperCase();
    } else if (transform === 'lowercase') {
      return text.toLowerCase();
    } else if (transform === 'capitalize') {
      return text.replace(/\b\w/g, char => char.toUpperCase());
    }
    return text;
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
      ctx.fillStyle = ColorUtilsImpl.toCSSColor(style.color);
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

    ctx.strokeStyle = ColorUtilsImpl.toCSSColor(stroke.color);
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

    ctx.shadowColor = ColorUtilsImpl.toCSSColor(shadow.color);
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blurRadius;

    this.renderTextFill(text, x, y, ctx, style);

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

    if (!decoration || decoration === 'none') {
      return;
    }

    const textWidth = this.measurement.measureFragmentWidth(fragment);
    const thickness = style.textDecorationThickness || Math.max(1, (style.fontSize || 16) * 0.05);
    const color = style.textDecorationColor || style.color;

    if (color) {
      ctx.strokeStyle = ColorUtilsImpl.toCSSColor(color);
    }
    ctx.lineWidth = thickness;

    ctx.beginPath();

    if (decoration === 'underline') {
      const underlineY = y + (style.fontSize || 16) * 0.1;
      ctx.moveTo(x, underlineY);
      ctx.lineTo(x + textWidth, underlineY);
    } else if (decoration === 'overline') {
      const overlineY = y - (style.fontSize || 16) * 0.8;
      ctx.moveTo(x, overlineY);
      ctx.lineTo(x + textWidth, overlineY);
    } else if (decoration === 'line-through') {
      const lineThroughY = y - (style.fontSize || 16) * 0.3;
      ctx.moveTo(x, lineThroughY);
      ctx.lineTo(x + textWidth, lineThroughY);
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
    const textWidth = this.measurement.measureFragmentWidth(fragment);
    const textHeight = this.measurement.getFragmentHeight(fragment);

    if (style.backgroundFillStyle) {
      this.setFillStyle(ctx, style.backgroundFillStyle);
    } else if (style.backgroundColor) {
      ctx.fillStyle = ColorUtilsImpl.toCSSColor(style.backgroundColor);
    }

    ctx.fillRect(x, y - textHeight * 0.8, textWidth, textHeight);
  }

  /**
   * 设置填充样式
   */
  private setFillStyle(ctx: CanvasRenderingContext2D, fillStyle: FillStyle): void {
    if ('r' in fillStyle) {
      ctx.fillStyle = ColorUtilsImpl.toCSSColor(fillStyle);
    } else if (fillStyle.type === 'linear') {
      const gradient = ctx.createLinearGradient(
        fillStyle.x0, fillStyle.y0,
        fillStyle.x1, fillStyle.y1
      );

      for (const stop of fillStyle.stops) {
        gradient.addColorStop(stop.offset, ColorUtilsImpl.toCSSColor(stop.color));
      }

      ctx.fillStyle = gradient;
    } else if (fillStyle.type === 'radial') {
      const gradient = ctx.createRadialGradient(
        fillStyle.x0, fillStyle.y0, fillStyle.r0,
        fillStyle.x1, fillStyle.y1, fillStyle.r1
      );

      for (const stop of fillStyle.stops) {
        gradient.addColorStop(stop.offset, ColorUtilsImpl.toCSSColor(stop.color));
      }

      ctx.fillStyle = gradient;
    }
  }

  /**
   * 转换文本对齐方式
   */
  private convertTextAlign(textAlign: TextAlign | string): CanvasTextAlign {
    if (textAlign === 'center') return 'center';
    if (textAlign === 'right') return 'right';
    if (textAlign === 'justify') return 'left';
    return 'left';
  }

  /**
   * 转换垂直对齐方式
   */
  private convertVerticalAlign(verticalAlign: VerticalAlign | string): CanvasTextBaseline {
    if (verticalAlign === 'top') return 'top';
    if (verticalAlign === 'middle') return 'middle';
    if (verticalAlign === 'bottom') return 'bottom';
    return 'alphabetic';
  }
}
