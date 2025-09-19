/**
 * Circle 圆形图形
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { Vector2 } from '../math/Vector2';
import { Shape, ShapeConfig } from './Shape';

/**
 * 圆形配置接口
 */
export interface CircleConfig extends ShapeConfig {
  /** 半径 */
  radius?: number;
}

/**
 * Circle 圆形类
 */
export class Circle extends Shape {
  private _radius: number;

  constructor(config: CircleConfig = {}) {
    super(config);
    this._radius = config.radius ?? 10;
  }

  // 半径属性
  get radius(): number {
    return this._radius;
  }

  set radius(value: number) {
    this._radius = Math.max(0, value);
  }

  // Konva.js 风格的半径方法
  setRadius(value: number): this {
    this._radius = Math.max(0, value);
    return this;
  }

  // 渲染方法
  render(context: IGraphicsContext): void {
    if (!this.visible || this._radius <= 0) {
      return;
    }

    this.saveAndRestore(context, () => {
      // 应用变换
      this.applyTransform(context);

      // 应用样式
      this.applyStyle(context);

      // 绘制圆形
      context.beginPath();
      context.arc(0, 0, this._radius, 0, Math.PI * 2);

      // 填充和描边
      this.fillAndStroke(context);
    });
  }

  // 碰撞检测
  hitTest(point: IPoint): boolean {
    if (!this.visible) {
      return false;
    }

    // 将点转换到形状的局部坐标系
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));

    // 计算距离
    const distance = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);

    // 考虑描边宽度
    const strokeOffset = this.stroke ? this.strokeWidth / 2 : 0;
    const testRadius = this._radius + strokeOffset;

    return distance <= testRadius;
  }

  // 获取边界框
  getBounds(): IRect {
    if (!this.visible || this._radius <= 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // 考虑描边宽度
    const strokeOffset = this.stroke ? this.strokeWidth / 2 : 0;
    const totalRadius = this._radius + strokeOffset;

    // 局部边界框
    const localBounds = {
      x: -totalRadius,
      y: -totalRadius,
      width: totalRadius * 2,
      height: totalRadius * 2
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
  clone(): Circle {
    const config: CircleConfig = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      visible: this.visible,
      zIndex: this.zIndex,
      radius: this._radius,
      style: this.style()
    };
    return new Circle(config);
  }

  // 静态工厂方法
  static create(config: CircleConfig): Circle {
    return new Circle(config);
  }

  // 便利的创建方法
  static createAt(x: number, y: number, radius: number): Circle {
    return new Circle({ x, y, radius });
  }
}