/**
 * 混合模式管理器
 * 提供混合模式的统一管理和应用
 */

import { BlendMode, type BlendModeConfig } from '../types/BlendTypes'

export class BlendModeManager {
  private static instance: BlendModeManager
  private blendModes: Map<BlendMode, BlendModeConfig> = new Map()

  private constructor() {
    this.initializeBlendModes()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): BlendModeManager {
    if (!BlendModeManager.instance) {
      BlendModeManager.instance = new BlendModeManager()
    }
    return BlendModeManager.instance
  }

  /**
   * 初始化混合模式
   */
  private initializeBlendModes(): void {
    // 标准混合模式
    this.blendModes.set(BlendMode.NORMAL, {
      mode: BlendMode.NORMAL,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.MULTIPLY, {
      mode: BlendMode.MULTIPLY,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.SCREEN, {
      mode: BlendMode.SCREEN,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.OVERLAY, {
      mode: BlendMode.OVERLAY,
      opacity: 1.0,
      enabled: true,
    })

    // 暗色混合模式
    this.blendModes.set(BlendMode.DARKEN, {
      mode: BlendMode.DARKEN,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.COLOR_BURN, {
      mode: BlendMode.COLOR_BURN,
      opacity: 1.0,
      enabled: true,
    })

    // 亮色混合模式
    this.blendModes.set(BlendMode.LIGHTEN, {
      mode: BlendMode.LIGHTEN,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.COLOR_DODGE, {
      mode: BlendMode.COLOR_DODGE,
      opacity: 1.0,
      enabled: true,
    })

    // 差值混合模式
    this.blendModes.set(BlendMode.DIFFERENCE, {
      mode: BlendMode.DIFFERENCE,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.EXCLUSION, {
      mode: BlendMode.EXCLUSION,
      opacity: 1.0,
      enabled: true,
    })

    // 颜色混合模式
    this.blendModes.set(BlendMode.HUE, {
      mode: BlendMode.HUE,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.SATURATION, {
      mode: BlendMode.SATURATION,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.COLOR, {
      mode: BlendMode.COLOR,
      opacity: 1.0,
      enabled: true,
    })

    this.blendModes.set(BlendMode.LUMINOSITY, {
      mode: BlendMode.LUMINOSITY,
      opacity: 1.0,
      enabled: true,
    })
  }

  /**
   * 获取混合模式配置
   */
  getBlendMode(mode: BlendMode): BlendModeConfig | undefined {
    return this.blendModes.get(mode)
  }

  /**
   * 设置混合模式配置
   */
  setBlendMode(mode: BlendMode, config: BlendModeConfig): void {
    this.blendModes.set(mode, config)
  }

  /**
   * 获取所有可用的混合模式
   */
  getAllBlendModes(): BlendMode[] {
    return Array.from(this.blendModes.keys())
  }

  /**
   * 检查混合模式是否可用
   */
  isBlendModeAvailable(mode: BlendMode): boolean {
    return this.blendModes.has(mode)
  }

  /**
   * 应用混合模式到Canvas上下文
   */
  applyBlendMode(ctx: CanvasRenderingContext2D, config: BlendModeConfig): void {
    if (!config.enabled) {
      return
    }

    ctx.globalCompositeOperation = config.mode as GlobalCompositeOperation
    ctx.globalAlpha = config.opacity
  }

  /**
   * 重置混合模式
   */
  resetBlendMode(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1.0
  }
}
