import { Vector2 } from './Vector2';

/**
 * 3x3矩阵类
 * 用于2D图形变换（平移、旋转、缩放）
 * 矩阵存储为列优先格式：
 * [m00 m10 m20]
 * [m01 m11 m21]
 * [m02 m12 m22]
 */
export class Matrix3x3 {
  public elements: Float32Array;

  constructor(
    m00: number = 1, m10: number = 0, m20: number = 0,
    m01: number = 0, m11: number = 1, m21: number = 0,
    m02: number = 0, m12: number = 0, m22: number = 1
  ) {
    this.elements = new Float32Array([
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ]);
  }

  // 静态常量
  static readonly IDENTITY = new Matrix3x3();
  static readonly ZERO = new Matrix3x3(0, 0, 0, 0, 0, 0, 0, 0, 0);

  // 基础操作
  clone(): Matrix3x3 {
    return new Matrix3x3(
      this.elements[0], this.elements[3], this.elements[6],
      this.elements[1], this.elements[4], this.elements[7],
      this.elements[2], this.elements[5], this.elements[8]
    );
  }

  copy(other: Matrix3x3): Matrix3x3 {
    for (let i = 0; i < 9; i++) {
      this.elements[i] = other.elements[i];
    }
    return this;
  }

  set(
    m00: number, m10: number, m20: number,
    m01: number, m11: number, m21: number,
    m02: number, m12: number, m22: number
  ): Matrix3x3 {
    this.elements[0] = m00; this.elements[3] = m10; this.elements[6] = m20;
    this.elements[1] = m01; this.elements[4] = m11; this.elements[7] = m21;
    this.elements[2] = m02; this.elements[5] = m12; this.elements[8] = m22;
    return this;
  }

  identity(): Matrix3x3 {
    return this.set(
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    );
  }

  // 矩阵运算
  multiply(other: Matrix3x3): Matrix3x3 {
    const a = this.elements;
    const b = other.elements;
    const result = new Matrix3x3();
    const c = result.elements;

    c[0] = a[0] * b[0] + a[3] * b[1] + a[6] * b[2];
    c[1] = a[1] * b[0] + a[4] * b[1] + a[7] * b[2];
    c[2] = a[2] * b[0] + a[5] * b[1] + a[8] * b[2];

    c[3] = a[0] * b[3] + a[3] * b[4] + a[6] * b[5];
    c[4] = a[1] * b[3] + a[4] * b[4] + a[7] * b[5];
    c[5] = a[2] * b[3] + a[5] * b[4] + a[8] * b[5];

    c[6] = a[0] * b[6] + a[3] * b[7] + a[6] * b[8];
    c[7] = a[1] * b[6] + a[4] * b[7] + a[7] * b[8];
    c[8] = a[2] * b[6] + a[5] * b[7] + a[8] * b[8];

    return result;
  }

  multiplyInPlace(other: Matrix3x3): Matrix3x3 {
    const result = this.multiply(other);
    this.copy(result);
    return this;
  }

  multiplyScalar(scalar: number): Matrix3x3 {
    const result = new Matrix3x3();
    for (let i = 0; i < 9; i++) {
      result.elements[i] = this.elements[i] * scalar;
    }
    return result;
  }

  multiplyScalarInPlace(scalar: number): Matrix3x3 {
    for (let i = 0; i < 9; i++) {
      this.elements[i] *= scalar;
    }
    return this;
  }

  add(other: Matrix3x3): Matrix3x3 {
    const result = new Matrix3x3();
    for (let i = 0; i < 9; i++) {
      result.elements[i] = this.elements[i] + other.elements[i];
    }
    return result;
  }

  addInPlace(other: Matrix3x3): Matrix3x3 {
    for (let i = 0; i < 9; i++) {
      this.elements[i] += other.elements[i];
    }
    return this;
  }

  // 矩阵属性
  determinant(): number {
    const e = this.elements;
    return e[0] * (e[4] * e[8] - e[7] * e[5]) -
           e[3] * (e[1] * e[8] - e[7] * e[2]) +
           e[6] * (e[1] * e[5] - e[4] * e[2]);
  }

  transpose(): Matrix3x3 {
    const e = this.elements;
    return new Matrix3x3(
      e[0], e[3], e[6],
      e[1], e[4], e[7],
      e[2], e[5], e[8]
    );
  }

  transposeInPlace(): Matrix3x3 {
    const e = this.elements;
    let temp: number;
    
    temp = e[1]; e[1] = e[3]; e[3] = temp;
    temp = e[2]; e[2] = e[6]; e[6] = temp;
    temp = e[5]; e[5] = e[7]; e[7] = temp;
    
    return this;
  }

  inverse(): Matrix3x3 | null {
    const det = this.determinant();
    if (Math.abs(det) < 1e-10) return null; // 矩阵不可逆

    const e = this.elements;
    const invDet = 1 / det;

    return new Matrix3x3(
      (e[4] * e[8] - e[7] * e[5]) * invDet,
      (e[7] * e[2] - e[1] * e[8]) * invDet,
      (e[1] * e[5] - e[4] * e[2]) * invDet,
      (e[6] * e[5] - e[3] * e[8]) * invDet,
      (e[0] * e[8] - e[6] * e[2]) * invDet,
      (e[3] * e[2] - e[0] * e[5]) * invDet,
      (e[3] * e[7] - e[6] * e[4]) * invDet,
      (e[6] * e[1] - e[0] * e[7]) * invDet,
      (e[0] * e[4] - e[3] * e[1]) * invDet
    );
  }

  // 向量变换
  transformVector(vector: Vector2): Vector2 {
    const e = this.elements;
    return new Vector2(
      e[0] * vector.x + e[3] * vector.y + e[6],
      e[1] * vector.x + e[4] * vector.y + e[7]
    );
  }

  transformDirection(vector: Vector2): Vector2 {
    const e = this.elements;
    return new Vector2(
      e[0] * vector.x + e[3] * vector.y,
      e[1] * vector.x + e[4] * vector.y
    );
  }

  transformPoint(point: Vector2): Vector2 {
    const e = this.elements;
    return new Vector2(
      e[0] * point.x + e[3] * point.y + e[6],
      e[1] * point.x + e[4] * point.y + e[7]
    );
  }

  // 变换矩阵创建
  static translation(x: number, y: number): Matrix3x3 {
    return new Matrix3x3(
      1, 0, x,
      0, 1, y,
      0, 0, 1
    );
  }

  static rotation(angle: number): Matrix3x3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix3x3(
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
    );
  }

  static scale(x: number, y: number = x): Matrix3x3 {
    return new Matrix3x3(
      x, 0, 0,
      0, y, 0,
      0, 0, 1
    );
  }

  static shear(x: number, y: number): Matrix3x3 {
    return new Matrix3x3(
      1, x, 0,
      y, 1, 0,
      0, 0, 1
    );
  }

  // 组合变换
  translate(x: number, y: number): Matrix3x3 {
    return this.multiply(Matrix3x3.translation(x, y));
  }

  translateInPlace(x: number, y: number): Matrix3x3 {
    return this.multiplyInPlace(Matrix3x3.translation(x, y));
  }

  rotate(angle: number): Matrix3x3 {
    return this.multiply(Matrix3x3.rotation(angle));
  }

  rotateInPlace(angle: number): Matrix3x3 {
    return this.multiplyInPlace(Matrix3x3.rotation(angle));
  }

  scale(x: number, y: number = x): Matrix3x3 {
    return this.multiply(Matrix3x3.scale(x, y));
  }

  scaleInPlace(x: number, y: number = x): Matrix3x3 {
    return this.multiplyInPlace(Matrix3x3.scale(x, y));
  }

  // 分解变换
  getTranslation(): Vector2 {
    return new Vector2(this.elements[6], this.elements[7]);
  }

  getScale(): Vector2 {
    // 对于包含旋转的变换矩阵，需要考虑行列式的符号
    const scaleX = Math.sqrt(this.elements[0] * this.elements[0] + this.elements[1] * this.elements[1]);
    const scaleY = Math.sqrt(this.elements[3] * this.elements[3] + this.elements[4] * this.elements[4]);
    
    // 检查是否有反射（负缩放）
    const det = this.determinant();
    const finalScaleY = det < 0 ? -scaleY : scaleY;
    
    return new Vector2(scaleX, finalScaleY);
  }

  getRotation(): number {
    return Math.atan2(this.elements[1], this.elements[0]);
  }

  // 比较
  equals(other: Matrix3x3, epsilon: number = 1e-10): boolean {
    for (let i = 0; i < 9; i++) {
      if (Math.abs(this.elements[i] - other.elements[i]) > epsilon) {
        return false;
      }
    }
    return true;
  }

  // 工具方法
  toString(): string {
    const e = this.elements;
    return `Matrix3x3(\n` +
           `  [${e[0].toFixed(3)}, ${e[3].toFixed(3)}, ${e[6].toFixed(3)}]\n` +
           `  [${e[1].toFixed(3)}, ${e[4].toFixed(3)}, ${e[7].toFixed(3)}]\n` +
           `  [${e[2].toFixed(3)}, ${e[5].toFixed(3)}, ${e[8].toFixed(3)}]\n` +
           `)`;
  }

  toArray(): number[] {
    return Array.from(this.elements);
  }

  // 静态方法
  static fromArray(arr: number[]): Matrix3x3 {
    if (arr.length !== 9) throw new Error('Array must have 9 elements');
    return new Matrix3x3(
      arr[0], arr[3], arr[6],
      arr[1], arr[4], arr[7],
      arr[2], arr[5], arr[8]
    );
  }

  static multiply(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
    return a.multiply(b);
  }

  static lerp(a: Matrix3x3, b: Matrix3x3, t: number): Matrix3x3 {
    const result = new Matrix3x3();
    for (let i = 0; i < 9; i++) {
      result.elements[i] = a.elements[i] + (b.elements[i] - a.elements[i]) * t;
    }
    return result;
  }

  // 创建单位矩阵
  static identity(): Matrix3x3 {
    return new Matrix3x3();
  }

  // 创建正交投影矩阵
  static orthographic(left: number, right: number, bottom: number, top: number): Matrix3x3 {
    const width = right - left;
    const height = top - bottom;
    
    return new Matrix3x3(
      2 / width, 0, -(right + left) / width,
      0, 2 / height, -(top + bottom) / height,
      0, 0, 1
    );
  }
}
