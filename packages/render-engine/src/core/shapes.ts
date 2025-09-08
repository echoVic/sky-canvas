import { IPoint, IRect } from '../graphics/IGraphicsContext';
import { Transform, Vector2 } from '../math';
import { Drawable, RenderState, RenderContext } from './index';

/**
 * 基础图形抽象类
 */
export abstract class Shape implements Drawable {
  public id: string;
  public visible: boolean = true;
  public zIndex: number = 0;
  public transform: Transform;
  protected _bounds: IRect;
  protected _style: Partial<RenderState>;

  constructor(id: string, bounds: IRect, style?: Partial<RenderState>) {
    this.id = id;
    this._bounds = { ...bounds };
    this.transform = new Transform();
    this._style = style || {};
  }

  get bounds(): IRect {
    return { ...this._bounds };
  }

  set bounds(value: IRect) {
    this._bounds = { ...value };
  }

  getBounds(): IRect {
    // 应用变换后的边界框
    const corners = [
      new Vector2(this._bounds.x, this._bounds.y),
      new Vector2(this._bounds.x + this._bounds.width, this._bounds.y),
      new Vector2(this._bounds.x + this._bounds.width, this._bounds.y + this._bounds.height),
      new Vector2(this._bounds.x, this._bounds.y + this._bounds.height)
    ];

    const transformedCorners = this.transform.transformPoints(corners);
    
    let minX = transformedCorners[0].x;
    let minY = transformedCorners[0].y;
    let maxX = transformedCorners[0].x;
    let maxY = transformedCorners[0].y;

    for (const corner of transformedCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  setTransform(transform: Transform): void {
    this.transform = transform;
  }

  setStyle(style: Partial<RenderState>): void {
    this._style = { ...this._style, ...style };
  }

  hitTest(point: IPoint): boolean {
    // 将点变换到局部坐标系
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));
    return localPoint.x >= this._bounds.x && 
           localPoint.x <= this._bounds.x + this._bounds.width &&
           localPoint.y >= this._bounds.y && 
           localPoint.y <= this._bounds.y + this._bounds.height;
  }

  abstract draw(context: RenderContext): void;

  protected applyStyle(ctx: CanvasRenderingContext2D): void {
    if (this._style.fillStyle) ctx.fillStyle = this._style.fillStyle;
    if (this._style.strokeStyle) ctx.strokeStyle = this._style.strokeStyle;
    if (this._style.lineWidth !== undefined) ctx.lineWidth = this._style.lineWidth;
    if (this._style.lineCap) ctx.lineCap = this._style.lineCap;
    if (this._style.lineJoin) ctx.lineJoin = this._style.lineJoin;
    if (this._style.globalAlpha !== undefined) ctx.globalAlpha = this._style.globalAlpha;
    if (this._style.globalCompositeOperation) ctx.globalCompositeOperation = this._style.globalCompositeOperation;
    if (this._style.shadowColor) ctx.shadowColor = this._style.shadowColor;
    if (this._style.shadowBlur !== undefined) ctx.shadowBlur = this._style.shadowBlur;
    if (this._style.shadowOffsetX !== undefined) ctx.shadowOffsetX = this._style.shadowOffsetX;
    if (this._style.shadowOffsetY !== undefined) ctx.shadowOffsetY = this._style.shadowOffsetY;
  }
}

/**
 * 矩形图形
 */
export class Rectangle extends Shape {
  public filled: boolean;

  constructor(id: string, x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>) {
    super(id, { x, y, width, height }, style);
    this.filled = filled;
  }

  draw(context: RenderContext): void {
    // Only handle Canvas2D context for now
    if (!context.ctx || typeof (context.ctx as any).save !== 'function') {
      console.warn('Rectangle.draw: Canvas2D context required');
      return;
    }
    const ctx = context.ctx as CanvasRenderingContext2D;
    ctx.save();
    
    this.applyStyle(ctx);
    
    if (this.filled) {
      ctx.fillRect(this._bounds.x, this._bounds.y, this._bounds.width, this._bounds.height);
    } else {
      ctx.strokeRect(this._bounds.x, this._bounds.y, this._bounds.width, this._bounds.height);
    }
    
    ctx.restore();
  }
}

/**
 * 圆形图形
 */
export class Circle extends Shape {
  public radius: number;
  public filled: boolean;

  constructor(id: string, centerX: number, centerY: number, radius: number, filled = false, style?: Partial<RenderState>) {
    super(id, { 
      x: centerX - radius, 
      y: centerY - radius, 
      width: radius * 2, 
      height: radius * 2 
    }, style);
    this.radius = radius;
    this.filled = filled;
  }

  get center(): IPoint {
    return {
      x: this._bounds.x + this.radius,
      y: this._bounds.y + this.radius
    };
  }

  draw(context: RenderContext): void {
    // Only handle Canvas2D context for now
    if (!context.ctx || typeof (context.ctx as any).save !== 'function') {
      console.warn('Circle.draw: Canvas2D context required');
      return;
    }
    const ctx = context.ctx as CanvasRenderingContext2D;
    ctx.save();
    
    this.applyStyle(ctx);
    
    const center = this.center;
    ctx.beginPath();
    ctx.arc(center.x, center.y, this.radius, 0, Math.PI * 2);
    
    if (this.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    
    ctx.restore();
  }

  hitTest(point: IPoint): boolean {
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));
    const center = this.center;
    const distance = Math.sqrt(
      Math.pow(localPoint.x - center.x, 2) + 
      Math.pow(localPoint.y - center.y, 2)
    );
    return distance <= this.radius;
  }
}

/**
 * 线段图形
 */
export class Line extends Shape {
  public start: IPoint;
  public end: IPoint;

  constructor(id: string, start: IPoint, end: IPoint, style?: Partial<RenderState>) {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    
    super(id, { 
      x: minX, 
      y: minY, 
      width: maxX - minX, 
      height: maxY - minY 
    }, style);
    
    this.start = { ...start };
    this.end = { ...end };
  }

  draw(context: RenderContext): void {
    // Only handle Canvas2D context for now
    if (!context.ctx || typeof (context.ctx as any).save !== 'function') {
      console.warn('Line.draw: Canvas2D context required');
      return;
    }
    const ctx = context.ctx as CanvasRenderingContext2D;
    ctx.save();
    
    this.applyStyle(ctx);
    
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
    
    ctx.restore();
  }

  hitTest(point: IPoint): boolean {
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));
    
    // 计算点到线段的距离
    const A = localPoint.x - this.start.x;
    const B = localPoint.y - this.start.y;
    const C = this.end.x - this.start.x;
    const D = this.end.y - this.start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return false;
    
    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = this.start.x;
      yy = this.start.y;
    } else if (param > 1) {
      xx = this.end.x;
      yy = this.end.y;
    } else {
      xx = this.start.x + param * C;
      yy = this.start.y + param * D;
    }

    const dx = localPoint.x - xx;
    const dy = localPoint.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 使用线宽作为命中测试的阈值
    const threshold = (this._style.lineWidth || 1) / 2 + 2;
    return distance <= threshold;
  }
}

/**
 * 文本图形
 */
export class Text extends Shape {
  public text: string;
  public font: string;
  public textAlign: CanvasTextAlign;
  public textBaseline: CanvasTextBaseline;

  constructor(
    id: string, 
    text: string, 
    x: number, 
    y: number, 
    font = '16px Arial',
    style?: Partial<RenderState>
  ) {
    // 估算文本边界框
    const estimatedWidth = text.length * 10; // 粗略估算
    const estimatedHeight = 20;
    
    super(id, { x, y, width: estimatedWidth, height: estimatedHeight }, style);
    
    this.text = text;
    this.font = font;
    this.textAlign = 'left';
    this.textBaseline = 'top';
  }

  draw(context: RenderContext): void {
    // Only handle Canvas2D context for now
    if (!context.ctx || typeof (context.ctx as any).save !== 'function') {
      console.warn('Text.draw: Canvas2D context required');
      return;
    }
    const ctx = context.ctx as CanvasRenderingContext2D;
    ctx.save();
    
    this.applyStyle(ctx);
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    
    ctx.fillText(this.text, this._bounds.x, this._bounds.y);
    
    ctx.restore();
  }

  // 更新文本边界框
  updateBounds(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = this.font;
    const metrics = ctx.measureText(this.text);
    this._bounds.width = metrics.width;
    this._bounds.height = parseInt(this.font) || 16; // 从字体大小提取高度
    ctx.restore();
  }
}
