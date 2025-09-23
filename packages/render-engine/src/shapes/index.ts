/**
 * Shapes 模块导出
 * 图形系统
 */

// 基类和接口
export { Shape } from './Shape';
export type { ShapeConfig, ShapeStyle } from './Shape';

// 具体图形实现
export { Circle } from './Circle';
export type { CircleConfig } from './Circle';
export { Line } from './Line';
export type { LineConfig } from './Line';
export { Rectangle } from './Rectangle';
export type { RectangleConfig } from './Rectangle';

// 便利导出类型
import type { Circle } from './Circle';
import type { Line } from './Line';
import type { Rectangle } from './Rectangle';
export type AnyShape = Circle | Rectangle | Line;

// 形状类型枚举
export const ShapeType = {
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
  LINE: 'line'
} as const;

export type ShapeTypeValue = typeof ShapeType[keyof typeof ShapeType];