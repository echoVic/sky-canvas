/**
 * 渲染优化配置管理
 * 统一管理所有渲染优化系统的配置参数
 */

// 重新导出类型
export type {
  AdaptiveQualityConfig,
  BatchingConfig,
  CacheConfig,
  CullingConfig,
  GPUResourceConfig,
  LODConfig,
  MonitoringConfig,
  MultiThreadConfig,
  PipelineConfig,
  QualitySettings,
  RenderOptimizationConfig,
  ShaderConfig,
} from './RenderOptimizationConfigTypes'
export type { PresetConfigKey } from './RenderOptimizationPresets'
// 重新导出预设配置
export {
  HIGH_END_CONFIG,
  LOW_END_CONFIG,
  MEDIUM_END_CONFIG,
  PRESET_CONFIGS,
} from './RenderOptimizationPresets'

import type { RenderOptimizationConfig } from './RenderOptimizationConfigTypes'
import { PRESET_CONFIGS } from './RenderOptimizationPresets'

/**
 * 配置管理器
 */
export class RenderOptimizationConfigManager {
  private config: RenderOptimizationConfig
  private listeners: Array<(config: RenderOptimizationConfig) => void> = []

  constructor(initialConfig?: RenderOptimizationConfig) {
    this.config = initialConfig || this.detectOptimalConfig()
  }

  /**
   * 检测最优配置
   */
  private detectOptimalConfig(): RenderOptimizationConfig {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

    if (!gl) {
      return PRESET_CONFIGS.LOW_END
    }

    const renderer = gl.getParameter(gl.RENDERER) || ''
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS)

    let performanceScore = 0

    // 基于纹理大小评分
    if (maxTextureSize >= 4096) performanceScore += 3
    else if (maxTextureSize >= 2048) performanceScore += 2
    else performanceScore += 1

    // 基于视口大小评分
    const maxViewport = Math.max(maxViewportDims[0], maxViewportDims[1])
    if (maxViewport >= 4096) performanceScore += 2
    else if (maxViewport >= 2048) performanceScore += 1

    // 基于GPU厂商评分
    if (renderer.toLowerCase().includes('nvidia') || renderer.toLowerCase().includes('amd')) {
      performanceScore += 2
    } else if (renderer.toLowerCase().includes('intel')) {
      performanceScore += 1
    }

    // 基于WebGL版本评分
    if (gl instanceof WebGL2RenderingContext) {
      performanceScore += 2
    }

    // 选择配置
    if (performanceScore >= 8) {
      return PRESET_CONFIGS.HIGH_END
    } else if (performanceScore >= 5) {
      return PRESET_CONFIGS.MEDIUM_END
    } else {
      return PRESET_CONFIGS.LOW_END
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): RenderOptimizationConfig {
    return { ...this.config }
  }

  /**
   * 设置配置
   */
  setConfig(config: RenderOptimizationConfig): void {
    this.config = { ...config }
    this.notifyListeners()
  }

  /**
   * 更新部分配置
   */
  updateConfig(updates: Partial<RenderOptimizationConfig>): void {
    this.config = { ...this.config, ...updates }
    this.notifyListeners()
  }

  /**
   * 应用预设配置
   */
  applyPreset(preset: keyof typeof PRESET_CONFIGS): void {
    this.config = { ...PRESET_CONFIGS[preset] }
    this.notifyListeners()
  }

  /**
   * 添加配置变更监听器
   */
  addListener(listener: (config: RenderOptimizationConfig) => void): void {
    this.listeners.push(listener)
  }

  /**
   * 移除配置变更监听器
   */
  removeListener(listener: (config: RenderOptimizationConfig) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index !== -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.config)
    }
  }

  /**
   * 导出配置为JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * 从JSON导入配置
   */
  importConfig(json: string): void {
    try {
      const config = JSON.parse(json) as RenderOptimizationConfig
      this.setConfig(config)
    } catch (error) {
      console.error('Failed to import config:', error)
      throw new Error('Invalid configuration JSON')
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: RenderOptimizationConfig): boolean {
    try {
      if (typeof config !== 'object' || config === null) return false

      const requiredKeys = [
        'lod',
        'batching',
        'culling',
        'cache',
        'gpuResource',
        'shader',
        'monitoring',
        'multiThread',
        'adaptiveQuality',
        'pipeline',
      ]
      for (const key of requiredKeys) {
        if (!(key in config)) return false
      }

      if (config.lod.maxDistance < 0 || config.lod.lodLevels < 1) return false
      if (config.batching.maxBatchSize < 1 || config.batching.maxVertices < 1) return false
      if (config.cache.maxSize < 0 || config.cache.maxAge < 0) return false
      if (config.gpuResource.memoryBudget < 0) return false
      if (config.adaptiveQuality.targetFPS < 1) return false

      return true
    } catch {
      return false
    }
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): {
    preset: string
    memoryBudget: string
    targetFPS: number
    enabledFeatures: string[]
  } {
    const enabledFeatures: string[] = []

    if (this.config.lod.enabled) enabledFeatures.push('LOD')
    if (this.config.batching.enabled) enabledFeatures.push('Batching')
    if (this.config.culling.frustumCulling) enabledFeatures.push('Frustum Culling')
    if (this.config.culling.occlusionCulling) enabledFeatures.push('Occlusion Culling')
    if (this.config.cache.enabled) enabledFeatures.push('Smart Cache')
    if (this.config.shader.asyncCompilation) enabledFeatures.push('Async Shaders')
    if (this.config.multiThread.enabled) enabledFeatures.push('Multi-Threading')
    if (this.config.adaptiveQuality.enabled) enabledFeatures.push('Adaptive Quality')
    if (this.config.pipeline.deferredShading) enabledFeatures.push('Deferred Shading')
    if (this.config.pipeline.gpuDrivenRendering) enabledFeatures.push('GPU-Driven Rendering')

    let preset = 'Custom'
    for (const [name, presetConfig] of Object.entries(PRESET_CONFIGS)) {
      if (JSON.stringify(this.config) === JSON.stringify(presetConfig)) {
        preset = name.replace('_', ' ')
        break
      }
    }

    return {
      preset,
      memoryBudget: `${Math.round(this.config.gpuResource.memoryBudget / (1024 * 1024))}MB`,
      targetFPS: this.config.adaptiveQuality.targetFPS,
      enabledFeatures,
    }
  }
}

// 导出单例实例
export const renderOptimizationConfig = new RenderOptimizationConfigManager()
