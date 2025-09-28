/**
 * Rectangle 矩形图形
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { Vector2 } from '../math/Vector2';
import { Shape, ShapeConfig } from './Shape';

/**
 * 矩形配置接口
 */
export interface RectangleConfig extends ShapeConfig {
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 圆角半径 */
  cornerRadius?: number;
}

/**
 * Rectangle 矩形类
 */
export class Rectangle extends Shape {
  private _width: number;
  private _height: number;
  private _cornerRadius: number;

  constructor(config: RectangleConfig = {}) {
    super(config);
    this._width = config.width ?? 100;
    this._height = config.height ?? 100;
    this._cornerRadius = config.cornerRadius ?? 0;
  }

  get type(): string {
    return 'rectangle';
  }

  // 尺寸属性
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

  get cornerRadius(): number {
    return this._cornerRadius;
  }

  set cornerRadius(value: number) {
    this._cornerRadius = Math.max(0, value);
  }

  size(): { width: number; height: number };
  size(width: number, height: number): this;
  size(width?: number, height?: number): { width: number; height: number } | this {
    if (width === undefined) {
      return { width: this._width, height: this._height };
    }
    this._width = Math.max(0, width);
    this._height = Math.max(0, height!);
    return this;
  }

  setWidth(value: number): this {
    this._width = Math.max(0, value);
    return this;
  }

  setHeight(value: number): this {
    this._height = Math.max(0, value);
    return this;
  }

  setCornerRadius(value: number): this {
    this._cornerRadius = Math.max(0, value);
    return this;
  }

  // 渲染方法
  render(context: IGraphicsContext): void {
    if (!this.visible || this._width <= 0 || this._height <= 0) {
      return;
    }

    this.saveAndRestore(context, () => {
      // 应用变换
      this.applyTransform(context);

      // 应用样式
      this.applyStyle(context);

      // 绘制矩形
      context.beginPath();

      if (this._cornerRadius > 0) {
        // 绘制圆角矩形
        this.drawRoundedRect(context);
      } else {
        // 绘制普通矩形
        context.rect(0, 0, this._width, this._height);
      }

      // 填充和描边
      this.fillAndStroke(context);
    });
  }

  // 绘制圆角矩形
  private drawRoundedRect(context: IGraphicsContext): void {
    const radius = Math.min(this._cornerRadius, this._width / 2, this._height / 2);
    const w = this._width;
    const h = this._height;

    // 使用 arc 和 lineTo 绘制圆角矩形
    context.moveTo(radius, 0);

    // 上边
    context.lineTo(w - radius, 0);
    // 右上角
    context.arc(w - radius, radius, radius, -Math.PI / 2, 0);

    // 右边
    context.lineTo(w, h - radius);
    // 右下角
    context.arc(w - radius, h - radius, radius, 0, Math.PI / 2);

    // 下边
    context.lineTo(radius, h);
    // 左下角
    context.arc(radius, h - radius, radius, Math.PI / 2, Math.PI);

    // 左边
    context.lineTo(0, radius);
    // 左上角
    context.arc(radius, radius, radius, Math.PI, -Math.PI / 2);

    context.closePath();
  }

  // 碰撞检测
  hitTest(point: IPoint): boolean {
    if (!this.visible) {
      return false;
    }

    // 将点转换到形状的局部坐标系
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));

    // 考虑描边宽度
    const strokeOffset = this.stroke ? this.strokeWidth / 2 : 0;

    // 扩展的边界框
    const left = -strokeOffset;
    const top = -strokeOffset;
    const right = this._width + strokeOffset;
    const bottom = this._height + strokeOffset;

    return localPoint.x >= left && localPoint.x <= right &&
           localPoint.y >= top && localPoint.y <= bottom;
  }

  // 获取边界框
  getBounds(): IRect {
    if (!this.visible || this._width <= 0 || this._height <= 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // 考虑描边宽度
    const strokeOffset = this.stroke ? this.strokeWidth / 2 : 0;

    // 局部边界框
    const localBounds = {
      x: -strokeOffset,
      y: -strokeOffset,
      width: this._width + strokeOffset * 2,
      height: this._height + strokeOffset * 2
    };

    // 应用变换到边界框的四个角点
    const corners = [
      { x: localBounds.x, y: localBounds.y },
      { x: localBounds.x + localBounds.width, y: localBounds.y },
      { x: localBounds.x + localBounds.width, y: localBounds.y + localBounds.height },
      { x: localBounds.x, y: localBounds.y + localBounds.height }
    ];

    const transformedCorners = corners.map(corner =>
      this.transform.transformPoint(new Vector2(corner.x, corner.y))
    );

    // 计算包围盒
    let minX = transformedCorners[0].x;
    let minY = transformedCorners[0].y;
    let maxX = transformedCorners[0].x;
    let maxY = transformedCorners[0].y;

    for (let i = 1; i < transformedCorners.length; i++) {
      const corner = transformedCorners[i];
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

  // 克隆方法
  clone(): Rectangle {
    const config: RectangleConfig = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      visible: this.visible,
      zIndex: this.zIndex,
      width: this._width,
      height: this._height,
      cornerRadius: this._cornerRadius,
      style: this.style()
    };
    return new Rectangle(config);
  }

  // 静态工厂方法
  static create(config: RectangleConfig): Rectangle {
    return new Rectangle(config);
  }

  // 便利的创建方法
  static createAt(x: number, y: number, width: number, height: number): Rectangle {
    return new Rectangle({ x, y, width, height });
  }

  // 创建正方形
  static createSquare(x: number, y: number, size: number): Rectangle {
    return new Rectangle({ x, y, width: size, height: size });
  }

  // 创建圆角矩形
  static createRounded(x: number, y: number, width: number, height: number, cornerRadius: number): Rectangle {
    return new Rectangle({ x, y, width, height, cornerRadius });
  }
}