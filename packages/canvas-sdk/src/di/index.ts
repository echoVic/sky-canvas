/**
 * 依赖注入系统 - 完全重构版本
 * 基于 VSCode DI 架构，删除所有冗余内容
 */

// 引入 reflect-metadata 支持
import 'reflect-metadata'

export type { SyncDescriptor0 } from './descriptors'
// 依赖描述符
export { SyncDescriptor } from './descriptors'
// 服务扩展
export {
  getSingletonServiceDescriptors,
  InstantiationType,
  registerSingleton,
} from './extensions'
// 依赖关系图
export {
  Graph,
  type Node,
} from './graph'
// 实例化服务
export { InstantiationService } from './InstantiationService'
export type {
  BrandedService,
  GetLeadingNonServiceArgs,
  IConstructorSignature,
  IInstantiationService as IInstantiationServiceType,
  ServiceIdentifier,
  ServicesAccessor,
} from './instantiation'
// 核心服务标识符和装饰器
// 依赖注入核心接口
export {
  _util,
  createDecorator,
  IInstantiationService,
  refineServiceDecorator,
} from './instantiation'
// 服务集合
export { ServiceCollection } from './ServiceCollection'
