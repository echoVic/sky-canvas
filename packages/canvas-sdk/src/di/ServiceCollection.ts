/**
 * 服务集合 - 基于 VSCode DI 架构
 */

import type { SyncDescriptor } from './descriptors'
import type { ServiceIdentifier } from './instantiation'

/**
 * 服务集合类
 */
export class ServiceCollection {
  private _entries = new Map<ServiceIdentifier<unknown>, unknown>()

  constructor(...entries: [ServiceIdentifier<unknown>, unknown][]) {
    for (const [id, service] of entries) {
      this.set(id, service)
    }
  }

  set<T>(
    id: ServiceIdentifier<T>,
    instanceOrDescriptor: T | SyncDescriptor<T>
  ): T | SyncDescriptor<T> {
    const result = this._entries.get(id)
    this._entries.set(id, instanceOrDescriptor)
    return result
  }

  has(id: ServiceIdentifier<unknown>): boolean {
    return this._entries.has(id)
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    return this._entries.get(id)
  }
}
