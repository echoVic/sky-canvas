/**
 * 2D向量数学库
 */

/**
 * 2D向量类
 */
export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /**
   * 向量加法
   * @param other 另一个向量
   * @returns 新的向量
   */
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * 向量减法
   * @param other 另一个向量
   * @returns 新的向量
   */
  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /**
   * 标量乘法
   * @param scalar 标量
   * @returns 新的向量
   */
  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * 标量除法
   * @param scalar 标量
   * @returns 新的向量
   */
  divide(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * 计算向量长度
   * @returns 向量长度
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * 计算向量长度的平方
   * @returns 向量长度的平方
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * 归一化向量
   * @returns 归一化后的向量
   */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) {
      return new Vector2(0, 0);
    }
    return this.divide(len);
  }

  /**
   * 计算点积
   * @param other 另一个向量
   * @returns 点积值
   */
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * 计算到另一个向量的距离
   * @param other 另一个向量
   * @returns 距离
   */
  distanceTo(other: Vector2): number {
    return this.subtract(other).length();
  }

  /**
   * 计算到另一个向量的距离的平方
   * @param other 另一个向量
   * @returns 距离的平方
   */
  distanceToSquared(other: Vector2): number {
    return this.subtract(other).lengthSquared();
  }

  /**
   * 计算向量角度（弧度）
   * @returns 角度
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * 计算与另一个向量的夹角
   * @param other 另一个向量
   * @returns 夹角（弧度）
   */
  angleTo(other: Vector2): number {
    const cosAngle = this.dot(other) / (this.length() * other.length());
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  /**
   * 克隆向量
   * @returns 克隆的向量
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * 判断向量相等
   * @param other 另一个向量
   * @param epsilon 精度阈值
   * @returns 是否相等
   */
  equals(other: Vector2, epsilon: number = Number.EPSILON): boolean {
    return Math.abs(this.x - other.x) <= epsilon && 
           Math.abs(this.y - other.y) <= epsilon;
  }

  /**
   * 转换为数组
   * @returns 数组表示
   */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  // 静态方法

  /**
   * 创建零向量
   * @returns 零向量
   */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /**
   * 创建单位向量
   * @returns 单位向量
   */
  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  /**
   * 线性插值
   * @param from 起始向量
   * @param to 目标向量
   * @param t 插值参数 (0-1)
   * @returns 插值结果
   */
  static lerp(from: Vector2, to: Vector2, t: number): Vector2 {
    const clampedT = Math.max(0, Math.min(1, t));
    return from.add(to.subtract(from).multiply(clampedT));
  }

  /**
   * 计算两点间的距离
   * @param a 点A
   * @param b 点B
   * @returns 距离
   */
  static distance(a: Vector2, b: Vector2): number {
    return a.distanceTo(b);
  }

  /**
   * 从角度创建向量
   * @param angle 角度（弧度）
   * @param length 长度
   * @returns 向量
   */
  static fromAngle(angle: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }
}