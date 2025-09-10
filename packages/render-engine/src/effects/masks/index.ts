/**
 * 遮罩系统主入口
 */

// 类型导出
export * from '../types/MaskTypes';

// 基础类导出
export { BaseMask } from './BaseMask';

// 具体遮罩类导出
export { RectangleMask } from './RectangleMask';
export { CircleMask } from './CircleMask';
export { EllipseMask } from './EllipseMask';
export { PolygonMask } from './PolygonMask';
export { PathMask } from './PathMask';
export { CustomMask } from './CustomMask';

// 工厂和管理器导出
export { MaskFactory } from './MaskFactory';
export { MaskManager } from './MaskManager';
export { MaskRenderer } from './MaskRenderer';

// 便捷创建函数
import { MaskFactory } from './MaskFactory';
import { Point2D } from '../../animation/types/PathTypes';

/**
 * 快速创建常用遮罩的便捷函数
 */

/**
 * 创建圆形剪切遮罩
 */
export function createCircleClip(center: Point2D, radius: number) {
  return MaskFactory.createCircleClip(center, radius);
}

/**
 * 创建矩形剪切遮罩
 */
export function createRectangleClip(position: Point2D, width: number, height: number) {
  return MaskFactory.createRectangleClip(position, width, height);
}

/**
 * 创建羽化圆形遮罩
 */
export function createFeatheredCircle(center: Point2D, radius: number, featherRadius: number) {
  return MaskFactory.createFeatheredCircle(center, radius, featherRadius);
}

/**
 * 创建径向渐变遮罩
 */
export function createRadialGradient(center: Point2D, innerRadius: number, outerRadius: number) {
  return MaskFactory.createRadialGradient(center, innerRadius, outerRadius);
}

/**
 * 创建线性渐变遮罩
 */
export function createLinearGradient(start: Point2D, end: Point2D, width: number) {
  return MaskFactory.createLinearGradient(start, end, width);
}

/**
 * 创建文本遮罩
 */
export function createTextMask(text: string, font: string, position: Point2D) {
  return MaskFactory.createTextMask(text, font, position);
}

/**
 * 创建星形遮罩
 */
export function createStarMask(center: Point2D, outerRadius: number, innerRadius: number, points: number = 5) {
  return MaskFactory.createStarMask(center, outerRadius, innerRadius, points);
}