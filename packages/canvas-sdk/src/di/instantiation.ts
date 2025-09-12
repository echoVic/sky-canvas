/**
 * 依赖注入核心类型定义 - 基于 VSCode DI 架构
 */
import { DisposableStore } from './common/lifecycle';
import * as descriptors from './descriptors';
import { ServiceCollection } from './ServiceCollection';

// ------ internal util

export namespace _util {
  export const serviceIds = new Map<string, ServiceIdentifier<any>>();
  export const DI_TARGET = '$di$target';
  export const DI_DEPENDENCIES = '$di$dependencies';

  export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number }[] {
    return ctor[DI_DEPENDENCIES] || [];
  }
}

// --- interfaces ------

/**
 * 品牌服务接口 - 用于类型标记
 */
export type BrandedService = { _serviceBrand: undefined };

/**
 * 服务标识符接口
 */
export interface ServiceIdentifier<T> {
  (...args: any[]): void;
  type: T;
}

/**
 * 服务访问器接口
 */
export interface ServicesAccessor {
  get<T>(id: ServiceIdentifier<T>): T;
  getIfExists<T>(id: ServiceIdentifier<T>): T | undefined;
}

/**
 * 构造函数签名接口
 */
export interface IConstructorSignature<T, Args extends any[] = []> {
  new <Services extends BrandedService[]>(...args: [...Args, ...Services]): T;
}

/**
 * 获取前导非服务参数类型
 */
export type GetLeadingNonServiceArgs<TArgs extends any[]> =
  TArgs extends [] ? []
  : TArgs extends [...infer TFirst, BrandedService] ? GetLeadingNonServiceArgs<TFirst>
  : TArgs;

/**
 * 实例化服务标识符
 */
export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService');

/**
 * 实例化服务接口
 */
export interface IInstantiationService {
  readonly _serviceBrand: undefined;

  /**
   * 同步创建实例
   */
  createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
  createInstance<Ctor extends new (...args: any[]) => unknown, R extends InstanceType<Ctor>>(
    ctor: Ctor, 
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R;

  /**
   * 调用函数并注入服务
   */
  invokeFunction<R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R, 
    ...args: TS
  ): R;

  /**
   * 创建子服务实例
   */
  createChild(services: ServiceCollection, store?: DisposableStore): IInstantiationService;

  /**
   * 销毁实例化服务
   */
  dispose(): void;
}

function storeServiceDependency(id: Function, target: Function, index: number): void {
  if ((target as any)[_util.DI_TARGET] === target) {
    (target as any)[_util.DI_DEPENDENCIES].push({ id, index });
  } else {
    (target as any)[_util.DI_DEPENDENCIES] = [{ id, index }];
    (target as any)[_util.DI_TARGET] = target;
  }
}

/**
 * 创建服务标识符 - 唯一有效的创建方式
 */
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId)!;
  }

  const id = <any>function (target: Function, _key: string, index: number) {
    if (arguments.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
    }
    storeServiceDependency(id, target, index);
  };

  id.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id);
  return id;
}

/**
 * 精炼服务装饰器
 */
export function refineServiceDecorator<T1, T extends T1>(serviceIdentifier: ServiceIdentifier<T1>): ServiceIdentifier<T> {
  return <ServiceIdentifier<T>>serviceIdentifier;
}

// ------ register singleton services ------

const _registry: [ServiceIdentifier<any>, descriptors.SyncDescriptor<any>][] = [];

/**
 * 注册单例服务 - VSCode 标准方式
 */
export function registerSingleton<T, Services extends BrandedService[]>(
  id: ServiceIdentifier<T>,
  ctor: IConstructorSignature<T, Services>,
  supportsDelayedInstantiation?: boolean
): void {
  _registry.push([id, new descriptors.SyncDescriptor<T>(ctor as any, [], supportsDelayedInstantiation)]);
}

/**
 * 获取已注册的服务
 */
export function getSingletonServiceDescriptors(): [ServiceIdentifier<any>, descriptors.SyncDescriptor<any>][] {
  return _registry;
}