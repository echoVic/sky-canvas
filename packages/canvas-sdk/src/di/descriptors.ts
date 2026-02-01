/**
 * 服务描述符 - 基于 VSCode DI 架构
 */

/**
 * 同步描述符类
 */
export class SyncDescriptor<T, Args extends unknown[] = unknown[]> {
  readonly ctor: new (
    ...args: Args
  ) => T
  readonly staticArguments: Args
  readonly supportsDelayedInstantiation: boolean

  constructor(
    ctor: new (...args: Args) => T,
    staticArguments: Args = [] as Args,
    supportsDelayedInstantiation: boolean = false
  ) {
    this.ctor = ctor
    this.staticArguments = staticArguments
    this.supportsDelayedInstantiation = supportsDelayedInstantiation
  }
}

/**
 * 简化版同步描述符接口
 */
export interface SyncDescriptor0<T> {
  readonly ctor: new () => T
}
