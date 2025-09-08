/**
 * 线条形状实现
 */
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType, IShapeUpdate, IShapeData } from './IShape';

/**
 * 线条形状类
 */
export class LineShape implements IShape {
  readonly id: string;
  readonly type: ShapeType = 'line';
  
  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  public selected: boolean = false;
  public locked: boolean = false;
  
  // 线条特有属性
  public startPoint: IPoint;
  public endPoint: IPoint;
  public strokeColor: string;
  public strokeWidth: number;
  
  constructor(
    id: string,
    startPoint: IPoint,
    endPoint: IPoint,
    strokeColor: string = '#000000',
    strokeWidth: number = 2
  ) {
    this.id = id;
    this.startPoint = { ...startPoint };
    this.endPoint = { ...endPoint };
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    
    // 计算位置和尺寸
    const bounds = this.calculateBounds();
    this.position = { x: bounds.x, y: bounds.y };
    this.size = { width: bounds.width, height: bounds.height };
  }
  
  private calculateBounds(): IRect {
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);
    
    const padding = this.strokeWidth / 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2
    };
  }
  
  get bounds(): IRect {
    return this.getBounds();
  }
  
  render(context: IGraphicsContext): void {
    if (!this.visible) return;
    
    context.save();
    
    // 设置样式
    context.setStrokeStyle(this.strokeColor);
    context.setLineWidth(this.strokeWidth);
    
    // 绘制线条
    context.drawLine(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y);
    
    // 如果选中，绘制选择框
    if (this.selected) {
      this.renderSelection(context);
    }
    
    context.restore();
  }
  
  private renderSelection(context: IGraphicsContext): void {
    const bounds = this.getBounds();
    const padding = 2;
    
    context.save();
    context.setStrokeStyle('#007AFF');
    context.setLineWidth(2);
    context.drawRect({
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    }, false, true);
    context.restore();
  }
  
  getBounds(): IRect {
    return this.calculateBounds();
  }
  
  hitTest(point: IPoint): boolean {
    // 简化的线条碰撞检测
    const threshold = this.strokeWidth + 2;
    const bounds = this.getBounds();
    
    // 先检查边界框
    if (point.x < bounds.x - threshold || 
        point.x > bounds.x + bounds.width + threshold || 
        point.y < bounds.y - threshold || 
        point.y > bounds.y + bounds.height + threshold) {
      return false;
    }
    
    // 计算点到线段的距离
    const distance = this.pointToLineDistance(point, this.startPoint, this.endPoint);
    return distance <= threshold;
  }
  
  private pointToLineDistance(point: IPoint, lineStart: IPoint, lineEnd: IPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // 线段长度为0，返回点到点的距离
      return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  clone(): IShape {
    const cloned = new LineShape(
      `${this.id}_clone_${Date.now()}`,
      this.startPoint,
      this.endPoint,
      this.strokeColor,
      this.strokeWidth
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
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth
    };
  }
  
  deserialize(data: IShapeData): void {
    this.position = data.position;
    this.size = data.size;
    this.visible = data.visible;
    this.zIndex = data.zIndex;
    this.selected = data.selected;
    this.locked = data.locked;
    
    // 线条特定数据
    if (data.startPoint) this.startPoint = data.startPoint;
    if (data.endPoint) this.endPoint = data.endPoint;
    if (data.strokeColor) this.strokeColor = data.strokeColor;
    if (data.strokeWidth !== undefined) this.strokeWidth = data.strokeWidth;
  }
  
  dispose(): void {
    // 清理资源
  }
}