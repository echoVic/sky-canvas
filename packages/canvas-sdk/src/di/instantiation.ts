/**
 * 依赖注入核心类型定义 - 基于 VSCode DI 架构
 */
import type { DisposableStore } from './common/lifecycle'
import * as descriptors from './descriptors'
import type { ServiceCollection } from './ServiceCollection'

// ------ internal util

export namespace _util {
  export const serviceIds = new Map<string, ServiceIdentifier<unknown>>()
  export const DI_TARGET = '$di$target'
  export const DI_DEPENDENCIES = '$di$dependencies'

  export function getServiceDependencies(ctor: {
    [DI_DEPENDENCIES]?: { id: ServiceIdentifier<unknown>; index: number }[]
  }): { id: ServiceIdentifier<unknown>; index: number }[] {
    return ctor[DI_DEPENDENCIES] || []
  }
}

// --- interfaces ------

/**
 * 品牌服务接口 - 用于类型标记
 */
export type BrandedService = { _serviceBrand: undefined }

type DecoratorTarget = {
  [_util.DI_TARGET]?: unknown
  [_util.DI_DEPENDENCIES]?: { id: ServiceIdentifier<unknown>; index: number }[]
}

/**
 * 服务标识符接口
 */
export interface ServiceIdentifier<T> {
  (...args: unknown[]): void
  type: T
}

/**
 * 服务访问器接口
 */
export interface ServicesAccessor {
  get<T>(id: ServiceIdentifier<T>): T
  getIfExists<T>(id: ServiceIdentifier<T>): T | undefined
}

/**
 * 构造函数签名接口
 */
export interface IConstructorSignature<T, Args extends unknown[] = []> {
  new <Services extends BrandedService[]>(...args: [...Args, ...Services]): T
}

/**
 * 获取前导非服务参数类型
 */
export type GetLeadingNonServiceArgs<TArgs extends unknown[]> = TArgs extends []
  ? []
  : TArgs extends [...infer TFirst, BrandedService]
    ? GetLeadingNonServiceArgs<TFirst>
    : TArgs

/**
 * 实例化服务标识符
 */
export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService')

/**
 * 实例化服务接口
 */
export interface IInstantiationService {
  readonly _serviceBrand: undefined

  /**
   * 同步创建实例
   */
  createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T
  createInstance<Ctor extends new (...args: unknown[]) => unknown, R extends InstanceType<Ctor>>(
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R

  /**
   * 调用函数并注入服务
   */
  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R

  /**
   * 创建子服务实例
   */
  createChild(services: ServiceCollection, store?: DisposableStore): IInstantiationService

  /**
   * 销毁实例化服务
   */
  dispose(): void
}

function storeServiceDependency(
  id: ServiceIdentifier<unknown>,
  target: DecoratorTarget,
  index: number
): void {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES]?.push({ id, index })
  } else {
    target[_util.DI_DEPENDENCIES] = [{ id, index }]
    target[_util.DI_TARGET] = target
  }
}

/**
 * 创建服务标识符 - 唯一有效的创建方式
 */
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  const existing = _util.serviceIds.get(serviceId)
  if (existing) {
    return existing as ServiceIdentifier<T>
  }

  const id = ((...args: unknown[]) => {
    if (args.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter')
    }
    const [target, _key, index] = args as [DecoratorTarget, string, number]
    storeServiceDependency(id, target, index)
  }) as ServiceIdentifier<T>

  id.toString = () => serviceId
  _util.serviceIds.set(serviceId, id)
  return id
}

/**
 * 精炼服务装饰器
 */
export function refineServiceDecorator<T1, T extends T1>(
  serviceIdentifier: ServiceIdentifier<T1>
): ServiceIdentifier<T> {
  return <ServiceIdentifier<T>>serviceIdentifier
}

// ------ register singleton services ------

const _registry: [ServiceIdentifier<unknown>, descriptors.SyncDescriptor<unknown>][] = []

/**
 * 注册单例服务 - VSCode 标准方式
 */
export function registerSingleton<T, Services extends BrandedService[]>(
  id: ServiceIdentifier<T>,
  ctor: IConstructorSignature<T, Services>,
  supportsDelayedInstantiation?: boolean
): void {
  _registry.push([
    id,
    new descriptors.SyncDescriptor<T>(
      ctor as unknown as new (
        ...args: unknown[]
      ) => T,
      [],
      supportsDelayedInstantiation
    ),
  ])
}

/**
 * 获取已注册的服务
 */
export function getSingletonServiceDescriptors(): [
  ServiceIdentifier<unknown>,
  descriptors.SyncDescriptor<unknown>,
][] {
  return _registry
}
