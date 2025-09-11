/**
 * 服务描述符 - 基于 VSCode DI 架构
 */

/**
 * 同步描述符类
 */
export class SyncDescriptor<T> {
  readonly ctor: any;
  readonly staticArguments: any[];
  readonly supportsDelayedInstantiation: boolean;

  constructor(ctor: new (...args: any[]) => T, staticArguments: any[] = [], supportsDelayedInstantiation: boolean = false) {
    this.ctor = ctor;
    this.staticArguments = staticArguments;
    this.supportsDelayedInstantiation = supportsDelayedInstantiation;
  }
}

/**
 * 简化版同步描述符接口
 */
export interface SyncDescriptor0<T> {
  readonly ctor: new () => T;
}
