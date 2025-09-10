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
  inject as Inject,
  injectable as Injectable,
  InstantiationService,
  ServiceCollection
} from './di';

export type {
  Optional,
  ServiceIdentifier,
  ServiceLifecycle
} from './di';

// =========================================
// 核心SDK与工厂
// =========================================

// 核心 SDK
export {
  CanvasSDK
} from './CanvasSDK';

export type {
  ICanvasSDKConfig
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

// 注意：形状相关类型已移动到 models 中

// =========================================
// 历史记录系统 - 撤销重做、事务、命令模式
// =========================================
export {
  CollectionAddCommand, CollectionMoveCommand, CollectionRemoveCommand, CommandBuilder, CompositeCommand, FunctionCommand, HistoryManager, MultiPropertyChangeCommand, PropertyChangeCommand, transactional,
  transactionalAsync, TransactionManager
} from './history';

// 明确导出ICommand以解决歧义
export type { ICommand } from './history/HistoryManager';

// =========================================
// 业务层组件 - 复杂业务逻辑  
// =========================================
export * from './business';

// =========================================
// 管理器层 - 协调 Services 和 Business 层
// =========================================
export * from './managers';

// =========================================
// 工具系统
// =========================================
export { CircleTool, LineTool, RectangleTool } from './tools';

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
// 数据模型 - 使用 MVVM 架构中的 Model 层
// =========================================
export * from './models';

// =========================================
// 事件系统
// =========================================
export * from './events';

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
