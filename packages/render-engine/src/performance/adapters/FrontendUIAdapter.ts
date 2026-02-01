/**
 * Frontend UI 性能数据适配器
 * 从前端UI层收集性能指标
 */

import {
  DataSourceType,
  type IDataSourceAdapter,
  UnifiedMetricType,
} from '../UnifiedPerformanceMonitor'

// 类型定义 - 避免直接依赖前端UI
interface ReactPerformanceMetrics {
  renderTime: number
  componentUpdateTime: number
  stateUpdateTime: number
  memoryUsage: number
  componentCount: number
  rerenderCount: number
}

interface UIPerformanceProvider {
  getReactMetrics?(): ReactPerformanceMetrics
  getUIMetrics?(): {
    domElementCount: number
    cssRuleCount: number
    imageCount: number
    scriptCount: number
    memoryUsage: number
    layoutTime: number
    paintTime: number
  }
  getBrowserMetrics?(): {
    memoryUsage: number
    cpuUsage: number
    networkLatency: number
    resourceLoadTime: number
  }
}

export class FrontendUIAdapter implements IDataSourceAdapter {
  readonly sourceType = DataSourceType.FRONTEND_UI
  readonly supportedMetrics = [
    UnifiedMetricType.RENDER_TIME,
    UnifiedMetricType.UPDATE_TIME,
    UnifiedMetricType.MEMORY_USAGE,
    UnifiedMetricType.CPU_USAGE,
    UnifiedMetricType.INPUT_LATENCY,
  ]

  private performanceProvider: UIPerformanceProvider | null = null
  private performanceObserver: PerformanceObserver | null = null
  private navigationObserver: PerformanceObserver | null = null

  // 性能缓存
  private lastRenderTime = 0
  private lastPaintTime = 0
  private lastLayoutTime = 0
  private renderTimeCache: number[] = []

  constructor(performanceProvider?: UIPerformanceProvider) {
    this.performanceProvider = performanceProvider || null
  }

  /**
   * 设置性能数据提供者
   */
  setPerformanceProvider(provider: UIPerformanceProvider): void {
    this.performanceProvider = provider
  }

  async initialize(): Promise<void> {
    // 初始化Performance Observer
    this.initializePerformanceObserver()

    // 如果没有提供性能数据源，尝试从全局获取
    if (!this.performanceProvider) {
      this.tryGetGlobalProvider()
    }
  }

  async collect(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>()

    // 收集React性能指标
    const reactMetrics = await this.collectReactMetrics()
    reactMetrics.forEach((value, key) => {
      metrics.set(key, value)
    })

    // 收集UI性能指标
    const uiMetrics = await this.collectUIMetrics()
    uiMetrics.forEach((value, key) => {
      metrics.set(key, value)
    })

    // 收集浏览器性能指标
    const browserMetrics = await this.collectBrowserMetrics()
    browserMetrics.forEach((value, key) => {
      metrics.set(key, value)
    })

    // 收集Web性能指标
    const webMetrics = await this.collectWebPerformanceMetrics()
    webMetrics.forEach((value, key) => {
      metrics.set(key, value)
    })

    return metrics
  }

  private async collectReactMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>()

    if (!this.performanceProvider?.getReactMetrics) {
      return metrics
    }

    try {
      const reactMetrics = this.performanceProvider.getReactMetrics()

      this.mapMetric(metrics, UnifiedMetricType.RENDER_TIME, reactMetrics.renderTime)
      this.mapMetric(metrics, UnifiedMetricType.UPDATE_TIME, reactMetrics.componentUpdateTime)
      this.mapMetric(metrics, UnifiedMetricType.MEMORY_USAGE, reactMetrics.memoryUsage)
    } catch (error) {
      console.warn('Failed to collect React metrics:', error)
    }

    return metrics
  }

  private async collectUIMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>()

    if (!this.performanceProvider?.getUIMetrics) {
      return metrics
    }

    try {
      const uiMetrics = this.performanceProvider.getUIMetrics()

      // 合并内存使用
      const currentMemory = metrics.get(UnifiedMetricType.MEMORY_USAGE) || 0
      this.mapMetric(metrics, UnifiedMetricType.MEMORY_USAGE, currentMemory + uiMetrics.memoryUsage)

      // Layout和Paint时间作为渲染时间的一部分
      const renderTime = uiMetrics.layoutTime + uiMetrics.paintTime
      this.mapMetric(metrics, UnifiedMetricType.RENDER_TIME, renderTime)
    } catch (error) {
      console.warn('Failed to collect UI metrics:', error)
    }

    return metrics
  }

  private async collectBrowserMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>()

    if (!this.performanceProvider?.getBrowserMetrics) {
      return metrics
    }

    try {
      const browserMetrics = this.performanceProvider.getBrowserMetrics()

      this.mapMetric(metrics, UnifiedMetricType.CPU_USAGE, browserMetrics.cpuUsage)
      this.mapMetric(metrics, UnifiedMetricType.INPUT_LATENCY, browserMetrics.networkLatency)

      // 合并内存使用
      const currentMemory = metrics.get(UnifiedMetricType.MEMORY_USAGE) || 0
      this.mapMetric(
        metrics,
        UnifiedMetricType.MEMORY_USAGE,
        currentMemory + browserMetrics.memoryUsage
      )
    } catch (error) {
      console.warn('Failed to collect browser metrics:', error)
    }

    return metrics
  }

  private async collectWebPerformanceMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>()

    try {
      // 收集Performance API数据
      if ('performance' in window) {
        // 收集Paint性能
        const paintEntries = performance.getEntriesByType('paint')
        if (paintEntries.length > 0) {
          const lastPaint = paintEntries[paintEntries.length - 1]
          if (lastPaint.startTime !== this.lastPaintTime) {
            this.lastPaintTime = lastPaint.startTime
            metrics.set(UnifiedMetricType.RENDER_TIME, lastPaint.startTime)
          }
        }

        // 收集Layout性能
        const measureEntries = performance.getEntriesByType('measure')
        const layoutMeasures = measureEntries.filter(
          (entry) => entry.name.includes('layout') || entry.name.includes('reflow')
        )

        if (layoutMeasures.length > 0) {
          const avgLayoutTime =
            layoutMeasures.reduce((sum, entry) => sum + entry.duration, 0) / layoutMeasures.length
          metrics.set(UnifiedMetricType.UPDATE_TIME, avgLayoutTime)
        }

        // 收集内存信息
        if ('memory' in performance) {
          const memory = (performance as any).memory
          if (memory && memory.usedJSHeapSize) {
            const currentMemory = metrics.get(UnifiedMetricType.MEMORY_USAGE) || 0
            metrics.set(UnifiedMetricType.MEMORY_USAGE, currentMemory + memory.usedJSHeapSize)
          }
        }

        // 收集渲染时间缓存
        if (this.renderTimeCache.length > 0) {
          const avgRenderTime =
            this.renderTimeCache.reduce((sum, time) => sum + time, 0) / this.renderTimeCache.length
          metrics.set(UnifiedMetricType.RENDER_TIME, avgRenderTime)

          // 清理缓存
          this.renderTimeCache = []
        }
      }

      // 收集DOM性能指标
      if (document) {
        const domElementCount = document.querySelectorAll('*').length
        const styleSheetCount = document.styleSheets.length

        // 使用DOM复杂度估算渲染时间影响
        const domComplexity = domElementCount + styleSheetCount * 10
        const estimatedRenderImpact = Math.min(domComplexity / 1000, 10) // 最大10ms影响

        const currentRenderTime = metrics.get(UnifiedMetricType.RENDER_TIME) || 0
        metrics.set(UnifiedMetricType.RENDER_TIME, currentRenderTime + estimatedRenderImpact)
      }
    } catch (error) {
      console.warn('Failed to collect web performance metrics:', error)
    }

    return metrics
  }

  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return

    try {
      // 观察渲染性能
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.renderTimeCache.push(entry.startTime)
          } else if (entry.entryType === 'measure' && entry.name.includes('React')) {
            this.renderTimeCache.push(entry.duration)
          }
        }
      })

      this.performanceObserver.observe({
        entryTypes: ['paint', 'measure'],
      })

      // 观察导航性能
      this.navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            const loadTime = navEntry.loadEventEnd - (navEntry as any).navigationStart
            this.renderTimeCache.push(loadTime)
          }
        }
      })

      this.navigationObserver.observe({
        entryTypes: ['navigation'],
      })
    } catch (error) {
      console.warn('Failed to initialize PerformanceObserver:', error)
    }
  }

  private mapMetric(
    metrics: Map<UnifiedMetricType, number>,
    type: UnifiedMetricType,
    value: number | undefined
  ): void {
    if (value !== undefined && !isNaN(value) && isFinite(value)) {
      metrics.set(type, value)
    }
  }

  private tryGetGlobalProvider(): void {
    // 尝试从全局对象获取性能数据提供者
    if (typeof window !== 'undefined') {
      const globalProvider = (window as any).frontendUIPerformanceProvider
      if (globalProvider) {
        this.performanceProvider = globalProvider
      }
    }
  }

  dispose(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
      this.performanceObserver = null
    }

    if (this.navigationObserver) {
      this.navigationObserver.disconnect()
      this.navigationObserver = null
    }

    this.performanceProvider = null
    this.renderTimeCache = []
  }
}

/**
 * Frontend UI 性能监控辅助类
 * 用于在前端UI中收集和提供性能数据
 */
export class FrontendUIPerformanceHelper {
  private reactMetrics: ReactPerformanceMetrics = {
    renderTime: 0,
    componentUpdateTime: 0,
    stateUpdateTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    rerenderCount: 0,
  }

  private uiMetrics = {
    domElementCount: 0,
    cssRuleCount: 0,
    imageCount: 0,
    scriptCount: 0,
    memoryUsage: 0,
    layoutTime: 0,
    paintTime: 0,
  }

  private renderStartTime = 0
  private updateStartTime = 0

  /**
   * 记录组件渲染开始
   */
  recordRenderStart(): void {
    this.renderStartTime = performance.now()
  }

  /**
   * 记录组件渲染结束
   */
  recordRenderEnd(): void {
    if (this.renderStartTime > 0) {
      this.reactMetrics.renderTime = performance.now() - this.renderStartTime
      this.renderStartTime = 0
    }
  }

  /**
   * 记录组件更新开始
   */
  recordUpdateStart(): void {
    this.updateStartTime = performance.now()
  }

  /**
   * 记录组件更新结束
   */
  recordUpdateEnd(): void {
    if (this.updateStartTime > 0) {
      this.reactMetrics.componentUpdateTime = performance.now() - this.updateStartTime
      this.updateStartTime = 0
    }
  }

  /**
   * 记录重渲染
   */
  recordRerender(): void {
    this.reactMetrics.rerenderCount++
  }

  /**
   * 更新UI指标
   */
  updateUIMetrics(): void {
    if (typeof document !== 'undefined') {
      this.uiMetrics.domElementCount = document.querySelectorAll('*').length
      this.uiMetrics.cssRuleCount = Array.from(document.styleSheets).reduce((total, sheet) => {
        try {
          return total + (sheet.cssRules?.length || 0)
        } catch {
          return total
        }
      }, 0)
      this.uiMetrics.imageCount = document.querySelectorAll('img').length
      this.uiMetrics.scriptCount = document.querySelectorAll('script').length
    }

    // 更新内存使用
    if ('memory' in performance) {
      const memory = (performance as any).memory
      if (memory) {
        this.uiMetrics.memoryUsage = memory.usedJSHeapSize || 0
      }
    }
  }

  /**
   * 获取性能数据提供者
   */
  getPerformanceProvider(): UIPerformanceProvider {
    return {
      getReactMetrics: () => ({ ...this.reactMetrics }),
      getUIMetrics: () => ({ ...this.uiMetrics }),
      getBrowserMetrics: () => ({
        memoryUsage: this.uiMetrics.memoryUsage,
        cpuUsage: 0, // 浏览器无法直接获取CPU使用率
        networkLatency: this.estimateNetworkLatency(),
        resourceLoadTime: this.getResourceLoadTime(),
      }),
    }
  }

  /**
   * 创建React性能装饰器
   */
  createReactPerformanceDecorator(metricType: 'render' | 'update') {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value

      descriptor.value = function (...args: any[]) {
        const startTime = performance.now()
        const result = originalMethod.apply(this, args)
        const endTime = performance.now()

        // 更新性能指标
        if ((this as any).performanceHelper instanceof FrontendUIPerformanceHelper) {
          if (metricType === 'render') {
            ;(this as any).performanceHelper.reactMetrics.renderTime = endTime - startTime
          } else if (metricType === 'update') {
            ;(this as any).performanceHelper.reactMetrics.componentUpdateTime = endTime - startTime
          }
        }

        return result
      }

      return descriptor
    }
  }

  private estimateNetworkLatency(): number {
    // 简化的网络延迟估算
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection && connection.rtt) {
        return connection.rtt
      }
    }
    return 0
  }

  private getResourceLoadTime(): number {
    if ('performance' in window) {
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigationEntry) {
        return navigationEntry.loadEventEnd - (navigationEntry as any).navigationStart
      }
    }
    return 0
  }
}
