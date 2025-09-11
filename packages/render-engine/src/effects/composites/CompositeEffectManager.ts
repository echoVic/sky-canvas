/**
 * 复合效果管理器
 * 提供复合效果的统一管理和应用
 */

import { CompositeConfig, CompositeOperation } from '../types/CompositeTypes';
import { CompositeManager } from './CompositeManager';

export class CompositeEffectManager {
  private static instance: CompositeEffectManager;
  private compositeManager: CompositeManager;

  private constructor() {
    this.compositeManager = new CompositeManager();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CompositeEffectManager {
    if (!CompositeEffectManager.instance) {
      CompositeEffectManager.instance = new CompositeEffectManager();
    }
    return CompositeEffectManager.instance;
  }

  /**
   * 获取复合管理器
   */
  getCompositeManager(): CompositeManager {
    return this.compositeManager;
  }

  /**
   * 应用复合效果
   */
  async applyCompositeEffect(
    canvas: HTMLCanvasElement,
    config: CompositeConfig
  ): Promise<HTMLCanvasElement> {
    return this.compositeManager.composite(canvas, config);
  }

  /**
   * 批量应用复合效果
   */
  async applyBatchCompositeEffects(
    canvases: HTMLCanvasElement[],
    configs: CompositeConfig[]
  ): Promise<HTMLCanvasElement[]> {
    const results: HTMLCanvasElement[] = [];
    
    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      const config = configs[i] || configs[0]; // 使用第一个配置作为默认
      
      const result = await this.applyCompositeEffect(canvas, config);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 创建复合效果配置
   */
  createCompositeConfig(
    operation: CompositeOperation,
    opacity: number = 1.0,
    enabled: boolean = true
  ): CompositeConfig {
    return {
      operation,
      opacity,
      enabled,
      blendMode: 'source-over',
      preserveAlpha: true
    };
  }

  /**
   * 验证复合效果配置
   */
  validateCompositeConfig(config: CompositeConfig): boolean {
    if (!config.enabled) {
      return true;
    }

    if (config.opacity < 0 || config.opacity > 1) {
      return false;
    }

    return true;
  }

  /**
   * 获取支持的复合操作列表
   */
  getSupportedOperations(): CompositeOperation[] {
    return [
      CompositeOperation.ADD,
      CompositeOperation.SUBTRACT,
      CompositeOperation.MULTIPLY,
      CompositeOperation.DIVIDE,
      CompositeOperation.OVERLAY,
      CompositeOperation.SOFT_LIGHT,
      CompositeOperation.HARD_LIGHT,
      CompositeOperation.COLOR_DODGE,
      CompositeOperation.COLOR_BURN,
      CompositeOperation.DARKEN,
      CompositeOperation.LIGHTEN,
      CompositeOperation.DIFFERENCE,
      CompositeOperation.EXCLUSION
    ];
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.compositeManager.dispose();
  }
}
