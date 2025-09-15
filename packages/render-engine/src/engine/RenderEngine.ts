/**
 * 渲染引擎统一入口
 * 根据配置自动选择合适的渲染器，提供统一的API接口
 */

import { IGraphicsContext } from '../graphics/IGraphicsContext';
import { BaseRenderer, Drawable, RenderContext, RendererCapabilities } from '../renderers/BaseRenderer';
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
    const ctx = this.getContext();
    return {
      canvas: this.canvas,
      ctx,
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
        // 适配不同上下文类型
        if (context.ctx instanceof CanvasRenderingContext2D) {
          // 为 Canvas2D 创建 IGraphicsContext 适配器
          const graphicsContext = this.createCanvas2DGraphicsContext(context.ctx);
          renderable.render(graphicsContext);
        } else {
          // WebGL/WebGPU 需要更复杂的适配
          // 暂时直接调用 render，后续可以扩展
          renderable.render({} as any);
        }
      },
      hitTest: (point: any) => renderable.hitTest(point),
      getBounds: () => renderable.getBounds(),
      setTransform: () => {} // 暂时空实现
    };
  }

  /**
   * 创建 Canvas2D 图形上下文适配器
   */
  private createCanvas2DGraphicsContext(ctx: CanvasRenderingContext2D): IGraphicsContext {
    return {
      // 基础绘制方法
      save: () => ctx.save(),
      restore: () => ctx.restore(),
      scale: (x: number, y: number) => ctx.scale(x, y),
      rotate: (angle: number) => ctx.rotate(angle),
      translate: (x: number, y: number) => ctx.translate(x, y),
      transform: (a: number, b: number, c: number, d: number, e: number, f: number) =>
        ctx.transform(a, b, c, d, e, f),

      // 路径方法
      beginPath: () => ctx.beginPath(),
      closePath: () => ctx.closePath(),
      moveTo: (x: number, y: number) => ctx.moveTo(x, y),
      lineTo: (x: number, y: number) => ctx.lineTo(x, y),
      quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) =>
        ctx.quadraticCurveTo(cpx, cpy, x, y),
      bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) =>
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
      arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean) =>
        ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise),
      rect: (x: number, y: number, width: number, height: number) => ctx.rect(x, y, width, height),

      // 绘制方法
      fill: () => ctx.fill(),
      stroke: () => ctx.stroke(),
      clip: () => ctx.clip(),

      // 样式属性
      get fillStyle() { return ctx.fillStyle; },
      set fillStyle(value) { ctx.fillStyle = value; },
      get strokeStyle() { return ctx.strokeStyle; },
      set strokeStyle(value) { ctx.strokeStyle = value; },
      get lineWidth() { return ctx.lineWidth; },
      set lineWidth(value) { ctx.lineWidth = value; },
      get lineCap() { return ctx.lineCap; },
      set lineCap(value) { ctx.lineCap = value; },
      get lineJoin() { return ctx.lineJoin; },
      set lineJoin(value) { ctx.lineJoin = value; },
      get globalAlpha() { return ctx.globalAlpha; },
      set globalAlpha(value) { ctx.globalAlpha = value; },

      // 尺寸属性
      get width() { return this.canvas?.width || 0; },
      get height() { return this.canvas?.height || 0; },

      // 清除方法
      clear: () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
      },

      // 销毁方法
      dispose: () => {}
    } as any;
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