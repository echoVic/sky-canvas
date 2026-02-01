import { Canvas2DContextFactory } from '../adapters/Canvas2DContext'
import { WebGLContextFactory } from '../adapters/WebGLContext'
import { type WebGPUContextConfig, WebGPUContextFactory } from '../adapters/WebGPUContext'
import type { BaseRenderer } from '../core'
import { RendererType } from '../core/RenderTypes'
import { CanvasRenderer } from './CanvasRenderer'
import { WebGLRenderer } from './WebGLRenderer'
import { WebGPURenderer } from './WebGPURenderer'

export { CanvasRenderer, WebGLRenderer, WebGPURenderer }
export { RendererBase } from './BaseRenderer'
export type {
  IColor,
  IDrawCircleOptions,
  IDrawImageOptions,
  IDrawLineOptions,
  IDrawRectOptions,
  IDrawTextOptions,
  IGraphicsStyle,
  IImageSource,
  IPoint,
  IRect,
  IRenderer,
  ITextStyle,
} from './IRenderer'

export class RendererFactory {
  static async createCanvasRenderer(canvas: HTMLCanvasElement): Promise<CanvasRenderer | null> {
    const factory = new Canvas2DContextFactory()

    if (!factory.isSupported()) {
      return null
    }

    try {
      const context = await factory.createContext(canvas)
      return new CanvasRenderer(context)
    } catch (error) {
      console.error('Failed to create Canvas2D context:', error)
      return null
    }
  }

  static async createWebGLRenderer(canvas: HTMLCanvasElement): Promise<WebGLRenderer | null> {
    const factory = new WebGLContextFactory()

    if (!factory.isSupported()) {
      return null
    }

    try {
      const context = await factory.createContext(canvas)
      return new WebGLRenderer(context)
    } catch (error) {
      console.error('Failed to create WebGL context:', error)
      return null
    }
  }

  static async createWebGPURenderer(
    canvas: HTMLCanvasElement,
    config?: WebGPUContextConfig
  ): Promise<WebGPURenderer | null> {
    const factory = new WebGPUContextFactory()

    if (!factory.isSupported()) {
      return null
    }

    try {
      const context = await factory.createContext(canvas, config)
      return new WebGPURenderer(context)
    } catch (error) {
      console.error('Failed to create WebGPU context:', error)
      return null
    }
  }

  static async createRenderer(
    type: RendererType,
    canvas: HTMLCanvasElement
  ): Promise<BaseRenderer | null> {
    let renderer: BaseRenderer

    switch (type) {
      case RendererType.CANVAS_2D: {
        const canvasRenderer = await RendererFactory.createCanvasRenderer(canvas)
        if (!canvasRenderer) {
          return null
        }
        renderer = canvasRenderer
        break
      }
      case RendererType.WEBGL:
      case RendererType.WEBGL2: {
        const webglRenderer = await RendererFactory.createWebGLRenderer(canvas)
        if (!webglRenderer) {
          return null
        }
        renderer = webglRenderer
        break
      }
      case RendererType.WEBGPU: {
        const webgpuRenderer = await RendererFactory.createWebGPURenderer(canvas)
        if (!webgpuRenderer) {
          return null
        }
        renderer = webgpuRenderer
        break
      }
      default:
        return null
    }

    return renderer
  }

  static isRendererSupported(type: string): boolean {
    switch (type) {
      case 'canvas2d':
        return true
      case 'webgl':
      case 'webgl2':
        return !!document.createElement('canvas').getContext('webgl')
      case 'webgpu':
        return 'gpu' in navigator
      default:
        return false
    }
  }

  static getBestSupportedRenderer(): RendererType {
    if (RendererFactory.isRendererSupported('webgpu')) {
      return RendererType.WEBGPU
    }
    if (RendererFactory.isRendererSupported('webgl2')) {
      return RendererType.WEBGL2
    }
    if (RendererFactory.isRendererSupported('webgl')) {
      return RendererType.WEBGL
    }
    return RendererType.CANVAS_2D
  }
}
