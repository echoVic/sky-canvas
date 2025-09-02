/**
 * 2D向量类
 * 提供完整的2D向量数学运算功能
 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // 静态常量
  static readonly ZERO = new Vector2(0, 0);
  static readonly ONE = new Vector2(1, 1);
  static readonly UP = new Vector2(0, -1);
  static readonly DOWN = new Vector2(0, 1);
  static readonly LEFT = new Vector2(-1, 0);
  static readonly RIGHT = new Vector2(1, 0);

  // 基础操作
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): Vector2 {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(other: Vector2): Vector2 {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  // 向量运算
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  addInPlace(other: Vector2): Vector2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  subtractInPlace(other: Vector2): Vector2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  multiplyInPlace(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  // 别名方法，为了兼容性
  multiplyScalar(scalar: number): Vector2 {
    return this.multiply(scalar);
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Division by zero');
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  divideInPlace(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Division by zero');
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  // 向量属性
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // 别名方法，为了兼容性
  magnitude(): number {
    return this.length();
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return this.divide(len);
  }

  normalizeInPlace(): Vector2 {
    const len = this.length();
    if (len === 0) {
      this.x = 0;
      this.y = 0;
    } else {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  // 向量关系
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  distance(other: Vector2): number {
    return this.subtract(other).length();
  }

  distanceSquared(other: Vector2): number {
    return this.subtract(other).lengthSquared();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(other: Vector2): number {
    return Math.atan2(this.cross(other), this.dot(other));
  }

  // 向量变换
  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  rotateInPlace(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  perpendicular(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  reflect(normal: Vector2): Vector2 {
    const normalizedNormal = normal.normalize();
    return this.subtract(normalizedNormal.multiply(2 * this.dot(normalizedNormal)));
  }

  // 插值
  lerp(other: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  // 比较
  equals(other: Vector2, epsilon: number = 1e-10): boolean {
    return Math.abs(this.x - other.x) < epsilon && Math.abs(this.y - other.y) < epsilon;
  }

  // 工具方法
  toString(): string {
    return `Vector2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  // 静态方法
  static fromAngle(angle: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static fromArray(arr: [number, number]): Vector2 {
    return new Vector2(arr[0], arr[1]);
  }

  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return a.lerp(b, t);
  }

  static distance(a: Vector2, b: Vector2): number {
    return a.distance(b);
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.dot(b);
  }

  static cross(a: Vector2, b: Vector2): number {
    return a.cross(b);
  }
}