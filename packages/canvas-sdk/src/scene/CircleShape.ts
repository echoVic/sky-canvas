/**
 * 圆形形状实现
 */
import { IPoint, IRect } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType } from './IShape';

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
  
  get center(): IPoint {
    return {
      x: this.position.x + this.radius,
      y: this.position.y + this.radius
    };
  }
  
  render(context: any): void {
    if (!this.visible) return;
    
    // 检查是否是Canvas 2D上下文
    if (context && typeof context.arc === 'function') {
      context.save();
      
      // 设置样式
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      
      const center = this.center;
      
      context.beginPath();
      context.arc(center.x, center.y, this.radius, 0, 2 * Math.PI);
      
      if (this.filled && this.fillColor) {
        context.fillStyle = this.fillColor;
        context.fill();
      }
      
      // 描边
      context.stroke();
      
      context.restore();
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
    return new CircleShape(
      `${this.id}_clone_${Date.now()}`,
      this.center,
      this.radius,
      this.strokeColor,
      this.strokeWidth,
      this.filled,
      this.fillColor
    );
  }
  
  dispose(): void {
    // 清理资源
  }
}