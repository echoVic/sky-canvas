/**
 * Canvas 2D图形上下文实现 (占位符)
 * TODO: 未来实现完整的Canvas 2D渲染功能
 */
import { IGraphicsContext, IGraphicsContextFactory, IPoint } from '../core/IGraphicsContext';

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
}

/**
 * Canvas 2D上下文实现 (占位符)
 */
class Canvas2DContext implements ICanvas2DContext {
  public readonly width: number;
  public readonly height: number;
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

  drawLine(from: IPoint, to: IPoint): void {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  drawImage(imageData: { source: any; dx?: number; dy?: number; dWidth?: number; dHeight?: number }): void {
    const { source, dx = 0, dy = 0, dWidth, dHeight } = imageData;
    if (dWidth !== undefined && dHeight !== undefined) {
      this.ctx.drawImage(source, dx, dy, dWidth, dHeight);
    } else {
      this.ctx.drawImage(source, dx, dy);
    }
  }

  dispose(): void {
    // Canvas 2D不需要特殊清理
  }
}
