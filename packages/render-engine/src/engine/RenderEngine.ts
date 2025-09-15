/**
 * 渲染引擎统一入口
 * 根据配置自动选择合适的渲染器，提供统一的API接口
 */

import { BaseRenderer } from '../renderers/BaseRenderer';
import { Drawable, RenderContext, RendererCapabilities } from '../renderers/types';
import { CanvasRenderer } from '../renderers/CanvasRenderer';
import { WebGLRenderer } from '../renderers/WebGLRenderer';
import { WebGPURenderer } from '../renderers/WebGPURenderer';
import type { IRenderable, IViewport, RenderEngineConfig } from './types';


/**
 * 渲染引擎主类
 * 提供统一的渲染器管理和渲染接口
 */
export class RenderEngine {
  private renderer: BaseRenderer;
  private canvas: HTMLCanvasElement;
  private config: RenderEngineConfig;
  private renderables: Map<string, IRenderable> = new Map();
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement, config: RenderEngineConfig = {}) {
    this.canvas = canvas;
    this.config = {
      renderer: 'auto',
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      enableBatching: true,
      targetFPS: 60,
      debug: false,
      ...config
    };

    this.renderer = this.createRenderer();
    this.initialize();
  }

  /**
   * 根据配置创建渲染器
   */
  private createRenderer(): BaseRenderer {
    const type = this.config.renderer!;

    if (type === 'auto') {
      return this.autoSelectRenderer();
    }

    switch (type) {
      case 'webgl':
        return new WebGLRenderer();
      case 'canvas2d':
        return new CanvasRenderer();
      case 'webgpu':
        return new WebGPURenderer(this.canvas);
      default:
        throw new Error(`Unknown renderer type: ${type}`);
    }
  }

  /**
   * 自动选择最佳渲染器
   */
  private autoSelectRenderer(): BaseRenderer {
    if (this.isWebGPUSupported()) {
      if (this.config.debug) {
        console.log('[RenderEngine] Auto-selected WebGPU renderer');
      }
      return new WebGPURenderer(this.canvas);
    }

    if (this.isWebGLSupported()) {
      if (this.config.debug) {
        console.log('[RenderEngine] Auto-selected WebGL renderer');
      }
      return new WebGLRenderer();
    }

    if (this.config.debug) {
      console.log('[RenderEngine] Auto-selected Canvas2D renderer');
    }
    return new CanvasRenderer();
  }

  /**
   * 初始化渲染引擎
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.renderer.initialize) {
        const result = this.renderer.initialize(this.canvas, this.config);

        // 处理异步初始化
        if (result instanceof Promise) {
          const success = await result;
          if (!success) {
            throw new Error('Renderer initialization failed');
          }
        } else if (result === false) {
          throw new Error('Renderer initialization failed');
        }
      }

      this.isInitialized = true;

      if (this.config.debug) {
        console.log(`[RenderEngine] Initialized with ${this.getRendererType()} renderer`);
      }
    } catch (error) {
      console.error('[RenderEngine] Initialization failed:', error);
      throw error;
    }
  }

  // ===== 公共 API =====

  /**
   * 添加可渲染对象
   */
  addRenderable(renderable: IRenderable): void {
    this.renderables.set(renderable.id, renderable);

    // 转换为 Drawable 格式添加到渲染器
    const drawable = this.convertToDrawable(renderable);
    this.renderer.addDrawable(drawable);

    if (this.config.debug) {
      console.log(`[RenderEngine] Added renderable: ${renderable.id}`);
    }
  }

  /**
   * 移除可渲染对象
   */
  removeRenderable(id: string): void {
    const removed = this.renderables.delete(id);
    if (removed) {
      this.renderer.removeDrawable(id);

      if (this.config.debug) {
        console.log(`[RenderEngine] Removed renderable: ${id}`);
      }
    }
  }

  /**
   * 清空所有可渲染对象
   */
  clearRenderables(): void {
    const count = this.renderables.size;
    this.renderables.clear();
    this.renderer.clearDrawables();

    if (this.config.debug) {
      console.log(`[RenderEngine] Cleared ${count} renderables`);
    }
  }

  /**
   * 获取可渲染对象
   */
  getRenderable(id: string): IRenderable | undefined {
    return this.renderables.get(id);
  }

  /**
   * 获取所有可渲染对象
   */
  getRenderables(): IRenderable[] {
    return Array.from(this.renderables.values());
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    if (!this.isInitialized) {
      console.warn('[RenderEngine] Engine not initialized, cannot start');
      return;
    }

    const context = this.createRenderContext();
    this.renderer.startRenderLoop(context);

    if (this.config.debug) {
      console.log('[RenderEngine] Render loop started');
    }
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    this.renderer.stopRenderLoop();

    if (this.config.debug) {
      console.log('[RenderEngine] Render loop stopped');
    }
  }

  /**
   * 手动渲染一帧
   */
  render(): void {
    if (!this.isInitialized) {
      console.warn('[RenderEngine] Engine not initialized, cannot render');
      return;
    }

    const context = this.createRenderContext();
    this.renderer.render(context);
  }

  /**
   * 设置视口
   */
  setViewport(viewport: Partial<IViewport>): void {
    this.renderer.setViewport(viewport);
  }

  /**
   * 获取当前视口
   */
  getViewport(): IViewport {
    return this.renderer.getViewport();
  }

  /**
   * 获取渲染统计信息
   */
  getStats(): any {
    return this.renderer.getStats?.() || {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      frameTime: 0
    };
  }

  /**
   * 获取渲染器能力
   */
  getCapabilities(): RendererCapabilities {
    return this.renderer.getCapabilities();
  }

  /**
   * 获取当前使用的渲染器类型
   */
  getRendererType(): string {
    if (this.renderer instanceof WebGLRenderer) return 'webgl';
    if (this.renderer instanceof CanvasRenderer) return 'canvas2d';
    if (this.renderer instanceof WebGPURenderer) return 'webgpu';
    return 'unknown';
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 获取配置
   */
  getConfig(): RenderEngineConfig {
    return { ...this.config };
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.renderer.isRunning?.() || false;
  }

  /**
   * 销毁渲染引擎
   */
  dispose(): void {
    this.stop();
    this.clearRenderables();
    this.renderer.dispose?.();
    this.isInitialized = false;

    if (this.config.debug) {
      console.log('[RenderEngine] Disposed');
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 创建渲染上下文
   */
  private createRenderContext(): RenderContext {
    const context = this.getContext();
    return {
      canvas: this.canvas,
      context,
      viewport: this.renderer.getViewport(),
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * 根据渲染器类型获取正确的上下文
   */
  private getContext(): any {
    if (this.renderer instanceof WebGLRenderer) {
      return this.canvas.getContext('webgl', {
        antialias: this.config.antialias,
        alpha: this.config.alpha,
        preserveDrawingBuffer: this.config.preserveDrawingBuffer
      }) || this.canvas.getContext('experimental-webgl');
    } else if (this.renderer instanceof CanvasRenderer) {
      return this.canvas.getContext('2d', {
        alpha: this.config.alpha
      });
    } else {
      // WebGPU
      return this.canvas.getContext('webgpu');
    }
  }

  /**
   * 将 IRenderable 转换为 Drawable 格式
   */
  private convertToDrawable(renderable: IRenderable): Drawable {
    return {
      id: renderable.id,
      visible: renderable.visible,
      zIndex: renderable.zIndex,
      bounds: renderable.getBounds(),
      transform: {
        // 默认变换矩阵
        matrix: [1, 0, 0, 1, 0, 0],
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 }
      } as any,
      draw: (context: RenderContext) => {
        // 现在不需要适配器了，渲染器直接处理自己的上下文类型
        // 这个方法主要是为了兼容旧的 IRenderable 接口
        // 实际使用中，应该直接使用渲染器的 render 方法
        console.warn('Using deprecated convertToDrawable - consider using renderer directly');
      },
      hitTest: (point: any) => renderable.hitTest(point),
      getBounds: () => renderable.getBounds(),
      setTransform: () => {} // 暂时空实现
    };
  }


  /**
   * 检测 WebGL 支持
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * 检测 WebGPU 支持
   */
  private isWebGPUSupported(): boolean {
    return 'gpu' in navigator;
  }
}