import { Point, Rect } from '../../types';

export class MathUtils {
  static distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
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
    return {
      x: (point.x - pan.x) * zoom,
      y: (point.y - pan.y) * zoom
    };
  }

  static inverseTransformPoint(point: Point, zoom: number, pan: Point): Point {
    return {
      x: point.x / zoom + pan.x,
      y: point.y / zoom + pan.y
    };
  }
}
