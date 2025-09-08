/**
 * 矩形形状实现
 */
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType, IShapeUpdate, IShapeData } from './IShape';

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
  public selected: boolean = false;
  public locked: boolean = false;
  
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
  
  get bounds(): IRect {
    return this.getBounds();
  }
  
  render(context: IGraphicsContext): void {
    if (!this.visible) return;
    
    context.save();
    
    // 设置样式
    context.setStrokeStyle(this.strokeColor);
    context.setLineWidth(this.strokeWidth);
    
    if (this.filled && this.fillColor) {
      context.setFillStyle(this.fillColor);
      context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
    }
    
    // 描边
    context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height);
    
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
    context.strokeRect(
      bounds.x - padding, 
      bounds.y - padding, 
      bounds.width + padding * 2, 
      bounds.height + padding * 2
    );
    context.restore();
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
    const cloned = new RectangleShape(
      `${this.id}_clone_${Date.now()}`,
      this.position,
      this.size,
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
    
    // 矩形特定数据
    if (data.strokeColor) this.strokeColor = data.strokeColor;
    if (data.strokeWidth !== undefined) this.strokeWidth = data.strokeWidth;
    if (data.filled !== undefined) this.filled = data.filled;
    if (data.fillColor) this.fillColor = data.fillColor;
  }
  
  dispose(): void {
    // 清理资源
  }
}