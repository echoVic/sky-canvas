import { IGraphicsContext, IGraphicsContextFactory, IPoint, IRect, ColorStyle, IImageData } from '@sky-canvas/render-engine';

/**
 * Canvas 2D 图形上下文实现
 */
export class Canvas2DGraphicsContext implements IGraphicsContext {
  public readonly width: number;
  public readonly height: number;

  constructor(private ctx: CanvasRenderingContext2D, private canvas: HTMLCanvasElement) {
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(color?: ColorStyle): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.ctx.clearRect(x, y, width, height);
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

  setStrokeStyle(style: ColorStyle): void {
    this.ctx.strokeStyle = style;
  }

  setFillStyle(style: ColorStyle): void {
    this.ctx.fillStyle = style;
  }

  setLineWidth(width: number): void {
    this.ctx.lineWidth = width;
  }

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void {
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

  drawImage(imageData: IImageData): void {
    const { source, sx = 0, sy = 0, sWidth, sHeight, dx = 0, dy = 0, dWidth, dHeight } = imageData;
    
    if (sWidth !== undefined && sHeight !== undefined && dWidth !== undefined && dHeight !== undefined) {
      this.ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    } else if (dWidth !== undefined && dHeight !== undefined) {
      this.ctx.drawImage(source, dx, dy, dWidth, dHeight);
    } else {
      this.ctx.drawImage(source, dx, dy);
    }
  }

  // Legacy methods for backward compatibility
  strokeRect(x: number, y: number, width: number, height: number): void {
    this.drawRect({ x, y, width, height }, false, true);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.drawRect({ x, y, width, height }, true, false);
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.drawCircle({ x, y }, radius, false, true);
  }

  fillCircle(x: number, y: number, radius: number): void {
    this.drawCircle({ x, y }, radius, true, false);
  }

  strokePath(points: IPoint[]): void {
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
  }

  fillPath(points: IPoint[]): void {
    if (points.length < 3) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawText(text: string, x: number, y: number, maxWidth?: number): void {
    this.ctx.fillText(text, x, y, maxWidth);
  }

  measureText(text: string): { width: number; height: number } {
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
  }

  setFont(font: string): void {
    this.ctx.font = font;
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  screenToWorld(point: IPoint): IPoint {
    // Canvas 2D 的屏幕坐标就是世界坐标
    return { ...point };
  }

  worldToScreen(point: IPoint): IPoint {
    // Canvas 2D 的世界坐标就是屏幕坐标
    return { ...point };
  }

  dispose(): void {
    // Canvas 2D context 不需要特殊清理
  }
}

/**
 * Canvas 2D 图形上下文工厂
 */
export class Canvas2DGraphicsContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  isSupported(): boolean {
    // 检查浏览器是否支持 Canvas 2D
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      return ctx !== null;
    } catch {
      return false;
    }
  }

  async createContext(canvas: HTMLCanvasElement): Promise<IGraphicsContext> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D rendering context');
    }

    // 设置高DPI支持
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    ctx.scale(dpr, dpr);

    return new Canvas2DGraphicsContext(ctx, canvas);
  }
}