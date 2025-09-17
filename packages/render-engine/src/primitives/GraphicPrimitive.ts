/**
 * 基础图形原语抽象类
 * 提供通用功能的默认实现
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { GraphicPrimitiveType, IGraphicPrimitive } from './IGraphicPrimitive';

/**
 * 图形原语基类
 */
export abstract class GraphicPrimitive implements IGraphicPrimitive {
  protected _id: string;
  protected _visible: boolean = true;
  protected _zIndex: number = 0;
  protected _position: IPoint = { x: 0, y: 0 };
  protected _transform: IGraphicPrimitive['transform'] = {
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  };
  protected _style: IGraphicPrimitive['style'] = {
    fillColor: '#000000',
    strokeColor: '#000000',
    strokeWidth: 1,
    opacity: 1
  };

  constructor(
    public readonly type: GraphicPrimitiveType,
    id?: string
  ) {
    this._id = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get id(): string {
    return this._id;
  }

  get bounds(): IRect {
    return this.getBounds();
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = value;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = value;
  }

  get position(): IPoint {
    return { ...this._position };
  }

  set position(value: IPoint) {
    this._position = { ...value };
  }

  get transform(): IGraphicPrimitive['transform'] {
    return { ...this._transform };
  }

  get style(): IGraphicPrimitive['style'] {
    return { ...this._style };
  }

  setPosition(position: IPoint): void {
    this._position = { ...position };
  }

  setTransform(transform: Partial<IGraphicPrimitive['transform']>): void {
    this._transform = { ...this._transform, ...transform };
  }

  setStyle(style: Partial<IGraphicPrimitive['style']>): void {
    this._style = { ...this._style, ...style };
  }

  abstract render(context: IGraphicsContext): void;
  abstract getBounds(): IRect;
  abstract hitTest(point: IPoint): boolean;
  abstract clone(): IGraphicPrimitive;
  
  dispose(): void {
    // 清理资源，子类可以重写
  }

  /**
   * 应用变换到上下文
   * @param context 图形上下文
   */
  protected applyTransform(context: IGraphicsContext): void {
    context.save();
    context.translate(this._position.x, this._position.y);
    if (this._transform.rotation !== 0) {
      context.rotate(this._transform.rotation);
    }
    if (this._transform.scaleX !== 1 || this._transform.scaleY !== 1) {
      context.scale(this._transform.scaleX, this._transform.scaleY);
    }
  }

  /**
   * 恢复变换
   * @param context 图形上下文
   */
  protected restoreTransform(context: IGraphicsContext): void {
    context.restore();
  }

  /**
   * 应用样式到上下文
   * @param context 图形上下文
   */
  protected applyStyle(context: IGraphicsContext): void {
    if (this._style.fillColor) {
      context.setFillStyle(this._style.fillColor);
    }
    if (this._style.strokeColor) {
      context.setStrokeStyle(this._style.strokeColor);
    }
    if (this._style.strokeWidth !== undefined) {
      context.setLineWidth(this._style.strokeWidth);
    }
    if (this._style.opacity !== undefined && this._style.opacity !== 1) {
      context.setOpacity(this._style.opacity);
    }
  }
}