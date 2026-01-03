import { Canvas2DContextFactory } from '../adapters/Canvas2DContext';
import { WebGLContextFactory } from '../adapters/WebGLContext';
import { WebGPUContextConfig, WebGPUContextFactory } from '../adapters/WebGPUContext';
import { BaseRenderer } from '../core';
import { RendererType } from '../core/RenderTypes';
import { CanvasRenderer } from './CanvasRenderer';
import { WebGLRenderer } from './WebGLRenderer';
import { WebGPURenderer } from './WebGPURenderer';

export { CanvasRenderer, WebGLRenderer, WebGPURenderer };
export { RendererBase } from './BaseRenderer';
export type {
  IRenderer,
  IDrawRectOptions,
  IDrawCircleOptions,
  IDrawLineOptions,
  IDrawTextOptions,
  IDrawImageOptions,
  IImageSource,
  IPoint,
  IRect,
  IColor,
  ITextStyle,
  IGraphicsStyle
} from './IRenderer';

export class RendererFactory {
  static async createCanvasRenderer(canvas: HTMLCanvasElement): Promise<CanvasRenderer | null> {
    const factory = new Canvas2DContextFactory();

    if (!factory.isSupported()) {
      return null;
    }

    try {
      const context = await factory.createContext(canvas);
      return new CanvasRenderer(context);
    } catch (error) {
      console.error('Failed to create Canvas2D context:', error);
      return null;
    }
  }

  static async createWebGLRenderer(canvas: HTMLCanvasElement): Promise<WebGLRenderer | null> {
    const factory = new WebGLContextFactory();
    
    if (!factory.isSupported()) {
      return null;
    }
    
    try {
      const context = await factory.createContext(canvas);
      return new WebGLRenderer(context);
    } catch (error) {
      console.error('Failed to create WebGL context:', error);
      return null;
    }
  }

  static async createWebGPURenderer(canvas: HTMLCanvasElement, config?: WebGPUContextConfig): Promise<WebGPURenderer | null> {
    const factory = new WebGPUContextFactory();
    
    if (!factory.isSupported()) {
      return null;
    }
    
    try {
      const context = await factory.createContext(canvas, config);
      return new WebGPURenderer(context);
    } catch (error) {
      console.error('Failed to create WebGPU context:', error);
      return null;
    }
  }

  static async createRenderer(type: RendererType, canvas: HTMLCanvasElement): Promise<BaseRenderer | null> {
    let renderer: BaseRenderer;

    switch (type) {
      case RendererType.CANVAS_2D:
        const canvasRenderer = await this.createCanvasRenderer(canvas);
        if (!canvasRenderer) {
          return null;
        }
        renderer = canvasRenderer;
        break;
      case RendererType.WEBGL:
      case RendererType.WEBGL2:
        const webglRenderer = await this.createWebGLRenderer(canvas);
        if (!webglRenderer) {
          return null;
        }
        renderer = webglRenderer;
        break;
      case RendererType.WEBGPU:
        const webgpuRenderer = await this.createWebGPURenderer(canvas);
        if (!webgpuRenderer) {
          return null;
        }
        renderer = webgpuRenderer;
        break;
      default:
        return null;
    }

    return renderer;
  }

  static isRendererSupported(type: string): boolean {
    switch (type) {
      case 'canvas2d':
        return true;
      case 'webgl':
      case 'webgl2':
        return !!document.createElement('canvas').getContext('webgl');
      case 'webgpu':
        return 'gpu' in navigator;
      default:
        return false;
    }
  }

  static getBestSupportedRenderer(): RendererType {
    if (this.isRendererSupported('webgpu')) {
      return RendererType.WEBGPU;
    }
    if (this.isRendererSupported('webgl2')) {
      return RendererType.WEBGL2;
    }
    if (this.isRendererSupported('webgl')) {
      return RendererType.WEBGL;
    }
    return RendererType.CANVAS_2D;
  }
}
