/**
 * Sky Canvas引擎统一入口文件
 * 基于VSCode架构理念的完整导出
 */

// 核心应用程序
export { 
  SkyCanvasApplication, 
  ApplicationState,
  getApplication,
  createApplication,
  disposeApplication,
  type IApplicationServices,
  type IApplicationOptions
} from './core/Application';

// 依赖注入系统
export {
  ServiceCollection,
  SyncDescriptor,
  InstantiationService,
  createDecorator,
  type ServiceIdentifier,
  type IInstantiationService
} from './core/ServiceCollection';

// 服务注册表
export {
  ServiceRegistry,
  // 核心服务接口
  ICanvasService,
  IRenderEngineService,
  IInteractionService,
  IConfigurationService,
  IEventBusService,
  IExtensionService,
  // 业务服务接口
  ISceneService,
  ISelectionService,
  IHistoryService,
  IToolService,
  // 渲染服务接口
  IWebGLRenderer,
  IWebGPURenderer,
  ICanvas2DRenderer
} from './core/ServiceRegistry';

// 服务注册表类型（避免重复）
export type {
  ICanvas,
  IRenderer,
  IScene,
  IShape,
  ITool,
  ICommand
} from './core/ServiceRegistry';

// 事件系统
export {
  EventBus,
  Emitter,
  DisposableStore,
  MessageRouter,
  StateSynchronizationService
} from './events/EventBus';

// 事件系统类型（避免重复）
export type {
  IMessage,
  IMessageHandler,
  IMessageMiddleware,
  IStateChangeEvent,
  IStateSubscriber
} from './events/EventBus';

// 插件系统
export {
  ExtensionPointRegistry,
  ExtensionRegistry,
  ExtensionState,
  createBuiltinExtensionPoints
} from './plugins/ExtensionRegistry';

export {
  ExtensionLifecycleManager
} from './plugins/ExtensionLifecycleManager';

// 插件系统类型（避免重复）
export type {
  IExtensionPoint,
  IExtensionDescription,
  IExtensionManifest,
  IExtensionInstance,
  IExtensionContext,
  IMemento,
  JSONSchema
} from './plugins/ExtensionRegistry';

export type {
  IActivationEvent,
  IExtensionActivationResult
} from './plugins/ExtensionLifecycleManager';

// 性能优化
export {
  LazyLoadingService,
  LazyComponent,
  lazy,
  lazyReactComponent
} from './core/LazyLoadingService';

export type {
  ILazyComponent,
  IModuleLoader,
  ILoadingMetrics
} from './core/LazyLoadingService';

export {
  VirtualizationManager
} from './core/VirtualizationManager';

export type {
  ISceneObject,
  ILODLevel,
  IRenderItem,
  ICullingService,
  IBatchRenderer
} from './core/VirtualizationManager';

// 原有引擎组件
export { RenderEngine } from './RenderEngine';

// 数学库（明确导出避免Rectangle冲突）
export { Vector2, Matrix3x3, Transform, MathUtils } from './math';
export { Rectangle as MathRectangle } from './math';

// 交互系统
export * from './interaction';

// 渲染器
export * from './renderers';

// 插件系统（原有）
export * from './plugins';

// 核心类型（原有，排除Rectangle避免冲突）
export * from './core';

// 统一导出常用类型（避免重复定义）
export type {
  IEvent,
  IDisposable
} from './events/EventBus';

export type {
  IViewport
} from './core/ServiceRegistry';

export type {
  IExtension
} from './plugins/ExtensionRegistry';

import { RenderEngine } from './RenderEngine';
import { Circle, Line, Text } from './core/shapes';
import { Rectangle as ShapeRectangle } from './core/shapes';

/**
 * 创建Canvas2D渲染引擎实例
 */
export function createCanvasRenderEngine(): RenderEngine {
  return new RenderEngine('canvas2d');
}

/**
 * 快速创建基础图形的便利函数
 */
export const ShapeFactory = {
  createRectangle: (id: string, x: number, y: number, width: number, height: number, filled = false) => 
    new ShapeRectangle(id, x, y, width, height, filled),
    
  createCircle: (id: string, centerX: number, centerY: number, radius: number, filled = false) => 
    new Circle(id, centerX, centerY, radius, filled),
    
  createLine: (id: string, startX: number, startY: number, endX: number, endY: number) => 
    new Line(id, { x: startX, y: startY }, { x: endX, y: endY }),
    
  createText: (id: string, text: string, x: number, y: number, font = '16px Arial') => 
    new Text(id, text, x, y, font)
};

/**
 * 渲染引擎版本信息
 */
export const VERSION = '1.0.0';

/**
 * 支持的渲染器类型
 */
export const SUPPORTED_RENDERERS = ['canvas2d'] as const;

export type SupportedRenderer = typeof SUPPORTED_RENDERERS[number];
