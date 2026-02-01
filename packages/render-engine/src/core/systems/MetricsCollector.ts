/**
 * 指标收集器
 */

import type { GPUResourceOptimizer } from './GPUResourceOptimizer'
import type { PerformanceSystem } from './PerformanceSystem'
import type { RenderOptimizationConfig } from './RenderOptimizationConfig'
import { createInitialMetrics, type OptimizationMetrics } from './RenderOptimizationTypes'
import type { RenderPipelineScheduler } from './RenderPipelineScheduler'
import type { SmartCacheSystem } from './SmartCacheSystem'
import type { BaseSystem } from './SystemManager'

export class MetricsCollector {
  private metrics: OptimizationMetrics = createInitialMetrics()
  private frameTimeHistory: number[] = []
  private maxHistorySize = 120
  private animationFrameId: number | null = null

  constructor(
    private getSystems: () => Map<string, BaseSystem>,
    private getCurrentConfig: () => RenderOptimizationConfig
  ) {}

  /**
   * 启动帧率监控
   */
  startFrameRateMonitoring(): void {
    let lastTime = performance.now()

    const measureFrame = () => {
      const currentTime = performance.now()
      const frameTime = currentTime - lastTime
      lastTime = currentTime

      this.recordFrameTime(frameTime)
      this.animationFrameId = requestAnimationFrame(measureFrame)
    }

    this.animationFrameId = requestAnimationFrame(measureFrame)
  }

  /**
   * 停止帧率监控
   */
  stopFrameRateMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 记录帧时间
   */
  private recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime)

    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift()
    }

    this.metrics.frameRate.current = 1000 / frameTime

    if (this.frameTimeHistory.length > 0) {
      const averageFrameTime =
        this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
      this.metrics.frameRate.average = 1000 / averageFrameTime

      const variance =
        this.frameTimeHistory.reduce((sum, time) => {
          const diff = time - averageFrameTime
          return sum + diff * diff
        }, 0) / this.frameTimeHistory.length

      this.metrics.frameRate.stability = variance > 0 ? 1 / Math.sqrt(variance) : 1
    }
  }

  /**
   * 更新所有指标
   */
  updateMetrics(): void {
    const systems = this.getSystems()
    const config = this.getCurrentConfig()

    this.updateMemoryMetrics(systems, config)
    this.updateRenderingMetrics(systems)
    this.updateCacheMetrics(systems)
    this.updateGPUMetrics(systems)
  }

  private updateMemoryMetrics(
    systems: Map<string, BaseSystem>,
    config: RenderOptimizationConfig
  ): void {
    const performanceSystem = systems.get('performance') as PerformanceSystem | undefined
    if (performanceSystem) {
      const perfStats = performanceSystem.getStats()
      this.metrics.memory.used = perfStats.memoryUsage || 0
      this.metrics.memory.budget = config.gpuResource.memoryBudget
      this.metrics.memory.efficiency =
        this.metrics.memory.budget > 0
          ? (this.metrics.memory.budget - this.metrics.memory.used) / this.metrics.memory.budget
          : 0
    }
  }

  private updateRenderingMetrics(systems: Map<string, BaseSystem>): void {
    const pipelineScheduler = systems.get('pipeline-scheduler') as
      | RenderPipelineScheduler
      | undefined
    if (pipelineScheduler) {
      const renderStats = pipelineScheduler.getRenderStats()
      this.metrics.rendering.drawCalls = renderStats.drawCalls
      this.metrics.rendering.triangles = renderStats.triangles
      this.metrics.rendering.batches = renderStats.batchCount
      this.metrics.rendering.culledObjects = renderStats.culledObjects
    }
  }

  private updateCacheMetrics(systems: Map<string, BaseSystem>): void {
    const cacheSystem = systems.get('smart-cache') as SmartCacheSystem | undefined
    if (cacheSystem) {
      const cacheStatsMap = cacheSystem.getAllStats()
      let totalHits = 0
      let totalRequests = 0
      let totalSize = 0

      for (const [, stats] of cacheStatsMap) {
        totalHits += stats.hits
        totalRequests += stats.hits + stats.misses
        totalSize += stats.totalSize
      }

      this.metrics.cache.hitRate = totalRequests > 0 ? totalHits / totalRequests : 0
      this.metrics.cache.size = totalSize
      this.metrics.cache.efficiency = this.metrics.cache.hitRate
    }
  }

  private updateGPUMetrics(systems: Map<string, BaseSystem>): void {
    const gpuOptimizer = systems.get('gpu-optimizer') as GPUResourceOptimizer | undefined
    if (gpuOptimizer) {
      const gpuStats = gpuOptimizer.getMemoryStats()
      this.metrics.gpu.memoryUsage = gpuStats.totalUsed
      this.metrics.gpu.utilization =
        gpuStats.availableMemory > 0
          ? gpuStats.totalUsed / (gpuStats.totalUsed + gpuStats.availableMemory)
          : 0
    }
  }

  /**
   * 获取当前指标
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics }
  }

  /**
   * 清除历史数据
   */
  clear(): void {
    this.frameTimeHistory = []
    this.metrics = createInitialMetrics()
  }
}
