/**
 * Sky Canvas SDK
 * 框架无关的画布绘制和交互SDK
 */

// 核心类型和接口
export type { 
  IShape,
  IShapeUpdate,
  IShapeEvent,
  IShapeSelectionEvent,
  ISize,
  ShapeType 
} from './scene/IShape';

export type {
  ICanvasSDKEvents
} from './core/CanvasSDK';

export type {
  ICommand
} from './core/HistoryManager';

// 核心实现
export { CanvasSDK } from './core/CanvasSDK';
export { HistoryManager } from './core/HistoryManager';
export { EventEmitter } from './events/EventEmitter';

// 工具类
export * from './utils/index';

// 插件系统
export * from './plugins/index';

// 交互系统
export * from './interaction/index';

// AI扩展
export * from './ai/index';

// 工具系统
export * from './tools/index';