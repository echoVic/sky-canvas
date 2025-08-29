/**
 * 统一坐标变换系统
 * 解决多层坐标变换和不同后端的坐标系差异
 */
import { IPoint, IRect } from '../core/IGraphicsContext';

/**
 * 2D变换矩阵
 * 使用齐次坐标系的3x3矩阵表示2D变换
 */
export class Matrix2D {
  /** 矩阵元素 (行主序) */
  public elements: number[] = [
    1, 0, 0,  // [m00, m01, m02]
    0, 1, 0,  // [m10, m11, m12]
    0, 0, 1   // [m20, m21, m22]
  ];

  constructor(elements?: number[]) {
    if (elements && elements.length === 9) {
      this.elements = [...elements];
    }
  }

  /**
   * 创建单位矩阵
   */
  static identity(): Matrix2D {
    return new Matrix2D();
  }

  /**
   * 创建平移矩阵
   * @param x X偏移
   * @param y Y偏移
   */
  static translation(x: number, y: number): Matrix2D {
    return new Matrix2D([
      1, 0, x,
      0, 1, y,
      0, 0, 1
    ]);
  }

  /**
   * 创建旋转矩阵
   * @param angle 旋转角度（弧度）
   */
  static rotation(angle: number): Matrix2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix2D([
      cos, -sin, 0,
      sin,  cos, 0,
      0,    0,   1
    ]);
  }

  /**
   * 创建缩放矩阵
   * @param scaleX X轴缩放
   * @param scaleY Y轴缩放
   */
  static scale(scaleX: number, scaleY: number): Matrix2D {
    return new Matrix2D([
      scaleX, 0,      0,
      0,      scaleY, 0,
      0,      0,      1
    ]);
  }

  /**
   * 创建投影矩阵
   * @param left 左边界
   * @param right 右边界
   * @param top 上边界
   * @param bottom 下边界
   */
  static orthographic(left: number, right: number, top: number, bottom: number): Matrix2D {
    const width = right - left;
    const height = top - bottom;
    return new Matrix2D([
      2 / width,  0,          -(right + left) / width,
      0,          2 / height, -(top + bottom) / height,
      0,          0,          1
    ]);
  }

  /**
   * 矩阵乘法
   * @param other 另一个矩阵
   */
  multiply(other: Matrix2D): Matrix2D {
    const a = this.elements;
    const b = other.elements;
    
    return new Matrix2D([
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],  // m00
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],  // m01
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],  // m02
      
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],  // m10
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],  // m11
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],  // m12
      
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],  // m20
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],  // m21
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]   // m22
    ]);
  }

  /**
   * 平移
   * @param x X偏移
   * @param y Y偏移
   */
  translate(x: number, y: number): Matrix2D {
    return this.multiply(Matrix2D.translation(x, y));
  }

  /**
   * 旋转
   * @param angle 旋转角度（弧度）
   */
  rotate(angle: number): Matrix2D {
    return this.multiply(Matrix2D.rotation(angle));
  }

  /**
   * 缩放
   * @param scaleX X轴缩放
   * @param scaleY Y轴缩放
   */
  scale(scaleX: number, scaleY: number): Matrix2D {
    return this.multiply(Matrix2D.scale(scaleX, scaleY));
  }

  /**
   * 变换点
   * @param point 点坐标
   */
  transformPoint(point: IPoint): IPoint {
    const x = point.x * this.elements[0] + point.y * this.elements[1] + this.elements[2];
    const y = point.x * this.elements[3] + point.y * this.elements[4] + this.elements[5];
    return { x, y };
  }

  /**
   * 变换向量（忽略平移）
   * @param vector 向量
   */
  transformVector(vector: IPoint): IPoint {
    const x = vector.x * this.elements[0] + vector.y * this.elements[1];
    const y = vector.x * this.elements[3] + vector.y * this.elements[4];
    return { x, y };
  }

  /**
   * 计算逆矩阵
   */
  inverse(): Matrix2D | null {
    const m = this.elements;
    
    // 计算行列式
    const det = m[0] * (m[4] * m[8] - m[7] * m[5]) -
                m[1] * (m[3] * m[8] - m[5] * m[6]) +
                m[2] * (m[3] * m[7] - m[4] * m[6]);
    
    if (Math.abs(det) < 1e-10) {
      return null; // 矩阵不可逆
    }
    
    const invDet = 1 / det;
    
    return new Matrix2D([
      (m[4] * m[8] - m[7] * m[5]) * invDet,
      (m[2] * m[7] - m[1] * m[8]) * invDet,
      (m[1] * m[5] - m[2] * m[4]) * invDet,
      
      (m[5] * m[6] - m[3] * m[8]) * invDet,
      (m[0] * m[8] - m[2] * m[6]) * invDet,
      (m[2] * m[3] - m[0] * m[5]) * invDet,
      
      (m[3] * m[7] - m[4] * m[6]) * invDet,
      (m[1] * m[6] - m[0] * m[7]) * invDet,
      (m[0] * m[4] - m[1] * m[3]) * invDet
    ]);
  }

  /**
   * 获取平移分量
   */
  getTranslation(): IPoint {
    return { x: this.elements[2], y: this.elements[5] };
  }

  /**
   * 获取缩放分量
   */
  getScale(): IPoint {
    const scaleX = Math.sqrt(this.elements[0] * this.elements[0] + this.elements[3] * this.elements[3]);
    const scaleY = Math.sqrt(this.elements[1] * this.elements[1] + this.elements[4] * this.elements[4]);
    return { x: scaleX, y: scaleY };
  }

  /**
   * 获取旋转分量（弧度）
   */
  getRotation(): number {
    return Math.atan2(this.elements[3], this.elements[0]);
  }

  /**
   * 克隆矩阵
   */
  clone(): Matrix2D {
    return new Matrix2D([...this.elements]);
  }

  /**
   * 转换为WebGL 4x4矩阵格式
   */
  toWebGL(): number[] {
    const m = this.elements;
    return [
      m[0], m[3], 0, m[6],  // 第一列
      m[1], m[4], 0, m[7],  // 第二列
      0,    0,    1, 0,     // 第三列
      m[2], m[5], 0, m[8]   // 第四列
    ];
  }

  /**
   * 转换为CSS变换字符串
   */
  toCSSTransform(): string {
    const m = this.elements;
    return `matrix(${m[0]}, ${m[3]}, ${m[1]}, ${m[4]}, ${m[2]}, ${m[5]})`;
  }
}

/**
 * 变换栈
 * 管理嵌套的坐标变换
 */
export class TransformStack {
  private stack: Matrix2D[] = [Matrix2D.identity()];

  /**
   * 获取当前变换矩阵
   */
  get current(): Matrix2D {
    return this.stack[this.stack.length - 1].clone();
  }

  /**
   * 保存当前变换
   */
  push(): void {
    this.stack.push(this.current);
  }

  /**
   * 恢复上一个变换
   */
  pop(): Matrix2D | null {
    if (this.stack.length <= 1) {
      console.warn('TransformStack: Cannot pop from empty stack');
      return null;
    }
    return this.stack.pop()!;
  }

  /**
   * 重置到单位矩阵
   */
  reset(): void {
    this.stack = [Matrix2D.identity()];
  }

  /**
   * 应用平移
   * @param x X偏移
   * @param y Y偏移
   */
  translate(x: number, y: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.translate(x, y);
  }

  /**
   * 应用旋转
   * @param angle 旋转角度（弧度）
   */
  rotate(angle: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.rotate(angle);
  }

  /**
   * 应用缩放
   * @param scaleX X轴缩放
   * @param scaleY Y轴缩放
   */
  scale(scaleX: number, scaleY: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.scale(scaleX, scaleY);
  }

  /**
   * 设置变换矩阵
   * @param matrix 新矩阵
   */
  setMatrix(matrix: Matrix2D): void {
    this.stack[this.stack.length - 1] = matrix.clone();
  }

  /**
   * 乘以变换矩阵
   * @param matrix 矩阵
   */
  multiply(matrix: Matrix2D): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.multiply(matrix);
  }

  /**
   * 变换点
   * @param point 点坐标
   */
  transformPoint(point: IPoint): IPoint {
    return this.current.transformPoint(point);
  }

  /**
   * 逆变换点
   * @param point 点坐标
   */
  inverseTransformPoint(point: IPoint): IPoint | null {
    const inverse = this.current.inverse();
    return inverse ? inverse.transformPoint(point) : null;
  }
}

/**
 * 坐标系统类型
 */
export enum CoordinateSystem {
  /** 设备坐标系（像素坐标） */
  DEVICE = 'device',
  /** 屏幕坐标系（视口坐标） */
  SCREEN = 'screen',
  /** 世界坐标系（逻辑坐标） */
  WORLD = 'world',
  /** 局部坐标系（对象坐标） */
  LOCAL = 'local'
}

/**
 * 视口配置
 */
export interface IViewportConfig {
  /** 视口位置和大小 */
  viewport: IRect;
  /** 世界坐标范围 */
  worldBounds: IRect;
  /** 设备像素比 */
  devicePixelRatio: number;
  /** 是否翻转Y轴（WebGL需要） */
  flipY: boolean;
}

/**
 * 坐标系统管理器
 */
export class CoordinateSystemManager {
  private viewportConfig: IViewportConfig;
  private transformStack = new TransformStack();
  
  // 预计算的变换矩阵（缓存）
  private deviceToScreen?: Matrix2D;
  private screenToWorld?: Matrix2D;
  private worldToScreen?: Matrix2D;
  private screenToDevice?: Matrix2D;

  constructor(config: IViewportConfig) {
    this.viewportConfig = { ...config };
    this.updateTransforms();
  }

  /**
   * 更新视口配置
   * @param config 新配置
   */
  updateViewport(config: Partial<IViewportConfig>): void {
    Object.assign(this.viewportConfig, config);
    this.updateTransforms();
  }

  /**
   * 获取当前视口配置
   */
  getViewportConfig(): Readonly<IViewportConfig> {
    return { ...this.viewportConfig };
  }

  /**
   * 设备坐标转屏幕坐标
   * @param point 设备坐标点
   */
  deviceToScreenPoint(point: IPoint): IPoint {
    if (!this.deviceToScreen) this.updateTransforms();
    return this.deviceToScreen!.transformPoint(point);
  }

  /**
   * 屏幕坐标转世界坐标
   * @param point 屏幕坐标点
   */
  screenToWorldPoint(point: IPoint): IPoint {
    if (!this.screenToWorld) this.updateTransforms();
    return this.screenToWorld!.transformPoint(point);
  }

  /**
   * 世界坐标转屏幕坐标
   * @param point 世界坐标点
   */
  worldToScreenPoint(point: IPoint): IPoint {
    if (!this.worldToScreen) this.updateTransforms();
    return this.worldToScreen!.transformPoint(point);
  }

  /**
   * 屏幕坐标转设备坐标
   * @param point 屏幕坐标点
   */
  screenToDevicePoint(point: IPoint): IPoint {
    if (!this.screenToDevice) this.updateTransforms();
    return this.screenToDevice!.transformPoint(point);
  }

  /**
   * 设备坐标直接转世界坐标
   * @param point 设备坐标点
   */
  deviceToWorldPoint(point: IPoint): IPoint {
    const screenPoint = this.deviceToScreenPoint(point);
    return this.screenToWorldPoint(screenPoint);
  }

  /**
   * 世界坐标直接转设备坐标
   * @param point 世界坐标点
   */
  worldToDevicePoint(point: IPoint): IPoint {
    const screenPoint = this.worldToScreenPoint(point);
    return this.screenToDevicePoint(screenPoint);
  }

  /**
   * 获取变换栈（用于局部变换）
   */
  getTransformStack(): TransformStack {
    return this.transformStack;
  }

  /**
   * 获取完整的世界到设备变换矩阵
   */
  getWorldToDeviceMatrix(): Matrix2D {
    if (!this.worldToScreen || !this.screenToDevice) this.updateTransforms();
    return this.worldToScreen!.multiply(this.screenToDevice!);
  }

  /**
   * 获取完整的设备到世界变换矩阵
   */
  getDeviceToWorldMatrix(): Matrix2D {
    const worldToDevice = this.getWorldToDeviceMatrix();
    return worldToDevice.inverse() || Matrix2D.identity();
  }

  /**
   * 变换矩形
   * @param rect 原矩形
   * @param transform 变换矩阵
   */
  transformRect(rect: IRect, transform: Matrix2D): IRect {
    // 变换四个角点
    const corners = [
      transform.transformPoint({ x: rect.x, y: rect.y }),
      transform.transformPoint({ x: rect.x + rect.width, y: rect.y }),
      transform.transformPoint({ x: rect.x + rect.width, y: rect.y + rect.height }),
      transform.transformPoint({ x: rect.x, y: rect.y + rect.height })
    ];

    // 计算包围盒
    let minX = corners[0].x, minY = corners[0].y;
    let maxX = corners[0].x, maxY = corners[0].y;

    for (let i = 1; i < corners.length; i++) {
      minX = Math.min(minX, corners[i].x);
      minY = Math.min(minY, corners[i].y);
      maxX = Math.max(maxX, corners[i].x);
      maxY = Math.max(maxY, corners[i].y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private updateTransforms(): void {
    const { viewport, worldBounds, devicePixelRatio, flipY } = this.viewportConfig;

    // 设备到屏幕变换（DPI缩放）
    this.deviceToScreen = Matrix2D.scale(1 / devicePixelRatio, 1 / devicePixelRatio);

    // 屏幕到设备变换
    this.screenToDevice = Matrix2D.scale(devicePixelRatio, devicePixelRatio);

    // 屏幕到世界变换
    const scaleX = worldBounds.width / viewport.width;
    const scaleY = worldBounds.height / viewport.height;
    
    this.screenToWorld = Matrix2D.identity()
      .translate(-viewport.x, -viewport.y)  // 移动到原点
      .scale(scaleX, flipY ? -scaleY : scaleY)  // 缩放并可能翻转Y轴
      .translate(worldBounds.x, flipY ? worldBounds.y + worldBounds.height : worldBounds.y);

    // 世界到屏幕变换
    this.worldToScreen = this.screenToWorld.inverse()!;
  }
}