/**
 * 渲染优化管理器
 * 统一管理和协调所有渲染优化系统
 */

import { BatchRenderSystem } from './BatchRenderSystem'
import { Extension, ExtensionType } from './ExtensionSystem'
import { GPUResourceOptimizer } from './GPUResourceOptimizer'
import { MetricsCollector } from './MetricsCollector'
import { MultiThreadRenderSystem } from './MultiThreadRenderSystem'
import { OptimizationEngine } from './OptimizationEngine'
import { PerformanceMonitorSystem } from './PerformanceMonitorSystem'
import { PerformanceSystem } from './PerformanceSystem'
import {
  PRESET_CONFIGS,
  type RenderOptimizationConfig,
  type RenderOptimizationConfigManager,
  renderOptimizationConfig,
} from './RenderOptimizationConfig'
import {
  createInitialListeners,
  type OptimizationListeners,
  type OptimizationMetrics,
  type OptimizationRecommendation,
  OptimizationState,
  type SystemStatus,
} from './RenderOptimizationTypes'
import { RenderPipelineScheduler } from './RenderPipelineScheduler'
import { ResourceSystem } from './ResourceSystem'
import { ShaderOptimizationSystem } from './ShaderOptimizationSystem'
import { SmartCacheSystem } from './SmartCacheSystem'
import { BaseSystem } from './SystemManager'

export { MetricsCollector } from './MetricsCollector'
export { OptimizationEngine } from './OptimizationEngine'
export type {
  OptimizationMetrics,
  OptimizationRecommendation,
  SystemStatus,
} from './RenderOptimizationTypes'
// 重新导出类型
export { OptimizationState } from './RenderOptimizationTypes'

@Extension({
  type: ExtensionType.RenderSystem,
  name: 'render-optimization-manager',
  priority: 1100,
})
export class RenderOptimizationManager extends BaseSystem {
  readonly name = 'render-optimization-manager'
  readonly priority = 1100

  private systems = new Map<string, BaseSystem>()
  private systemStatus = new Map<string, SystemStatus>()
  private configManager: RenderOptimizationConfigManager
  private currentConfig: RenderOptimizationConfig
  private state = OptimizationState.DISABLED
  private isInitialized = false
  private listeners: OptimizationListeners = createInitialListeners()

  private metricsCollector: MetricsCollector
  private optimizationEngine: OptimizationEngine
  private monitoringInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    super()
    this.configManager = renderOptimizationConfig
    this.currentConfig = this.configManager.getConfig()

    this.metricsCollector = new MetricsCollector(
      () => this.systems,
      () => this.currentConfig
    )

    this.optimizationEngine = new OptimizationEngine(
      () => this.systems,
      this.configManager,
      () => this.currentConfig
    )

    this.configManager.addListener((config) => {
      this.currentConfig = config
      this.applyConfiguration()
    })
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.setState(OptimizationState.INITIALIZING)
      await this.initializeSubSystems()
      this.applyConfiguration()
      this.startMonitoring()
      this.setState(OptimizationState.ACTIVE)
      this.isInitialized = true
      console.log('Render optimization manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize render optimization manager:', error)
      this.setState(OptimizationState.ERROR)
      throw error
    }
  }

  private async initializeSubSystems(): Promise<void> {
    const systemConfigs = [
      { name: 'batch-render', system: BatchRenderSystem },
      { name: 'performance', system: PerformanceSystem },
      { name: 'resource', system: ResourceSystem },
      { name: 'gpu-optimizer', system: GPUResourceOptimizer },
      { name: 'shader-optimization', system: ShaderOptimizationSystem },
      { name: 'smart-cache', system: SmartCacheSystem },
      { name: 'performance-monitor', system: PerformanceMonitorSystem },
      { name: 'pipeline-scheduler', system: RenderPipelineScheduler },
      { name: 'multi-thread', system: MultiThreadRenderSystem },
    ]

    for (const config of systemConfigs) {
      try {
        const system = new config.system()
        await system.init()
        this.systems.set(config.name, system)
        this.systemStatus.set(config.name, {
          name: config.name,
          state: OptimizationState.ACTIVE,
          lastUpdate: Date.now(),
          errorCount: 0,
          performance: { averageTime: 0, maxTime: 0, minTime: Infinity },
        })
        console.log(`Initialized ${config.name} system`)
      } catch (error) {
        console.error(`Failed to initialize ${config.name} system:`, error)
        this.systemStatus.set(config.name, {
          name: config.name,
          state: OptimizationState.ERROR,
          lastUpdate: Date.now(),
          errorCount: 1,
          performance: { averageTime: 0, maxTime: 0, minTime: 0 },
        })
      }
    }

    this.setupSystemDependencies()
  }

  private setupSystemDependencies(): void {
    const pipelineScheduler = this.systems.get('pipeline-scheduler') as
      | RenderPipelineScheduler
      | undefined
    if (pipelineScheduler) {
      pipelineScheduler.setSubSystems({
        batchSystem: this.systems.get('batch-render') as BatchRenderSystem,
        performanceSystem: this.systems.get('performance') as PerformanceSystem,
        resourceSystem: this.systems.get('resource') as ResourceSystem,
        gpuOptimizer: this.systems.get('gpu-optimizer') as GPUResourceOptimizer,
        shaderSystem: this.systems.get('shader-optimization') as ShaderOptimizationSystem,
        cacheSystem: this.systems.get('smart-cache') as SmartCacheSystem,
        monitorSystem: this.systems.get('performance-monitor') as PerformanceMonitorSystem,
      })
    }
  }

  private applyConfiguration(): void {
    console.log('Applied optimization configuration')
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.metricsCollector.updateMetrics()
      const metrics = this.metricsCollector.getMetrics()

      const optimized = this.optimizationEngine.analyzeAndOptimize(metrics)
      if (optimized) {
        this.setState(OptimizationState.OPTIMIZING)
        this.setState(OptimizationState.ACTIVE)
      }

      this.optimizationEngine.generateRecommendations(metrics)
      this.notifyMetricsUpdate(metrics)
      this.notifyRecommendations()
    }, 1000)

    this.metricsCollector.startFrameRateMonitoring()
  }

  private setState(newState: OptimizationState): void {
    if (this.state !== newState) {
      this.state = newState
      this.listeners.onStateChange.forEach((listener) => listener(this.state))
    }
  }

  private notifyMetricsUpdate(metrics: OptimizationMetrics): void {
    this.listeners.onMetricsUpdate.forEach((listener) => listener(metrics))
  }

  private notifyRecommendations(): void {
    const recommendations = this.optimizationEngine.getRecommendations()
    this.listeners.onRecommendation.forEach((listener) => listener(recommendations))
  }

  getState(): OptimizationState {
    return this.state
  }

  getMetrics(): OptimizationMetrics {
    return this.metricsCollector.getMetrics()
  }

  getRecommendations(): OptimizationRecommendation[] {
    return this.optimizationEngine.getRecommendations()
  }

  getSystemStatus(): Map<string, SystemStatus> {
    return new Map(this.systemStatus)
  }

  applyPreset(preset: keyof typeof PRESET_CONFIGS): void {
    this.configManager.applyPreset(preset)
  }

  applyRecommendation(recommendation: OptimizationRecommendation): void {
    if (this.optimizationEngine.applyRecommendation(recommendation)) {
      this.notifyRecommendations()
    }
  }

  addEventListener<T extends keyof OptimizationListeners>(
    event: T,
    listener: OptimizationListeners[T][0]
  ): void {
    const eventListeners = this.listeners[event] as Array<typeof listener>
    eventListeners.push(listener)
  }

  removeEventListener<T extends keyof OptimizationListeners>(
    event: T,
    listener: OptimizationListeners[T][0]
  ): void {
    const eventListeners = this.listeners[event] as Array<typeof listener>
    const index = eventListeners.indexOf(listener)
    if (index !== -1) {
      eventListeners.splice(index, 1)
    }
  }

  forceOptimization(): void {
    this.setState(OptimizationState.OPTIMIZING)
    this.optimizationEngine.forceOptimization()
    this.setState(OptimizationState.ACTIVE)
  }

  resetOptimizations(): void {
    const defaultConfig = PRESET_CONFIGS.MEDIUM_END
    this.configManager.setConfig(defaultConfig)
    this.optimizationEngine.clearRecommendations()
    this.notifyRecommendations()
    console.log('Optimizations reset to defaults')
  }

  getPerformanceReport(): {
    summary: string
    metrics: OptimizationMetrics
    recommendations: OptimizationRecommendation[]
    systemStatus: Array<{ name: string; status: SystemStatus }>
    config: ReturnType<RenderOptimizationConfigManager['getConfigSummary']>
  } {
    const metrics = this.metricsCollector.getMetrics()
    const systemStatusArray = Array.from(this.systemStatus.entries()).map(([name, status]) => ({
      name,
      status,
    }))

    let summary = 'Performance is '
    if (metrics.frameRate.average >= metrics.frameRate.target * 0.9) {
      summary += 'excellent'
    } else if (metrics.frameRate.average >= metrics.frameRate.target * 0.7) {
      summary += 'good'
    } else if (metrics.frameRate.average >= metrics.frameRate.target * 0.5) {
      summary += 'fair'
    } else {
      summary += 'poor'
    }

    summary += `. Average FPS: ${metrics.frameRate.average.toFixed(1)}, Memory efficiency: ${(metrics.memory.efficiency * 100).toFixed(1)}%`

    return {
      summary,
      metrics,
      recommendations: this.optimizationEngine.getRecommendations(),
      systemStatus: systemStatusArray,
      config: this.configManager.getConfigSummary(),
    }
  }

  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.metricsCollector.stopFrameRateMonitoring()
    this.metricsCollector.clear()

    for (const system of this.systems.values()) {
      if (
        'dispose' in system &&
        typeof (system as { dispose?: () => void }).dispose === 'function'
      ) {
        ;(system as { dispose: () => void }).dispose()
      }
    }

    this.systems.clear()
    this.systemStatus.clear()
    this.optimizationEngine.clearRecommendations()

    Object.keys(this.listeners).forEach((key) => {
      const typedKey = key as keyof OptimizationListeners
      ;(this.listeners[typedKey] as unknown[]) = []
    })

    this.setState(OptimizationState.DISABLED)
    this.isInitialized = false
  }
}
