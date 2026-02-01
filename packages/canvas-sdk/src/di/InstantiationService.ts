/**
 * 实例化服务 - 基于 VSCode DI 架构
 */

import { illegalState } from './common/errors'
import { type DisposableStore, dispose, isDisposable } from './common/lifecycle'
import { SyncDescriptor, type SyncDescriptor0 } from './descriptors'
import { Graph } from './graph'
import {
  _util,
  type GetLeadingNonServiceArgs,
  IInstantiationService,
  type ServiceIdentifier,
  type ServicesAccessor,
} from './instantiation'
import { ServiceCollection } from './ServiceCollection'

class CyclicDependencyError extends Error {
  constructor(graph: Graph<unknown>) {
    super('cyclic dependency between services')
    this.message =
      graph.findCycleSlow() ?? `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`
  }
}

export class InstantiationService implements IInstantiationService {
  declare readonly _serviceBrand: undefined

  readonly _globalGraph?: Graph<string>

  private _isDisposed = false
  private readonly _servicesToMaybeDispose = new Set<unknown>()
  private readonly _children = new Set<InstantiationService>()

  constructor(
    private readonly _services: ServiceCollection = new ServiceCollection(),
    private readonly _strict: boolean = false,
    private readonly _parent?: InstantiationService
  ) {
    this._services.set(IInstantiationService, this)
  }

  dispose(): void {
    if (!this._isDisposed) {
      this._isDisposed = true
      // dispose all child services
      dispose(this._children)
      this._children.clear()

      // dispose all services created by this service
      for (const candidate of this._servicesToMaybeDispose) {
        if (isDisposable(candidate)) {
          candidate.dispose()
        }
      }
      this._servicesToMaybeDispose.clear()
    }
  }

  private _throwIfDisposed(): void {
    if (this._isDisposed) {
      throw new Error('InstantiationService has been disposed')
    }
  }

  createChild(services: ServiceCollection, store?: DisposableStore): IInstantiationService {
    this._throwIfDisposed()

    const that = this
    const result = new (class extends InstantiationService {
      override dispose(): void {
        that._children.delete(result)
        super.dispose()
      }
    })(services, this._strict, this)
    this._children.add(result)

    store?.add(result)
    return result
  }

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R {
    this._throwIfDisposed()

    let _done = false
    try {
      const accessor: ServicesAccessor = {
        get: <T>(id: ServiceIdentifier<T>) => {
          if (_done) {
            throw illegalState(
              'service accessor is only valid during the invocation of its target method'
            )
          }

          const result = this._getOrCreateServiceInstance(id)
          if (!result) {
            throw new Error(`[invokeFunction] unknown service '${id}'`)
          }
          return result
        },
        getIfExists: <T>(id: ServiceIdentifier<T>) => {
          if (_done) {
            throw illegalState(
              'service accessor is only valid during the invocation of its target method'
            )
          }
          const result = this._getOrCreateServiceInstance(id)
          return result
        },
      }
      return fn(accessor, ...args)
    } finally {
      _done = true
    }
  }

  createInstance<T>(descriptor: SyncDescriptor0<T>): T
  createInstance<Ctor extends new (...args: unknown[]) => unknown, R extends InstanceType<Ctor>>(
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R
  createInstance(
    ctorOrDescriptor: SyncDescriptor<unknown> | (new (...args: unknown[]) => unknown),
    ...rest: unknown[]
  ): unknown {
    this._throwIfDisposed()

    let result: unknown
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      result = this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(rest)
      )
    } else {
      result = this._createInstance(ctorOrDescriptor, rest)
    }
    return result
  }

  private _createInstance<T>(ctor: new (...args: unknown[]) => T, args: unknown[] = []): T {
    // arguments defined by service decorators
    const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index)
    const serviceArgs: unknown[] = []
    for (const dependency of serviceDependencies) {
      const service = this._getOrCreateServiceInstance(dependency.id)
      if (!service) {
        this._throwIfStrict(
          `[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`,
          false
        )
      }
      serviceArgs.push(service)
    }

    const firstServiceArgPos =
      serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length

    // check for argument mismatches, adjust static args if needed
    if (args.length !== firstServiceArgPos) {
      console.trace(
        `[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`
      )

      const delta = firstServiceArgPos - args.length
      if (delta > 0) {
        args = args.concat(new Array(delta))
      } else {
        args = args.slice(0, firstServiceArgPos)
      }
    }

    // now create the instance
    return Reflect.construct(ctor, args.concat(serviceArgs))
  }

  private _setCreatedServiceInstance<T>(id: ServiceIdentifier<T>, instance: T): void {
    if (this._services.get(id) instanceof SyncDescriptor) {
      this._services.set(id, instance)
    } else if (this._parent) {
      this._parent._setCreatedServiceInstance(id, instance)
    } else {
      throw new Error('illegalState - setting UNKNOWN service instance')
    }
  }

  private _getServiceInstanceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    const instanceOrDesc = this._services.get(id)
    if (!instanceOrDesc && this._parent) {
      return this._parent._getServiceInstanceOrDescriptor(id)
    } else {
      return instanceOrDesc
    }
  }

  protected _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>): T {
    const thing = this._getServiceInstanceOrDescriptor(id)
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id, thing)
    } else {
      return thing
    }
  }

  private readonly _activeInstantiations = new Set<ServiceIdentifier<unknown>>()

  private _safeCreateAndCacheServiceInstance<T>(
    id: ServiceIdentifier<T>,
    desc: SyncDescriptor<T>
  ): T {
    if (this._activeInstantiations.has(id)) {
      throw new Error(`illegal state - RECURSIVELY instantiating service '${id}'`)
    }
    this._activeInstantiations.add(id)
    try {
      return this._createAndCacheServiceInstance(id, desc)
    } finally {
      this._activeInstantiations.delete(id)
    }
  }

  private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>): T {
    type Triple = { id: ServiceIdentifier<unknown>; desc: SyncDescriptor<unknown> }
    const graph = new Graph<Triple>((data) => data.id.toString())

    let cycleCount = 0
    const stack = [{ id, desc }]
    const seen = new Set<string>()
    while (stack.length) {
      const item = stack.pop()
      if (!item) {
        break
      }

      if (seen.has(String(item.id))) {
        continue
      }
      seen.add(String(item.id))

      graph.lookupOrInsertNode(item)

      // a weak but working heuristic for cycle checks
      if (cycleCount++ > 1000) {
        throw new CyclicDependencyError(graph)
      }

      // check all dependencies for existence and if they need to be created first
      for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id)
        if (!instanceOrDesc) {
          this._throwIfStrict(
            `[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`,
            true
          )
        }

        if (instanceOrDesc instanceof SyncDescriptor) {
          const d = { id: dependency.id, desc: instanceOrDesc }
          graph.insertEdge(item, d)
          stack.push(d)
        }
      }
    }

    while (true) {
      const roots = graph.roots()

      // if there is no more roots but still
      // nodes in the graph we have a cycle
      if (roots.length === 0) {
        if (!graph.isEmpty()) {
          throw new CyclicDependencyError(graph)
        }
        break
      }

      for (const { data } of roots) {
        // Repeat the check for this still being a service sync descriptor. That's because
        // instantiating a dependency might have side-effect and recursively trigger instantiation
        // so that some dependencies are now fullfilled already.
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id)
        if (instanceOrDesc instanceof SyncDescriptor) {
          // create instance and overwrite the service collections
          const instance = this._createServiceInstanceWithOwner(
            data.id,
            data.desc.ctor,
            data.desc.staticArguments,
            data.desc.supportsDelayedInstantiation
          )
          this._setCreatedServiceInstance(data.id, instance)
        }
        graph.removeNode(data)
      }
    }
    return <T>this._getServiceInstanceOrDescriptor(id)
  }

  private _createServiceInstanceWithOwner<T>(
    id: ServiceIdentifier<T>,
    ctor: new (...args: unknown[]) => T,
    args: unknown[] = [],
    supportsDelayedInstantiation: boolean
  ): T {
    if (this._services.get(id) instanceof SyncDescriptor) {
      return this._createServiceInstance(
        id,
        ctor,
        args,
        supportsDelayedInstantiation,
        this._servicesToMaybeDispose
      )
    } else if (this._parent) {
      return this._parent._createServiceInstanceWithOwner(
        id,
        ctor,
        args,
        supportsDelayedInstantiation
      )
    } else {
      throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`)
    }
  }

  private _createServiceInstance<T>(
    _id: ServiceIdentifier<T>,
    ctor: new (...args: unknown[]) => T,
    args: unknown[] = [],
    _supportsDelayedInstantiation: boolean,
    disposeBucket: Set<unknown>
  ): T {
    // eager instantiation
    const result = this._createInstance<T>(ctor, args)
    disposeBucket.add(result)
    return result
  }

  private _throwIfStrict(msg: string, _printWarning: boolean): void {
    if (this._strict) {
      throw new Error(msg)
    }
  }
}
