/**
 * 依赖注入系统统一导出
 */

// 引入 reflect-metadata 以支持依赖注入
import 'reflect-metadata';

// 核心服务标识符和装饰器
export { 
  ServiceIdentifier, 
  ServiceLifecycle, 
  injectable, 
  inject, 
  optional,
  // 辅助函数
  isInjectable,
  getInjectTokens,
  getOptionalInjectTokens
} from './ServiceIdentifier';

// 服务集合和注册
export { 
  ServiceCollection,
  type ServiceDescriptor,
  type Newable,
  type ServiceFactory,
  type ServiceInstance,
  type ServicesAccessor
} from './ServiceCollection';

// 实例化服务
export { InstantiationService } from './InstantiationService';

// 服务接口与标识符
export * from './ServiceIdentifiers';

// 便捷的别名导出
export { injectable as Injectable } from './ServiceIdentifier';
export { inject as Inject } from './ServiceIdentifier';
export { optional as Optional } from './ServiceIdentifier';
