/**
 * 插件系统性能监控器
 */

export interface PerformanceMetrics {
  pluginId: string
  loadTime: number
  activateTime: number
  memoryUsage: number
  apiCallCount: number
  errorCount: number
  lastActivity: number
  loadStartTime?: number
  activationTime?: number
  apiCalls?: number
  errors?: number
  lastError?: string
}

export interface SystemMetrics {
  totalPlugins: number
  activePlugins: number
  totalMemoryUsage: number
  averageLoadTime: number
  averageActivateTime: number
  totalApiCalls: number
  totalErrors: number
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>()
  private observers: PerformanceObserver[] = []
  private memoryCheckInterval?: number
  private listeners = new Map<string, Set<(metrics: PerformanceMetrics | SystemMetrics) => void>>()
  private loadStartTimes = new Map<string, number>()
  private activationStartTimes = new Map<string, number>()
  private realTimeInterval?: number

  constructor() {
    this.initializeObservers()
    this.startMemoryMonitoring()
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // 监控用户定时
      const userTimingObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.startsWith('plugin:')) {
            this.handlePerformanceEntry(entry)
          }
        }
      })
      userTimingObserver.observe({ entryTypes: ['measure'] })
      this.observers.push(userTimingObserver)

      // 监控资源加载
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('/plugins/')) {
            this.handleResourceEntry(entry as PerformanceResourceTiming)
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    }
  }

  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = window.setInterval(() => {
      this.updateMemoryMetrics()
    }, 5000) // 每5秒检查一次内存使用
  }

  /**
   * 记录插件加载开始
   */
  startPluginLoad(pluginId: string): void {
    performance.mark(`plugin:${pluginId}:load:start`)
  }

  /**
   * 记录插件加载结束
   */
  endPluginLoad(pluginId: string): void {
    performance.mark(`plugin:${pluginId}:load:end`)
    performance.measure(
      `plugin:${pluginId}:load`,
      `plugin:${pluginId}:load:start`,
      `plugin:${pluginId}:load:end`
    )
  }

  /**
   * 记录插件激活开始
   */
  startPluginActivate(pluginId: string): void {
    performance.mark(`plugin:${pluginId}:activate:start`)
  }

  /**
   * 记录插件激活结束
   */
  endPluginActivate(pluginId: string): void {
    performance.mark(`plugin:${pluginId}:activate:end`)
    performance.measure(
      `plugin:${pluginId}:activate`,
      `plugin:${pluginId}:activate:start`,
      `plugin:${pluginId}:activate:end`
    )
  }

  /**
   * 记录API调用
   */
  recordApiCall(pluginId: string, apiPath: string): void {
    const metrics = this.getOrCreateMetrics(pluginId)
    metrics.apiCallCount++
    metrics.lastActivity = Date.now()

    // 记录API调用性能
    performance.mark(`plugin:${pluginId}:api:${apiPath}`)
  }

  /**
   * 记录错误
   */
  recordError(pluginId: string, error: Error): void {
    const metrics = this.getOrCreateMetrics(pluginId)
    metrics.errorCount++
    metrics.lastActivity = Date.now()

    this.emit('error', { pluginId, error, timestamp: Date.now() })
  }

  /**
   * 获取插件性能指标
   */
  getPluginMetrics(pluginId: string): PerformanceMetrics {
    return this.metrics.get(pluginId) || this.getOrCreateMetrics(pluginId)
  }

  /**
   * 获取所有插件性能指标
   */
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 获取系统整体性能指标
   */
  getSystemMetrics(): SystemMetrics {
    const allMetrics = this.getAllMetrics()

    return {
      totalPlugins: allMetrics.length,
      activePlugins: allMetrics.filter((m) => m.lastActivity > Date.now() - 300000).length, // 5分钟内有活动
      totalMemoryUsage: allMetrics.reduce((sum, m) => sum + m.memoryUsage, 0),
      averageLoadTime: this.calculateAverage(allMetrics.map((m) => m.loadTime)),
      averageActivateTime: this.calculateAverage(allMetrics.map((m) => m.activateTime)),
      totalApiCalls: allMetrics.reduce((sum, m) => sum + m.apiCallCount, 0),
      totalErrors: allMetrics.reduce((sum, m) => sum + m.errorCount, 0),
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    summary: SystemMetrics
    topMemoryConsumers: PerformanceMetrics[]
    slowestLoaders: PerformanceMetrics[]
    mostActivePlugins: PerformanceMetrics[]
    errorPronePlugins: PerformanceMetrics[]
  } {
    const allMetrics = this.getAllMetrics()

    return {
      summary: this.getSystemMetrics(),
      topMemoryConsumers: allMetrics.sort((a, b) => b.memoryUsage - a.memoryUsage).slice(0, 5),
      slowestLoaders: allMetrics.sort((a, b) => b.loadTime - a.loadTime).slice(0, 5),
      mostActivePlugins: allMetrics.sort((a, b) => b.apiCallCount - a.apiCallCount).slice(0, 5),
      errorPronePlugins: allMetrics
        .filter((m) => m.errorCount > 0)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 5),
    }
  }

  /**
   * 检查性能问题
   */
  checkPerformanceIssues(): {
    memoryLeaks: string[]
    slowPlugins: string[]
    errorPlugins: string[]
    inactivePlugins: string[]
  } {
    const allMetrics = this.getAllMetrics()
    const now = Date.now()

    return {
      memoryLeaks: allMetrics
        .filter((m) => m.memoryUsage > 50 * 1024 * 1024) // 50MB
        .map((m) => m.pluginId),
      slowPlugins: allMetrics
        .filter((m) => m.loadTime > 1000 || m.activateTime > 500) // 1s加载或500ms激活
        .map((m) => m.pluginId),
      errorPlugins: allMetrics
        .filter((m) => m.errorCount > 5) // 超过5个错误
        .map((m) => m.pluginId),
      inactivePlugins: allMetrics
        .filter((m) => now - m.lastActivity > 1800000) // 30分钟无活动
        .map((m) => m.pluginId),
    }
  }

  /**
   * 清理插件指标
   */
  clearPluginMetrics(pluginId: string): void {
    this.metrics.delete(pluginId)

    // 清理性能条目
    if (performance.clearMeasures) {
      performance.clearMeasures(`plugin:${pluginId}:load`)
      performance.clearMeasures(`plugin:${pluginId}:activate`)
    }
    if (performance.clearMarks) {
      performance.clearMarks(`plugin:${pluginId}:load:start`)
      performance.clearMarks(`plugin:${pluginId}:load:end`)
      performance.clearMarks(`plugin:${pluginId}:activate:start`)
      performance.clearMarks(`plugin:${pluginId}:activate:end`)
    }
  }

  /**
   * 监听性能事件
   */
  on(event: string, listener: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  /**
   * 移除性能事件监听
   */
  off(event: string, listener: (data: any) => void): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 销毁监控器
   */
  dispose(): void {
    // 停止内存监控
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
    }

    // 断开性能观察器
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []

    // 清理数据
    this.metrics.clear()
    this.listeners.clear()
  }

  /**
   * 处理性能条目
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    const [, pluginId, operation] = entry.name.split(':')
    const metrics = this.getOrCreateMetrics(pluginId)

    if (operation === 'load') {
      metrics.loadTime = entry.duration
    } else if (operation === 'activate') {
      metrics.activateTime = entry.duration
    }

    this.emit('metrics-updated', metrics)
  }

  /**
   * 处理资源条目
   */
  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    // 从URL中提取插件ID
    const match = entry.name.match(/\/plugins\/([^/]+)\//)
    if (match) {
      const pluginId = match[1]
      const metrics = this.getOrCreateMetrics(pluginId)

      // 记录资源加载时间
      if (entry.transferSize) {
        metrics.memoryUsage += entry.transferSize
      }
    }
  }

  /**
   * 更新内存指标
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory

      // 估算每个插件的内存使用
      const totalUsed = memory.usedJSHeapSize
      const pluginCount = this.metrics.size

      if (pluginCount > 0) {
        const averageUsage = totalUsed / pluginCount

        for (const metrics of this.metrics.values()) {
          // 简单的内存使用估算
          metrics.memoryUsage = Math.max(metrics.memoryUsage, averageUsage * 0.1)
        }
      }
    }
  }

  /**
   * 获取或创建指标对象
   */
  private getOrCreateMetrics(pluginId: string): PerformanceMetrics {
    if (!this.metrics.has(pluginId)) {
      this.metrics.set(pluginId, {
        pluginId,
        loadTime: 0,
        activateTime: 0,
        memoryUsage: 0,
        apiCallCount: 0,
        errorCount: 0,
        lastActivity: Date.now(),
      })
    }
    return this.metrics.get(pluginId)!
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch {}
      }
    }
  }

  /**
   * 开始记录插件加载时间
   */
  startLoadTime(pluginId: string): void {
    this.loadStartTimes.set(pluginId, Date.now())
    const metrics = this.getOrCreateMetrics(pluginId)
    metrics.loadStartTime = Date.now()
  }

  /**
   * 结束记录插件加载时间
   */
  endLoadTime(pluginId: string): void {
    const startTime = this.loadStartTimes.get(pluginId)
    if (startTime) {
      const metrics = this.getOrCreateMetrics(pluginId)
      metrics.loadTime = Date.now() - startTime
      this.loadStartTimes.delete(pluginId)
    } else {
      const metrics = this.getOrCreateMetrics(pluginId)
      metrics.loadTime = 0
    }
  }

  /**
   * 开始记录插件激活时间
   */
  startActivationTime(pluginId: string): void {
    this.activationStartTimes.set(pluginId, Date.now())
  }

  /**
   * 结束记录插件激活时间
   */
  endActivationTime(pluginId: string): void {
    const startTime = this.activationStartTimes.get(pluginId)
    if (startTime) {
      const metrics = this.getOrCreateMetrics(pluginId)
      metrics.activationTime = Date.now() - startTime
      this.activationStartTimes.delete(pluginId)
    }
  }

  /**
   * 增加API调用计数
   */
  incrementApiCalls(pluginId: string): void {
    const metrics = this.getOrCreateMetrics(pluginId)
    metrics.apiCalls = (metrics.apiCalls || 0) + 1
    metrics.apiCallCount++
  }

  /**
   * 增加错误计数
   */
  incrementErrors(pluginId: string): void {
    const metrics = this.getOrCreateMetrics(pluginId)
    metrics.errors = (metrics.errors || 0) + 1
    metrics.errorCount++
  }

  /**
   * 记录内存使用情况
   */
  recordMemoryUsage(pluginId: string): void {
    const metrics = this.getOrCreateMetrics(pluginId)
    if ((performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
    } else {
      metrics.memoryUsage = 0
    }
  }

  /**
   * 清除所有指标
   */
  clearAllMetrics(): void {
    this.metrics.clear()
    this.loadStartTimes.clear()
    this.activationStartTimes.clear()
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    totalPlugins: number
    totalLoadTime: number
    totalActivationTime: number
    totalApiCalls: number
    totalErrors: number
    averageLoadTime: number
    averageActivationTime: number
    slowestLoadTime: number
    plugins: PerformanceMetrics[]
  } {
    const allMetrics = this.getAllMetrics()
    const totalLoadTime = allMetrics.reduce((sum, m) => sum + m.loadTime, 0)
    const totalActivationTime = allMetrics.reduce((sum, m) => sum + (m.activationTime || 0), 0)
    const totalApiCalls = allMetrics.reduce((sum, m) => sum + (m.apiCalls || 0), 0)
    const totalErrors = allMetrics.reduce((sum, m) => sum + (m.errors || 0), 0)
    const slowestLoadTime =
      allMetrics.length > 0 ? Math.max(...allMetrics.map((m) => m.loadTime)) : 0

    return {
      totalPlugins: allMetrics.length,
      totalLoadTime,
      totalActivationTime,
      totalApiCalls,
      totalErrors,
      averageLoadTime: allMetrics.length > 0 ? totalLoadTime / allMetrics.length : 0,
      averageActivationTime: allMetrics.length > 0 ? totalActivationTime / allMetrics.length : 0,
      slowestLoadTime,
      plugins: allMetrics,
    }
  }

  /**
   * 开始实时监控
   */
  startRealTimeMonitoring(callback: (metrics: any) => void, interval: number): void {
    this.realTimeInterval = window.setInterval(() => {
      callback(this.getSystemMetrics())
    }, interval)
  }

  /**
   * 停止实时监控
   */
  stopRealTimeMonitoring(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval)
      this.realTimeInterval = undefined
    }
  }

  /**
   * 设置性能基准
   */
  setBenchmark(benchmark: any): void {
    // 实现基准设置逻辑
  }

  /**
   * 获取性能警告
   */
  getPerformanceWarnings(): any[] {
    // 实现警告获取逻辑
    return []
  }

  /**
   * 导出数据
   */
  exportData(): {
    timestamp: number
    plugins: Record<string, any>
  } {
    const plugins: Record<string, any> = {}
    for (const [pluginId, metrics] of this.metrics) {
      plugins[pluginId] = {
        loadTime: metrics.loadTime,
        activationTime: metrics.activationTime || 0,
        memoryUsage: metrics.memoryUsage,
        apiCalls: metrics.apiCalls || 0,
        errors: metrics.errors || 0,
        lastError: metrics.lastError,
      }
    }
    return {
      timestamp: Date.now(),
      plugins,
    }
  }

  /**
   * 导入数据
   */
  importData(data: { timestamp: number; plugins: Record<string, any> }): void {
    for (const [pluginId, pluginData] of Object.entries(data.plugins)) {
      const metrics = this.getOrCreateMetrics(pluginId)
      metrics.loadTime = pluginData.loadTime || 0
      metrics.activationTime = pluginData.activationTime || 0
      metrics.memoryUsage = pluginData.memoryUsage || 0
      metrics.apiCalls = pluginData.apiCalls || 0
      metrics.errors = pluginData.errors || 0
      metrics.lastError = pluginData.lastError
      metrics.apiCallCount = pluginData.apiCalls || 0
      metrics.errorCount = pluginData.errors || 0
    }
  }
}
