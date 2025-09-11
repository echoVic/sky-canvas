/**
 * Canvas 2D图形上下文实现 (占位符)
 * TODO: 未来实现完整的Canvas 2D渲染功能
 */
import { IGraphicsCapabilities, IGraphicsContext, IGraphicsContextFactory, IImageData, IPoint } from '../graphics/IGraphicsContext';

export interface ICanvas2DContext extends IGraphicsContext {
  readonly ctx: CanvasRenderingContext2D;
  
  // Canvas 2D特有方法
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
}

/**
 * Canvas 2D上下文工厂
 */
export class Canvas2DContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      return ctx !== null;
    } catch {
      return false;
    }
  }

  async createContext(canvas: HTMLCanvasElement): Promise<ICanvas2DContext> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D not supported');
    }

    return new Canvas2DContext(ctx, canvas);
  }

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: false,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpeg', 'webp', 'svg']
    };
  }
}

/**
 * Canvas 2D上下文实现 (占位符)
 */
class Canvas2DContext implements ICanvas2DContext {
  public readonly width: number;
  public readonly height: number;
  public readonly devicePixelRatio: number = window.devicePixelRatio || 1;
  public readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }

  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }

  scale(scaleX: number, scaleY: number): void {
    this.ctx.scale(scaleX, scaleY);
  }

  setOpacity(opacity: number): void {
    this.ctx.globalAlpha = opacity;
  }

  // Canvas 2D特有方法
  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  screenToWorld(point: IPoint): IPoint {
    // Canvas 2D坐标系直接对应
    return { ...point };
  }

  worldToScreen(point: IPoint): IPoint {
    return { ...point };
  }

  // 缺失的接口方法实现
  setStrokeStyle(style: string): void {
    this.ctx.strokeStyle = style;
  }

  setFillStyle(style: string): void {
    this.ctx.fillStyle = style;
  }

  setLineWidth(width: number): void {
    this.ctx.lineWidth = width;
  }

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
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

  drawRect(rect: { x: number; y: number; width: number; height: number }, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    if (stroke) {
      this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    if (fill) {
      this.ctx.fill();
    }
    if (stroke) {
      this.ctx.stroke();
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    // 占位符实现
    console.warn('drawImage not fully implemented in Canvas2DContext');
  }

  // 添加缺失的接口方法
  getState(): any {
    return {}; // 占位符实现
  }

  setState(state: any): void {
    // 占位符实现
  }

  setTransform(transform: any): void {
    this.ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctx.transform(a, b, c, d, e, f);
  }

  resetTransform(): void {
    this.ctx.resetTransform();
  }

  setStyle(style: any): void {
    // 占位符实现
  }

  setFillColor(color: any): void {
    this.ctx.fillStyle = typeof color === 'string' ? color : `rgba(${color.r},${color.g},${color.b},${color.a || 1})`;
  }

  setStrokeColor(color: any): void {
    this.ctx.strokeStyle = typeof color === 'string' ? color : `rgba(${color.r},${color.g},${color.b},${color.a || 1})`;
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.ctx.clearRect(x, y, width, height);
  }

  present(): void {
    // Canvas 2D不需要显式提交
  }

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

  fill(): void {
    this.ctx.fill();
  }

  stroke(): void {
    this.ctx.stroke();
  }

  fillCircle(x: number, y: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  fillText(text: string, x: number, y: number, style?: any): void {
    this.ctx.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number, style?: any): void {
    this.ctx.strokeText(text, x, y);
  }

  measureText(text: string, style?: any): { width: number; height: number } {
    const metrics = this.ctx.measureText(text);
    return { width: metrics.width, height: 12 }; // 简化实现
  }

  getImageData(x: number, y: number, width: number, height: number): any {
    return this.ctx.getImageData(x, y, width, height);
  }

  putImageData(imageData: any, x: number, y: number): void {
    this.ctx.putImageData(imageData, x, y);
  }

  clip(): void {
    this.ctx.clip();
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }



  dispose(): void {
    // Canvas 2D不需要特殊清理
  }
}
