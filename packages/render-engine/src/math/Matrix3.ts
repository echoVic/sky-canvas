/**
 * 3x3矩阵类 - 用于2D变换
 * 矩阵布局：
 * [m00, m01, m02]
 * [m10, m11, m12] 
 * [m20, m21, m22]
 * 
 * 对于2D变换：
 * [sx*cos, -sx*sin, tx]
 * [sy*sin,  sy*cos, ty]
 * [0,       0,      1 ]
 */

export class Matrix3 {
  public elements: Float32Array;

  constructor(
    m00 = 1, m01 = 0, m02 = 0,
    m10 = 0, m11 = 1, m12 = 0,
    m20 = 0, m21 = 0, m22 = 1
  ) {
    this.elements = new Float32Array([
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ]);
  }

  /**
   * 创建单位矩阵
   */
  static identity(): Matrix3 {
    return new Matrix3();
  }

  /**
   * 创建平移矩阵
   */
  static translation(x: number, y: number): Matrix3 {
    return new Matrix3(
      1, 0, x,
      0, 1, y,
      0, 0, 1
    );
  }

  /**
   * 创建旋转矩阵
   */
  static rotation(angle: number): Matrix3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix3(
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
    );
  }

  /**
   * 创建缩放矩阵
   */
  static scaling(sx: number, sy: number): Matrix3 {
    return new Matrix3(
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1
    );
  }

  /**
   * 创建投影矩阵（NDC坐标系）
   */
  static projection(width: number, height: number): Matrix3 {
    return new Matrix3(
      2 / width, 0, -1,
      0, -2 / height, 1,
      0, 0, 1
    );
  }

  /**
   * 设置为单位矩阵
   */
  identity(): Matrix3 {
    this.elements.set([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
    return this;
  }

  /**
   * 复制矩阵
   */
  copy(other: Matrix3): Matrix3 {
    this.elements.set(other.elements);
    return this;
  }

  /**
   * 克隆矩阵
   */
  clone(): Matrix3 {
    const m = this.elements;
    return new Matrix3(
      m[0], m[1], m[2],
      m[3], m[4], m[5],
      m[6], m[7], m[8]
    );
  }

  /**
   * 矩阵乘法 (this = this * other)
   */
  multiply(other: Matrix3): Matrix3 {
    const a = this.elements;
    const b = other.elements;
    
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    a[0] = a00 * b00 + a01 * b10 + a02 * b20;
    a[1] = a00 * b01 + a01 * b11 + a02 * b21;
    a[2] = a00 * b02 + a01 * b12 + a02 * b22;

    a[3] = a10 * b00 + a11 * b10 + a12 * b20;
    a[4] = a10 * b01 + a11 * b11 + a12 * b21;
    a[5] = a10 * b02 + a11 * b12 + a12 * b22;

    a[6] = a20 * b00 + a21 * b10 + a22 * b20;
    a[7] = a20 * b01 + a21 * b11 + a22 * b21;
    a[8] = a20 * b02 + a21 * b12 + a22 * b22;

    return this;
  }

  /**
   * 左乘矩阵 (this = other * this)
   */
  premultiply(other: Matrix3): Matrix3 {
    const temp = other.clone();
    temp.multiply(this);
    this.copy(temp);
    return this;
  }

  /**
   * 应用平移变换
   */
  translate(x: number, y: number): Matrix3 {
    return this.multiply(Matrix3.translation(x, y));
  }

  /**
   * 应用旋转变换
   */
  rotate(angle: number): Matrix3 {
    return this.multiply(Matrix3.rotation(angle));
  }

  /**
   * 应用缩放变换
   */
  scale(sx: number, sy: number): Matrix3 {
    return this.multiply(Matrix3.scaling(sx, sy));
  }

  /**
   * 计算逆矩阵
   */
  invert(): Matrix3 {
    const m = this.elements;
    
    const m00 = m[0], m01 = m[1], m02 = m[2];
    const m10 = m[3], m11 = m[4], m12 = m[5];
    const m20 = m[6], m21 = m[7], m22 = m[8];

    const det = m00 * (m11 * m22 - m21 * m12) -
                m01 * (m10 * m22 - m12 * m20) +
                m02 * (m10 * m21 - m11 * m20);

    if (Math.abs(det) < 1e-10) {
      console.warn('Matrix3: Cannot invert matrix, determinant is 0');
      return this.identity();
    }

    const invDet = 1 / det;

    m[0] = (m11 * m22 - m21 * m12) * invDet;
    m[1] = (m02 * m21 - m01 * m22) * invDet;
    m[2] = (m01 * m12 - m02 * m11) * invDet;
    m[3] = (m12 * m20 - m10 * m22) * invDet;
    m[4] = (m00 * m22 - m02 * m20) * invDet;
    m[5] = (m02 * m10 - m00 * m12) * invDet;
    m[6] = (m10 * m21 - m11 * m20) * invDet;
    m[7] = (m01 * m20 - m00 * m21) * invDet;
    m[8] = (m00 * m11 - m01 * m10) * invDet;

    return this;
  }

  /**
   * 变换向量点
   */
  transformPoint(x: number, y: number): { x: number; y: number } {
    const m = this.elements;
    return {
      x: m[0] * x + m[1] * y + m[2],
      y: m[3] * x + m[4] * y + m[5]
    };
  }

  /**
   * 获取平移分量
   */
  getTranslation(): { x: number; y: number } {
    return {
      x: this.elements[2],
      y: this.elements[5]
    };
  }

  /**
   * 获取缩放分量
   */
  getScale(): { x: number; y: number } {
    const m = this.elements;
    const sx = Math.sqrt(m[0] * m[0] + m[3] * m[3]);
    const sy = Math.sqrt(m[1] * m[1] + m[4] * m[4]);
    return { x: sx, y: sy };
  }

  /**
   * 获取旋转角度
   */
  getRotation(): number {
    return Math.atan2(this.elements[3], this.elements[0]);
  }

  /**
   * 转换为WebGL uniform格式（列主序）
   */
  toWebGL(): Float32Array {
    const m = this.elements;
    return new Float32Array([
      m[0], m[3], m[6],
      m[1], m[4], m[7],
      m[2], m[5], m[8]
    ]);
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    const m = this.elements;
    return `Matrix3(
  ${m[0].toFixed(3)}, ${m[1].toFixed(3)}, ${m[2].toFixed(3)}
  ${m[3].toFixed(3)}, ${m[4].toFixed(3)}, ${m[5].toFixed(3)}
  ${m[6].toFixed(3)}, ${m[7].toFixed(3)}, ${m[8].toFixed(3)}
)`;
  }

  /**
   * 比较两个矩阵是否相等
   */
  equals(other: Matrix3, epsilon = 1e-6): boolean {
    const a = this.elements;
    const b = other.elements;
    
    for (let i = 0; i < 9; i++) {
      if (Math.abs(a[i] - b[i]) > epsilon) {
        return false;
      }
    }
    
    return true;
  }
}