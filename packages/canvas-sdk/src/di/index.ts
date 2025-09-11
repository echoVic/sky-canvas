/**
 * 依赖注入系统 - 完全重构版本
 * 基于 VSCode DI 架构，删除所有冗余内容
 */

// 引入 reflect-metadata 支持
import 'reflect-metadata';

// 核心服务标识符和装饰器
export {
  _util, createDecorator,
  refineServiceDecorator
} from './instantiation';

export type {
  BrandedService, ServiceIdentifier, ServicesAccessor
} from './instantiation';

// 依赖描述符
export {
  SyncDescriptor
} from './descriptors';

export type {
  SyncDescriptor0
} from './descriptors';

// 依赖关系图
export {
  Graph,
  type Node
} from './graph';

// 服务扩展
export {
  registerSingleton,
  getSingletonServiceDescriptors,
  InstantiationType
} from './extensions';

// 依赖注入核心接口
export {
  IInstantiationService
} from './instantiation';

export type {
  GetLeadingNonServiceArgs, IConstructorSignature, IInstantiationService as IInstantiationServiceType
} from './instantiation';

// 服务集合
export {
  ServiceCollection
} from './ServiceCollection';

// 实例化服务
export {
  InstantiationService
} from './InstantiationService';
