/**
 * 渲染服务
 */

import { createDecorator } from '../../di';
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
  readonly _serviceBrand: undefined;
}

/**
 * 渲染服务标识符
 */
export const ICanvasRenderingService = createDecorator<ICanvasRenderingService>('CanvasRenderingService');

/**
 * 渲染服务实现
 */
export class CanvasRenderingService implements ICanvasRenderingService {
  readonly _serviceBrand: undefined;
  private renderEngine: IRenderEngineInstance | null = null;
  private running = false;
  private renderables = new Map<string, IRenderable>();
  private defaultLayer: IRenderLayer | null = null;
  private static readonly DEFAULT_LAYER_ID = 'default-layer';

  constructor(
    @ILogService private logger: ILogServiceInterface
  ) {}

  async initialize(canvas: HTMLCanvasElement, config: IRenderingConfig): Promise<void> {
    this.logger.info('Initializing canvas rendering service', { config });

    if (this.renderEngine) {
      this.renderEngine.stop();
      this.renderEngine.dispose();
      this.renderEngine = null;
      this.defaultLayer = null;
      this.renderables.clear();
      this.running = false;
    }

    try {
      const { RenderEngine, WebGLContextFactory, Canvas2DContextFactory, WebGPUContextFactory } = await import('@sky-canvas/render-engine');

      let factory;
      const renderType = config.renderEngine || 'webgl';

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

      this.defaultLayer = engine.createLayer(CanvasRenderingService.DEFAULT_LAYER_ID, 0) as IRenderLayer;
      this.logger.debug('Default render layer created');

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
    if (renderable && renderable.id) {
      this.renderables.set(renderable.id, renderable);
      if (this.defaultLayer) {
        this.defaultLayer.addRenderable(renderable);
      }
      this.logger.debug('Renderable added', renderable.id);
    }
  }

  removeRenderable(id: string): void {
    if (this.renderables.has(id)) {
      this.renderables.delete(id);
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
    if (!this.running) {
      this.running = true;
      this.renderEngine?.start();
      this.logger.debug('Rendering started');
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this.renderEngine?.stop();
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
