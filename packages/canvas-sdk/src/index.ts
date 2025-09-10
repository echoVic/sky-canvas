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

// SDK 工厂
export {
  CanvasSDKFactory, 
  canvasSDKFactory, 
  createCanvasSDK, 
  createCanvasSDKWithPlugins, 
  createCanvasSDKWithServices, 
  createDebugCanvasSDK,
  createMVVMCanvasSDK,
  type CanvasSDKFactoryOptions, 
  type ICanvasSDKPlugin
} from './CanvasSDKFactory';

// MVVM扩展
export {
  CanvasSDKMVVMExtension,
  addMVVMExtension,
  type IMVVMExtensionConfig
} from './CanvasSDKMVVMExtension';

// =========================================
// 服务实现（适用于扩展）
// =========================================
export { ConfigurationService } from './services/ConfigurationService';
export { EventBusService } from './services/EventBusService';
export { LogService } from './services/LogService';

// MVVM 集成服务
export {
  createEnhancedServiceManager, EnhancedServiceManager, getServiceManager,
  initializeGlobalServiceManager
} from './services/EnhancedServiceManager';
export { MVVMIntegrationService } from './services/MVVMIntegrationService';

// 服务标识符（为了兼容性）
export {
  IConfigurationService as IConfigurationServiceId, IEventBusService as IEventBusServiceId,
  ILogService as ILogServiceId
} from './di/ServiceIdentifiers';

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

// 事件发射器 (为了兼容性)
export { EventEmitter } from './events/EventEmitter';

// =========================================
// 交互系统 - 保留完整导出
// =========================================
export * from './interaction/index';

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
// MVVM 架构支持
// =========================================
export * from './models';
export * from './viewmodels';
export * from './views';

// =========================================
// 便捷的默认导出
// =========================================

// 导入所需的函数和类以用于默认导出
import { CanvasSDK } from './CanvasSDK';
import {
  canvasSDKFactory,
  createCanvasSDK,
  createCanvasSDKWithPlugins,
  createDebugCanvasSDK
} from './CanvasSDKFactory';
import { InstantiationService, ServiceCollection } from './di';
// 移除独立MVVM SDK的引用
import {
  createEnhancedServiceManager,
  initializeGlobalServiceManager
} from './services/EnhancedServiceManager';
import { createMVVMCanvasSDK } from './CanvasSDKFactory';
import { addMVVMExtension } from './CanvasSDKMVVMExtension';

// MVVM使用示例
export { 
  IntegratedMVVMExample, 
  createIntegratedMVVMExample, 
  runIntegratedMVVMExample 
} from './examples/IntegratedMVVMExample';

export default {
  // SDK 构造函数
  create: createCanvasSDK,
  createWithPlugins: createCanvasSDKWithPlugins,
  createDebug: createDebugCanvasSDK,
  createMVVM: createMVVMCanvasSDK,
  
  // 工厂实例
  factory: canvasSDKFactory,
  
  // 核心类
  CanvasSDK,
  ServiceCollection,
  InstantiationService,
  
  // MVVM扩展
  addMVVMExtension,
  
  // 服务管理器
  createEnhancedServiceManager,
  initializeGlobalServiceManager
};
