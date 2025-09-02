import { Vector2 } from './Vector2';
import { Matrix3x3 } from './Matrix3';

/**
 * 统一坐标变换系统
 * 解决多层坐标变换和不同后端的坐标系差异
 */

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
      scaleX,  0,      0,
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
  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    const x = point.x * this.elements[0] + point.y * this.elements[1] + this.elements[2];
    const y = point.x * this.elements[3] + point.y * this.elements[4] + this.elements[5];
    return { x, y };
  }

  /**
   * 变换向量（忽略平移）
   * @param vector 向量
   */
  transformVector(vector: { x: number; y: number }): { x: number; y: number } {
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
  getTranslation(): { x: number; y: number } {
    return { x: this.elements[2], y: this.elements[5] };
  }

  /**
   * 获取缩放分量
   */
  getScale(): { x: number; y: number } {
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
  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    return this.current.transformPoint(point);
  }

  /**
   * 逆变换点
   * @param point 点坐标
   */
  inverseTransformPoint(point: { x: number; y: number }): { x: number; y: number } | null {
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
  viewport: { x: number; y: number; width: number; height: number };
  /** 世界坐标范围 */
  worldBounds: { x: number; y: number; width: number; height: number };
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
  deviceToScreenPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.deviceToScreen) this.updateTransforms();
    return this.deviceToScreen!.transformPoint(point);
  }

  /**
   * 屏幕坐标转世界坐标
   * @param point 屏幕坐标点
   */
  screenToWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.screenToWorld) this.updateTransforms();
    return this.screenToWorld!.transformPoint(point);
  }

  /**
   * 世界坐标转屏幕坐标
   * @param point 世界坐标点
   */
  worldToScreenPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.worldToScreen) this.updateTransforms();
    return this.worldToScreen!.transformPoint(point);
  }

  /**
   * 屏幕坐标转设备坐标
   * @param point 屏幕坐标点
   */
  screenToDevicePoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.screenToDevice) this.updateTransforms();
    return this.screenToDevice!.transformPoint(point);
  }

  /**
   * 设备坐标直接转世界坐标
   * @param point 设备坐标点
   */
  deviceToWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
    const screenPoint = this.deviceToScreenPoint(point);
    return this.screenToWorldPoint(screenPoint);
  }

  /**
   * 世界坐标直接转设备坐标
   * @param point 世界坐标点
   */
  worldToDevicePoint(point: { x: number; y: number }): { x: number; y: number } {
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
  transformRect(rect: { x: number; y: number; width: number; height: number }, transform: Matrix2D): { x: number; y: number; width: number; height: number } {
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

/**
 * Transform 变换类
 * 提供高级的2D变换操作，内部使用Matrix3x3实现
 * 支持位置、旋转、缩放的组合变换
 */
export class Transform {
  private _position: Vector2;
  private _rotation: number;
  private _scale: Vector2;
  private _matrix: Matrix3x3;
  private _matrixDirty: boolean;

  constructor(
    position: Vector2 = Vector2.ZERO.clone(),
    rotation: number = 0,
    scale: Vector2 = Vector2.ONE.clone()
  ) {
    this._position = position.clone();
    this._rotation = rotation;
    this._scale = scale.clone();
    this._matrix = new Matrix3x3();
    this._matrixDirty = true;
  }

  // 属性访问器
  get position(): Vector2 {
    return this._position.clone();
  }

  set position(value: Vector2) {
    this._position.copy(value);
    this._matrixDirty = true;
  }

  get rotation(): number {
    return this._rotation;
  }

  set rotation(value: number) {
    this._rotation = value;
    this._matrixDirty = true;
  }

  get scale(): Vector2 {
    return this._scale.clone();
  }

  set scale(value: Vector2) {
    this._scale.copy(value);
    this._matrixDirty = true;
  }

  get matrix(): Matrix3x3 {
    if (this._matrixDirty) {
      this._updateMatrix();
    }
    return this._matrix.clone();
  }

  // 基础操作
  clone(): Transform {
    return new Transform(this._position, this._rotation, this._scale);
  }

  copy(other: Transform): Transform {
    this._position.copy(other._position);
    this._rotation = other._rotation;
    this._scale.copy(other._scale);
    this._matrixDirty = true;
    return this;
  }

  reset(): Transform {
    this._position.set(0, 0);
    this._rotation = 0;
    this._scale.set(1, 1);
    this._matrixDirty = true;
    return this;
  }

  // 变换操作
  translate(delta: Vector2): Transform {
    this._position.addInPlace(delta);
    this._matrixDirty = true;
    return this;
  }

  translateBy(x: number, y: number): Transform {
    this._position.addInPlace(new Vector2(x, y));
    this._matrixDirty = true;
    return this;
  }

  rotate(deltaAngle: number): Transform {
    this._rotation += deltaAngle;
    this._matrixDirty = true;
    return this;
  }

  scaleBy(factor: number): Transform;
  scaleBy(factorX: number, factorY: number): Transform;
  scaleBy(factorX: number, factorY?: number): Transform {
    const fy = factorY !== undefined ? factorY : factorX;
    this._scale.x *= factorX;
    this._scale.y *= fy;
    this._matrixDirty = true;
    return this;
  }

  // 设置操作
  setPosition(position: Vector2): Transform;
  setPosition(x: number, y: number): Transform;
  setPosition(x: number | Vector2, y?: number): Transform {
    if (x instanceof Vector2) {
      this._position.copy(x);
    } else {
      this._position.set(x, y!);
    }
    this._matrixDirty = true;
    return this;
  }

  setRotation(angle: number): Transform {
    this._rotation = angle;
    this._matrixDirty = true;
    return this;
  }

  setScale(scale: Vector2): Transform;
  setScale(scale: number): Transform;
  setScale(scaleX: number, scaleY: number): Transform;
  setScale(scaleX: number | Vector2, scaleY?: number): Transform {
    if (scaleX instanceof Vector2) {
      this._scale.copy(scaleX);
    } else if (scaleY !== undefined) {
      this._scale.set(scaleX, scaleY);
    } else {
      this._scale.set(scaleX, scaleX);
    }
    this._matrixDirty = true;
    return this;
  }

  // 变换应用
  transformPoint(point: Vector2): Vector2 {
    if (this._matrixDirty) {
      this._updateMatrix();
    }
    return this._matrix.transformVector(point);
  }

  transformDirection(direction: Vector2): Vector2 {
    if (this._matrixDirty) {
      this._updateMatrix();
    }
    return this._matrix.transformDirection(direction);
  }

  transformPoints(points: Vector2[]): Vector2[] {
    if (this._matrixDirty) {
      this._updateMatrix();
    }
    return points.map(point => this._matrix.transformVector(point));
  }

  // 逆变换
  inverse(): Transform | null {
    // 对于复合变换 T*R*S，逆变换是 S^-1*R^-1*T^-1
    // 直接计算逆变换参数更准确
    if (this._scale.x === 0 || this._scale.y === 0) {
      return null; // 不可逆
    }

    const invTransform = new Transform();
    
    // 逆缩放
    const invScale = new Vector2(1 / this._scale.x, 1 / this._scale.y);
    
    // 逆旋转
    const invRotation = -this._rotation;
    
    // 逆平移：需要先应用逆旋转和逆缩放到平移向量
    const rotatedPos = this._position.rotate(-this._rotation);
    const invPosition = new Vector2(-rotatedPos.x / this._scale.x, -rotatedPos.y / this._scale.y);
    
    invTransform._position = invPosition;
    invTransform._rotation = invRotation;
    invTransform._scale = invScale;
    invTransform._matrixDirty = true;

    return invTransform;
  }

  inverseTransformPoint(point: Vector2): Vector2 {
    const inv = this.inverse();
    if (!inv) throw new Error('Transform is not invertible');
    return inv.transformPoint(point);
  }

  inverseTransformDirection(direction: Vector2): Vector2 {
    const inv = this.inverse();
    if (!inv) throw new Error('Transform is not invertible');
    return inv.transformDirection(direction);
  }

  // 组合变换
  combine(other: Transform): Transform {
    if (this._matrixDirty) this._updateMatrix();
    if (other._matrixDirty) other._updateMatrix();

    const combinedMatrix = this._matrix.multiply(other._matrix);
    const result = new Transform();
    result._matrix = combinedMatrix;
    result._matrixDirty = false;

    // 从组合矩阵中提取变换参数
    result._position = combinedMatrix.getTranslation();
    result._rotation = combinedMatrix.getRotation();
    result._scale = combinedMatrix.getScale();

    return result;
  }

  // 插值
  lerp(other: Transform, t: number): Transform {
    return new Transform(
      this._position.lerp(other._position, t),
      this._rotation + (other._rotation - this._rotation) * t,
      this._scale.lerp(other._scale, t)
    );
  }

  // 比较
  equals(other: Transform, epsilon: number = 1e-10): boolean {
    return this._position.equals(other._position, epsilon) &&
           Math.abs(this._rotation - other._rotation) < epsilon &&
           this._scale.equals(other._scale, epsilon);
  }

  // 私有方法
  private _updateMatrix(): void {
    // 构建变换矩阵：T * R * S
    const translation = Matrix3x3.translation(this._position.x, this._position.y);
    const rotation = Matrix3x3.rotation(this._rotation);
    const scale = Matrix3x3.scale(this._scale.x, this._scale.y);

    // 组合变换：先缩放，再旋转，最后平移
    this._matrix = translation.multiply(rotation.multiply(scale));
    this._matrixDirty = false;
  }

  // 工具方法
  toString(): string {
    return `Transform(\n` +
           `  position: ${this._position.toString()}\n` +
           `  rotation: ${this._rotation.toFixed(3)} rad (${(this._rotation * 180 / Math.PI).toFixed(1)}°)\n` +
           `  scale: ${this._scale.toString()}\n` +
           `)`;
  }

  toObject(): { position: [number, number], rotation: number, scale: [number, number] } {
    return {
      position: this._position.toArray(),
      rotation: this._rotation,
      scale: this._scale.toArray()
    };
  }

  // 静态方法
  static identity(): Transform {
    return new Transform();
  }

  static translation(x: number, y: number): Transform {
    return new Transform(new Vector2(x, y));
  }

  static rotation(angle: number): Transform {
    return new Transform(Vector2.ZERO.clone(), angle);
  }

  static scale(x: number, y: number = x): Transform {
    return new Transform(Vector2.ZERO.clone(), 0, new Vector2(x, y));
  }

  static fromMatrix(matrix: Matrix3x3): Transform {
    const transform = new Transform();
    transform._matrix = matrix.clone();
    transform._matrixDirty = false;
    
    // 从矩阵中提取变换参数
    transform._position = matrix.getTranslation();
    transform._rotation = matrix.getRotation();
    transform._scale = matrix.getScale();
    
    return transform;
  }

  static fromObject(obj: { position: [number, number], rotation: number, scale: [number, number] }): Transform {
    return new Transform(
      Vector2.fromArray(obj.position),
      obj.rotation,
      Vector2.fromArray(obj.scale)
    );
  }

  static lerp(a: Transform, b: Transform, t: number): Transform {
    return a.lerp(b, t);
  }

  static combine(a: Transform, b: Transform): Transform {
    return a.combine(b);
  }
}