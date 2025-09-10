/**
 * 依赖注入系统 - 完全重构版本
 * 基于 VSCode DI 架构，删除所有冗余内容
 */

// 引入 reflect-metadata 支持
import 'reflect-metadata';

// 核心服务标识符和装饰器
export {
  createServiceIdentifier, getInjectTokens,
  getOptionalInjectTokens, inject, INJECT_METADATA_KEY, injectable, INJECTABLE_METADATA_KEY, isInjectable, optional, OPTIONAL_INJECT_METADATA_KEY, ServicesAccessor,
  ServiceScope
} from './ServiceIdentifier';

export type {
  ServiceDescriptor, ServiceIdentifier, ServiceLifecycle
} from './ServiceIdentifier';

// 依赖描述符
export {
  AsyncDescriptor, SyncDescriptor, type ServiceDescriptor as ServiceDescriptorType, type SyncDescriptor0
} from './descriptors';

// 依赖关系图
export {
  Graph,
  type Node
} from './graph';

// 插件系统和装饰器
export {
  extension,
  extensionPoint, ExtensionPointRegistry, getSingleton,
  registerSingleton, service, SingletonServiceRegistry, type IExtensionDescriptor, type IExtensionPointDescriptor
} from './extensions';

// 依赖注入高级特性
export {
  DI_DEPENDENCIES, DI_TARGET, getDependencies, isAsyncDescriptor, isSyncDescriptor, ServiceLifetime
} from './instantiation';

export type {
  BrandedService, IInstantiationService,
  IInstantiationServiceOptions, IServiceCollection, Optional,
  ServiceRegistration
} from './instantiation';

// 服务集合
export {
  ServiceCollection,
  type Newable,
  type ServiceFactory,
  type ServiceInstance
} from './ServiceCollection';

// 实例化服务
export {
  CircularDependencyError, DependencyResolutionError, InstantiationService, ServiceNotRegisteredError
} from './InstantiationService';
