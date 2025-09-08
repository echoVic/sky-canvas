/**
 * 圆形形状实现
 */
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType, IShapeUpdate, IShapeData } from './IShape';

/**
 * 圆形形状类
 */
export class CircleShape implements IShape {
  readonly id: string;
  readonly type: ShapeType = 'circle';
  
  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  public selected: boolean = false;
  public locked: boolean = false;
  
  // 圆形特有属性
  public strokeColor: string;
  public strokeWidth: number;
  public filled: boolean;
  public fillColor: string | undefined;
  public radius: number;
  
  constructor(
    id: string,
    center: IPoint,
    radius: number,
    strokeColor: string = '#000000',
    strokeWidth: number = 2,
    filled: boolean = false,
    fillColor: string | undefined = undefined
  ) {
    this.id = id;
    this.radius = radius;
    this.position = { x: center.x - radius, y: center.y - radius };
    this.size = { width: radius * 2, height: radius * 2 };
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    this.filled = filled;
    this.fillColor = fillColor;
  }
  
  get bounds(): IRect {
    return this.getBounds();
  }
  
  get center(): IPoint {
    return {
      x: this.position.x + this.radius,
      y: this.position.y + this.radius
    };
  }
  
  render(context: IGraphicsContext): void {
    if (!this.visible) return;
    
    // 检查是否是Canvas 2D上下文
    if (context && typeof (context as any).beginPath === 'function') {
      const ctx = context as any as CanvasRenderingContext2D;
      ctx.save();
      
      // 设置样式
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      
      const center = this.center;
      
      ctx.beginPath();
      ctx.arc(center.x, center.y, this.radius, 0, 2 * Math.PI);
      
      if (this.filled && this.fillColor) {
        ctx.fillStyle = this.fillColor;
        ctx.fill();
      }
      
      // 描边
      ctx.stroke();
      
      // 如果选中，绘制选择框
      if (this.selected) {
        this.renderSelection(context);
      }
      
      ctx.restore();
    }
  }
  
  private renderSelection(context: IGraphicsContext): void {
    if (context && typeof (context as any).strokeRect === 'function') {
      const ctx = context as any as CanvasRenderingContext2D;
      const bounds = this.getBounds();
      const padding = 2;
      
      ctx.save();
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        bounds.x - padding, 
        bounds.y - padding, 
        bounds.width + padding * 2, 
        bounds.height + padding * 2
      );
      ctx.restore();
    }
  }
  
  getBounds(): IRect {
    const padding = this.strokeWidth / 2;
    return {
      x: this.position.x - padding,
      y: this.position.y - padding,
      width: this.size.width + padding * 2,
      height: this.size.height + padding * 2
    };
  }
  
  hitTest(point: IPoint): boolean {
    const center = this.center;
    const distance = Math.sqrt(
      Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
    );
    return distance <= this.radius + this.strokeWidth / 2;
  }
  
  clone(): IShape {
    const cloned = new CircleShape(
      `${this.id}_clone_${Date.now()}`,
      this.center,
      this.radius,
      this.strokeColor,
      this.strokeWidth,
      this.filled,
      this.fillColor
    );
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    cloned.selected = this.selected;
    cloned.locked = this.locked;
    return cloned;
  }
  
  update(update: IShapeUpdate): void {
    if (update.position) {
      this.position = { ...this.position, ...update.position };
    }
    if (update.size) {
      this.size = { ...this.size, ...update.size };
      // 同步半径
      this.radius = Math.min(this.size.width, this.size.height) / 2;
    }
    if (update.visible !== undefined) {
      this.visible = update.visible;
    }
    if (update.zIndex !== undefined) {
      this.zIndex = update.zIndex;
    }
    if (update.selected !== undefined) {
      this.selected = update.selected;
    }
    if (update.locked !== undefined) {
      this.locked = update.locked;
    }
  }
  
  serialize(): IShapeData {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      size: this.size,
      visible: this.visible,
      zIndex: this.zIndex,
      selected: this.selected,
      locked: this.locked,
      radius: this.radius,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      filled: this.filled,
      fillColor: this.fillColor
    };
  }
  
  deserialize(data: IShapeData): void {
    this.position = data.position;
    this.size = data.size;
    this.visible = data.visible;
    this.zIndex = data.zIndex;
    this.selected = data.selected;
    this.locked = data.locked;
    
    // 圆形特定数据
    if (data.radius !== undefined) this.radius = data.radius;
    if (data.strokeColor) this.strokeColor = data.strokeColor;
    if (data.strokeWidth !== undefined) this.strokeWidth = data.strokeWidth;
    if (data.filled !== undefined) this.filled = data.filled;
    if (data.fillColor) this.fillColor = data.fillColor;
  }
  
  dispose(): void {
    // 清理资源
  }
}