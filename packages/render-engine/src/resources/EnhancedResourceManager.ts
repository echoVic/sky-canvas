/**
 * 增强型资源管理系统
 * 集成异步资源加载器和 LRU 缓存策略，实现完整的资源生命周期管理
 */

import { EventEmitter } from 'eventemitter3'
import {
  AsyncResourceLoader,
  type LoadingProgress,
  LoadingState,
  type ResourceConfig,
  ResourceType,
} from './AsyncResourceLoader'
import {
  CacheItem,
  GPUResourceCache,
  LRUCache,
  MemoryAwareLRUCache,
  type MemoryStats,
} from './LRUCache'

/**
 * 资源引用
 */
export interface ResourceRef<T> {
  readonly id: string
  readonly url?: string
  readonly type: ResourceType
  readonly data: T
  readonly size: number
  readonly cached: boolean
  addRef(): void
  removeRef(): void
  dispose(): void
}

/**
 * 资源管理器配置
 */
export interface ResourceManagerConfig {
  // 缓存配置
  cacheMaxMemory?: number // 最大缓存内存（字节）
  cacheMaxItems?: number // 最大缓存项数
  cacheDefaultTTL?: number // 缓存项默认存活时间（毫秒）

  // GPU缓存配置
  gpuCacheMaxMemory?: number // GPU缓存最大内存
  gpuCacheMaxItems?: number // GPU缓存最大项数

  // 加载器配置
  maxConcurrentLoads?: number // 最大并发加载数
  defaultTimeout?: number // 默认加载超时时间
  defaultRetries?: number // 默认重试次数

  // 预加载配置
  enablePreloading?: boolean // 启用预加载
  preloadBatchSize?: number // 预加载批次大小

  // 垃圾收集配置
  enableAutoGC?: boolean // 启用自动垃圾收集
  gcInterval?: number // 垃圾收集间隔（毫秒）
  memoryWarningThreshold?: number // 内存警告阈值（0-1）
}

/**
 * 资源管理器统计信息
 */
export interface ResourceManagerStats {
  // 加载器统计
  loader: {
    total: number
    pending: number
    loading: number
    loaded: number
    error: number
    cancelled: number
    queueSize: number
    activeLoaders: number
  }

  // 缓存统计
  cache: MemoryStats
  gpuCache: MemoryStats

  // 引用计数
  references: {
    totalRefs: number
    activeRefs: number
    orphanedRefs: number
  }

  // 性能指标
  performance: {
    averageLoadTime: number
    cacheHitRate: number
    memoryEfficiency: number
  }
}

/**
 * 资源管理器事件
 */
export interface ResourceManagerEvents<T> {
  resourceLoaded: (ref: ResourceRef<T>) => void
  resourceCached: (id: string, size: number) => void
  resourceEvicted: (id: string, reason: string) => void
  memoryWarning: (stats: ResourceManagerStats) => void
  loadingProgress: (id: string, progress: LoadingProgress) => void
  batchComplete: (batchId: string, results: ResourceRef<any>[]) => void
  gcComplete: (freedMemory: number, itemsRemoved: number) => void
}

/**
 * 内部资源引用实现
 */
class InternalResourceRef<T> implements ResourceRef<T> {
  private refCount = 0
  private disposed = false

  constructor(
    public readonly id: string,
    public readonly url: string | undefined,
    public readonly type: ResourceType,
    public readonly data: T,
    public readonly size: number,
    public readonly cached: boolean,
    private onDispose?: () => void
  ) {}

  addRef(): void {
    if (!this.disposed) {
      this.refCount++
    }
  }

  removeRef(): void {
    if (!this.disposed && this.refCount > 0) {
      this.refCount--
    }
  }

  get refCount_internal(): number {
    return this.refCount
  }

  dispose(): void {
    if (!this.disposed) {
      this.disposed = true
      this.refCount = 0
      this.onDispose?.()
    }
  }
}

/**
 * 增强型资源管理系统
 */
export class EnhancedResourceManager<T = any> extends EventEmitter {
  private loader!: AsyncResourceLoader
  private cache!: MemoryAwareLRUCache<T>
  private gpuCache!: GPUResourceCache<T & { dispose(): void }>
  private references = new Map<string, InternalResourceRef<T>>()
  private preloadQueue: ResourceConfig[] = []

  private config: Required<ResourceManagerConfig>
  private gcTimer: NodeJS.Timeout | null = null
  private stats = {
    totalLoadTime: 0,
    loadCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  constructor(config: ResourceManagerConfig = {}) {
    super()

    // 标准化配置
    this.config = {
      cacheMaxMemory: 200 * 1024 * 1024, // 200MB
      cacheMaxItems: 1000,
      cacheDefaultTTL: 10 * 60 * 1000, // 10分钟
      gpuCacheMaxMemory: 128 * 1024 * 1024, // 128MB
      gpuCacheMaxItems: 200,
      maxConcurrentLoads: 6,
      defaultTimeout: 30000,
      defaultRetries: 3,
      enablePreloading: true,
      preloadBatchSize: 5,
      enableAutoGC: true,
      gcInterval: 30 * 1000, // 30秒
      memoryWarningThreshold: 0.8,
      ...config,
    }

    this.initializeComponents()
    this.setupEventHandlers()

    if (this.config.enableAutoGC) {
      this.startAutoGC()
    }
  }

  /**
   * 加载单个资源
   */
  async loadResource(config: ResourceConfig): Promise<ResourceRef<T>> {
    const startTime = Date.now()

    // 首先检查缓存
    const cached = this.getCachedResource(config.id)
    if (cached) {
      this.stats.cacheHits++
      this.emit('resourceLoaded', cached)
      return cached
    }

    this.stats.cacheMisses++

    try {
      // 使用加载器加载资源
      const data = await this.loader.loadResource<T>(config)
      const size = this.estimateResourceSize(data)

      // 创建资源引用
      const resourceRef = new InternalResourceRef<T>(
        config.id,
        config.url,
        config.type,
        data,
        size,
        true,
        () => this.handleResourceDispose(config.id)
      )

      // 缓存资源
      this.cacheResource(config.id, data, size)

      // 记录引用
      this.references.set(config.id, resourceRef)

      // 更新统计
      this.stats.totalLoadTime += Date.now() - startTime
      this.stats.loadCount++

      this.emit('resourceLoaded', resourceRef)
      this.emit('resourceCached', config.id, size)

      return resourceRef
    } catch (error) {
      console.error(`Failed to load resource ${config.id}:`, error)
      throw error
    }
  }

  /**
   * 批量加载资源
   */
  async loadBatch(configs: ResourceConfig[], batchId?: string): Promise<ResourceRef<T>[]> {
    const id = batchId ?? `batch_${Date.now()}`

    try {
      const promises = configs.map((config) => this.loadResource(config))
      const results = await Promise.all(promises)

      this.emit('batchComplete', id, results)
      return results
    } catch (error) {
      console.error(`Batch loading failed for ${id}:`, error)
      throw error
    }
  }

  /**
   * 预加载资源
   */
  async preloadResources(configs: ResourceConfig[]): Promise<void> {
    if (!this.config.enablePreloading) return

    // 分批加载，避免过多并发
    const batches = this.chunkArray(configs, this.config.preloadBatchSize)

    for (const batch of batches) {
      try {
        await this.loadBatch(batch, `preload_${Date.now()}`)
      } catch (error) {
        console.warn('Preload batch failed:', error)
      }
    }
  }

  /**
   * 获取资源引用
   */
  getResource(id: string): ResourceRef<T> | null {
    const ref = this.references.get(id)
    if (ref) {
      ref.addRef()
      return ref
    }

    // 尝试从缓存获取
    const cached = this.getCachedResource(id)
    if (cached) {
      cached.addRef()
      return cached
    }

    return null
  }

  /**
   * 释放资源引用
   */
  releaseResource(id: string): void {
    const ref = this.references.get(id)
    if (ref) {
      ref.removeRef()

      // 如果引用计数为0，可以考虑从引用表移除（但保留在缓存中）
      if ((ref as any).refCount_internal === 0) {
        this.references.delete(id)
      }
    }
  }

  /**
   * 强制释放资源
   */
  forceReleaseResource(id: string): boolean {
    const ref = this.references.get(id)
    if (ref) {
      ref.dispose()
      this.references.delete(id)
      this.cache.delete(id)
      this.gpuCache.delete(id)
      return true
    }
    return false
  }

  /**
   * 取消资源加载
   */
  cancelResourceLoading(id: string): boolean {
    return this.loader.cancelResource(id)
  }

  /**
   * 获取加载进度
   */
  getLoadingProgress(id: string): LoadingProgress | null {
    const task = this.loader.getTask(id)
    return task?.progress ?? null
  }

  /**
   * 执行垃圾收集
   */
  forceGC(): void {
    // 清理引用计数为0的资源
    const toRemove: string[] = []
    for (const [id, ref] of this.references) {
      if ((ref as any).refCount_internal === 0) {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      this.references.delete(id)
    }

    // 执行缓存垃圾收集
    const cacheResult = this.cache.forceGC()
    const gpuCacheResult = this.gpuCache.forceGC()

    const totalFreed = cacheResult.freedMemory + gpuCacheResult.freedMemory
    const totalRemoved = cacheResult.itemsRemoved + gpuCacheResult.itemsRemoved

    if (totalRemoved > 0) {
      this.emit('gcComplete', totalFreed, totalRemoved)
    }
  }

  /**
   * 获取管理器统计信息
   */
  getStats(): ResourceManagerStats {
    const loaderStats = this.loader.getStats()
    const cacheStats = this.cache.getMemoryStats()
    const gpuCacheStats = this.gpuCache.getMemoryStats()

    const totalRefs = this.references.size
    const activeRefs = Array.from(this.references.values()).filter(
      (ref) => (ref as any).refCount_internal > 0
    ).length
    const orphanedRefs = totalRefs - activeRefs

    const averageLoadTime =
      this.stats.loadCount > 0 ? this.stats.totalLoadTime / this.stats.loadCount : 0

    const cacheHitRate =
      this.stats.cacheHits + this.stats.cacheMisses > 0
        ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
        : 0

    const memoryEfficiency =
      cacheStats.utilization > 0 ? cacheStats.hitRate / cacheStats.utilization : 0

    return {
      loader: loaderStats,
      cache: cacheStats,
      gpuCache: gpuCacheStats,
      references: {
        totalRefs,
        activeRefs,
        orphanedRefs,
      },
      performance: {
        averageLoadTime,
        cacheHitRate,
        memoryEfficiency,
      },
    }
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    // 取消所有加载任务
    this.loader.cancelAll()

    // 释放所有引用
    for (const ref of this.references.values()) {
      ref.dispose()
    }
    this.references.clear()

    // 清空缓存
    this.cache.clear()
    this.gpuCache.clear()

    // 重置统计
    this.stats = {
      totalLoadTime: 0,
      loadCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }

  /**
   * 销毁资源管理器
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer)
      this.gcTimer = null
    }

    this.clear()
    this.loader.dispose()
    this.cache.dispose()
    this.gpuCache.dispose()
    this.removeAllListeners()
  }

  /**
   * 初始化组件
   */
  private initializeComponents(): void {
    this.loader = new AsyncResourceLoader({
      maxConcurrentLoads: this.config.maxConcurrentLoads,
      defaultTimeout: this.config.defaultTimeout,
      defaultRetries: this.config.defaultRetries,
    })

    this.cache = new MemoryAwareLRUCache<T>({
      maxMemory: this.config.cacheMaxMemory,
      maxItems: this.config.cacheMaxItems,
      defaultTTL: this.config.cacheDefaultTTL,
      memoryWarningThreshold: this.config.memoryWarningThreshold,
    })

    this.gpuCache = new GPUResourceCache<T & { dispose(): void }>({
      maxMemory: this.config.gpuCacheMaxMemory,
      maxItems: this.config.gpuCacheMaxItems,
      defaultTTL: this.config.cacheDefaultTTL,
    })
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 加载器事件
    this.loader.on('taskProgress', (task, progress) => {
      this.emit('loadingProgress', task.config.id, progress)
    })

    // 缓存事件
    this.cache.on('evict', (key, item, reason) => {
      this.emit('resourceEvicted', key, reason)
    })

    this.cache.on('memoryWarning', (stats) => {
      this.emit('memoryWarning', this.getStats())
    })

    this.gpuCache.on('evict', (key, item, reason) => {
      this.emit('resourceEvicted', key, `gpu_${reason}`)
    })
  }

  /**
   * 获取缓存的资源
   */
  private getCachedResource(id: string): ResourceRef<T> | null {
    // 首先尝试普通缓存
    const cached = this.cache.get(id)
    if (cached) {
      return new InternalResourceRef<T>(
        id,
        undefined,
        ResourceType.TEXTURE, // 假设类型，实际应该存储
        cached,
        this.estimateResourceSize(cached),
        true,
        () => this.handleResourceDispose(id)
      )
    }

    // 然后尝试GPU缓存
    const gpuCached = this.gpuCache.get(id)
    if (gpuCached) {
      return new InternalResourceRef<T>(
        id,
        undefined,
        ResourceType.TEXTURE,
        gpuCached,
        this.estimateResourceSize(gpuCached),
        true,
        () => this.handleResourceDispose(id)
      )
    }

    return null
  }

  /**
   * 缓存资源
   */
  private cacheResource(id: string, data: T, size: number): void {
    // 根据资源类型选择合适的缓存
    if (this.isGPUResource(data)) {
      this.gpuCache.set(id, data as T & { dispose(): void }, size)
    } else {
      this.cache.set(id, data, size)
    }
  }

  /**
   * 判断是否为GPU资源
   */
  private isGPUResource(data: T): data is T & { dispose(): void } {
    return data !== null && typeof data === 'object' && typeof (data as any).dispose === 'function'
  }

  /**
   * 估算资源大小
   */
  private estimateResourceSize(data: T): number {
    try {
      if (data instanceof ArrayBuffer) {
        return data.byteLength
      }
      if (data instanceof HTMLImageElement) {
        return data.width * data.height * 4 // 假设RGBA
      }
      if (typeof data === 'string') {
        return data.length * 2 // UTF-16
      }
      // 其他类型的简单估算
      return JSON.stringify(data).length * 2
    } catch {
      return 1024 // 默认1KB
    }
  }

  /**
   * 处理资源释放
   */
  private handleResourceDispose(id: string): void {
    this.cache.delete(id)
    this.gpuCache.delete(id)
  }

  /**
   * 数组分块
   */
  private chunkArray<U>(array: U[], size: number): U[][] {
    const chunks: U[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 开始自动垃圾收集
   */
  private startAutoGC(): void {
    if (typeof setInterval !== 'undefined') {
      this.gcTimer = setInterval(() => {
        this.forceGC()
      }, this.config.gcInterval)
    }
  }
}

// 全局实例管理
let globalResourceManager: EnhancedResourceManager | null = null

/**
 * 获取全局资源管理器
 */
export function getResourceManager(): EnhancedResourceManager {
  if (!globalResourceManager) {
    globalResourceManager = new EnhancedResourceManager()
  }
  return globalResourceManager
}

/**
 * 设置全局资源管理器
 */
export function setResourceManager(manager: EnhancedResourceManager): void {
  if (globalResourceManager) {
    globalResourceManager.dispose()
  }
  globalResourceManager = manager
}

/**
 * 创建资源管理器实例
 */
export function createResourceManager(config?: ResourceManagerConfig): EnhancedResourceManager {
  return new EnhancedResourceManager(config)
}
