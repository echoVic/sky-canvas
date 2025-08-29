/**
 * 菱形形状实现
 */
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType, IShapeUpdate, IShapeData } from './IShape';

/**
 * 菱形形状类
 */
export class DiamondShape implements IShape {
  readonly id: string;
  readonly type: ShapeType = 'rectangle'; // 使用rectangle类型，因为菱形本质上是旋转的矩形
  
  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  public selected: boolean = false;
  public locked: boolean = false;
  
  // 菱形特有属性
  public strokeColor: string;
  public strokeWidth: number;
  public filled: boolean;
  public fillColor: string | undefined;
  
  constructor(
    id: string,
    position: IPoint,
    size: ISize,
    strokeColor: string = '#000000',
    strokeWidth: number = 2,
    filled: boolean = false,
    fillColor: string | undefined = undefined
  ) {
    this.id = id;
    this.position = { ...position };
    this.size = { ...size };
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    this.filled = filled;
    this.fillColor = fillColor;
  }
  
  get center(): IPoint {
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2
    };
  }
  
  get bounds(): IRect {
    return this.getBounds();
  }
  
  render(context: IGraphicsContext): void {
    if (!this.visible) return;
    
    // 检查是否是Canvas 2D上下文
    if (context && typeof context.beginPath === 'function') {
      context.save();
      
      // 设置样式
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      context.lineJoin = 'round';
      
      const center = this.center;
      const halfWidth = this.size.width / 2;
      const halfHeight = this.size.height / 2;
      
      // 绘制菱形路径
      context.beginPath();
      context.moveTo(center.x, center.y - halfHeight); // 上顶点
      context.lineTo(center.x + halfWidth, center.y);  // 右顶点
      context.lineTo(center.x, center.y + halfHeight); // 下顶点
      context.lineTo(center.x - halfWidth, center.y);  // 左顶点
      context.closePath();
      
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
    // 简化的菱形点击测试：先检查边界框，再做更精确的测试
    const bounds = this.getBounds();
    if (point.x < bounds.x || point.x > bounds.x + bounds.width ||
        point.y < bounds.y || point.y > bounds.y + bounds.height) {
      return false;
    }
    
    const center = this.center;
    const halfWidth = this.size.width / 2;
    const halfHeight = this.size.height / 2;
    
    // 使用叉积判断点是否在菱形内部
    const dx = Math.abs(point.x - center.x);
    const dy = Math.abs(point.y - center.y);
    
    return (dx / halfWidth + dy / halfHeight) <= 1;
  }
  
  clone(): IShape {
    return new DiamondShape(
      `${this.id}_clone_${Date.now()}`,
      this.position,
      this.size,
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