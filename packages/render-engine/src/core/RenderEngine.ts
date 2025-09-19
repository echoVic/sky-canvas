/**
 * 渲染引擎统一入口
 * 根据配置自动选择合适的渲染器，提供统一的API接口
 */

import { BaseRenderer } from './renderers/BaseRenderer';
import { CanvasRenderer } from './renderers/CanvasRenderer';
import { RendererCapabilities } from './renderers/types';
import { WebGLRenderer } from './renderers/WebGLRenderer';
import { WebGPURenderer } from './renderers/WebGPURenderer';
import type { IRenderable, IViewport, RenderEngineConfig } from './types';


/**
 * 渲染引擎主类
 * 提供统一的渲染器管理和渲染接口
 */
export class RenderEngine {
  private renderer: BaseRenderer;
  private canvas: HTMLCanvasElement;
  private config: RenderEngineConfig;
  private objects: Map<string, IRenderable> = new Map();
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement, config: RenderEngineConfig = {}) {
    this.canvas = canvas;
    this.config = {
      renderer: 'webgl',
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      enableBatching: true,
      targetFPS: 60,
      debug: false,
      ...config
    };

    this.renderer = this.createRenderer();
    // 移除自动初始化，改为外部显式调用
  }

  /**
   * 根据配置创建渲染器，如果不支持则降级
   */
  private createRenderer(): BaseRenderer {
    const requestedType = this.config.renderer!;
    let actualType = requestedType;

    // 检查浏览器支持并进行降级处理
    if (requestedType === 'webgpu' && !('gpu' in navigator)) {
      actualType = 'webgl';
      if (this.config.debug) {
        console.warn('[RenderEngine] WebGPU not supported, falling back to WebGL');
      }
    }

    if (actualType === 'webgl' && !this.isWebGLSupported()) {
      actualType = 'canvas2d';
      if (this.config.debug) {
        console.warn('[RenderEngine] WebGL not supported, falling back to Canvas2D');
      }
    }

    // 如果最终降级的类型与请求的不同，更新配置
    if (actualType !== requestedType) {
      this.config.renderer = actualType;
    }

    switch (actualType) {
      case 'webgl':
        return new WebGLRenderer();
      case 'canvas2d':
        return new CanvasRenderer();
      case 'webgpu':
        return new WebGPURenderer();
      default:
        throw new Error(`Unknown renderer type: ${actualType}. Supported types: 'webgl', 'canvas2d', 'webgpu'`);
    }
  }


  /**
   * 初始化渲染引擎
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const originalRenderer = this.config.renderer;
    let initSuccess = false;

    try {
      initSuccess = await this.tryInitializeRenderer();
    } catch (error) {
      if (this.config.debug) {
        console.warn(`[RenderEngine] ${this.config.renderer} initialization failed:`, error);
      }
      initSuccess = false;
    }

    // 如果初始化失败，尝试降级
    if (!initSuccess) {
      initSuccess = await this.tryFallbackRenderers();
    }

    if (!initSuccess) {
      throw new Error(`Failed to initialize any renderer. Tried: ${originalRenderer} -> canvas2d`);
    }

    this.isInitialized = true;

    if (this.config.debug) {
      console.log(`[RenderEngine] Initialized with ${this.getRendererType()} renderer`);
    }
  }

  private async tryInitializeRenderer(): Promise<boolean> {
    if (this.renderer.initialize) {
      const result = this.renderer.initialize(this.canvas, this.config);

      // 处理异步初始化
      if (result instanceof Promise) {
        return await result;
      } else {
        return result !== false;
      }
    }
    return true;
  }

  private async tryFallbackRenderers(): Promise<boolean> {
    const currentType = this.config.renderer;

    // 降级路径：webgpu -> webgl -> canvas2d
    if (currentType === 'webgpu' || currentType === 'webgl') {
      if (this.config.debug) {
        console.warn(`[RenderEngine] ${currentType} failed, falling back to Canvas2D`);
      }

      this.config.renderer = 'canvas2d';
      this.renderer = this.createRenderer();

      try {
        return await this.tryInitializeRenderer();
      } catch (error) {
        if (this.config.debug) {
          console.error('[RenderEngine] Canvas2D fallback also failed:', error);
        }
        return false;
      }
    }

    return false;
  }

  // ===== 公共 API =====

  /**
   * 添加渲染对象
   */
  addObject(renderable: IRenderable): void {
    this.objects.set(renderable.id, renderable);

    // 直接添加到渲染器，不需要转换
    this.renderer.addRenderable(renderable);

    if (this.config.debug) {
      console.log(`[RenderEngine] Added object: ${renderable.id}`);
    }
  }

  /**
   * 移除渲染对象
   */
  removeObject(id: string): void {
    const removed = this.objects.delete(id);
    if (removed) {
      this.renderer.removeRenderable(id);

      if (this.config.debug) {
        console.log(`[RenderEngine] Removed object: ${id}`);
      }
    }
  }

  /**
   * 清空所有渲染对象
   */
  clearObjects(): void {
    const count = this.objects.size;
    this.objects.clear();
    this.renderer.clearRenderables();

    if (this.config.debug) {
      console.log(`[RenderEngine] Cleared ${count} objects`);
    }
  }

  /**
   * 获取渲染对象
   */
  getObject(id: string): IRenderable | undefined {
    return this.objects.get(id);
  }

  /**
   * 获取所有渲染对象
   */
  getObjects(): IRenderable[] {
    return Array.from(this.objects.values());
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    if (!this.isInitialized) {
      console.warn('[RenderEngine] Engine not initialized, cannot start');
      return;
    }

    this.renderer.startRenderLoop();

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
    console.log(`[RenderEngine] render() called, isInitialized: ${this.isInitialized}`);
    if (!this.isInitialized) {
      console.warn('[RenderEngine] Engine not initialized, cannot render');
      return;
    }

    console.log(`[RenderEngine] Calling renderer.render()`);
    this.renderer.render();
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
    this.clearObjects();
    this.renderer.dispose?.();
    this.isInitialized = false;

    if (this.config.debug) {
      console.log('[RenderEngine] Disposed');
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 检测 WebGL 支持
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const contextOptions = {
        alpha: true,
        antialias: true,
        stencil: true,
        failIfMajorPerformanceCaveat: false
      };

      let gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext ||
               canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext;

      if (!gl) {
        return false;
      }

      // 检查上下文属性是否正确获取
      const contextAttributes = gl.getContextAttributes();
      if (!contextAttributes) {
        return false;
      }

      // 检查是否支持必要的扩展
      const requiredExtensions = ['OES_standard_derivatives'];
      for (const ext of requiredExtensions) {
        if (!gl.getExtension(ext)) {
          if (this.config.debug) {
            console.warn(`[RenderEngine] WebGL extension ${ext} not supported`);
          }
        }
      }

      // 清理上下文以避免内存泄漏
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }

      gl = null as any;
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检测 WebGPU 支持（异步检测）
   */
  private async isWebGPUSupported(): Promise<boolean> {
    if (!('gpu' in navigator) || typeof navigator.gpu?.requestAdapter !== 'function') {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return false;
      }

      // 尝试请求设备以确保真正可用
      const device = await adapter.requestDevice();
      if (!device) {
        return false;
      }

      // 清理设备资源
      device.destroy();
      return true;
    } catch (e) {
      return false;
    }
  }
}