/**
 * Sky Canvas SDK
 * 基于依赖注入的现代化画板SDK
 */

// 引入 reflect-metadata 以支持依赖注入
import 'reflect-metadata';

// =========================================
// 核心 DI 系统导出
// =========================================

// 核心 DI 系统（从 di 文件夹导入）
export * from './di';

// 为了兼容性，也提供直接导出
export {
  Inject, Injectable, InstantiationService, Optional,
  ServiceCollection, ServiceIdentifier,
  ServiceLifecycle
} from './di';

// =========================================
// 核心SDK与工厂
// =========================================

// 核心 SDK
export {
  CanvasSDK,
  type ICanvasSDKConfig,
  type ICanvasSDKEvents
} from './CanvasSDK';

// MVVM服务支持（通过DI集成）
// MVVM模式通过依赖注入服务提供，而不是独立的SDK

// SDK 基础支持
// 注意：简化的架构中直接使用 CanvasSDK，不需要额外的工厂类

// =========================================
// 服务层导出
// =========================================
export * from './services';

// =========================================
// 旧版核心类型和接口（保留兼容性）
// =========================================

// 核心类型和接口
export type {
  IShape, IShapeEvent,
  IShapeSelectionEvent, IShapeUpdate, ISize,
  ShapeType
} from './scene/IShape';

// 形状实现
export { PathShape } from './scene/PathShape';

export type {
  ICommand
} from './core/HistoryManager';

// 历史记录管理器 (为了兼容性)
export { HistoryManager } from './core/HistoryManager';

// 旧版 Canvas SDK 已移除
// LegacyCanvasSDK 已完全迁移到新的 CanvasSDK

// =========================================
// 业务层组件 - 复杂业务逻辑
// =========================================
export * from './business';

// =========================================
// 工具系统
// =========================================
export * from './tools/index';

// =========================================
// 插件系统
// =========================================
export * from './plugins/index';

// =========================================
// AI 扩展
// =========================================
export * from './ai/index';

// =========================================
// 工具函数
// =========================================
export * from './utils/index';

// =========================================
// 场景与数据模型
// =========================================
export * from './models';
export * from './scene';

// =========================================
// 便捷的默认导出
// =========================================

// 导入核心类
import { CanvasSDK } from './CanvasSDK';
import { InstantiationService, ServiceCollection } from './di';

export default {
  // 核心类
  CanvasSDK,
  ServiceCollection,
  InstantiationService,
};
