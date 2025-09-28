/**
 * Renderables 模块导出
 * 可渲染图形元素系统
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
export { Text } from './Text';
export type { TextConfig } from './Text';

// 便利导出类型
import type { Circle } from './Circle';
import type { Line } from './Line';
import type { Rectangle } from './Rectangle';
import type { Text } from './Text';
export type AnyRenderable = Circle | Rectangle | Line | Text;

// 图形类型枚举
export const RenderableType = {
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
  LINE: 'line',
  TEXT: 'text'
} as const;

export type RenderableTypeValue = typeof RenderableType[keyof typeof RenderableType];

// 保留向后兼容（暂时）
export type AnyShape = AnyRenderable;
export const ShapeType = RenderableType;
export type ShapeTypeValue = RenderableTypeValue;