/**
 * 服务集合 - 依赖注入容器的核心
 * 基于VSCode的ServiceCollection设计
 */

export interface ServiceIdentifier<T = any> {
  (...args: any[]): void;
  type: T;
}

export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  const id = function (target: any, key: string, index: number): any {
    if (arguments.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
    }
    storeServiceDependency(id, target, index);
  };

  id.toString = () => serviceId;
  return id;
}

// 服务依赖存储
const _serviceIds = new Map<string, ServiceIdentifier<any>>();
const _serviceDependencies = new Map<ServiceIdentifier<any>, any[]>();

function storeServiceDependency(id: ServiceIdentifier<any>, target: any, index: number): void {
  if (!_serviceDependencies.has(id)) {
    _serviceDependencies.set(id, []);
  }
  _serviceDependencies.get(id)![index] = target;
}

export class ServiceCollection {
  private _entries = new Map<ServiceIdentifier<any>, any>();

  set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>): void {
    const entry = this._entries.get(id);
    if (entry) {
      throw new Error(`Service ${id} is already registered`);
    }
    this._entries.set(id, instanceOrDescriptor);
  }

  has(id: ServiceIdentifier<any>): boolean {
    return this._entries.has(id);
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> | undefined {
    return this._entries.get(id);
  }

  getEntries(): IterableIterator<[ServiceIdentifier<any>, any]> {
    return this._entries.entries();
  }
}

export class SyncDescriptor<T> {
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

export interface IInstantiationService {
  createInstance<T>(ctor: new (...args: any[]) => T, ...args: any[]): T;
  createInstance<T>(descriptor: SyncDescriptor<T>): T;
}

export class InstantiationService implements IInstantiationService {
  private _services = new Map<ServiceIdentifier<any>, any>();

  constructor(services: ServiceCollection) {
    for (const [id, instanceOrDescriptor] of services.getEntries()) {
      if (instanceOrDescriptor instanceof SyncDescriptor) {
        this._services.set(id, instanceOrDescriptor);
      } else {
        this._services.set(id, instanceOrDescriptor);
      }
    }
  }

  createInstance<T>(ctorOrDescriptor: any, ...args: any[]): T {
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      return this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments);
    } else {
      return this._createInstance(ctorOrDescriptor, args);
    }
  }

  private _createInstance<T>(ctor: new (...args: any[]) => T, staticArgs: any[] = []): T {
    // 获取构造函数的依赖
    const dependencies = this._getServiceDependencies(ctor);
    const args = [...staticArgs];

    // 解析依赖
    for (let i = staticArgs.length; i < dependencies.length; i++) {
      const dependency = dependencies[i];
      if (dependency) {
        args[i] = this._getOrCreateService(dependency);
      }
    }

    return new ctor(...args);
  }

  private _getServiceDependencies(ctor: any): ServiceIdentifier<any>[] {
    return _serviceDependencies.get(ctor) || [];
  }

  private _getOrCreateService<T>(id: ServiceIdentifier<T>): T {
    const service = this._services.get(id);
    
    if (!service) {
      throw new Error(`Service ${id} is not registered`);
    }

    if (service instanceof SyncDescriptor) {
      const instance = this._createInstance(service.ctor, service.staticArguments);
      this._services.set(id, instance);
      return instance;
    }

    return service;
  }
}
