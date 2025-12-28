/**
 * 自适应质量管理器
 * 根据性能动态调整渲染质量
 */

import { QualityRecommendations } from './RenderPipelineTypes';

/**
 * 自适应质量管理器
 */
export class AdaptiveQualityManager {
  private targetFPS: number;
  private currentQuality = 1.0;
  private frameTimeHistory: number[] = [];
  private maxHistorySize = 60; // 1秒的历史记录

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
  }

  /**
   * 更新帧时间
   */
  updateFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);

    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }

    this.adjustQuality();
  }

  /**
   * 调整质量
   */
  private adjustQuality(): void {
    if (this.frameTimeHistory.length < 10) return;

    const averageFrameTime = this.getAverageFrameTime();
    const targetFrameTime = 1000 / this.targetFPS;

    if (averageFrameTime > targetFrameTime * 1.2) {
      // 性能不足，降低质量
      this.currentQuality = Math.max(0.5, this.currentQuality - 0.1);
    } else if (averageFrameTime < targetFrameTime * 0.8) {
      // 性能充足，提高质量
      this.currentQuality = Math.min(1.0, this.currentQuality + 0.05);
    }
  }

  /**
   * 获取平均帧时间
   */
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    return this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
  }

  /**
   * 获取当前质量
   */
  getCurrentQuality(): number {
    return this.currentQuality;
  }

  /**
   * 设置目标帧率
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, fps);
    this.frameTimeHistory = [];
    this.currentQuality = 1.0;
  }

  /**
   * 获取目标帧率
   */
  getTargetFPS(): number {
    return this.targetFPS;
  }

  /**
   * 强制设置质量
   */
  setQuality(quality: number): void {
    this.currentQuality = Math.max(0, Math.min(1, quality));
  }

  /**
   * 获取质量建议
   */
  getQualityRecommendations(): QualityRecommendations {
    return {
      lodBias: 1.0 - this.currentQuality,
      shadowQuality: this.currentQuality,
      textureQuality: this.currentQuality,
      effectsQuality: this.currentQuality
    };
  }

  /**
   * 重置管理器
   */
  reset(): void {
    this.frameTimeHistory = [];
    this.currentQuality = 1.0;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    averageFrameTime: number;
    currentQuality: number;
    targetFrameTime: number;
    historySize: number;
  } {
    return {
      averageFrameTime: this.getAverageFrameTime(),
      currentQuality: this.currentQuality,
      targetFrameTime: 1000 / this.targetFPS,
      historySize: this.frameTimeHistory.length
    };
  }
}
