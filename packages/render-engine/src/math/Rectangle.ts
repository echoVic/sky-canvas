/**
 * Rectangle类 - 矩形几何类型
 * 提供完整的矩形操作方法
 */

import { Vector2 } from './Vector2';

export class Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  get center(): Vector2 {
    return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
  }

  get topLeft(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  get topRight(): Vector2 {
    return new Vector2(this.right, this.y);
  }

  get bottomLeft(): Vector2 {
    return new Vector2(this.x, this.bottom);
  }

  get bottomRight(): Vector2 {
    return new Vector2(this.right, this.bottom);
  }

  contains(point: Vector2): boolean;
  contains(x: number, y: number): boolean;
  contains(pointOrX: Vector2 | number, y?: number): boolean {
    if (typeof pointOrX === 'number') {
      const x = pointOrX;
      const pointY = y!;
      return x >= this.x && x <= this.right && pointY >= this.y && pointY <= this.bottom;
    } else {
      const point = pointOrX;
      return point.x >= this.x && point.x <= this.right && point.y >= this.y && point.y <= this.bottom;
    }
  }

  intersects(other: Rectangle): boolean {
    return !(other.right < this.x || 
             other.x > this.right || 
             other.bottom < this.y || 
             other.y > this.bottom);
  }

  union(other: Rectangle): Rectangle {
    const left = Math.min(this.x, other.x);
    const top = Math.min(this.y, other.y);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    
    return new Rectangle(left, top, right - left, bottom - top);
  }

  intersection(other: Rectangle): Rectangle | null {
    if (!this.intersects(other)) {
      return null;
    }

    const left = Math.max(this.x, other.x);
    const top = Math.max(this.y, other.y);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);

    return new Rectangle(left, top, right - left, bottom - top);
  }

  expand(amount: number): Rectangle {
    return new Rectangle(
      this.x - amount,
      this.y - amount,
      this.width + amount * 2,
      this.height + amount * 2
    );
  }

  scale(factor: number): Rectangle {
    const center = this.center;
    const newWidth = this.width * factor;
    const newHeight = this.height * factor;
    
    return new Rectangle(
      center.x - newWidth / 2,
      center.y - newHeight / 2,
      newWidth,
      newHeight
    );
  }

  translate(offset: Vector2): Rectangle {
    return new Rectangle(
      this.x + offset.x,
      this.y + offset.y,
      this.width,
      this.height
    );
  }

  clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }

  equals(other: Rectangle): boolean {
    return this.x === other.x && 
           this.y === other.y && 
           this.width === other.width && 
           this.height === other.height;
  }

  isEmpty(): boolean {
    return this.width <= 0 || this.height <= 0;
  }

  getArea(): number {
    return this.width * this.height;
  }

  getPerimeter(): number {
    return 2 * (this.width + this.height);
  }

  toString(): string {
    return `Rectangle(${this.x}, ${this.y}, ${this.width}, ${this.height})`;
  }

  toJSON(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  static fromJSON(data: { x: number; y: number; width: number; height: number }): Rectangle {
    return new Rectangle(data.x, data.y, data.width, data.height);
  }

  static fromPoints(p1: Vector2, p2: Vector2): Rectangle {
    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const right = Math.max(p1.x, p2.x);
    const bottom = Math.max(p1.y, p2.y);
    
    return new Rectangle(left, top, right - left, bottom - top);
  }

  static fromCenter(center: Vector2, width: number, height: number): Rectangle {
    return new Rectangle(
      center.x - width / 2,
      center.y - height / 2,
      width,
      height
    );
  }

  static zero(): Rectangle {
    return new Rectangle(0, 0, 0, 0);
  }

  static unit(): Rectangle {
    return new Rectangle(0, 0, 1, 1);
  }
}