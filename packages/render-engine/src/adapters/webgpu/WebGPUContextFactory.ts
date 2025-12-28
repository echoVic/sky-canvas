/**
 * WebGPU 上下文工厂和管理器
 */

import { WebGPUContext } from './WebGPUContextImpl';
import { WebGPUContextConfig, DEFAULT_WEBGPU_CONFIG, LOW_POWER_CONFIG, isWebGPUSupported } from './WebGPUTypes';

/**
 * 实验性警告常量
 */
export const WEBGPU_EXPERIMENTAL_WARNING =
  '[WebGPU] This adapter is experimental. Some features may not be fully implemented.';

/**
 * WebGPU 上下文工厂类
 */
export class WebGPUContextFactory {
  /**
   * 检查 WebGPU 支持
   */
  isSupported(): boolean {
    return isWebGPUSupported();
  }

  /**
   * 创建 WebGPU 上下文实例
   */
  async createContext(canvas: HTMLCanvasElement, config?: WebGPUContextConfig): Promise<WebGPUContext> {
    console.warn(WEBGPU_EXPERIMENTAL_WARNING);

    const context = await WebGPUContext.create(canvas, config);
    if (!context) {
      throw new Error('Failed to create WebGPU context');
    }
    return context;
  }

  /**
   * 获取图形能力
   */
  getCapabilities() {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 8192,
      supportedFormats: ['rgba8unorm', 'bgra8unorm', 'rgba16float']
    };
  }

  /**
   * 获取推荐的上下文配置
   */
  static getRecommendedConfig(): WebGPUContextConfig {
    return { ...DEFAULT_WEBGPU_CONFIG };
  }

  /**
   * 获取低功耗配置
   */
  static getLowPowerConfig(): WebGPUContextConfig {
    return { ...LOW_POWER_CONFIG };
  }
}

/**
 * WebGPU 上下文管理器
 */
export class WebGPUContextManager {
  private static contexts: Map<HTMLCanvasElement, WebGPUContext> = new Map();

  /**
   * 获取或创建上下文
   */
  static async getOrCreateContext(
    canvas: HTMLCanvasElement,
    config?: WebGPUContextConfig
  ): Promise<WebGPUContext | undefined> {
    let context = this.contexts.get(canvas);

    if (!context) {
      const factory = new WebGPUContextFactory();
      try {
        const newContext = await factory.createContext(canvas, config);
        if (newContext) {
          this.contexts.set(canvas, newContext);
          context = newContext;
        }
      } catch (error) {
        console.error('Failed to create WebGPU context:', error);
      }
    }

    return context;
  }

  /**
   * 销毁指定画布的上下文
   */
  static disposeContext(canvas: HTMLCanvasElement): void {
    const context = this.contexts.get(canvas);
    if (context) {
      context.dispose();
      this.contexts.delete(canvas);
    }
  }

  /**
   * 销毁所有上下文
   */
  static disposeAllContexts(): void {
    this.contexts.forEach(context => context.dispose());
    this.contexts.clear();
  }

  /**
   * 获取活跃的上下文数量
   */
  static getActiveContextCount(): number {
    return this.contexts.size;
  }

  /**
   * 获取指定画布的上下文
   */
  static getContext(canvas: HTMLCanvasElement): WebGPUContext | undefined {
    return this.contexts.get(canvas);
  }
}
