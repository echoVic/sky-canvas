/**
 * 渲染服务
 */

import { createDecorator } from '../../di';
import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService, type ILogService as ILogServiceInterface } from '../logging/logService';

/**
 * 渲染引擎配置
 */
export interface IRenderingConfig {
  renderEngine?: 'webgl' | 'canvas2d' | 'webgpu';
  targetFPS?: number;
  enableVSync?: boolean;
  enableCulling?: boolean;
}

/**
 * 可渲染对象接口
 */
export interface IRenderable {
  readonly id: string;
  readonly visible: boolean;
  render(context: unknown): void;
}

/**
 * 渲染引擎接口（本地定义，避免循环依赖）
 */
interface IRenderEngineInstance {
  initialize(factory: unknown, canvas: HTMLCanvasElement): Promise<void>;
  start(): void;
  stop(): void;
  render(): void;
  isRunning(): boolean;
  dispose(): void;
  createLayer(id: string, zIndex?: number): unknown;
  getLayer(id: string): unknown;
}

/**
 * 渲染图层接口
 */
interface IRenderLayer {
  addRenderable(renderable: IRenderable): void;
  removeRenderable(id: string): void;
  clearRenderables(): void;
}

/**
 * 渲染统计信息
 */
export interface RenderingStats {
  running: boolean;
  renderableCount: number;
  engineStats: Record<string, unknown>;
}

/**
 * 渲染服务接口
 */
export interface ICanvasRenderingService {
  initialize(canvas: HTMLCanvasElement, config: IRenderingConfig): Promise<void>;
  getRenderEngine(): IRenderEngineInstance | null;
  addRenderable(renderable: IRenderable): void;
  removeRenderable(id: string): void;
  render(): void;
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getStats(): RenderingStats;
  dispose(): void;
}

/**
 * 渲染服务标识符
 */
export const ICanvasRenderingService = createDecorator<ICanvasRenderingService>('CanvasRenderingService');

/**
 * 渲染服务实现
 */
export class CanvasRenderingService implements ICanvasRenderingService {
  private renderEngine: IRenderEngineInstance | null = null;
  private running = false;
  private renderables = new Map<string, IRenderable>();
  private defaultLayer: IRenderLayer | null = null;
  private static readonly DEFAULT_LAYER_ID = 'default-layer';

  constructor(
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logger: ILogServiceInterface
  ) {}

  async initialize(canvas: HTMLCanvasElement, config: IRenderingConfig): Promise<void> {
    console.log('[RenderingService] Initializing with config:', config);
    this.logger.info('Initializing canvas rendering service', { config });

    // 如果已经初始化过，先停止并清理旧的引擎
    if (this.renderEngine) {
      console.log('[RenderingService] Stopping existing render engine before re-initialization');
      this.renderEngine.stop();
      this.renderEngine.dispose();
      this.renderEngine = null;
      this.defaultLayer = null;
      this.renderables.clear();
      this.running = false;
    }

    try {
      const { RenderEngine, WebGLContextFactory, Canvas2DContextFactory, WebGPUContextFactory } = await import('@sky-canvas/render-engine');

      // 根据配置选择对应的图形上下文工厂
      let factory;
      const renderType = config.renderEngine || 'webgl';
      console.log('[RenderingService] Using render type:', renderType);

      switch (renderType) {
        case 'webgl':
          factory = new WebGLContextFactory();
          break;
        case 'canvas2d':
          factory = new Canvas2DContextFactory();
          break;
        case 'webgpu':
          factory = new WebGPUContextFactory();
          break;
        default:
          factory = new WebGLContextFactory();
      }

      const engine = new RenderEngine(config) as unknown as IRenderEngineInstance;
      await engine.initialize(factory, canvas);
      this.renderEngine = engine;

      // 创建默认渲染图层
      this.defaultLayer = engine.createLayer(CanvasRenderingService.DEFAULT_LAYER_ID, 0) as IRenderLayer;
      this.logger.debug('Default render layer created');

      // 监听形状变化事件
      this.eventBus.on('canvas:shapeAdded', (data: { entity: unknown; view: IRenderable }) => {
        this.logger.debug('Shape added, adding to render layer');
        if (data.view) {
          this.addRenderable(data.view);
        }
      });

      this.eventBus.on('canvas:shapeUpdated', () => {
        this.logger.debug('Shape updated, triggering render');
        // 形状更新会自动反映在渲染中，因为view引用的是同一个对象
      });

      this.eventBus.on('canvas:shapeRemoved', (data: { id: string }) => {
        this.logger.debug('Shape removed, removing from render layer');
        if (data.id) {
          this.removeRenderable(data.id);
        }
      });

      this.eventBus.on('canvas:cleared', () => {
        this.logger.debug('Canvas cleared, triggering render');
        this.render();
      });

      this.eventBus.emit('rendering:initialized', { canvas, config });
      this.logger.info('Canvas rendering service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize rendering service', error);
      throw error;
    }
  }

  getRenderEngine(): IRenderEngineInstance | null {
    return this.renderEngine;
  }

  addRenderable(renderable: IRenderable): void {
    console.log('[RenderingService] addRenderable called:', renderable?.id, 'defaultLayer:', !!this.defaultLayer);
    if (renderable && renderable.id) {
      this.renderables.set(renderable.id, renderable);
      // 同时添加到默认渲染图层
      if (this.defaultLayer) {
        this.defaultLayer.addRenderable(renderable);
        console.log('[RenderingService] Renderable added to default layer:', renderable.id);
      } else {
        console.warn('[RenderingService] No default layer available!');
      }
      this.logger.debug('Renderable added', renderable.id);
    }
  }

  removeRenderable(id: string): void {
    if (this.renderables.has(id)) {
      this.renderables.delete(id);
      // 同时从默认渲染图层移除
      if (this.defaultLayer) {
        this.defaultLayer.removeRenderable(id);
      }
      this.logger.debug('Renderable removed', id);
    }
  }

  render(): void {
    if (this.renderEngine) {
      this.renderEngine.render();
    }
  }

  start(): void {
    console.log('[RenderingService] start() called, running:', this.running, 'engine:', !!this.renderEngine);
    if (!this.running) {
      this.running = true;
      this.renderEngine?.start();
      this.eventBus.emit('rendering:started', {});
      this.logger.debug('Rendering started');
      console.log('[RenderingService] Rendering started successfully');
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this.renderEngine?.stop();
      this.eventBus.emit('rendering:stopped', {});
      this.logger.debug('Rendering stopped');
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats(): RenderingStats {
    return {
      running: this.running,
      renderableCount: this.renderables.size,
      engineStats: {}
    };
  }

  dispose(): void {
    this.stop();
    this.renderables.clear();
    this.renderEngine?.dispose();
    this.logger.info('Canvas rendering service disposed');
  }
}