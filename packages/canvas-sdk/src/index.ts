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

// 核心 SDK
export {
  CanvasSDK
} from './CanvasSDK';

export type {
  ICanvasSDKConfig
} from './CanvasSDK';

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
// 历史服务和命令
export {
  AsyncCommandWrapper, CollectionAddCommand, CollectionMoveCommand, CollectionRemoveCommand, CommandBuilder, CompositeCommand, FunctionCommand, HistoryService, MultiPropertyChangeCommand, PropertyChangeCommand
} from './services';

// 事务管理器
export {
  transactional,
  transactionalAsync, TransactionManager
} from './managers';

// 类型导出
export type { ITransactionManager } from './managers';
export type {
  ICommand, IHistoryService
} from './services';

// =========================================
// 业务层组件 - 已重构到 Managers 和 Services
// =========================================
// 业务逻辑现在由 Managers 和 Services 处理

// =========================================
// 管理器层 - 协调 Services 和 Business 层
// =========================================
export * from './managers';

// =========================================
// ViewModel 层 - MVVM 架构
// =========================================
export * from './viewmodels';

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
// 类型定义
// =========================================
export * from './models/types';

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
