/**
 * 优化引擎
 */

import type {
  RenderOptimizationConfig,
  RenderOptimizationConfigManager,
} from './RenderOptimizationConfig'
import type { OptimizationMetrics, OptimizationRecommendation } from './RenderOptimizationTypes'
import type { SmartCacheSystem } from './SmartCacheSystem'
import type { BaseSystem } from './SystemManager'

export class OptimizationEngine {
  private lastOptimizationTime = 0
  private optimizationInterval = 1000
  private recommendations: OptimizationRecommendation[] = []

  constructor(
    private getSystems: () => Map<string, BaseSystem>,
    private configManager: RenderOptimizationConfigManager,
    private getCurrentConfig: () => RenderOptimizationConfig
  ) {}

  /**
   * 分析性能并执行优化
   */
  analyzeAndOptimize(metrics: OptimizationMetrics): boolean {
    const now = Date.now()

    if (now - this.lastOptimizationTime < this.optimizationInterval) {
      return false
    }

    this.lastOptimizationTime = now

    const needs = this.checkOptimizationNeeds(metrics)

    if (needs.length > 0) {
      this.performOptimizations(needs, metrics)
      return true
    }

    return false
  }

  /**
   * 检查优化需求
   */
  private checkOptimizationNeeds(metrics: OptimizationMetrics): string[] {
    const config = this.getCurrentConfig()
    const needs: string[] = []

    if (metrics.frameRate.average < metrics.frameRate.target * 0.9) {
      needs.push('framerate')
    }

    if (metrics.memory.efficiency < 0.2) {
      needs.push('memory')
    }

    const maxDrawCalls = config.monitoring.alertThresholds.drawCalls
    if (metrics.rendering.drawCalls > maxDrawCalls) {
      needs.push('drawcalls')
    }

    if (metrics.cache.hitRate < 0.7) {
      needs.push('cache')
    }

    return needs
  }

  /**
   * 执行优化
   */
  private performOptimizations(needs: string[], _metrics: OptimizationMetrics): void {
    for (const need of needs) {
      switch (need) {
        case 'framerate':
          this.optimizeFrameRate()
          break
        case 'memory':
          this.optimizeMemory()
          break
        case 'drawcalls':
          this.optimizeDrawCalls()
          break
        case 'cache':
          this.optimizeCache()
          break
      }
    }
  }

  /**
   * 优化帧率
   */
  optimizeFrameRate(): void {
    const newConfig = { ...this.getCurrentConfig() }

    newConfig.lod.biasMultiplier = Math.min(3.0, newConfig.lod.biasMultiplier * 1.2)
    newConfig.batching.maxBatchSize = Math.max(
      50,
      Math.floor(newConfig.batching.maxBatchSize * 0.8)
    )
    newConfig.culling.smallObjectThreshold = Math.max(
      0.5,
      newConfig.culling.smallObjectThreshold * 0.8
    )

    this.configManager.setConfig(newConfig)
    console.log('Applied frame rate optimizations')
  }

  /**
   * 优化内存
   */
  optimizeMemory(): void {
    const systems = this.getSystems()
    const cacheSystem = systems.get('smart-cache') as SmartCacheSystem | undefined

    if (cacheSystem) {
      const cacheStatsMap = cacheSystem.getAllStats()
      for (const [cacheName] of cacheStatsMap) {
        cacheSystem.clear(cacheName)
      }
    }

    const newConfig = { ...this.getCurrentConfig() }
    newConfig.gpuResource.maxTextureSize = Math.max(512, newConfig.gpuResource.maxTextureSize / 2)

    this.configManager.setConfig(newConfig)
    console.log('Applied memory optimizations')
  }

  /**
   * 优化绘制调用
   */
  optimizeDrawCalls(): void {
    const newConfig = { ...this.getCurrentConfig() }
    newConfig.batching.maxBatchSize = Math.min(1000, newConfig.batching.maxBatchSize * 1.5)
    newConfig.batching.enableInstancing = true

    this.configManager.setConfig(newConfig)
    console.log('Applied draw call optimizations')
  }

  /**
   * 优化缓存
   */
  optimizeCache(): void {
    const newConfig = { ...this.getCurrentConfig() }
    newConfig.cache.maxSize = Math.min(1024 * 1024 * 1024, newConfig.cache.maxSize * 1.5)
    newConfig.cache.predictiveLoading = true

    this.configManager.setConfig(newConfig)
    console.log('Applied cache optimizations')
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(metrics: OptimizationMetrics): OptimizationRecommendation[] {
    const newRecommendations: OptimizationRecommendation[] = []

    if (metrics.frameRate.average < metrics.frameRate.target * 0.8) {
      newRecommendations.push({
        type: 'performance',
        priority: 'high',
        description: 'Frame rate is significantly below target',
        action: 'Reduce rendering quality or enable more aggressive optimizations',
        estimatedImpact: 0.3,
        autoApplicable: true,
      })
    }

    if (metrics.memory.efficiency < 0.1) {
      newRecommendations.push({
        type: 'memory',
        priority: 'critical',
        description: 'Memory usage is critically high',
        action: 'Clear caches and reduce texture quality',
        estimatedImpact: 0.5,
        autoApplicable: true,
      })
    }

    if (metrics.cache.hitRate < 0.5) {
      newRecommendations.push({
        type: 'performance',
        priority: 'medium',
        description: 'Cache hit rate is low',
        action: 'Increase cache size or enable predictive loading',
        estimatedImpact: 0.2,
        autoApplicable: true,
      })
    }

    if (metrics.frameRate.stability < 0.5) {
      newRecommendations.push({
        type: 'stability',
        priority: 'medium',
        description: 'Frame rate is unstable',
        action: 'Enable adaptive quality or reduce dynamic effects',
        estimatedImpact: 0.25,
        autoApplicable: false,
      })
    }

    this.recommendations = newRecommendations
    return newRecommendations
  }

  /**
   * 获取当前建议
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations]
  }

  /**
   * 应用建议
   */
  applyRecommendation(recommendation: OptimizationRecommendation): boolean {
    if (!recommendation.autoApplicable) {
      console.warn('Recommendation is not auto-applicable:', recommendation.description)
      return false
    }

    switch (recommendation.type) {
      case 'performance':
        if (recommendation.description.includes('frame rate')) {
          this.optimizeFrameRate()
        } else if (recommendation.description.includes('cache')) {
          this.optimizeCache()
        }
        break
      case 'memory':
        this.optimizeMemory()
        break
    }

    const index = this.recommendations.indexOf(recommendation)
    if (index !== -1) {
      this.recommendations.splice(index, 1)
    }

    return true
  }

  /**
   * 强制执行所有优化
   */
  forceOptimization(): void {
    this.optimizeFrameRate()
    this.optimizeMemory()
    this.optimizeDrawCalls()
    this.optimizeCache()
    console.log('Forced optimization completed')
  }

  /**
   * 清除建议
   */
  clearRecommendations(): void {
    this.recommendations = []
  }
}
