/**
 * 懒加载服务 - 基于VSCode的懒加载机制
 * 提供模块和组件的按需加载功能
 */

export interface ILazyComponent<T> {
  getInstance(): Promise<T>
  isLoaded(): boolean
  dispose(): void
}

export interface IModuleLoader {
  loadModule<T>(modulePath: string): Promise<T>
  preloadModule(modulePath: string): Promise<void>
  isModuleLoaded(modulePath: string): boolean
  clearCache(): void
}

export interface ILoadingMetrics {
  readonly modulePath: string
  readonly loadTime: number
  readonly size: number
  readonly timestamp: number
}

/**
 * 懒加载组件实现
 */
export class LazyComponent<T> implements ILazyComponent<T> {
  private _instance?: T
  private _loadingPromise?: Promise<T>
  private _factory: () => Promise<T>
  private _disposed = false

  constructor(factory: () => Promise<T>) {
    this._factory = factory
  }

  async getInstance(): Promise<T> {
    if (this._disposed) {
      throw new Error('LazyComponent is disposed')
    }

    if (this._instance) {
      return this._instance
    }

    if (this._loadingPromise) {
      return this._loadingPromise
    }

    this._loadingPromise = this._factory()
    try {
      this._instance = await this._loadingPromise
      return this._instance
    } finally {
      this._loadingPromise = undefined
    }
  }

  isLoaded(): boolean {
    return this._instance !== undefined
  }

  dispose(): void {
    if (this._disposed) {
      return
    }

    this._disposed = true
    if (this._instance) {
      const disposable = this._instance as unknown as { dispose?: () => void }
      if (typeof disposable.dispose === 'function') {
        disposable.dispose()
      }
    }
    this._instance = undefined
    this._loadingPromise = undefined
  }
}

/**
 * 模块缓存管理
 */
class ModuleCache {
  private _cache = new Map<string, unknown>()
  private _loadingPromises = new Map<string, Promise<unknown>>()
  private _metrics = new Map<string, ILoadingMetrics>()

  set(modulePath: string, module: unknown, loadTime: number, size: number): void {
    this._cache.set(modulePath, module)
    this._metrics.set(modulePath, {
      modulePath,
      loadTime,
      size,
      timestamp: Date.now(),
    })
  }

  get<T>(modulePath: string): T | undefined {
    return this._cache.get(modulePath)
  }

  has(modulePath: string): boolean {
    return this._cache.has(modulePath)
  }

  setLoadingPromise(modulePath: string, promise: Promise<unknown>): void {
    this._loadingPromises.set(modulePath, promise)
  }

  getLoadingPromise<T>(modulePath: string): Promise<T> | undefined {
    return this._loadingPromises.get(modulePath)
  }

  removeLoadingPromise(modulePath: string): void {
    this._loadingPromises.delete(modulePath)
  }

  getMetrics(modulePath: string): ILoadingMetrics | undefined {
    return this._metrics.get(modulePath)
  }

  getAllMetrics(): ILoadingMetrics[] {
    return Array.from(this._metrics.values())
  }

  clear(): void {
    this._cache.clear()
    this._loadingPromises.clear()
    this._metrics.clear()
  }

  getSize(): number {
    return this._cache.size
  }

  getTotalMemoryUsage(): number {
    return Array.from(this._metrics.values()).reduce((total, metric) => total + metric.size, 0)
  }
}

/**
 * 依赖图管理
 */
class DependencyGraph {
  private _dependencies = new Map<string, Set<string>>()
  private _dependents = new Map<string, Set<string>>()

  addDependency(module: string, dependency: string): void {
    if (!this._dependencies.has(module)) {
      this._dependencies.set(module, new Set())
    }
    this._dependencies.get(module)?.add(dependency)

    if (!this._dependents.has(dependency)) {
      this._dependents.set(dependency, new Set())
    }
    this._dependents.get(dependency)?.add(module)
  }

  getDependencies(module: string): string[] {
    const deps = this._dependencies.get(module)
    return deps ? Array.from(deps) : []
  }

  getDependents(module: string): string[] {
    const deps = this._dependents.get(module)
    return deps ? Array.from(deps) : []
  }

  getLoadOrder(modules: string[]): string[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const result: string[] = []

    const visit = (module: string) => {
      if (visited.has(module)) return
      if (visiting.has(module)) {
        throw new Error(`Circular dependency detected: ${module}`)
      }

      visiting.add(module)
      const dependencies = this.getDependencies(module)
      for (const dep of dependencies) {
        visit(dep)
      }
      visiting.delete(module)
      visited.add(module)
      result.push(module)
    }

    for (const module of modules) {
      visit(module)
    }

    return result
  }

  clear(): void {
    this._dependencies.clear()
    this._dependents.clear()
  }
}

/**
 * 预加载管理器
 */
class PreloadManager {
  private _preloadQueue: string[] = []
  private _preloadInProgress = false
  private _moduleLoader: IModuleLoader

  constructor(moduleLoader: IModuleLoader) {
    this._moduleLoader = moduleLoader
  }

  addToPreloadQueue(modulePath: string): void {
    if (!this._preloadQueue.includes(modulePath)) {
      this._preloadQueue.push(modulePath)
    }
    this._processPreloadQueue()
  }

  private async _processPreloadQueue(): Promise<void> {
    if (this._preloadInProgress || this._preloadQueue.length === 0) {
      return
    }

    this._preloadInProgress = true

    while (this._preloadQueue.length > 0) {
      const modulePath = this._preloadQueue.shift()
      if (!modulePath) {
        continue
      }
      try {
        await this._moduleLoader.preloadModule(modulePath)
      } catch (error) {
        console.warn(`Failed to preload module ${modulePath}:`, error)
      }
    }

    this._preloadInProgress = false
  }

  clear(): void {
    this._preloadQueue = []
  }
}

/**
 * 懒加载服务实现
 */
export class LazyLoadingService implements IModuleLoader {
  private _cache: ModuleCache
  private _dependencyGraph: DependencyGraph
  private _preloadManager: PreloadManager
  private _disposed = false

  constructor() {
    this._cache = new ModuleCache()
    this._dependencyGraph = new DependencyGraph()
    this._preloadManager = new PreloadManager(this)
  }

  async loadModule<T>(modulePath: string): Promise<T> {
    if (this._disposed) {
      throw new Error('LazyLoadingService is disposed')
    }

    // 检查缓存
    if (this._cache.has(modulePath)) {
      const cached = this._cache.get<T>(modulePath)
      if (cached !== undefined) {
        return cached
      }
    }

    // 检查是否正在加载
    const loadingPromise = this._cache.getLoadingPromise<T>(modulePath)
    if (loadingPromise) {
      return loadingPromise
    }

    // 开始加载
    const promise = this._doLoadModule<T>(modulePath)
    this._cache.setLoadingPromise(modulePath, promise)

    try {
      const module = await promise
      return module
    } finally {
      this._cache.removeLoadingPromise(modulePath)
    }
  }

  private async _doLoadModule<T>(modulePath: string): Promise<T> {
    const startTime = performance.now()

    try {
      // 动态导入模块
      const module = await import(modulePath)
      const loadTime = performance.now() - startTime

      // 估算模块大小（简化实现）
      const size = JSON.stringify(module).length

      // 缓存模块
      const result = module.default || module
      this._cache.set(modulePath, result, loadTime, size)

      return result
    } catch (error) {
      throw new Error(`Failed to load module ${modulePath}: ${error}`)
    }
  }

  async preloadModule(modulePath: string): Promise<void> {
    if (!this.isModuleLoaded(modulePath)) {
      await this.loadModule(modulePath)
    }
  }

  isModuleLoaded(modulePath: string): boolean {
    return this._cache.has(modulePath)
  }

  addDependency(module: string, dependency: string): void {
    this._dependencyGraph.addDependency(module, dependency)
  }

  schedulePreload(modulePath: string): void {
    this._preloadManager.addToPreloadQueue(modulePath)
  }

  getLoadingMetrics(): ILoadingMetrics[] {
    return this._cache.getAllMetrics()
  }

  getMemoryUsage(): number {
    return this._cache.getTotalMemoryUsage()
  }

  clearCache(): void {
    this._cache.clear()
    this._dependencyGraph.clear()
    this._preloadManager.clear()
  }

  createLazyComponent<T>(factory: () => Promise<T>): ILazyComponent<T> {
    return new LazyComponent(factory)
  }

  dispose(): void {
    if (this._disposed) {
      return
    }

    this._disposed = true
    this.clearCache()
  }
}

/**
 * 懒加载装饰器
 */
export function lazy<T>(factory: () => Promise<T>): ILazyComponent<T> {
  return new LazyComponent(factory)
}

/**
 * 懒加载React组件包装器
 * 注意：此函数仅在React环境中可用
 */
export function lazyReactComponent<T>(factory: () => Promise<{ default: T }>): unknown {
  // 动态访问React以避免硬依赖
  const ReactModule = (globalThis as Record<string, unknown>).React as
    | {
        lazy: (factory: () => Promise<{ default: T }>) => unknown
      }
    | undefined

  if (!ReactModule?.lazy) {
    throw new Error('React is not available. lazyReactComponent requires React.')
  }
  return ReactModule.lazy(factory)
}
