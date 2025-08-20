// 导出核心数学库
export { Matrix3x3 } from './Matrix3x3';
export { Rectangle } from './Rectangle';
export { Transform } from './Transform';
export { Vector2 } from './Vector2';

// 导出兼容的工具类
import { Point, Rect } from '../../types';
import { Vector2 } from './Vector2';

export class MathUtils {
  static distance(p1: Point, p2: Point): number {
    return Vector2.distance(new Vector2(p1.x, p1.y), new Vector2(p2.x, p2.y));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static pointInRect(point: Point, rect: Rect): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width &&
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }

  static transformPoint(point: Point, zoom: number, pan: Point): Point {
    const result = new Vector2((point.x - pan.x) * zoom, (point.y - pan.y) * zoom);
    return { x: result.x, y: result.y };
  }

  static inverseTransformPoint(point: Point, zoom: number, pan: Point): Point {
    const result = new Vector2(point.x / zoom + pan.x, point.y / zoom + pan.y);
    return { x: result.x, y: result.y };
  }

  // 新增便利方法
  static toVector2(point: Point): Vector2 {
    return new Vector2(point.x, point.y);
  }

  static toPoint(vector: Vector2): Point {
    return { x: vector.x, y: vector.y };
  }

  static degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  static radiansToDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }
}
