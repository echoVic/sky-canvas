/**
 * 服务集合 - 依赖注入容器的核心
 * 基于VSCode的ServiceCollection设计
 */

export interface ServiceIdentifier<T = unknown> {
  (...args: unknown[]): void
  type: T
}

export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  const id = ((target: unknown, _key: string, index: number): void => {
    if (typeof index !== 'number') {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter')
    }
    storeServiceDependency(id as ServiceIdentifier<T>, target, index)
  }) as ServiceIdentifier<T>

  id.toString = () => serviceId
  // Add the type property required by the interface
  ;(id as unknown as { type: T }).type = undefined as T
  return id
}

// 服务依赖存储
const _serviceDependencies = new Map<ServiceIdentifier<unknown>, unknown[]>()

function storeServiceDependency(
  id: ServiceIdentifier<unknown>,
  target: unknown,
  index: number
): void {
  if (!_serviceDependencies.has(id)) {
    _serviceDependencies.set(id, [])
  }
  const dependencies = _serviceDependencies.get(id)
  if (dependencies) {
    dependencies[index] = target
  }
}

export class ServiceCollection {
  private _entries = new Map<ServiceIdentifier<unknown>, unknown>()

  set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>): void {
    const entry = this._entries.get(id)
    if (entry) {
      throw new Error(`Service ${id} is already registered`)
    }
    this._entries.set(id, instanceOrDescriptor)
  }

  has(id: ServiceIdentifier<unknown>): boolean {
    return this._entries.has(id)
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> | undefined {
    return this._entries.get(id)
  }

  getEntries(): IterableIterator<[ServiceIdentifier<unknown>, unknown]> {
    return this._entries.entries()
  }
}

export class SyncDescriptor<T> {
  readonly ctor: new (
    ...args: unknown[]
  ) => T
  readonly staticArguments: unknown[]
  readonly supportsDelayedInstantiation: boolean

  constructor(
    ctor: new (...args: unknown[]) => T,
    staticArguments: unknown[] = [],
    supportsDelayedInstantiation: boolean = false
  ) {
    this.ctor = ctor
    this.staticArguments = staticArguments
    this.supportsDelayedInstantiation = supportsDelayedInstantiation
  }
}

export interface IInstantiationService {
  createInstance<T>(ctor: new (...args: unknown[]) => T, ...args: unknown[]): T
  createInstance<T>(descriptor: SyncDescriptor<T>): T
}

export class InstantiationService implements IInstantiationService {
  private _services = new Map<ServiceIdentifier<unknown>, unknown>()

  constructor(services: ServiceCollection) {
    for (const [id, instanceOrDescriptor] of services.getEntries()) {
      if (instanceOrDescriptor instanceof SyncDescriptor) {
        this._services.set(id, instanceOrDescriptor)
      } else {
        this._services.set(id, instanceOrDescriptor)
      }
    }
  }

  createInstance<T>(
    ctorOrDescriptor: SyncDescriptor<T> | (new (...args: unknown[]) => T),
    ...args: unknown[]
  ): T {
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      return this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments)
    } else {
      return this._createInstance(ctorOrDescriptor, args)
    }
  }

  private _createInstance<T>(ctor: new (...args: unknown[]) => T, staticArgs: unknown[] = []): T {
    // 获取构造函数的依赖
    const dependencies = this._getServiceDependencies(ctor)
    const args = [...staticArgs]

    // 解析依赖
    for (let i = staticArgs.length; i < dependencies.length; i++) {
      const dependency = dependencies[i]
      if (dependency) {
        args[i] = this._getOrCreateService(dependency)
      }
    }

    return new ctor(...args)
  }

  private _getServiceDependencies(ctor: unknown): ServiceIdentifier<unknown>[] {
    return _serviceDependencies.get(ctor as ServiceIdentifier<unknown>) || []
  }

  private _getOrCreateService<T>(id: ServiceIdentifier<T>): T {
    const service = this._services.get(id as ServiceIdentifier<unknown>)

    if (!service) {
      throw new Error(`Service ${id} is not registered`)
    }

    if (service instanceof SyncDescriptor) {
      const instance = this._createInstance(service.ctor, service.staticArguments)
      this._services.set(id as ServiceIdentifier<unknown>, instance)
      return instance
    }

    return service as T
  }
}
