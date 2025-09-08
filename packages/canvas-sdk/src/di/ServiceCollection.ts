/**
 * 依赖注入系统 - 服务集合
 * 用于注册和管理服务描述符
 */

import { ServiceIdentifier, ServiceDescriptor, ServiceScope, ServicesAccessor } from './ServiceIdentifier';

// 导出类型别名以便外部使用
export type { ServiceDescriptor, ServicesAccessor };
export type Newable<T = any> = new (...args: any[]) => T;
export type ServiceFactory<T = any> = (accessor: ServicesAccessor) => T;
export type ServiceInstance<T = any> = T;

/**
 * 服务集合类
 */
export class ServiceCollection {
  private services = new Map<ServiceIdentifier, ServiceDescriptor>();
  
  /**
   * 注册单例服务（通过类）
   */
  addSingleton<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  /**
   * 注册单例服务（通过工厂函数）
   */
  addSingleton<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addSingleton<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Singleton,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  /**
   * 注册瞬态服务（通过类）
   */
  addTransient<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  /**
   * 注册瞬态服务（通过工厂函数）
   */
  addTransient<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addTransient<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Transient,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  /**
   * 注册作用域服务（通过类）
   */
  addScoped<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  /**
   * 注册作用域服务（通过工厂函数）
   */
  addScoped<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addScoped<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Scoped,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  /**
   * 注册实例
   */
  addInstance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
    return this.add({
      identifier,
      scope: ServiceScope.Singleton,
      factory: () => instance
    });
  }
  
  /**
   * 添加服务描述符
   */
  private add(descriptor: ServiceDescriptor): this {
    this.services.set(descriptor.identifier, descriptor);
    return this;
  }
  
  /**
   * 获取服务描述符
   */
  get(identifier: ServiceIdentifier): ServiceDescriptor | undefined {
    return this.services.get(identifier);
  }
  
  /**
   * 检查是否包含服务
   */
  has(identifier: ServiceIdentifier): boolean {
    return this.services.has(identifier);
  }
  
  /**
   * 获取所有服务描述符
   */
  getAll(): ServiceDescriptor[] {
    return Array.from(this.services.values());
  }
  
  /**
   * 移除服务
   */
  remove(identifier: ServiceIdentifier): boolean {
    return this.services.delete(identifier);
  }
  
  /**
   * 清空所有服务
   */
  clear(): void {
    this.services.clear();
  }
  
  /**
   * 获取服务数量
   */
  size(): number {
    return this.services.size;
  }
  
  /**
   * 克隆服务集合
   */
  clone(): ServiceCollection {
    const cloned = new ServiceCollection();
    for (const [identifier, descriptor] of this.services) {
      cloned.services.set(identifier, { ...descriptor });
    }
    return cloned;
  }
  
  /**
   * 合并其他服务集合
   */
  merge(other: ServiceCollection): this {
    for (const [identifier, descriptor] of other.services) {
      this.services.set(identifier, descriptor);
    }
    return this;
  }
  
  /**
   * 按作用域过滤服务
   */
  filterByScope(scope: ServiceScope): ServiceDescriptor[] {
    return this.getAll().filter(descriptor => descriptor.scope === scope);
  }
  
  /**
   * 验证服务集合的完整性
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const descriptor of this.getAll()) {
      // 检查是否有实现或工厂
      if (!descriptor.factory && !descriptor.implementationClass) {
        errors.push(`Service ${descriptor.identifier.id} has no factory or implementation class`);
      }
      
      // 检查依赖是否都已注册
      if (descriptor.dependencies) {
        for (const dependency of descriptor.dependencies) {
          if (!this.has(dependency)) {
            errors.push(`Service ${descriptor.identifier.id} depends on unregistered service ${dependency.id}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
