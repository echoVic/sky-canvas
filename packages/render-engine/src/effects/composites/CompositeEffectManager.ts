/**
 * 复合效果管理器
 * 提供复合效果的统一管理和应用
 */

import { type CompositeConfig, CompositeOperation } from '../types/CompositeTypes'
import { CompositeManager } from './CompositeManager'

export class CompositeEffectManager {
  private static instance: CompositeEffectManager
  private compositeManager: CompositeManager

  private constructor() {
    this.compositeManager = new CompositeManager()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CompositeEffectManager {
    if (!CompositeEffectManager.instance) {
      CompositeEffectManager.instance = new CompositeEffectManager()
    }
    return CompositeEffectManager.instance
  }

  /**
   * 获取复合管理器
   */
  getCompositeManager(): CompositeManager {
    return this.compositeManager
  }

  /**
   * 应用复合效果
   */
  async applyCompositeEffect(
    canvas: HTMLCanvasElement,
    config: CompositeConfig
  ): Promise<HTMLCanvasElement> {
    return this.compositeManager.composite([
      {
        id: 'main',
        canvas,
        operation: config.operation,
        globalAlpha: config.globalAlpha,
        visible: config.enabled,
      },
    ])
  }

  /**
   * 批量应用复合效果
   */
  async applyBatchCompositeEffects(
    canvases: HTMLCanvasElement[],
    configs: CompositeConfig[]
  ): Promise<HTMLCanvasElement[]> {
    const results: HTMLCanvasElement[] = []

    for (let i = 0; i < canvases.length; i++) {
      const result = await this.applyCompositeEffect(canvases[i], configs[i])
      results.push(result)
    }

    return results
  }

  /**
   * 创建复合配置
   */
  createCompositeConfig(
    operation: CompositeOperation,
    globalAlpha: number = 1.0,
    enabled: boolean = true
  ): CompositeConfig {
    return {
      operation,
      globalAlpha,
      enabled,
    }
  }

  /**
   * 验证复合配置
   */
  validateCompositeConfig(config: CompositeConfig): boolean {
    if (!config.enabled) {
      return true
    }

    if (config.globalAlpha < 0 || config.globalAlpha > 1) {
      return false
    }

    return true
  }

  /**
   * 获取支持的复合操作列表
   */
  getSupportedOperations(): CompositeOperation[] {
    return [
      CompositeOperation.SOURCE_OVER,
      CompositeOperation.MULTIPLY,
      CompositeOperation.SCREEN,
      CompositeOperation.OVERLAY,
      CompositeOperation.SOFT_LIGHT,
      CompositeOperation.HARD_LIGHT,
      CompositeOperation.COLOR_DODGE,
      CompositeOperation.COLOR_BURN,
      CompositeOperation.DARKEN,
      CompositeOperation.LIGHTEN,
      CompositeOperation.DIFFERENCE,
      CompositeOperation.EXCLUSION,
    ]
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.compositeManager.dispose()
  }
}
