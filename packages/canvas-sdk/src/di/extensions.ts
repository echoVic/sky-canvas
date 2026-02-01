/**
 * 服务扩展 - 基于 VSCode DI 架构
 */

import { SyncDescriptor } from './descriptors'
import type { BrandedService, ServiceIdentifier } from './instantiation'

const _registry: [ServiceIdentifier<unknown>, SyncDescriptor<unknown>][] = []

export enum InstantiationType {
  /**
   * Instantiate this service as soon as a consumer depends on it. _Note_ that this
   * is more costly as some upfront work is done that is likely not needed
   */
  Eager = 0,

  /**
   * Instantiate this service as soon as a consumer uses it. This is the _better_
   * way of registering a service.
   */
  Delayed = 1,
}

export function registerSingleton<T, Services extends BrandedService[]>(
  id: ServiceIdentifier<T>,
  ctor: new (...services: Services) => T,
  supportsDelayedInstantiation: InstantiationType
): void
export function registerSingleton<T, _Services extends BrandedService[]>(
  id: ServiceIdentifier<T>,
  descriptor: SyncDescriptor<T>
): void
export function registerSingleton<T, Services extends BrandedService[]>(
  id: ServiceIdentifier<T>,
  ctorOrDescriptor: { new (...services: Services): T } | SyncDescriptor<T>,
  supportsDelayedInstantiation?: boolean | InstantiationType
): void {
  if (!(ctorOrDescriptor instanceof SyncDescriptor)) {
    ctorOrDescriptor = new SyncDescriptor<T>(
      ctorOrDescriptor as new (
        ...args: unknown[]
      ) => T,
      [],
      Boolean(supportsDelayedInstantiation)
    )
  }

  _registry.push([id, ctorOrDescriptor])
}

export function getSingletonServiceDescriptors(): [
  ServiceIdentifier<unknown>,
  SyncDescriptor<unknown>,
][] {
  return _registry
}
