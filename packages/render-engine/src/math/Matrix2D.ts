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

  /** 创建单位矩阵 */
  static identity(): Matrix2D {
    return new Matrix2D();
  }

  /** 创建平移矩阵 */
  static translation(x: number, y: number): Matrix2D {
    return new Matrix2D([
      1, 0, x,
      0, 1, y,
      0, 0, 1
    ]);
  }

  /** 创建旋转矩阵 */
  static rotation(angle: number): Matrix2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix2D([
      cos, -sin, 0,
      sin,  cos, 0,
      0,    0,   1
    ]);
  }

  /** 创建缩放矩阵 */
  static scale(scaleX: number, scaleY: number): Matrix2D {
    return new Matrix2D([
      scaleX,  0,      0,
      0,      scaleY, 0,
      0,      0,      1
    ]);
  }

  /** 创建投影矩阵 */
  static orthographic(left: number, right: number, top: number, bottom: number): Matrix2D {
    const width = right - left;
    const height = top - bottom;
    return new Matrix2D([
      2 / width,  0,          -(right + left) / width,
      0,          2 / height, -(top + bottom) / height,
      0,          0,          1
    ]);
  }

  /** 矩阵乘法 */
  multiply(other: Matrix2D): Matrix2D {
    const a = this.elements;
    const b = other.elements;

    return new Matrix2D([
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ]);
  }

  /** 平移 */
  translate(x: number, y: number): Matrix2D {
    return this.multiply(Matrix2D.translation(x, y));
  }

  /** 旋转 */
  rotate(angle: number): Matrix2D {
    return this.multiply(Matrix2D.rotation(angle));
  }

  /** 缩放 */
  scale(scaleX: number, scaleY: number): Matrix2D {
    return this.multiply(Matrix2D.scale(scaleX, scaleY));
  }

  /** 变换点 */
  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    const x = point.x * this.elements[0] + point.y * this.elements[1] + this.elements[2];
    const y = point.x * this.elements[3] + point.y * this.elements[4] + this.elements[5];
    return { x, y };
  }

  /** 变换向量（忽略平移） */
  transformVector(vector: { x: number; y: number }): { x: number; y: number } {
    const x = vector.x * this.elements[0] + vector.y * this.elements[1];
    const y = vector.x * this.elements[3] + vector.y * this.elements[4];
    return { x, y };
  }

  /** 计算逆矩阵 */
  inverse(): Matrix2D | null {
    const m = this.elements;

    const det = m[0] * (m[4] * m[8] - m[7] * m[5]) -
                m[1] * (m[3] * m[8] - m[5] * m[6]) +
                m[2] * (m[3] * m[7] - m[4] * m[6]);

    if (Math.abs(det) < 1e-10) {
      return null;
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

  /** 获取平移分量 */
  getTranslation(): { x: number; y: number } {
    return { x: this.elements[2], y: this.elements[5] };
  }

  /** 获取缩放分量 */
  getScale(): { x: number; y: number } {
    const scaleX = Math.sqrt(this.elements[0] * this.elements[0] + this.elements[3] * this.elements[3]);
    const scaleY = Math.sqrt(this.elements[1] * this.elements[1] + this.elements[4] * this.elements[4]);
    return { x: scaleX, y: scaleY };
  }

  /** 获取旋转分量（弧度） */
  getRotation(): number {
    return Math.atan2(this.elements[3], this.elements[0]);
  }

  /** 克隆矩阵 */
  clone(): Matrix2D {
    return new Matrix2D([...this.elements]);
  }

  /** 转换为WebGL 4x4矩阵格式 */
  toWebGL(): number[] {
    const m = this.elements;
    return [
      m[0], m[3], 0, m[6],
      m[1], m[4], 0, m[7],
      0,    0,    1, 0,
      m[2], m[5], 0, m[8]
    ];
  }

  /** 转换为CSS变换字符串 */
  toCSSTransform(): string {
    const m = this.elements;
    return `matrix(${m[0]}, ${m[3]}, ${m[1]}, ${m[4]}, ${m[2]}, ${m[5]})`;
  }
}
