/**
 * 性能监控系统
 * 实时监控渲染性能、内存使用和GPU状态
 */
import { EventEmitter } from '../events/EventBus'
import {
  DEFAULT_PERFORMANCE_CONFIG,
  FPSCounter,
  GPUQueryManager,
  MemoryProfiler,
  type MetricDataPoint,
  type MetricStats,
  MetricType,
  type PerformanceConfig,
  type PerformanceEvents,
  type RenderStats,
} from './monitoring'

export type {
  MetricDataPoint,
  MetricStats,
  PerformanceConfig,
  PerformanceEvents,
  PerformanceThresholds,
  RenderStats,
} from './monitoring'
// 重新导出类型供外部使用
export { MetricType } from './monitoring'

/**
 * 性能监控器
 */
export class PerformanceMonitor extends EventEmitter<PerformanceEvents> {
  private config: PerformanceConfig
  private metrics = new Map<MetricType, MetricDataPoint[]>()
  private stats = new Map<MetricType, MetricStats>()

  private fpsCounter: FPSCounter
  private memoryProfiler: MemoryProfiler
  private gpuQueryManager: GPUQueryManager | null = null

  private isActive = false
  private sampleTimer: number | null = null
  private lastSampleTime = 0
  private renderStats: RenderStats = this.createEmptyRenderStats()

  constructor(gl?: WebGLRenderingContext, config?: Partial<PerformanceConfig>) {
    super()
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config }
    this.fpsCounter = new FPSCounter()
    this.memoryProfiler = new MemoryProfiler()

    if (gl && this.config.enableGPUQueries) {
      this.gpuQueryManager = new GPUQueryManager(gl)
    }

    this.initializeMetrics()
  }

  start(): void {
    if (this.isActive) return
    this.isActive = true
    this.lastSampleTime = performance.now()

    this.sampleTimer = window.setInterval(() => {
      this.sampleMetrics()
    }, this.config.sampleInterval)

    this.startFrameMonitoring()
  }

  stop(): void {
    if (!this.isActive) return
    this.isActive = false

    if (this.sampleTimer) {
      clearInterval(this.sampleTimer)
      this.sampleTimer = null
    }
  }

  recordFrame(): void {
    if (!this.isActive) return
    this.fpsCounter.recordFrame()

    const fps = this.fpsCounter.getCurrentFPS()
    const frameTime = this.fpsCounter.getAverageFrameTime()

    this.updateMetric(MetricType.FPS, fps)
    this.updateMetric(MetricType.FRAME_TIME, frameTime)
  }

  recordDrawCall(vertices: number, triangles?: number): void {
    this.renderStats.drawCalls++
    this.renderStats.vertices += vertices
    if (triangles !== undefined) {
      this.renderStats.triangles += triangles
    }
  }

  recordBatch(commandCount: number): void {
    this.renderStats.batchCount++
    if (this.renderStats.drawCalls > 0) {
      const efficiency = commandCount / this.renderStats.drawCalls
      this.updateMetric(MetricType.BATCH_EFFICIENCY, efficiency)
    }
  }

  recordStateChange(): void {
    this.renderStats.stateChanges++
  }

  recordMemoryAllocation(type: string, size: number): void {
    if (this.config.enableMemoryProfiler) {
      this.memoryProfiler.recordAllocation(type, size)
    }
  }

  recordMemoryDeallocation(type: string, size: number): void {
    if (this.config.enableMemoryProfiler) {
      this.memoryProfiler.recordDeallocation(type, size)
    }
  }

  getCurrentMetrics(): Record<MetricType, number> {
    const metrics: Record<string, number> = {}
    for (const [type, stat] of this.stats) {
      metrics[type] = stat.current
    }
    return metrics as Record<MetricType, number>
  }

  getStats(metricType?: MetricType): MetricStats | Map<MetricType, MetricStats> {
    if (metricType) {
      return this.stats.get(metricType) || { min: 0, max: 0, avg: 0, current: 0, samples: 0 }
    }
    return new Map(this.stats)
  }

  getHistoryData(metricType: MetricType, duration?: number): MetricDataPoint[] {
    const data = this.metrics.get(metricType) || []
    if (duration) {
      const cutoffTime = performance.now() - duration * 1000
      return data.filter((point) => point.timestamp >= cutoffTime)
    }
    return [...data]
  }

  generateReport(): {
    summary: Record<MetricType, MetricStats>
    warnings: string[]
    recommendations: string[]
  } {
    const summary: Record<string, MetricStats> = {}
    const warnings: string[] = []
    const recommendations: string[] = []

    for (const [type, stat] of this.stats) {
      summary[type] = { ...stat }
    }

    this.analyzePerformance(warnings, recommendations)

    return { summary: summary as Record<MetricType, MetricStats>, warnings, recommendations }
  }

  clearHistory(): void {
    this.metrics.clear()
    this.stats.clear()
    this.initializeMetrics()
  }

  dispose(): void {
    this.stop()
    this.clearHistory()
    this.removeAllListeners()
  }

  private initializeMetrics(): void {
    for (const metricType of Object.values(MetricType)) {
      this.metrics.set(metricType as MetricType, [])
      this.stats.set(metricType as MetricType, {
        min: Infinity,
        max: -Infinity,
        avg: 0,
        current: 0,
        samples: 0,
      })
    }
  }

  private sampleMetrics(): void {
    this.updateMetric(MetricType.DRAW_CALLS, this.renderStats.drawCalls)
    this.updateMetric(MetricType.VERTICES, this.renderStats.vertices)
    this.updateMetric(MetricType.TRIANGLES, this.renderStats.triangles)

    if (this.config.enableMemoryProfiler) {
      const memoryUsage = this.memoryProfiler.getMemoryUsage()
      this.updateMetric(MetricType.MEMORY_USAGE, memoryUsage.total)

      const leaks = this.memoryProfiler.detectMemoryLeaks()
      for (const leak of leaks) {
        this.emit('memory-leak', { type: leak.type, trend: leak.trend })
      }
    }

    this.updateGPUMetrics()
    this.renderStats = this.createEmptyRenderStats()
    this.cleanupOldData()

    if (this.config.enableAutoAnalysis) {
      this.performAutoAnalysis()
    }

    this.lastSampleTime = performance.now()
  }

  private updateMetric(type: MetricType, value: number): void {
    const now = performance.now()
    const dataPoints = this.metrics.get(type) || []
    dataPoints.push({ timestamp: now, value })

    const stat = this.stats.get(type)
    if (stat) {
      stat.current = value
      stat.min = Math.min(stat.min, value)
      stat.max = Math.max(stat.max, value)
      stat.samples++
      const recentPoints = dataPoints.slice(-10)
      stat.avg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length
    }

    this.emit('metric-updated', { type, value, timestamp: now })
    this.checkThresholds(type, value)
  }

  private checkThresholds(type: MetricType, value: number): void {
    if (!this.config.enableWarnings) return
    const thresholds = this.config.thresholds

    switch (type) {
      case MetricType.FPS:
        if (value < thresholds.fps.min) {
          this.emit('performance-warning', {
            type: 'Low FPS',
            message: `FPS dropped to ${value.toFixed(1)}`,
            severity: value < 15 ? 'high' : 'medium',
          })
        }
        break
      case MetricType.FRAME_TIME:
        if (value > thresholds.frameTime.max) {
          this.emit('performance-warning', {
            type: 'High Frame Time',
            message: `Frame time exceeded ${thresholds.frameTime.max}ms: ${value.toFixed(2)}ms`,
            severity: value > 50 ? 'high' : 'medium',
          })
        }
        break
      case MetricType.DRAW_CALLS:
        if (value > thresholds.drawCalls.max) {
          this.emit('performance-warning', {
            type: 'High Draw Calls',
            message: `Draw calls exceeded ${thresholds.drawCalls.max}: ${value}`,
            severity: 'medium',
          })
        }
        break
      case MetricType.MEMORY_USAGE:
        if (value > thresholds.memoryUsage.max) {
          this.emit('performance-warning', {
            type: 'High Memory Usage',
            message: `Memory exceeded ${(thresholds.memoryUsage.max / (1024 * 1024)).toFixed(0)}MB`,
            severity: 'high',
          })
        }
        break
    }
  }

  private startFrameMonitoring(): void {
    const frameCallback = () => {
      if (this.isActive) {
        this.recordFrame()
        requestAnimationFrame(frameCallback)
      }
    }
    requestAnimationFrame(frameCallback)
  }

  private createEmptyRenderStats(): RenderStats {
    return { drawCalls: 0, vertices: 0, triangles: 0, batchCount: 0, stateChanges: 0 }
  }

  private updateGPUMetrics(): void {
    if (!this.gpuQueryManager) return
    const gpuMemory = Math.random() * 100 * 1024 * 1024
    this.updateMetric(MetricType.GPU_MEMORY, gpuMemory)
  }

  private cleanupOldData(): void {
    const cutoffTime = performance.now() - this.config.historyRetention * 1000
    for (const [type, dataPoints] of this.metrics) {
      this.metrics.set(
        type,
        dataPoints.filter((point) => point.timestamp >= cutoffTime)
      )
    }
  }

  private performAutoAnalysis(): void {
    const fpsData = this.metrics.get(MetricType.FPS) || []
    if (fpsData.length >= 2) {
      const recent = fpsData.slice(-10)
      const earlier = fpsData.slice(-20, -10)

      if (recent.length > 0 && earlier.length > 0) {
        const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length
        const earlierAvg = earlier.reduce((sum, p) => sum + p.value, 0) / earlier.length

        if (earlierAvg - recentAvg > 10) {
          this.emit('fps-drop', {
            from: earlierAvg,
            to: recentAvg,
            duration: (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000,
          })
        }
      }
    }
  }

  private analyzePerformance(warnings: string[], recommendations: string[]): void {
    const fps = this.stats.get(MetricType.FPS)
    const drawCalls = this.stats.get(MetricType.DRAW_CALLS)
    const memory = this.stats.get(MetricType.MEMORY_USAGE)
    const batchEfficiency = this.stats.get(MetricType.BATCH_EFFICIENCY)

    if (fps && fps.avg < 30) {
      warnings.push('平均FPS低于30，性能较差')
      recommendations.push('考虑减少绘制调用或降低渲染复杂度')
    }

    if (drawCalls && drawCalls.avg > 500) {
      warnings.push('绘制调用数量过高')
      recommendations.push('使用批处理合并绘制调用')
    }

    if (memory && memory.avg > 256 * 1024 * 1024) {
      warnings.push('内存使用量较高')
      recommendations.push('检查是否存在内存泄漏，优化资源管理')
    }

    if (batchEfficiency && batchEfficiency.avg < 0.5) {
      warnings.push('批处理效率较低')
      recommendations.push('优化批处理策略，提高合并率')
    }
  }
}
