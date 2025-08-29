/**
 * 矩形图形原语实现
 */
import { IGraphicsContext, IPoint, IRect } from '../core/IGraphicsContext';
import { GraphicPrimitive } from './GraphicPrimitive';
import { IRectanglePrimitive } from './IGraphicPrimitive';

/**
 * 矩形图形原语
 */
export class RectanglePrimitive extends GraphicPrimitive implements IRectanglePrimitive {
  readonly type = 'rectangle' as const;
  
  private _width: number;
  private _height: number;

  constructor(
    width: number = 100,
    height: number = 100,
    id?: string
  ) {
    super('rectangle', id);
    this._width = width;
    this._height = height;
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = Math.max(0, value);
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = Math.max(0, value);
  }

  render(context: IGraphicsContext): void {
    if (!this.visible) return;

    this.applyTransform(context);
    this.applyStyle(context);

    const rect = {
      x: -this._width / 2,
      y: -this._height / 2,
      width: this._width,
      height: this._height
    };

    context.drawRect(rect, !!this._style.fillColor, !!this._style.strokeColor && this._style.strokeWidth! > 0);

    this.restoreTransform(context);
  }

  getBounds(): IRect {
    const halfWidth = this._width / 2;
    const halfHeight = this._height / 2;
    
    return {
      x: this._position.x - halfWidth,
      y: this._position.y - halfHeight,
      width: this._width,
      height: this._height
    };
  }

  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  clone(): RectanglePrimitive {
    const cloned = new RectanglePrimitive(this._width, this._height);
    cloned.setPosition(this._position);
    cloned.setTransform(this._transform);
    cloned.setStyle(this._style);
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }

  /**
   * 设置矩形尺寸
   * @param width 宽度
   * @param height 高度
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}