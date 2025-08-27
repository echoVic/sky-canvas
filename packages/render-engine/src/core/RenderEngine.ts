/**
 * 渲染引擎核心实现
 */
import { 
  IRenderEngine, 
  IRenderLayer, 
  IRenderable, 
  IViewport, 
  IRenderStats, 
  IRenderEngineConfig 
} from './IRenderEngine';
import { IGraphicsContext, IGraphicsContextFactory, IPoint } from './IGraphicsContext';

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
 * 渲染引擎实现
 */
export class RenderEngine implements IRenderEngine {
  private context: IGraphicsContext | null = null;
  private layers: Map<string, IRenderLayer> = new Map();
  private viewport: IViewport = { 
    x: 0, 
    y: 0, 
    width: 800, 
    height: 600, 
    zoom: 1 
  };
  private config: IRenderEngineConfig;
  private stats: IRenderStats = {
    frameCount: 0,
    fps: 0,
    renderTime: 0,
    objectsRendered: 0
  };

  private isRunningFlag = false;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];

  constructor(config: IRenderEngineConfig = {}) {
    this.config = {
      targetFPS: 60,
      enableVSync: true,
      enableCulling: true,
      cullMargin: 50,
      ...config
    };
  }

  async initialize<TCanvas>(
    factory: IGraphicsContextFactory<TCanvas>, 
    canvas: TCanvas
  ): Promise<void> {
    if (this.context) {
      throw new Error('Render engine already initialized');
    }

    if (!factory.isSupported()) {
      throw new Error('Graphics context not supported');
    }

    this.context = await factory.createContext(canvas);
    
    // 设置默认视口
    this.viewport.width = this.context.width;
    this.viewport.height = this.context.height;
  }

  start(): void {
    if (this.isRunningFlag || !this.context) {
      return;
    }

    this.isRunningFlag = true;
    this.lastFrameTime = performance.now();

    if (this.config.enableVSync) {
      this.startVSyncLoop();
    } else {
      this.startCustomLoop();
    }
  }

  stop(): void {
    this.isRunningFlag = false;

    if (this.animationId !== null) {
      if (this.config.enableVSync) {
        cancelAnimationFrame(this.animationId);
      } else {
        clearTimeout(this.animationId);
      }
      this.animationId = null;
    }
  }

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

    // 渲染所有层
    this.renderLayers();

    this.context.restore();

    // 更新统计信息
    const renderTime = performance.now() - startTime;
    this.updateStats(renderTime);
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  getContext(): IGraphicsContext | null {
    return this.context;
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  getViewport(): IViewport {
    return { ...this.viewport };
  }

  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    const layer = new RenderLayer(id, true, 1, zIndex);
    this.layers.set(id, layer);
    return layer;
  }

  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id);
  }

  removeLayer(id: string): void {
    this.layers.delete(id);
  }

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

  getStats(): IRenderStats {
    return { ...this.stats };
  }

  dispose(): void {
    this.stop();

    if (this.context) {
      this.context.dispose();
      this.context = null;
    }

    this.layers.clear();
  }

  // 私有方法
  private startVSyncLoop(): void {
    const loop = () => {
      if (!this.isRunningFlag) return;

      this.render();
      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private startCustomLoop(): void {
    const targetInterval = 1000 / (this.config.targetFPS || 60);

    const loop = () => {
      if (!this.isRunningFlag) return;

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

  private renderLayers(): void {
    if (!this.context) return;

    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    let objectsRendered = 0;

    for (const layer of sortedLayers) {
      this.context.save();
      this.context.setOpacity(layer.opacity);

      const renderables = layer.getRenderables();

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

  private updateStats(renderTime: number): void {
    this.stats.frameCount++;
    this.stats.renderTime = renderTime;

    // 计算FPS
    const currentTime = performance.now();
    this.frameTimeHistory.push(currentTime);

    // 保持最近1秒的帧时间记录
    while (this.frameTimeHistory.length > 0) {
      const firstFrameTime = this.frameTimeHistory[0];
      if (firstFrameTime !== undefined && currentTime - firstFrameTime > 1000) {
        this.frameTimeHistory.shift();
      } else {
        break;
      }
    }

    this.stats.fps = this.frameTimeHistory.length;
    this.lastFrameTime = currentTime;
  }
}