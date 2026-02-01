/**
 * WebGL上下文工厂
 */

import type { BatchManagerConfig } from '../batch'
import type { IGraphicsCapabilities, IGraphicsContextFactory } from '../graphics/IGraphicsContext'
import { WebGLContext } from './WebGLContext'
import type { IWebGLContext, WebGLAdvancedConfig } from './WebGLContextTypes'

/**
 * WebGL上下文工厂实现
 */
export class WebGLContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  /**
   * 检查WebGL是否支持
   */
  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return gl !== null
    } catch {
      return false
    }
  }

  /**
   * 创建WebGL上下文
   */
  async createContext(
    canvas: HTMLCanvasElement,
    config?: Partial<BatchManagerConfig>,
    advancedConfig?: WebGLAdvancedConfig
  ): Promise<IWebGLContext> {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      throw new Error('WebGL not supported')
    }

    return new WebGLContext(gl as WebGLRenderingContext, canvas, config, advancedConfig)
  }

  /**
   * 获取WebGL能力
   */
  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsBlending: true,
      supportsFilters: false,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
    }
  }
}
