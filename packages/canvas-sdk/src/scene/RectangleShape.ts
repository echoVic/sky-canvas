/**
 * 矩形形状实现
 */
import { IPoint, IRect } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType } from './IShape';

/**
 * 矩形形状类
 */
export class RectangleShape implements IShape {
  readonly id: string;
  readonly type: ShapeType = 'rectangle';
  
  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  
  // 矩形特有属性
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
  
  render(context: any): void {
    if (!this.visible) return;
    
    // 检查是否是Canvas 2D上下文
    if (context && typeof context.strokeRect === 'function') {
      context.save();
      
      // 设置样式
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      
      if (this.filled && this.fillColor) {
        context.fillStyle = this.fillColor;
        context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
      }
      
      // 描边
      context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height);
      
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
    const bounds = this.getBounds();
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }
  
  clone(): IShape {
    return new RectangleShape(
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