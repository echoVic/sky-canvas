/**
 * Sky Canvas SDK - Public API
 *
 * @packageDocumentation
 */

// 主要工厂函数 - 创建SDK实例
export { createCanvasSDK } from './main';

// 核心类导出
export { CanvasSDK } from './CanvasSDK';

// 核心类型
export type { ICanvasSDKConfig } from './CanvasSDK';
export type { SDKConfig } from './main';

// 形状实体类型
export type {
  ICircleEntity,
  IPathEntity,
  IRectangleEntity,
  IShapeEntity,
  ITextEntity,
  ShapeEntity
} from './models/entities/Shape';
