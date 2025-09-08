/**
 * 依赖注入系统 - 服务标识符
 * 基于 VSCode DI 架构设计
 */

import 'reflect-metadata';

// 元数据键
export const INJECTABLE_METADATA_KEY = Symbol('injectable');
export const INJECT_METADATA_KEY = Symbol('inject');
export const OPTIONAL_INJECT_METADATA_KEY = Symbol('optional_inject');

/**
 * 服务标识符基类
 */
export abstract class ServiceIdentifier<T = any> {
  constructor(public readonly id: string) {}
  
  toString(): string {
    return this.id;
  }
}

/**
 * 创建服务标识符的工厂函数
 */
export function createServiceIdentifier<T>(id: string): ServiceIdentifier<T> {
  return new class extends ServiceIdentifier<T> {
    constructor() {
      super(id);
    }
  };
}

/**
 * 服务生命周期枚举
 */
export enum ServiceScope {
  Singleton = 'singleton',    // 单例，全局唯一
  Transient = 'transient',    // 瞬态，每次创建新实例
  Scoped = 'scoped',          // 作用域，在特定范围内单例
}

/**
 * ServiceLifecycle 别名，为了兼容性
 */
export const ServiceLifecycle = ServiceScope;

/**
 * 服务访问器接口
 */
export interface ServicesAccessor {
  get<T>(identifier: ServiceIdentifier<T>): T;
  has(identifier: ServiceIdentifier): boolean;
}

/**
 * 服务描述符接口
 */
export interface ServiceDescriptor {
  identifier: ServiceIdentifier;
  scope: ServiceScope;
  factory?: (accessor: ServicesAccessor) => any;
  implementationClass?: new (...args: any[]) => any;
  dependencies?: ServiceIdentifier[];
  lazy?: boolean;
}

import 'reflect-metadata';

/**
 * 服务标识符和依赖注入装饰器
 */
export function injectable<T extends new (...args: any[]) => any>(target: T): T {
  // 标记类为可注入
  Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
  return target;
}

/**
 * 注入装饰器
 */
export function inject<T>(identifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    existingTokens[parameterIndex] = identifier;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}

/**
 * 可选注入装饰器
 */
export function optional<T>(identifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(OPTIONAL_INJECT_METADATA_KEY, target) || [];
    existingTokens[parameterIndex] = identifier;
    Reflect.defineMetadata(OPTIONAL_INJECT_METADATA_KEY, existingTokens, target);
  };
}

/**
 * 检查类是否可注入
 */
export function isInjectable(target: any): boolean {
  return Reflect.hasMetadata(INJECTABLE_METADATA_KEY, target);
}

/**
 * 获取注入的服务标识符
 */
export function getInjectTokens(target: any): ServiceIdentifier[] {
  return Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
}

/**
 * 获取可选注入的服务标识符
 */
export function getOptionalInjectTokens(target: any): ServiceIdentifier[] {
  return Reflect.getMetadata(OPTIONAL_INJECT_METADATA_KEY, target) || [];
}
