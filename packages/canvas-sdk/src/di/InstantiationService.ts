import 'reflect-metadata';

/**
 * 依赖注入系统 - 实例化服务
 * 负责创建和管理服务实例
 */

import { 
  ServiceIdentifier, 
  ServicesAccessor, 
  ServiceScope, 
  ServiceDescriptor,
  INJECT_METADATA_KEY,
  OPTIONAL_INJECT_METADATA_KEY
} from './ServiceIdentifier';
import { ServiceCollection } from './ServiceCollection';

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends Error {
  constructor(path: string[]) {
    super(`Circular dependency detected: ${path.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * 服务未注册错误
 */
export class ServiceNotRegisteredError extends Error {
  constructor(serviceId: string) {
    super(`Service not registered: ${serviceId}`);
    this.name = 'ServiceNotRegisteredError';
  }
}

/**
 * 依赖解析错误
 */
export class DependencyResolutionError extends Error {
  constructor(serviceId: string, parameterIndex: number, innerError?: Error) {
    super(`Cannot resolve dependency at index ${parameterIndex} for service ${serviceId}: ${innerError?.message || 'Unknown error'}`);
    this.name = 'DependencyResolutionError';
  }
}

/**
 * 实例化服务
 */
export class InstantiationService implements ServicesAccessor {
  private readonly services = new Map<ServiceIdentifier, any>();
  private readonly creating = new Set<ServiceIdentifier>();
  private readonly creationPath: string[] = [];
  
  constructor(private readonly serviceCollection: ServiceCollection) {}
  
  /**
   * 获取服务实例
   */
  get<T>(identifier: ServiceIdentifier<T>): T {
    // 检查循环依赖
    if (this.creating.has(identifier)) {
      this.creationPath.push(identifier.id);
      throw new CircularDependencyError([...this.creationPath]);
    }
    
    const descriptor = this.serviceCollection.get(identifier);
    if (!descriptor) {
      throw new ServiceNotRegisteredError(identifier.id);
    }
    
    // 单例模式检查
    if (descriptor.scope === ServiceScope.Singleton && this.services.has(identifier)) {
      return this.services.get(identifier);
    }
    
    this.creating.add(identifier);
    this.creationPath.push(identifier.id);
    
    try {
      const instance = this.createInstance(descriptor);
      
      // 缓存单例和作用域服务
      if (descriptor.scope === ServiceScope.Singleton || descriptor.scope === ServiceScope.Scoped) {
        this.services.set(identifier, instance);
      }
      
      return instance as T;
    } catch (error) {
      throw error;
    } finally {
      this.creating.delete(identifier);
      this.creationPath.pop();
    }
  }
  
  /**
   * 检查是否已注册服务
   */
  has(identifier: ServiceIdentifier): boolean {
    return this.serviceCollection.has(identifier);
  }
  
  /**
   * 尝试获取服务，不存在时返回 undefined
   */
  tryGet<T>(identifier: ServiceIdentifier<T>): T | undefined {
    try {
      return this.get(identifier);
    } catch (error) {
      if (error instanceof ServiceNotRegisteredError) {
        return undefined;
      }
      throw error;
    }
  }
  
  /**
   * 创建作用域实例化服务
   */
  createScope(): InstantiationService {
    const scopedService = new InstantiationService(this.serviceCollection);
    
    // 复制单例服务到作用域
    for (const [identifier, instance] of this.services) {
      const descriptor = this.serviceCollection.get(identifier);
      if (descriptor?.scope === ServiceScope.Singleton) {
        scopedService.services.set(identifier, instance);
      }
    }
    
    return scopedService;
  }
  
  /**
   * 预加载所有单例服务
   */
  preloadSingletons(): void {
    const singletonDescriptors = this.serviceCollection.filterByScope(ServiceScope.Singleton);
    
    for (const descriptor of singletonDescriptors) {
      if (!this.services.has(descriptor.identifier)) {
        try {
          this.get(descriptor.identifier);
        } catch (error) {
          console.warn(`Failed to preload singleton service ${descriptor.identifier.id}:`, error);
        }
      }
    }
  }
  
  /**
   * 获取所有已创建的服务实例
   */
  getCreatedServices(): Map<ServiceIdentifier, any> {
    return new Map(this.services);
  }
  
  /**
   * 清除特定作用域的服务
   */
  clearScope(scope: ServiceScope): void {
    const toRemove: ServiceIdentifier[] = [];
    
    for (const [identifier] of this.services) {
      const descriptor = this.serviceCollection.get(identifier);
      if (descriptor?.scope === scope) {
        toRemove.push(identifier);
      }
    }
    
    for (const identifier of toRemove) {
      const instance = this.services.get(identifier);
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.warn(`Error disposing service ${identifier.id}:`, error);
        }
      }
      this.services.delete(identifier);
    }
  }
  
  /**
   * 创建服务实例
   */
  private createInstance<T>(descriptor: ServiceDescriptor): T {
    if (descriptor.factory) {
      try {
        return descriptor.factory(this);
      } catch (error) {
        throw new DependencyResolutionError(descriptor.identifier.id, -1, error as Error);
      }
    }
    
    if (descriptor.implementationClass) {
      return this.createClassInstance(descriptor.implementationClass, descriptor.identifier.id);
    }
    
    throw new Error(`No factory or implementation class provided for service: ${descriptor.identifier.id}`);
  }
  
  /**
   * 通过类创建实例
   */
  private createClassInstance<T>(implementationClass: new (...args: any[]) => T, serviceId: string): T {
    try {
      const dependencies = this.resolveDependencies(implementationClass, serviceId);
      return new implementationClass(...dependencies);
    } catch (error) {
      if (error instanceof DependencyResolutionError) {
        throw error;
      }
      throw new DependencyResolutionError(serviceId, -1, error as Error);
    }
  }
  
  /**
   * 解析构造函数依赖
   */
  private resolveDependencies(target: any, serviceId: string): any[] {
    // 获取参数类型
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    
    // 获取注入的服务标识符
    const injectTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    const optionalTokens = Reflect.getMetadata(OPTIONAL_INJECT_METADATA_KEY, target) || [];
    
    return paramTypes.map((paramType: any, index: number) => {
      try {
        const injectToken = injectTokens[index];
        const optionalToken = optionalTokens[index];
        const token = injectToken || optionalToken;
        
        if (token) {
          if (optionalToken) {
            // 可选依赖
            return this.has(token) ? this.get(token) : null;
          } else {
            // 必需依赖
            return this.get(token);
          }
        }
        
        // 如果没有明确的注入标识符，尝试从参数类型推断
        if (paramType && paramType.serviceIdentifier) {
          return this.get(paramType.serviceIdentifier);
        }
        
        // 尝试通过参数类型名称查找服务
        const potentialIdentifier = this.findServiceByTypeName(paramType?.name);
        if (potentialIdentifier) {
          return this.get(potentialIdentifier);
        }
        
        throw new Error(`No service identifier found for parameter at index ${index}`);
      } catch (error) {
        throw new DependencyResolutionError(serviceId, index, error as Error);
      }
    });
  }
  
  /**
   * 通过类型名称查找服务标识符
   */
  private findServiceByTypeName(typeName: string): ServiceIdentifier | undefined {
    if (!typeName) return undefined;
    
    for (const descriptor of this.serviceCollection.getAll()) {
      if (descriptor.implementationClass?.name === typeName) {
        return descriptor.identifier;
      }
    }
    
    return undefined;
  }
  
  /**
   * 销毁所有服务实例
   */
  dispose(): void {
    // 按创建顺序的逆序销毁服务
    const servicesToDispose = Array.from(this.services.entries()).reverse();
    
    for (const [identifier, instance] of servicesToDispose) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.warn(`Error disposing service ${identifier.id}:`, error);
        }
      }
    }
    
    this.services.clear();
    this.creating.clear();
    this.creationPath.length = 0;
  }
  
  /**
   * 获取服务统计信息
   */
  getStats(): {
    totalRegistered: number;
    totalCreated: number;
    singletonCount: number;
    transientCount: number;
    scopedCount: number;
    createdServices: string[];
  } {
    const allDescriptors = this.serviceCollection.getAll();
    const createdServices = Array.from(this.services.keys()).map(id => id.id);
    
    return {
      totalRegistered: allDescriptors.length,
      totalCreated: this.services.size,
      singletonCount: allDescriptors.filter(d => d.scope === ServiceScope.Singleton).length,
      transientCount: allDescriptors.filter(d => d.scope === ServiceScope.Transient).length,
      scopedCount: allDescriptors.filter(d => d.scope === ServiceScope.Scoped).length,
      createdServices
    };
  }
}
