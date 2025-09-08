import { BaseRenderer } from '../core';
import { RendererType } from '../core/RenderTypes';
import { CanvasRenderer } from './CanvasRenderer';
import { WebGLRenderer } from './WebGLRenderer';
import { WebGPURenderer } from './WebGPURenderer'; // Temporarily disabled

export { CanvasRenderer, WebGLRenderer };
export { WebGPURenderer }; // Temporarily disabled

export class RendererFactory {
  static createCanvasRenderer(): CanvasRenderer {
    return new CanvasRenderer();
  }

  static createWebGLRenderer(): WebGLRenderer {
    return new WebGLRenderer();
  }

  static createWebGPURenderer(canvas: HTMLCanvasElement): WebGPURenderer {
    return new WebGPURenderer(canvas);
  }

  static async createRenderer(type: RendererType, canvas: HTMLCanvasElement): Promise<BaseRenderer | null> {
    let renderer: BaseRenderer;

    switch (type) {
      case RendererType.CANVAS_2D:
        renderer = new CanvasRenderer();
        break;
      case RendererType.WEBGL:
      case RendererType.WEBGL2:
        renderer = new WebGLRenderer();
        if (renderer.initialize && !renderer.initialize(canvas)) {
          return null;
        }
        break;
      case RendererType.WEBGPU:
        renderer = new WebGPURenderer(canvas);
        if (renderer.initialize && !await renderer.initialize(canvas)) {
          return null;
        }
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
