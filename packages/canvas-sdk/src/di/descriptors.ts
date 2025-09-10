/**
 * 依赖描述符 - 参考 VSCode DI 架构
 * 用于描述服务的创建方式和依赖关系
 */

import { ServicesAccessor } from './ServiceIdentifier';

/**
 * 同步描述符 - 用于同步创建服务实例
 */
export class SyncDescriptor<T = any> {
  readonly ctor: new (...args: any[]) => T;
  readonly staticArguments: any[];
  readonly supportsDelayedInstantiation: boolean;

  constructor(
    ctor: new (...args: any[]) => T,
    staticArguments: any[] = [],
    supportsDelayedInstantiation: boolean = false
  ) {
    this.ctor = ctor;
    this.staticArguments = staticArguments;
    this.supportsDelayedInstantiation = supportsDelayedInstantiation;
  }
}

/**
 * 简化版同步描述符接口
 */
export interface SyncDescriptor0<T = any> {
  readonly ctor: new () => T;
}

/**
 * 异步描述符 - 用于异步创建服务实例
 */
export class AsyncDescriptor<T = any> {
  readonly factory: (accessor: ServicesAccessor) => Promise<T>;

  constructor(factory: (accessor: ServicesAccessor) => Promise<T>) {
    this.factory = factory;
  }
}

/**
 * 服务描述符类型
 */
export type ServiceDescriptor<T = any> = 
  | SyncDescriptor<T>
  | AsyncDescriptor<T>
  | ((accessor: ServicesAccessor) => T)
  | ((accessor: ServicesAccessor) => Promise<T>);

// 删除工厂函数，直接使用 new SyncDescriptor() 和 new AsyncDescriptor() 创建实例