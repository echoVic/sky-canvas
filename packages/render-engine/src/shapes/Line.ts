/**
 * Line 线条图形 - Konva.js 风格
 */
import { Shape, ShapeConfig } from './Shape';
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { Vector2 } from '../math/Vector2';

/**
 * 线条配置接口
 */
export interface LineConfig extends ShapeConfig {
  /** 起点 X 坐标 */
  x1?: number;
  /** 起点 Y 坐标 */
  y1?: number;
  /** 终点 X 坐标 */
  x2?: number;
  /** 终点 Y 坐标 */
  y2?: number;
  /** 线条点集合（多点线条） */
  points?: number[];
}

/**
 * Line 线条类
 */
export class Line extends Shape {
  private _points: number[];

  constructor(config: LineConfig = {}) {
    super(config);

    // 如果提供了单独的坐标，转换为点数组
    if (config.x1 !== undefined && config.y1 !== undefined &&
        config.x2 !== undefined && config.y2 !== undefined) {
      this._points = [config.x1, config.y1, config.x2, config.y2];
    } else if (config.points && config.points.length >= 4) {
      // 确保至少有两个点（4个数值）
      this._points = [...config.points];
    } else {
      // 默认水平线
      this._points = [0, 0, 100, 0];
    }
  }

  // 点集合属性
  get points(): number[] {
    return [...this._points];
  }

  set points(value: number[]) {
    if (value.length >= 4 && value.length % 2 === 0) {
      this._points = [...value];
    }
  }

  // 起点和终点属性（仅对简单两点线条有效）
  get startPoint(): IPoint {
    return { x: this._points[0], y: this._points[1] };
  }

  set startPoint(value: IPoint) {
    this._points[0] = value.x;
    this._points[1] = value.y;
  }

  get endPoint(): IPoint {
    const len = this._points.length;
    return { x: this._points[len - 2], y: this._points[len - 1] };
  }

  set endPoint(value: IPoint) {
    const len = this._points.length;
    this._points[len - 2] = value.x;
    this._points[len - 1] = value.y;
  }

  // Konva.js 风格的方法
  setPoints(points: number[]): this {
    if (points.length >= 4 && points.length % 2 === 0) {
      this._points = [...points];
    }
    return this;
  }

  addPoint(x: number, y: number): this {
    this._points.push(x, y);
    return this;
  }

  removeLastPoint(): this {
    if (this._points.length > 4) {
      this._points.splice(-2, 2);
    }
    return this;
  }

  // 获取点的数量
  getPointCount(): number {
    return this._points.length / 2;
  }

  // 获取指定索引的点
  getPoint(index: number): IPoint | null {
    const i = index * 2;
    if (i < 0 || i >= this._points.length - 1) {
      return null;
    }
    return { x: this._points[i], y: this._points[i + 1] };
  }

  // 设置指定索引的点
  setPoint(index: number, point: IPoint): this {
    const i = index * 2;
    if (i >= 0 && i < this._points.length - 1) {
      this._points[i] = point.x;
      this._points[i + 1] = point.y;
    }
    return this;
  }

  // 渲染方法
  render(context: IGraphicsContext): void {
    if (!this.visible || this._points.length < 4) {
      return;
    }

    this.saveAndRestore(context, () => {
      // 应用变换
      this.applyTransform(context);

      // 应用样式
      this.applyStyle(context);

      // 绘制线条
      context.beginPath();

      // 移动到第一个点
      context.moveTo(this._points[0], this._points[1]);

      // 连接到其他点
      for (let i = 2; i < this._points.length; i += 2) {
        context.lineTo(this._points[i], this._points[i + 1]);
      }

      // 只进行描边，线条不填充
      if (this.stroke && this.strokeWidth > 0) {
        context.stroke();
      }
    });
  }

  // 碰撞检测
  hitTest(point: IPoint): boolean {
    if (!this.visible || this._points.length < 4) {
      return false;
    }

    // 将点转换到形状的局部坐标系
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));

    // 检测点是否接近线段
    const tolerance = Math.max(this.strokeWidth / 2, 5); // 至少5个像素的容差

    for (let i = 0; i < this._points.length - 2; i += 2) {
      const x1 = this._points[i];
      const y1 = this._points[i + 1];
      const x2 = this._points[i + 2];
      const y2 = this._points[i + 3];

      if (this.pointToLineDistance(localPoint, { x: x1, y: y1 }, { x: x2, y: y2 }) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  // 计算点到线段的距离
  private pointToLineDistance(point: IPoint, lineStart: IPoint, lineEnd: IPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      // 退化为点
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

  // 获取边界框
  getBounds(): IRect {
    if (!this.visible || this._points.length < 4) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // 考虑描边宽度
    const strokeOffset = this.stroke ? this.strokeWidth / 2 : 0;

    // 找到所有点的边界
    let minX = this._points[0];
    let minY = this._points[1];
    let maxX = this._points[0];
    let maxY = this._points[1];

    for (let i = 2; i < this._points.length; i += 2) {
      minX = Math.min(minX, this._points[i]);
      minY = Math.min(minY, this._points[i + 1]);
      maxX = Math.max(maxX, this._points[i]);
      maxY = Math.max(maxY, this._points[i + 1]);
    }

    // 扩展边界以包含描边
    const localBounds = {
      x: minX - strokeOffset,
      y: minY - strokeOffset,
      width: (maxX - minX) + strokeOffset * 2,
      height: (maxY - minY) + strokeOffset * 2
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
    let finalMinX = transformedCorners[0].x;
    let finalMinY = transformedCorners[0].y;
    let finalMaxX = transformedCorners[0].x;
    let finalMaxY = transformedCorners[0].y;

    for (let i = 1; i < transformedCorners.length; i++) {
      const corner = transformedCorners[i];
      finalMinX = Math.min(finalMinX, corner.x);
      finalMinY = Math.min(finalMinY, corner.y);
      finalMaxX = Math.max(finalMaxX, corner.x);
      finalMaxY = Math.max(finalMaxY, corner.y);
    }

    return {
      x: finalMinX,
      y: finalMinY,
      width: finalMaxX - finalMinX,
      height: finalMaxY - finalMinY
    };
  }

  // 克隆方法
  clone(): Line {
    const config: LineConfig = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      visible: this.visible,
      zIndex: this.zIndex,
      points: [...this._points],
      style: this.style()
    };
    return new Line(config);
  }

  // 静态工厂方法
  static create(config: LineConfig): Line {
    return new Line(config);
  }

  // 便利的创建方法
  static createFromPoints(x1: number, y1: number, x2: number, y2: number): Line {
    return new Line({ x1, y1, x2, y2 });
  }

  static createFromPointArray(points: number[]): Line {
    return new Line({ points });
  }

  static createFromIPoints(points: IPoint[]): Line {
    const pointArray: number[] = [];
    points.forEach(point => {
      pointArray.push(point.x, point.y);
    });
    return new Line({ points: pointArray });
  }
}