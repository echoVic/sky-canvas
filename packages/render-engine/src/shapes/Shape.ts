/**
 * Shape 基类
 * 提供用户友好的图形操作 API
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { IRenderable } from '../core/types';
import { Transform } from '../math/Transform';
import { Vector2 } from '../math/Vector2';

/**
 * 形状样式接口
 */
export interface ShapeStyle {
  /** 填充颜色 */
  fill?: string;
  /** 描边颜色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 透明度 0-1 */
  opacity?: number;
  /** 线条端点样式 */
  lineCap?: 'butt' | 'round' | 'square';
  /** 线条连接样式 */
  lineJoin?: 'miter' | 'round' | 'bevel';
  /** 虚线样式 */
  dash?: number[];
  /** 虚线偏移 */
  dashOffset?: number;
}

/**
 * 形状配置接口
 */
export interface ShapeConfig {
  /** 位置 X 坐标 */
  x?: number;
  /** 位置 Y 坐标 */
  y?: number;
  /** 旋转角度（弧度） */
  rotation?: number;
  /** X 轴缩放 */
  scaleX?: number;
  /** Y 轴缩放 */
  scaleY?: number;
  /** 是否可见 */
  visible?: boolean;
  /** Z 轴层级 */
  zIndex?: number;
  /** 样式配置 */
  style?: ShapeStyle;
}

/**
 * Shape 基类
 * 提供用户友好的图形操作 API，内部使用 Transform 进行变换管理
 */
export abstract class Shape implements IRenderable {
  private _id: string;
  private _visible: boolean = true;
  private _zIndex: number = 0;
  private _transform: Transform;
  private _style: ShapeStyle = {};

  constructor(config: ShapeConfig = {}) {
    this._id = this.generateId();
    this._visible = config.visible ?? true;
    this._zIndex = config.zIndex ?? 0;

    // 初始化变换
    this._transform = new Transform(
      new Vector2(config.x ?? 0, config.y ?? 0),
      config.rotation ?? 0,
      new Vector2(config.scaleX ?? 1, config.scaleY ?? 1)
    );

    // 设置样式
    if (config.style) {
      this._style = { ...config.style };
    }
  }

  // IRenderable 接口实现
  get id(): string {
    return this._id;
  }

  get visible(): boolean {
    return this._visible;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  get transform(): Transform {
    return this._transform;
  }

  // 用户友好的属性访问器
  get x(): number {
    return this._transform.position.x;
  }

  set x(value: number) {
    this._transform.setPosition(value, this.y);
  }

  get y(): number {
    return this._transform.position.y;
  }

  set y(value: number) {
    this._transform.setPosition(this.x, value);
  }

  get rotation(): number {
    return this._transform.rotation;
  }

  set rotation(value: number) {
    this._transform.setRotation(value);
  }

  get scaleX(): number {
    return this._transform.scale.x;
  }

  set scaleX(value: number) {
    this._transform.setScale(value, this.scaleY);
  }

  get scaleY(): number {
    return this._transform.scale.y;
  }

  set scaleY(value: number) {
    this._transform.setScale(this.scaleX, value);
  }

  get opacity(): number {
    return this._style.opacity ?? 1;
  }

  set opacity(value: number) {
    this._style.opacity = Math.max(0, Math.min(1, value));
  }

  get fill(): string | undefined {
    return this._style.fill;
  }

  set fill(value: string | undefined) {
    this._style.fill = value;
  }

  get stroke(): string | undefined {
    return this._style.stroke;
  }

  set stroke(value: string | undefined) {
    this._style.stroke = value;
  }

  get strokeWidth(): number {
    return this._style.strokeWidth ?? 1;
  }

  set strokeWidth(value: number) {
    this._style.strokeWidth = Math.max(0, value);
  }

  // 用户友好的方法
  setVisible(value: boolean): this {
    this._visible = value;
    return this;
  }

  setZIndex(value: number): this {
    this._zIndex = value;
    return this;
  }

  position(): IPoint;
  position(point: IPoint): this;
  position(x: number, y: number): this;
  position(x?: number | IPoint, y?: number): IPoint | this {
    if (x === undefined) {
      return { x: this.x, y: this.y };
    }
    if (typeof x === 'object') {
      this.x = x.x;
      this.y = x.y;
    } else {
      this.x = x;
      this.y = y!;
    }
    return this;
  }

  scale(): IPoint;
  scale(value: number): this;
  scale(scaleX: number, scaleY: number): this;
  scale(scaleX?: number, scaleY?: number): IPoint | this {
    if (scaleX === undefined) {
      return { x: this.scaleX, y: this.scaleY };
    }
    if (scaleY === undefined) {
      this.scaleX = scaleX;
      this.scaleY = scaleX;
    } else {
      this.scaleX = scaleX;
      this.scaleY = scaleY;
    }
    return this;
  }

  // 样式方法
  style(): ShapeStyle;
  style(style: Partial<ShapeStyle>): this;
  style(style?: Partial<ShapeStyle>): ShapeStyle | this {
    if (style === undefined) {
      return { ...this._style };
    }
    Object.assign(this._style, style);
    return this;
  }

  // 变换方法
  move(deltaX: number, deltaY: number): this {
    this._transform.translateBy(deltaX, deltaY);
    return this;
  }

  moveTo(x: number, y: number): this {
    this._transform.setPosition(x, y);
    return this;
  }

  rotate(deltaAngle: number): this {
    this._transform.rotate(deltaAngle);
    return this;
  }

  rotateTo(angle: number): this {
    this._transform.setRotation(angle);
    return this;
  }

  scaleBy(factor: number): this;
  scaleBy(factorX: number, factorY: number): this;
  scaleBy(factorX: number, factorY?: number): this {
    this._transform.scaleBy(factorX, factorY ?? factorX);
    return this;
  }

  scaleTo(scale: number): this;
  scaleTo(scaleX: number, scaleY: number): this;
  scaleTo(scaleX: number, scaleY?: number): this {
    this._transform.setScale(scaleX, scaleY ?? scaleX);
    return this;
  }

  // 克隆方法
  abstract clone(): Shape;

  // 抽象方法 - 子类必须实现
  abstract render(context: IGraphicsContext): void;
  abstract hitTest(point: IPoint): boolean;
  abstract getBounds(): IRect;

  // 工具方法
  protected applyStyle(context: IGraphicsContext): void {
    // 设置透明度
    if (this._style.opacity !== undefined) {
      context.setGlobalAlpha(this._style.opacity);
    }

    // 设置填充样式
    if (this._style.fill) {
      context.setFillStyle(this._style.fill);
    }

    // 设置描边样式
    if (this._style.stroke) {
      context.setStrokeStyle(this._style.stroke);
      context.setLineWidth(this._style.strokeWidth ?? 1);
    }

    // 设置虚线
    if (this._style.dash) {
      context.setLineDash(this._style.dash);
    }

    // 注意：lineCap, lineJoin, lineDashOffset 等属性需要通过 setStyle 方法设置
    // 这些属性不是直接的 setter 方法，需要通过样式对象设置
    const styleObj: any = {};
    if (this._style.lineCap) {
      styleObj.lineCap = this._style.lineCap;
    }
    if (this._style.lineJoin) {
      styleObj.lineJoin = this._style.lineJoin;
    }
    if (Object.keys(styleObj).length > 0) {
      context.setStyle(styleObj);
    }
  }

  protected applyTransform(context: IGraphicsContext): void {
    // 应用变换矩阵
    const matrix = this._transform.matrix;
    const elements = matrix.elements;

    // 设置变换矩阵
    context.transform(
      elements[0], elements[1], elements[3],
      elements[4], elements[6], elements[7]
    );
  }

  protected fillAndStroke(context: IGraphicsContext): void {
    if (this._style.fill) {
      context.fill();
    }
    if (this._style.stroke && this._style.strokeWidth && this._style.strokeWidth > 0) {
      context.stroke();
    }
  }

  protected saveAndRestore(context: IGraphicsContext, callback: () => void): void {
    context.save();
    try {
      callback();
    } finally {
      context.restore();
    }
  }

  private generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 销毁方法
  dispose(): void {
    // 清理资源
    // 基类没有需要清理的资源，子类可以重写此方法
  }
}