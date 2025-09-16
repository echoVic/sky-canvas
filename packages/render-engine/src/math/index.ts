// 核心数学类
export { Matrix3x3, Matrix3 } from './Matrix3';
export { Rectangle } from './Rectangle';
export { Transform } from './Transform';
export { Vector2 } from './Vector2';

// 几何计算模块
export * from './Geometry';

// 数学工具函数
export class MathUtils {
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  static radiansToDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }
}