import { Rect, RenderContext } from '../types';
import { BaseRenderer, Drawable, RenderState } from './core';
import { CanvasRenderer, RendererFactory } from './renderers';

/**
 * 渲染引擎管理器
 * 负责管理渲染器、场景对象和渲染循环
 */
export class RenderEngine {
  private renderer: BaseRenderer;
  private context: RenderContext | null = null;
  private isRunning = false;
  private targetFPS = 60;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsCounter = 0;
  private lastFPSUpdate = 0;

  constructor(rendererType: string = 'canvas2d') {
    try {
      if (!RendererFactory.isRendererSupported(rendererType)) {
        console.warn(`Unsupported renderer type: ${rendererType}, falling back to canvas2d`);
        rendererType = 'canvas2d';
      }

      switch (rendererType) {
        case 'canvas2d':
          this.renderer = RendererFactory.createCanvasRenderer();
          break;
        case 'webgl':
        case 'webgl2':
          this.renderer = RendererFactory.createWebGLRenderer();
          break;
        case 'webgpu':
          this.renderer = RendererFactory.createWebGPURenderer();
          break;
        default:
          console.warn(`Unknown renderer type: ${rendererType}, using canvas2d`);
          this.renderer = RendererFactory.createCanvasRenderer();
      }
    } catch (error) {
      console.error('Failed to create renderer, falling back to canvas2d:', error);
      this.renderer = RendererFactory.createCanvasRenderer();
    }
  }

  /**
   * 初始化渲染引擎
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // 如果渲染器有自己的初始化方法，调用它
    if (this.renderer.initialize) {
      const success = await this.renderer.initialize(canvas);
      if (!success) {
        throw new Error('Failed to initialize renderer');
      }
    }

    // 设置高DPI支持
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // 为Canvas2D渲染器创建上下文
    if (this.renderer instanceof CanvasRenderer) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D rendering context');
      }

      this.context = {
        canvas,
        ctx,
        viewport: { x: 0, y: 0, width: displayWidth, height: displayHeight },
        devicePixelRatio
      };
    } else {
      // 对于WebGL/WebGPU渲染器，创建基础上下文
      this.context = {
        canvas,
        ctx: null as unknown as CanvasRenderingContext2D, // WebGL/WebGPU不需要2D上下文
        viewport: { x: 0, y: 0, width: displayWidth, height: displayHeight },
        devicePixelRatio
      };
      
      // 为WebGPU渲染器添加present方法
      if (this.renderer.constructor.name === 'WebGPURenderer') {
        this.context.present = () => {
          // WebGPU的present在渲染器内部处理
          // 这里提供一个空实现以满足类型要求
        };
      }
    }

    // 设置初始视口
    this.renderer.setViewport(this.context.viewport);
  }

  /**
   * 开始渲染循环
   */
  start(): void {
    if (this.isRunning || !this.context) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;

    if (this.renderer instanceof CanvasRenderer) {
      this.renderer.startRenderLoop(this.context);
    } else {
      this.startCustomRenderLoop();
    }
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.renderer instanceof CanvasRenderer) {
      this.renderer.stopRenderLoop();
    }
  }

  /**
   * 手动渲染一帧
   */
  render(): void {
    if (!this.context) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.renderer.update(deltaTime);
    this.renderer.render(this.context);
    
    // 提交渲染通道（对WebGPU重要，对Canvas2D无影响）
    this.context.present?.();

    this.updateFPS(currentTime);
  }

  /**
   * 添加可绘制对象
   */
  addDrawable(drawable: Drawable): void {
    this.renderer.addDrawable(drawable);
  }

  /**
   * 移除可绘制对象
   */
  removeDrawable(id: string): void {
    this.renderer.removeDrawable(id);
  }

  /**
   * 获取可绘制对象
   */
  getDrawable(id: string): Drawable | undefined {
    return this.renderer.getDrawable(id);
  }

  /**
   * 获取指定区域内的可绘制对象
   */
  getDrawablesInBounds(bounds: Rect): Drawable[] {
    return this.renderer.getDrawablesInBounds(bounds);
  }

  /**
   * 设置视口
   */
  setViewport(viewport: Rect): void {
    this.renderer.setViewport(viewport);
    if (this.context) {
      this.context.viewport = { ...viewport };
    }
  }

  /**
   * 获取视口
   */
  getViewport(): Rect {
    return this.renderer.getViewport();
  }

  /**
   * 清空画布
   */
  clear(): void {
    this.renderer.clear();
  }

  /**
   * 设置渲染状态
   */
  setRenderState(state: Partial<RenderState>): void {
    this.renderer.setRenderState(state);
  }

  /**
   * 获取渲染状态
   */
  getRenderState(): RenderState {
    return this.renderer.getRenderState();
  }

  /**
   * 保存渲染状态
   */
  pushState(): void {
    this.renderer.pushState();
  }

  /**
   * 恢复渲染状态
   */
  popState(): void {
    this.renderer.popState();
  }

  /**
   * 设置目标FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, Math.min(120, fps));
  }

  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number {
    return this.fpsCounter;
  }

  /**
   * 获取底层渲染器
   */
  getRenderer(): BaseRenderer {
    return this.renderer;
  }

  /**
   * 获取渲染器能力
   */
  getCapabilities() {
    return this.renderer.getCapabilities();
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    return {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      batches: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0
    };
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void {
    if (!this.context) return;

    const { canvas, devicePixelRatio } = this.context;
    
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    this.context.viewport.width = width;
    this.context.viewport.height = height;
    
    this.renderer.setViewport(this.context.viewport);
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenPoint: { x: number; y: number }): { x: number; y: number } {
    if (!this.context) return screenPoint;

    const { viewport, devicePixelRatio } = this.context;
    return {
      x: (screenPoint.x * devicePixelRatio) + viewport.x,
      y: (screenPoint.y * devicePixelRatio) + viewport.y
    };
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldPoint: { x: number; y: number }): { x: number; y: number } {
    if (!this.context) return worldPoint;

    const { viewport, devicePixelRatio } = this.context;
    return {
      x: (worldPoint.x - viewport.x) / devicePixelRatio,
      y: (worldPoint.y - viewport.y) / devicePixelRatio
    };
  }

  /**
   * 销毁渲染引擎
   */
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.context = null;
  }

  /**
   * 自定义渲染循环（用于非Canvas渲染器）
   */
  private startCustomRenderLoop(): void {
    const frameInterval = 1000 / this.targetFPS;
    let lastTime = performance.now();

    const renderFrame = (currentTime: number) => {
      if (!this.isRunning) return;

      if (currentTime - lastTime >= frameInterval) {
        this.render();
        lastTime = currentTime;
      }

      requestAnimationFrame(renderFrame);
    };

    requestAnimationFrame(renderFrame);
  }

  /**
   * 更新FPS计数器
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++;

    if (currentTime - this.lastFPSUpdate >= 1000) {
      this.fpsCounter = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
  }
}
