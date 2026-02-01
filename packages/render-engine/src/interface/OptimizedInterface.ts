/**
 * 优化的接口调用系统
 * 提供高效的包间通信和数据传输机制
 */

/**
 * 批处理接口调用管理器
 */
export class BatchCallManager {
  private pendingCalls: Map<
    string,
    Array<{ data: unknown; processor: (items: unknown[]) => void }>
  > = new Map()
  private flushTimer: number | null = null
  private batchDelay = 16 // 1帧时间
  private maxBatchSize = 100

  /**
   * 添加批处理调用
   */
  addCall<T>(key: string, data: T, processor: (items: T[]) => void): void {
    if (!this.pendingCalls.has(key)) {
      this.pendingCalls.set(key, [])
    }

    const batch = this.pendingCalls.get(key)
    if (!batch) {
      return
    }
    batch.push({ data, processor: processor as (items: unknown[]) => void })

    // 如果批次达到最大大小，立即处理
    if (batch.length >= this.maxBatchSize) {
      this.flushBatch(key)
      return
    }

    // 设置延迟处理
    this.scheduleFlush()
  }

  /**
   * 立即刷新所有批处理
   */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    for (const key of this.pendingCalls.keys()) {
      this.flushBatch(key)
    }
  }

  /**
   * 刷新特定批处理
   */
  flushBatch(key: string): void {
    const batch = this.pendingCalls.get(key)
    if (!batch || batch.length === 0) return

    // 按处理器分组
    const processorGroups = new Map<(items: unknown[]) => void, unknown[]>()

    for (const item of batch) {
      const processor = item.processor
      if (!processorGroups.has(processor)) {
        processorGroups.set(processor, [])
      }
      processorGroups.get(processor)?.push(item.data)
    }

    // 执行批处理
    for (const [processor, items] of processorGroups) {
      try {
        processor(items)
      } catch (error) {
        console.error(`Batch processing error for key ${key}:`, error)
      }
    }

    // 清空批次
    this.pendingCalls.set(key, [])
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return

    this.flushTimer = window.setTimeout(() => {
      this.flush()
    }, this.batchDelay)
  }

  /**
   * 配置批处理参数
   */
  configure(options: { batchDelay?: number; maxBatchSize?: number }): void {
    if (options.batchDelay !== undefined) {
      this.batchDelay = options.batchDelay
    }
    if (options.maxBatchSize !== undefined) {
      this.maxBatchSize = options.maxBatchSize
    }
  }

  /**
   * 获取批处理统计
   */
  getStats(): {
    pendingBatches: number
    totalPendingCalls: number
    batchSizes: Record<string, number>
  } {
    const batchSizes: Record<string, number> = {}
    let totalPendingCalls = 0

    for (const [key, batch] of this.pendingCalls) {
      batchSizes[key] = batch.length
      totalPendingCalls += batch.length
    }

    return {
      pendingBatches: this.pendingCalls.size,
      totalPendingCalls,
      batchSizes,
    }
  }

  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.pendingCalls.clear()
  }
}

/**
 * 对象池管理器
 */
export class ObjectPoolManager {
  private pools = new Map<string, ObjectPool<unknown>>()

  /**
   * 创建对象池
   */
  createPool<T>(
    key: string,
    factory: () => T,
    reset?: (obj: T) => void,
    maxSize = 100
  ): ObjectPool<T> {
    const pool = new ObjectPool(factory, reset, maxSize)
    this.pools.set(key, pool as ObjectPool<unknown>)
    return pool
  }

  /**
   * 获取对象池
   */
  getPool<T>(key: string): ObjectPool<T> | null {
    return this.pools.get(key) || null
  }

  /**
   * 从池中获取对象
   */
  get<T>(key: string): T | null {
    const pool = this.pools.get(key)
    return pool ? (pool.get() as T) : null
  }

  /**
   * 归还对象到池
   */
  release(key: string, obj: unknown): void {
    const pool = this.pools.get(key)
    if (pool) {
      pool.release(obj as never)
    }
  }

  /**
   * 获取所有池的统计信息
   */
  getStats(): Record<
    string,
    {
      available: number
      total: number
      hitRate: number
    }
  > {
    const stats: Record<string, { available: number; total: number; hitRate: number }> = {}

    for (const [key, pool] of this.pools) {
      stats[key] = pool.getStats()
    }

    return stats
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      pool.dispose()
    }
    this.pools.clear()
  }
}

/**
 * 通用对象池
 */
export class ObjectPool<T> {
  private available: T[] = []
  private factory: () => T
  private reset?: (obj: T) => void
  private maxSize: number

  // 统计信息
  private hits = 0
  private misses = 0
  private totalCreated = 0

  constructor(factory: () => T, reset?: (obj: T) => void, maxSize = 100) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  get(): T {
    if (this.available.length > 0) {
      this.hits++
      const obj = this.available.pop()
      if (!obj) {
        this.misses++
        this.totalCreated++
        return this.factory()
      }
      if (this.reset) {
        this.reset(obj)
      }
      return obj
    }

    this.misses++
    this.totalCreated++
    return this.factory()
  }

  release(obj: T): void {
    if (this.available.length < this.maxSize) {
      this.available.push(obj)
    }
  }

  getStats() {
    const total = this.hits + this.misses
    return {
      available: this.available.length,
      total: this.totalCreated,
      hitRate: total > 0 ? this.hits / total : 0,
      hits: this.hits,
      misses: this.misses,
    }
  }

  dispose(): void {
    this.available = []
  }
}

/**
 * 数据传输优化器
 */
export class DataTransferOptimizer {
  private compressionThreshold = 1024 // 1KB
  private cache = new Map<string, unknown>()
  private cacheMaxSize = 1000

  /**
   * 优化数据传输
   */
  optimizeTransfer<T>(
    data: T,
    options?: {
      compress?: boolean
      cache?: boolean
      cacheKey?: string
    }
  ): OptimizedData<T> {
    const opts = {
      compress: false,
      cache: false,
      ...options,
    }

    let processedData = data
    const metadata: DataMetadata = {
      compressed: false,
      cached: false,
      originalSize: 0,
      processedSize: 0,
    }

    // 序列化以计算大小
    const serialized = JSON.stringify(data)
    metadata.originalSize = serialized.length

    // 缓存检查
    if (opts.cache && opts.cacheKey) {
      const cached = this.cache.get(opts.cacheKey)
      if (cached) {
        metadata.cached = true
        return { data: cached, metadata }
      }
    }

    // 压缩处理
    if (opts.compress && serialized.length > this.compressionThreshold) {
      try {
        processedData = this.compressData(data)
        metadata.compressed = true
      } catch (error) {
        console.warn('Data compression failed:', error)
      }
    }

    const processedSerialized = JSON.stringify(processedData)
    metadata.processedSize = processedSerialized.length

    // 缓存存储
    if (opts.cache && opts.cacheKey) {
      if (this.cache.size >= this.cacheMaxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey !== undefined) {
          this.cache.delete(firstKey)
        }
      }
      this.cache.set(opts.cacheKey, processedData)
    }

    return { data: processedData, metadata }
  }

  /**
   * 恢复优化的数据
   */
  restoreData<T>(optimizedData: OptimizedData<T>): T {
    if (optimizedData.metadata.compressed) {
      return this.decompressData(optimizedData.data)
    }
    return optimizedData.data
  }

  private compressData<T>(data: T): T {
    // 简化的压缩实现 - 在实际应用中可能使用 LZ4 或其他算法
    if (Array.isArray(data)) {
      return data.filter(
        (item, index, arr) => index === 0 || JSON.stringify(item) !== JSON.stringify(arr[index - 1])
      ) as T
    }
    return data
  }

  private decompressData<T>(data: T): T {
    // 对应的解压缩实现
    return data
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize,
    }
  }

  dispose(): void {
    this.cache.clear()
  }
}

/**
 * 优化的数据结构
 */
interface OptimizedData<T> {
  data: T
  metadata: DataMetadata
}

interface DataMetadata {
  compressed: boolean
  cached: boolean
  originalSize: number
  processedSize: number
}

/**
 * 接口调用拦截器
 */
export class InterfaceInterceptor {
  private interceptors = new Map<string, InterceptorFunction[]>()
  private metrics = new Map<string, CallMetrics>()

  /**
   * 添加拦截器
   */
  addInterceptor(method: string, interceptor: InterceptorFunction): void {
    if (!this.interceptors.has(method)) {
      this.interceptors.set(method, [])
    }
    this.interceptors.get(method)?.push(interceptor)
  }

  /**
   * 移除拦截器
   */
  removeInterceptor(method: string, interceptor: InterceptorFunction): void {
    const interceptors = this.interceptors.get(method)
    if (interceptors) {
      const index = interceptors.indexOf(interceptor)
      if (index > -1) {
        interceptors.splice(index, 1)
      }
    }
  }

  /**
   * 执行拦截的方法调用
   */
  async intercept<TArgs extends unknown[], TReturn>(
    method: string,
    originalFn: (...args: TArgs) => TReturn | Promise<TReturn>,
    args: TArgs
  ): Promise<TReturn> {
    const startTime = performance.now()

    // 更新调用统计
    this.updateMetrics(method, 'call')

    const interceptors = this.interceptors.get(method) || []
    let context: InterceptorContext = {
      method,
      args,
      timestamp: startTime,
    }

    try {
      // 前置拦截器
      for (const interceptor of interceptors) {
        if (interceptor.before) {
          context = await interceptor.before(context)
        }
      }

      // 执行原方法
      const result = await originalFn(...(context.args as TArgs))
      context.result = result

      // 后置拦截器
      for (const interceptor of interceptors) {
        if (interceptor.after) {
          context = await interceptor.after(context)
        }
      }

      // 更新性能统计
      const duration = performance.now() - startTime
      this.updateMetrics(method, 'success', duration)

      return context.result as TReturn
    } catch (error) {
      // 错误拦截器
      for (const interceptor of interceptors) {
        if (interceptor.error) {
          context.error = error
          context = await interceptor.error(context)
        }
      }

      // 更新错误统计
      this.updateMetrics(method, 'error')

      if (context.error) {
        throw context.error
      }
      throw error
    }
  }

  /**
   * 获取调用统计
   */
  getMetrics(method?: string): Record<string, CallMetrics> | CallMetrics {
    if (method) {
      return (
        this.metrics.get(method) || {
          calls: 0,
          successes: 0,
          errors: 0,
          totalDuration: 0,
          averageDuration: 0,
        }
      )
    }

    return Object.fromEntries(this.metrics)
  }

  private updateMetrics(
    method: string,
    type: 'call' | 'success' | 'error',
    duration?: number
  ): void {
    if (!this.metrics.has(method)) {
      this.metrics.set(method, {
        calls: 0,
        successes: 0,
        errors: 0,
        totalDuration: 0,
        averageDuration: 0,
      })
    }

    const metrics = this.metrics.get(method)
    if (!metrics) {
      return
    }

    switch (type) {
      case 'call':
        metrics.calls++
        break
      case 'success':
        metrics.successes++
        if (duration) {
          metrics.totalDuration += duration
          metrics.averageDuration = metrics.totalDuration / metrics.successes
        }
        break
      case 'error':
        metrics.errors++
        break
    }
  }

  dispose(): void {
    this.interceptors.clear()
    this.metrics.clear()
  }
}

/**
 * 拦截器函数接口
 */
interface InterceptorFunction {
  before?: (context: InterceptorContext) => Promise<InterceptorContext>
  after?: (context: InterceptorContext) => Promise<InterceptorContext>
  error?: (context: InterceptorContext) => Promise<InterceptorContext>
}

interface InterceptorContext {
  method: string
  args: unknown[]
  result?: unknown
  error?: unknown
  timestamp: number
  startTime?: number
  pooledObj?: unknown
}

interface CallMetrics {
  calls: number
  successes: number
  errors: number
  totalDuration: number
  averageDuration: number
}

/**
 * 全局接口优化管理器
 */
export class GlobalInterfaceOptimizer {
  private static instance: GlobalInterfaceOptimizer | null = null

  public batchManager = new BatchCallManager()
  public objectPoolManager = new ObjectPoolManager()
  public dataOptimizer = new DataTransferOptimizer()
  public interceptor = new InterfaceInterceptor()

  private constructor() {}

  static getInstance(): GlobalInterfaceOptimizer {
    if (!GlobalInterfaceOptimizer.instance) {
      GlobalInterfaceOptimizer.instance = new GlobalInterfaceOptimizer()
    }
    return GlobalInterfaceOptimizer.instance
  }

  /**
   * 获取综合性能统计
   */
  getComprehensiveStats() {
    return {
      batch: this.batchManager.getStats(),
      pools: this.objectPoolManager.getStats(),
      cache: this.dataOptimizer.getCacheStats(),
      calls: this.interceptor.getMetrics(),
    }
  }

  /**
   * 配置优化参数
   */
  configure(options: {
    batchDelay?: number
    maxBatchSize?: number
    compressionThreshold?: number
    cacheMaxSize?: number
  }): void {
    if (options.batchDelay !== undefined || options.maxBatchSize !== undefined) {
      this.batchManager.configure({
        batchDelay: options.batchDelay,
        maxBatchSize: options.maxBatchSize,
      })
    }
  }

  dispose(): void {
    this.batchManager.dispose()
    this.objectPoolManager.dispose()
    this.dataOptimizer.dispose()
    this.interceptor.dispose()
    GlobalInterfaceOptimizer.instance = null
  }
}

// 导出全局实例
export const globalInterfaceOptimizer = GlobalInterfaceOptimizer.getInstance()
