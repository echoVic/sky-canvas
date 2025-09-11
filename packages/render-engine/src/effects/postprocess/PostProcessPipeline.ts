/**
 * 后处理管道
 * 提供后处理效果的管道式处理
 */

import { PostProcessConfig, PostProcessLayer, PostProcessType } from '../types/PostProcessTypes';
import { PostProcessManager } from './PostProcessManager';

export class PostProcessPipeline {
  private static instance: PostProcessPipeline;
  private postProcessManager: PostProcessManager;
  private pipeline: PostProcessConfig[] = [];

  private constructor() {
    this.postProcessManager = new PostProcessManager();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PostProcessPipeline {
    if (!PostProcessPipeline.instance) {
      PostProcessPipeline.instance = new PostProcessPipeline();
    }
    return PostProcessPipeline.instance;
  }

  /**
   * 获取后处理管理器
   */
  getPostProcessManager(): PostProcessManager {
    return this.postProcessManager;
  }

  /**
   * 添加后处理效果到管道
   */
  addEffect(config: PostProcessConfig): void {
    this.pipeline.push(config);
  }

  /**
   * 移除后处理效果
   */
  removeEffect(type: PostProcessType): boolean {
    const index = this.pipeline.findIndex(config => config.type === type);
    if (index !== -1) {
      this.pipeline.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清空管道
   */
  clearPipeline(): void {
    this.pipeline = [];
  }

  /**
   * 获取管道中的所有效果
   */
  getPipeline(): PostProcessConfig[] {
    return [...this.pipeline];
  }

  /**
   * 处理图像通过管道
   */
  async processImage(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    if (this.pipeline.length === 0) {
      return canvas;
    }

    let currentCanvas = canvas;

    for (const config of this.pipeline) {
      if (!config.enabled) {
        continue;
      }

      // 创建临时图层
      const layer: PostProcessLayer = {
        id: `layer-${config.type}`,
        canvas: currentCanvas,
        effects: [],
        enabled: true
      };

      // 应用效果
      currentCanvas = this.postProcessManager.process(currentCanvas);
    }

    return currentCanvas;
  }

  /**
   * 批量处理图像
   */
  async processBatchImages(canvases: HTMLCanvasElement[]): Promise<HTMLCanvasElement[]> {
    const results: HTMLCanvasElement[] = [];

    for (const canvas of canvases) {
      const result = await this.processImage(canvas);
      results.push(result);
    }

    return results;
  }

  /**
   * 创建后处理配置
   */
  createConfig(
    type: PostProcessType,
    intensity: number = 1.0,
    enabled: boolean = true,
    parameters: Record<string, number> = {}
  ): PostProcessConfig {
    return {
      type,
      enabled,
      intensity,
      parameters
    };
  }

  /**
   * 验证管道配置
   */
  validatePipeline(): boolean {
    for (const config of this.pipeline) {
      if (config.intensity < 0 || config.intensity > 1) {
        return false;
      }

      for (const [key, value] of Object.entries(config.parameters)) {
        if (typeof value !== 'number') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取管道统计信息
   */
  getPipelineStats(): {
    totalEffects: number;
    enabledEffects: number;
    disabledEffects: number;
  } {
    const totalEffects = this.pipeline.length;
    const enabledEffects = this.pipeline.filter(config => config.enabled).length;
    const disabledEffects = totalEffects - enabledEffects;

    return {
      totalEffects,
      enabledEffects,
      disabledEffects
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.postProcessManager.dispose();
    this.pipeline = [];
  }
}
