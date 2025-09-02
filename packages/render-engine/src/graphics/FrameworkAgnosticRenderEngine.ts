/**
 * 框架无关的渲染引擎
 * 完全独立于任何UI框架，可在任何JavaScript环境中使用
 */

import { IGraphicsContext, IGraphicsContextFactory, IRect, IPoint } from './IGraphicsContext';
import { IRenderCommand } from './RenderCommand';

/**
 * 可渲染对象接口
 */
export interface IRenderable {
  readonly id: string;
  readonly bounds: IRect;
  readonly visible: boolean;
  readonly zIndex: number;
  
  render(context: IGraphicsContext): void;
  hitTest(point: IPoint): boolean;
  getBounds(): IRect;
  dispose(): void;
}

/**
 * 渲染层接口
 */
export interface IRenderLayer {
  readonly id: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly zIndex: number;
  
  addRenderable(renderable: IRenderable): void;
  removeRenderable(id: string): void;
  getRenderables(): IRenderable[];
  clear(): void;
}

/**
 * 视口接口
 */
export interface IViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

/**
 * 渲染统计信息
 */
export interface IRenderStats {
  frameCount: number;
  fps: number;
  renderTime: number;
  objectsRendered: number;
  commandsExecuted: number;
}

/**
 * 渲染引擎配置
 */
export interface IRenderEngineConfig {
  targetFPS?: number;
  enableVSync?: boolean;
  enableBatching?: boolean;
  enableCulling?: boolean;
  maxBatchSize?: number;
  cullMargin?: number;
}

/**
 * 渲染层实现
 */
class RenderLayer implements IRenderLayer {
  private renderables: Map<string, IRenderable> = new Map();
  
  constructor(
    public readonly id: string,
    public visible: boolean = true,
    public opacity: number = 1,
    public zIndex: number = 0
  ) {}
  
  addRenderable(renderable: IRenderable): void {
    this.renderables.set(renderable.id, renderable);
  }
  
  removeRenderable(id: string): void {
    this.renderables.delete(id);
  }
  
  getRenderables(): IRenderable[] {
    return Array.from(this.renderables.values())
      .filter(r => r.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }
  
  clear(): void {
    this.renderables.clear();
  }
}

/**
 * 框架无关的渲染引擎
 */
export class FrameworkAgnosticRenderEngine {
  private context: IGraphicsContext | null = null;
  private layers: Map<string, IRenderLayer> = new Map();
  private viewport: IViewport = { x: 0, y: 0, width: 800, height: 600, zoom: 1 };
  private config: IRenderEngineConfig;
  private stats: IRenderStats = {
    frameCount: 0,
    fps: 0,
    renderTime: 0,
    objectsRendered: 0,
    commandsExecuted: 0
  };
  
  private isRunning = false;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private commandQueue: IRenderCommand[] = [];
  
  constructor(config: IRenderEngineConfig = {}) {
    this.config = {
      targetFPS: 60,
      enableVSync: true,
      enableBatching: true,
      enableCulling: true,
      maxBatchSize: 1000,
      cullMargin: 50,
      ...config
    };
  }
  
  /**
   * 初始化渲染引擎
   */
  async initialize<TCanvas>(factory: IGraphicsContextFactory<TCanvas>, canvas: TCanvas): Promise<void> {
    if (!factory.isSupported()) {
      throw new Error('Graphics context not supported');
    }
    
    this.context = await factory.createContext(canvas);
    
    // 设置默认视口
    this.viewport.width = this.context.width;
    this.viewport.height = this.context.height;
  }
  
  /**
   * 开始渲染循环
   */
  start(): void {
    if (this.isRunning || !this.context) {
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    if (this.config.enableVSync) {
      this.startVSyncLoop();
    } else {
      this.startCustomLoop();
    }
  }
  
  /**
   * 停止渲染循环
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.animationId !== null) {
      if (this.config.enableVSync) {
        cancelAnimationFrame(this.animationId);
      } else {
        clearTimeout(this.animationId);
      }
      this.animationId = null;
    }
  }
  
  /**
   * 手动渲染一帧
   */
  render(): void {
    if (!this.context) {
      return;
    }
    
    const startTime = performance.now();
    
    // 清空画布
    this.context.clear();
    
    // 设置视口变换
    this.context.save();
    this.setupViewportTransform();
    
    // 执行命令队列
    this.executeCommandQueue();
    
    // 渲染所有层
    this.renderLayers();
    
    this.context.restore();
    
    // 更新统计信息
    const renderTime = performance.now() - startTime;
    this.updateStats(renderTime);
  }
  
  /**
   * 添加渲染命令
   */
  addCommand(command: IRenderCommand): void {
    this.commandQueue.push(command);
  }
  
  /**
   * 添加渲染命令（批量）
   */
  addCommands(commands: IRenderCommand[]): void {
    this.commandQueue.push(...commands);
  }
  
  /**
   * 清空命令队列
   */
  clearCommands(): void {
    this.commandQueue = [];
  }
  
  /**
   * 创建渲染层
   */
  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    const layer = new RenderLayer(id, true, 1, zIndex);
    this.layers.set(id, layer);
    return layer;
  }
  
  /**
   * 获取渲染层
   */
  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id);
  }
  
  /**
   * 移除渲染层
   */
  removeLayer(id: string): void {
    this.layers.delete(id);
  }
  
  /**
   * 设置视口
   */
  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }
  
  /**
   * 获取视口
   */
  getViewport(): IViewport {
    return { ...this.viewport };
  }
  
  /**
   * 获取渲染统计信息
   */
  getStats(): IRenderStats {
    return { ...this.stats };
  }
  
  /**
   * 获取图形上下文
   */
  getContext(): IGraphicsContext | null {
    return this.context;
  }
  
  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(point: IPoint): IPoint {
    if (!this.context) {
      return point;
    }
    
    const screenPoint = this.context.screenToWorld(point);
    return {
      x: (screenPoint.x + this.viewport.x) / this.viewport.zoom,
      y: (screenPoint.y + this.viewport.y) / this.viewport.zoom
    };
  }
  
  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(point: IPoint): IPoint {
    if (!this.context) {
      return point;
    }
    
    const worldPoint = {
      x: point.x * this.viewport.zoom - this.viewport.x,
      y: point.y * this.viewport.zoom - this.viewport.y
    };
    
    return this.context.worldToScreen(worldPoint);
  }
  
  /**
   * 点击测试
   */
  hitTest(point: IPoint): IRenderable | null {
    const worldPoint = this.screenToWorld(point);
    
    // 从上到下遍历层
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    
    for (const layer of sortedLayers) {
      const renderables = layer.getRenderables().reverse(); // 从上到下
      
      for (const renderable of renderables) {
        if (renderable.hitTest(worldPoint)) {
          return renderable;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 获取视口内的对象
   */
  getObjectsInViewport(): IRenderable[] {
    const viewportBounds = {
      x: this.viewport.x - this.config.cullMargin!,
      y: this.viewport.y - this.config.cullMargin!,
      width: this.viewport.width / this.viewport.zoom + this.config.cullMargin! * 2,
      height: this.viewport.height / this.viewport.zoom + this.config.cullMargin! * 2
    };
    
    const result: IRenderable[] = [];
    
    for (const layer of this.layers.values()) {
      if (!layer.visible) continue;
      
      for (const renderable of layer.getRenderables()) {
        if (this.boundsIntersect(renderable.getBounds(), viewportBounds)) {
          result.push(renderable);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 销毁渲染引擎
   */
  dispose(): void {
    this.stop();
    
    if (this.context) {
      this.context.dispose();
      this.context = null;
    }
    
    this.layers.clear();
    this.commandQueue = [];
  }
  
  // 私有方法
  private startVSyncLoop(): void {
    const loop = () => {
      if (!this.isRunning) return;
      
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    
    this.animationId = requestAnimationFrame(loop);
  }
  
  private startCustomLoop(): void {
    const targetInterval = 1000 / this.config.targetFPS!;
    
    const loop = () => {
      if (!this.isRunning) return;
      
      this.render();
      this.animationId = setTimeout(loop, targetInterval) as unknown as number;
    };
    
    this.animationId = setTimeout(loop, targetInterval) as unknown as number;
  }
  
  private setupViewportTransform(): void {
    if (!this.context) return;
    
    this.context.scale(this.viewport.zoom, this.viewport.zoom);
    this.context.translate(-this.viewport.x, -this.viewport.y);
  }
  
  private executeCommandQueue(): void {
    if (!this.context || this.commandQueue.length === 0) {
      return;
    }
    
    for (const command of this.commandQueue) {
      command.execute(this.context);
    }
    
    this.stats.commandsExecuted += this.commandQueue.length;
    this.commandQueue = [];
  }
  
  private renderLayers(): void {
    if (!this.context) return;
    
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
    
    let objectsRendered = 0;
    
    for (const layer of sortedLayers) {
      this.context.save();
      this.context.setOpacity(layer.opacity);
      
      const renderables = this.config.enableCulling 
        ? this.cullRenderables(layer.getRenderables())
        : layer.getRenderables();
      
      for (const renderable of renderables) {
        this.context.save();
        renderable.render(this.context);
        this.context.restore();
        objectsRendered++;
      }
      
      this.context.restore();
    }
    
    this.stats.objectsRendered = objectsRendered;
  }
  
  private cullRenderables(renderables: IRenderable[]): IRenderable[] {
    const viewportBounds = {
      x: this.viewport.x - this.config.cullMargin!,
      y: this.viewport.y - this.config.cullMargin!,
      width: this.viewport.width / this.viewport.zoom + this.config.cullMargin! * 2,
      height: this.viewport.height / this.viewport.zoom + this.config.cullMargin! * 2
    };
    
    return renderables.filter(renderable => 
      this.boundsIntersect(renderable.getBounds(), viewportBounds)
    );
  }
  
  private boundsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }
  
  private updateStats(renderTime: number): void {
    this.stats.frameCount++;
    this.stats.renderTime = renderTime;
    
    // 计算FPS
    const currentTime = performance.now();
    this.frameTimeHistory.push(currentTime);
    
    // 保持最近1秒的帧时间记录
    while (this.frameTimeHistory.length > 0 && 
           currentTime - this.frameTimeHistory[0] > 1000) {
      this.frameTimeHistory.shift();
    }
    
    this.stats.fps = this.frameTimeHistory.length;
    this.lastFrameTime = currentTime;
  }
}