/**
 * Sky Canvas SDK
 * 完整的画板SDK，包含渲染引擎和交互系统
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

// 形状实现
export { PathShape } from './scene/PathShape';

export type {
  ICanvasSDKEvents,
  ICanvasSDKConfig,
  RenderEngineType
} from './core/CanvasSDK';

export type {
  ICommand
} from './core/HistoryManager';

// 核心实现
export { CanvasSDK } from './core/CanvasSDK';
export { HistoryManager } from './core/HistoryManager';
export { EventEmitter } from './events/EventEmitter';

// 交互系统 - 完整导出
export * from './interaction/index';

// 工具系统
export * from './tools/index';

// 插件系统
export * from './plugins/index';

// AI扩展
export * from './ai/index';

// 工具函数
export * from './utils/index';