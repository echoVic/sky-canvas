/**
 * 依赖注入类型和装饰器 - 参考 VSCode DI 架构
 * 定义了依赖注入系统的核心类型、接口和装饰器
 */

import 'reflect-metadata';
import { ServiceIdentifier, ServicesAccessor } from './ServiceIdentifier';
import { SyncDescriptor, AsyncDescriptor } from './descriptors';

/**
 * 实例化选项
 */
export interface IInstantiationServiceOptions {
  strict?: boolean; // 严格模式，不允许未注册的依赖
  enableLogging?: boolean; // 启用日志记录
}

/**
 * 服务实例化接口
 */
export interface IInstantiationService extends ServicesAccessor {
  readonly options: IInstantiationServiceOptions;
  
  /**
   * 创建实例，不缓存
   */
  createInstance<T>(descriptor: SyncDescriptor<T>): T;
  createInstance<T>(ctor: new (...args: any[]) => T, ...args: any[]): T;

  /**
   * 异步创建实例
   */
  createInstanceAsync<T>(descriptor: AsyncDescriptor<T>): Promise<T>;

  /**
   * 调用函数并注入依赖
   */
  invokeFunction<R>(fn: (accessor: ServicesAccessor, ...args: any[]) => R, ...args: any[]): R;

  /**
   * 创建子作用域
   */
  createChild(services: ServiceCollection): IInstantiationService;
}

/**
 * 可选依赖标记接口
 */
export interface BrandedService<T> {
  readonly _serviceBrand: undefined;
}

/**
 * 标记为可选依赖
 */
export interface Optional<T> {
  readonly _optionalBrand: undefined;
}

/**
 * 依赖注入元数据键
 */
export const DI_TARGET = Symbol('DI_TARGET');
export const DI_DEPENDENCIES = Symbol('DI_DEPENDENCIES');

/**
 * 注入装饰器 - 标记构造函数参数需要注入
 */
export function inject<T>(serviceIdentifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(DI_DEPENDENCIES, target) || [];
    existingTokens[parameterIndex] = serviceIdentifier;
    Reflect.defineMetadata(DI_DEPENDENCIES, existingTokens, target);
  };
}

/**
 * 可选注入装饰器 - 标记构造函数参数为可选依赖
 */
export function optional<T>(serviceIdentifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(DI_DEPENDENCIES, target) || [];
    existingTokens[parameterIndex] = { serviceIdentifier, optional: true };
    Reflect.defineMetadata(DI_DEPENDENCIES, existingTokens, target);
  };
}

/**
 * 可注入装饰器 - 标记类为可注入
 */
export function injectable<T extends new (...args: any[]) => any>(target: T): T {
  Reflect.defineMetadata(DI_TARGET, true, target);
  return target;
}

/**
 * 多重注入装饰器 - 注入多个实现同一接口的服务
 */
export function multiInject<T>(serviceIdentifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(DI_DEPENDENCIES, target) || [];
    existingTokens[parameterIndex] = { serviceIdentifier, multiple: true };
    Reflect.defineMetadata(DI_DEPENDENCIES, existingTokens, target);
  };
}

/**
 * 获取类的依赖信息
 */
export function getDependencies(target: any): (ServiceIdentifier<any> | { serviceIdentifier: ServiceIdentifier<any>; optional?: boolean; multiple?: boolean })[] {
  return Reflect.getMetadata(DI_DEPENDENCIES, target) || [];
}

/**
 * 检查类是否可注入
 */
export function isInjectable(target: any): boolean {
  return Reflect.getMetadata(DI_TARGET, target) === true;
}

/**
 * 服务生命周期
 */
export enum ServiceLifetime {
  Singleton = 'singleton',
  Transient = 'transient',
  Scoped = 'scoped'
}

/**
 * 服务注册信息
 */
export interface ServiceRegistration<T = any> {
  serviceIdentifier: ServiceIdentifier<T>;
  lifetime: ServiceLifetime;
  implementation?: new (...args: any[]) => T;
  factory?: (accessor: ServicesAccessor) => T;
  instance?: T;
}

/**
 * 服务集合接口
 */
export interface IServiceCollection {
  /**
   * 注册服务
   */
  register<T>(registration: ServiceRegistration<T>): void;

  /**
   * 注册单例
   */
  addSingleton<T>(serviceIdentifier: ServiceIdentifier<T>, implementation: new (...args: any[]) => T): void;
  addSingleton<T>(serviceIdentifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): void;
  addSingleton<T>(serviceIdentifier: ServiceIdentifier<T>, instance: T): void;

  /**
   * 注册瞬态
   */
  addTransient<T>(serviceIdentifier: ServiceIdentifier<T>, implementation: new (...args: any[]) => T): void;
  addTransient<T>(serviceIdentifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): void;

  /**
   * 注册作用域
   */
  addScoped<T>(serviceIdentifier: ServiceIdentifier<T>, implementation: new (...args: any[]) => T): void;
  addScoped<T>(serviceIdentifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): void;

  /**
   * 获取注册信息
   */
  getRegistration<T>(serviceIdentifier: ServiceIdentifier<T>): ServiceRegistration<T> | undefined;

  /**
   * 检查是否已注册
   */
  has<T>(serviceIdentifier: ServiceIdentifier<T>): boolean;
}

// 删除工厂函数，直接使用 createServiceIdentifier() 创建服务标识符

/**
 * 类型保护函数
 */
export function isSyncDescriptor<T>(obj: any): obj is SyncDescriptor<T> {
  return obj instanceof SyncDescriptor;
}

export function isAsyncDescriptor<T>(obj: any): obj is AsyncDescriptor<T> {
  return obj instanceof AsyncDescriptor;
}