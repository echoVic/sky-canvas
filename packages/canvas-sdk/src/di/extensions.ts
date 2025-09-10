/**
 * 插件系统和装饰器 - 参考 VSCode DI 架构
 * 用于注册和获取单例服务以及扩展点
 */

import { ServiceIdentifier, ServicesAccessor } from './ServiceIdentifier';
import { InstantiationService } from './InstantiationService';
import { ServiceCollection } from './ServiceCollection';

/**
 * 扩展点描述符
 */
export interface IExtensionPointDescriptor<T> {
  extensionPoint: string;
  jsonSchema?: object;
}

/**
 * 扩展描述符
 */
export interface IExtensionDescriptor {
  identifier: string;
  name: string;
  publisher: string;
  version: string;
  engines: { [name: string]: string };
  contributes?: { [point: string]: any };
  activationEvents?: string[];
}

/**
 * 扩展点注册表
 */
export class ExtensionPointRegistry {
  private readonly extensionPoints = new Map<string, IExtensionPointDescriptor<any>>();

  /**
   * 注册扩展点
   */
  registerExtensionPoint<T>(extensionPoint: string, descriptor: IExtensionPointDescriptor<T>): void {
    if (this.extensionPoints.has(extensionPoint)) {
      throw new Error(`Extension point '${extensionPoint}' is already registered`);
    }
    this.extensionPoints.set(extensionPoint, descriptor);
  }

  /**
   * 获取扩展点
   */
  getExtensionPoint<T>(extensionPoint: string): IExtensionPointDescriptor<T> | undefined {
    return this.extensionPoints.get(extensionPoint);
  }

  /**
   * 获取所有扩展点
   */
  getAllExtensionPoints(): IExtensionPointDescriptor<any>[] {
    return Array.from(this.extensionPoints.values());
  }
}

/**
 * 单例服务注册器
 * 提供全局访问单例服务的方式
 */
export class SingletonServiceRegistry {
  private static instance: SingletonServiceRegistry;
  private readonly services = new Map<ServiceIdentifier<any>, any>();
  private instantiationService?: InstantiationService;

  private constructor() {}

  /**
   * 获取单例注册器实例
   */
  static getInstance(): SingletonServiceRegistry {
    if (!SingletonServiceRegistry.instance) {
      SingletonServiceRegistry.instance = new SingletonServiceRegistry();
    }
    return SingletonServiceRegistry.instance;
  }

  /**
   * 设置实例化服务
   */
  setInstantiationService(instantiationService: InstantiationService): void {
    this.instantiationService = instantiationService;
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(identifier: ServiceIdentifier<T>, service: T): void {
    if (this.services.has(identifier)) {
      throw new Error(`Service '${identifier.id}' is already registered`);
    }
    this.services.set(identifier, service);
  }

  /**
   * 获取单例服务
   */
  getSingleton<T>(identifier: ServiceIdentifier<T>): T {
    const service = this.services.get(identifier);
    if (service) {
      return service;
    }

    if (this.instantiationService) {
      return this.instantiationService.get(identifier);
    }

    throw new Error(`Service '${identifier.id}' is not registered`);
  }

  /**
   * 检查服务是否已注册
   */
  hasSingleton<T>(identifier: ServiceIdentifier<T>): boolean {
    return this.services.has(identifier) || 
           (this.instantiationService?.has(identifier) ?? false);
  }

  /**
   * 获取所有已注册的服务标识符
   */
  getAllServices(): ServiceIdentifier<any>[] {
    return Array.from(this.services.keys());
  }

  /**
   * 清空所有服务（用于测试）
   */
  clear(): void {
    this.services.clear();
    this.instantiationService = undefined;
  }
}

/**
 * 服务装饰器 - 标记类为可注入的服务
 */
export function service<T>(identifier: ServiceIdentifier<T>) {
  return function (target: new (...args: any[]) => T) {
    // 在类上添加服务标识符
    (target as any).serviceIdentifier = identifier;
    return target;
  };
}

/**
 * 扩展装饰器 - 标记类为扩展
 */
export function extension(descriptor: Partial<IExtensionDescriptor>) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    (target as any).extensionDescriptor = descriptor;
    return target;
  };
}

/**
 * 扩展点装饰器 - 标记方法为扩展点
 */
export function extensionPoint<T>(extensionPoint: string, schema?: object) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const extensionPointDescriptor: IExtensionPointDescriptor<T> = {
      extensionPoint,
      jsonSchema: schema
    };
    
    // 存储扩展点信息
    if (!target.constructor._extensionPoints) {
      target.constructor._extensionPoints = [];
    }
    target.constructor._extensionPoints.push(extensionPointDescriptor);
  };
}

/**
 * 获取全局单例服务的便捷函数
 */
export function getSingleton<T>(identifier: ServiceIdentifier<T>): T {
  return SingletonServiceRegistry.getInstance().getSingleton(identifier);
}

/**
 * 注册全局单例服务的便捷函数
 */
export function registerSingleton<T>(identifier: ServiceIdentifier<T>, service: T): void {
  SingletonServiceRegistry.getInstance().registerSingleton(identifier, service);
}

// 删除工厂函数，直接使用 new ServiceCollection() 和 new InstantiationService() 创建实例