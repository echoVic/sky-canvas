import { Vector2 } from './Vector2';
import { Matrix3x3 } from './Matrix3x3';

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
