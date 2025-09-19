/**
 * Canvas2D上下文适配器
 * 将原生Canvas2D API适配到IGraphicsContext接口
 */
import {
  IColor,
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  IRect,
  ITextStyle,
  ITransform
} from '../interface/IGraphicsContext';

/**
 * Canvas2D上下文适配器类
 */
export class Canvas2DContext implements IGraphicsContext {
  public readonly width: number;
  public readonly height: number;
  public readonly devicePixelRatio: number;

  constructor(private ctx: CanvasRenderingContext2D) {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.devicePixelRatio = window.devicePixelRatio || 1;
  }

  // 状态管理
  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  getState(): IGraphicsState {
    const transform = this.ctx.getTransform();
    return {
      transform: {
        a: transform.a,
        b: transform.b,
        c: transform.c,
        d: transform.d,
        e: transform.e,
        f: transform.f
      },
      style: {
        fillColor: this.ctx.fillStyle as string,
        strokeColor: this.ctx.strokeStyle as string,
        lineWidth: this.ctx.lineWidth,
        opacity: this.ctx.globalAlpha
      }
    };
  }

  setState(state: Partial<IGraphicsState>): void {
    if (state.transform) {
      this.setTransform(state.transform);
    }
    if (state.style) {
      this.setStyle(state.style);
    }
  }

  // 变换操作
  setTransform(transform: ITransform): void {
    this.ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctx.transform(a, b, c, d, e, f);
  }

  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }

  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }

  scale(x: number, y: number): void {
    this.ctx.scale(x, y);
  }

  resetTransform(): void {
    this.ctx.resetTransform();
  }

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void {
    if (style.fillColor) {
      this.setFillColor(style.fillColor);
    }
    if (style.strokeColor) {
      this.setStrokeColor(style.strokeColor);
    }
    if (style.lineWidth) {
      this.setLineWidth(style.lineWidth);
    }
    if (style.opacity !== undefined) {
      this.setOpacity(style.opacity);
    }
    if (style.lineCap) {
      this.ctx.lineCap = style.lineCap;
    }
    if (style.lineJoin) {
      this.ctx.lineJoin = style.lineJoin;
    }
    if (style.shadowColor) {
      this.ctx.shadowColor = style.shadowColor as string;
    }
    if (style.shadowBlur) {
      this.ctx.shadowBlur = style.shadowBlur;
    }
    if (style.shadowOffsetX) {
      this.ctx.shadowOffsetX = style.shadowOffsetX;
    }
    if (style.shadowOffsetY) {
      this.ctx.shadowOffsetY = style.shadowOffsetY;
    }
  }

  setFillColor(color: IColor | string): void {
    this.ctx.fillStyle = this.convertColorToString(color);
  }

  setStrokeColor(color: IColor | string): void {
    this.ctx.strokeStyle = this.convertColorToString(color);
  }

  setFillStyle(color: IColor | string): void {
    this.setFillColor(color);
  }

  setStrokeStyle(color: IColor | string): void {
    this.setStrokeColor(color);
  }

  setLineWidth(width: number): void {
    this.ctx.lineWidth = width;
  }

  setOpacity(opacity: number): void {
    this.setGlobalAlpha(opacity);
  }

  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
  }

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    this.ctx.textAlign = align;
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    this.ctx.textBaseline = baseline;
  }

  setFont(font: string): void {
    this.ctx.font = font;
  }

  // 清除和渲染
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.ctx.clearRect(x, y, width, height);
  }

  present(): void {
    // Canvas2D 不需要显式提交，自动呈现
  }

  // 路径绘制
  beginPath(): void {
    this.ctx.beginPath();
  }

  closePath(): void {
    this.ctx.closePath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.ctx.quadraticCurveTo(cpx, cpy, x, y);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.ctx.rect(x, y, width, height);
  }

  // 绘制方法
  fill(): void {
    this.ctx.fill();
  }

  stroke(): void {
    this.ctx.stroke();
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.stroke();
  }

  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    if (stroke) {
      this.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  // 圆形绘制
  fillCircle(x: number, y: number, radius: number): void {
    this.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    this.fill();
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    this.stroke();
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    this.beginPath();
    this.arc(center.x, center.y, radius, 0, Math.PI * 2);
    if (fill) this.fill();
    if (stroke) this.stroke();
  }

  // 文本绘制
  fillText(text: string, x: number, y: number, style?: ITextStyle): void {
    if (style) {
      this.applyTextStyle(style);
    }
    this.ctx.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number, style?: ITextStyle): void {
    if (style) {
      this.applyTextStyle(style);
    }
    this.ctx.strokeText(text, x, y);
  }

  measureText(text: string, style?: ITextStyle): { width: number; height: number } {
    if (style) {
      this.applyTextStyle(style);
    }
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
  }

  // 图像操作
  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tempCtx = canvas.getContext('2d')!;
    tempCtx.putImageData(imageData as ImageData, 0, 0);

    if (dw !== undefined && dh !== undefined) {
      this.ctx.drawImage(canvas, dx, dy, dw, dh);
    } else {
      this.ctx.drawImage(canvas, dx, dy);
    }
  }

  getImageData(x: number, y: number, width: number, height: number): IImageData {
    return this.ctx.getImageData(x, y, width, height);
  }

  putImageData(imageData: IImageData, x: number, y: number): void {
    this.ctx.putImageData(imageData as ImageData, x, y);
  }

  // 裁剪
  clip(): void {
    this.ctx.clip();
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    this.beginPath();
    this.rect(x, y, width, height);
    this.clip();
  }

  // 坐标转换
  screenToWorld(point: IPoint): IPoint {
    const transform = this.ctx.getTransform().invertSelf();
    return {
      x: point.x * transform.a + point.y * transform.c + transform.e,
      y: point.x * transform.b + point.y * transform.d + transform.f
    };
  }

  worldToScreen(point: IPoint): IPoint {
    const transform = this.ctx.getTransform();
    return {
      x: point.x * transform.a + point.y * transform.c + transform.e,
      y: point.x * transform.b + point.y * transform.d + transform.f
    };
  }

  // 资源管理
  dispose(): void {
    // Canvas2D 不需要显式资源释放
  }

  // 私有辅助方法
  private convertColorToString(color: IColor | string): string {
    if (typeof color === 'string') {
      return color;
    }
    // 将 IColor 对象转换为 CSS 颜色字符串
    const { r, g, b, a = 1 } = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  private applyTextStyle(style: ITextStyle): void {
    if (style.fontFamily || style.fontSize || style.fontWeight || style.fontStyle) {
      const fontSize = style.fontSize || 16;
      const fontWeight = style.fontWeight || 'normal';
      const fontStyle = style.fontStyle || 'normal';
      const fontFamily = style.fontFamily || 'sans-serif';
      this.setFont(`${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`);
    }
    if (style.textAlign) {
      this.setTextAlign(style.textAlign);
    }
    if (style.textBaseline) {
      this.setTextBaseline(style.textBaseline);
    }
    if (style.fillColor) {
      this.setFillColor(style.fillColor);
    }
    if (style.strokeColor) {
      this.setStrokeColor(style.strokeColor);
    }
    if (style.opacity !== undefined) {
      this.setOpacity(style.opacity);
    }
  }
}

// 静态方法用于创建和检查支持
export namespace Canvas2DContext {
  export function create(canvas: HTMLCanvasElement): Canvas2DContext {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create Canvas2D context');
    }
    return new Canvas2DContext(ctx);
  }

  export function isSupported(): boolean {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('2d');
  }

  export function getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: false,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    };
  }
}