/**
 * 渲染服务
 */

import { createServiceIdentifier, injectable, inject } from '../../di/ServiceIdentifier';
import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService, type ILogService as ILogServiceInterface } from '../logging/logService';

/**
 * 渲染服务接口
 */
export interface ICanvasRenderingService {
  initialize(canvas: HTMLCanvasElement, config: any): Promise<void>;
  getRenderEngine(): any;
  addRenderable(renderable: any): void;
  removeRenderable(id: string): void;
  render(): void;
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getStats(): any;
  dispose(): void;
}

/**
 * 渲染服务标识符
 */
export const ICanvasRenderingService = createServiceIdentifier<ICanvasRenderingService>('CanvasRenderingService');

/**
 * 渲染服务实现
 */
@injectable
export class CanvasRenderingService implements ICanvasRenderingService {
  private renderEngine: any;
  private running = false;
  private renderables = new Map<string, any>();

  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService,
    @inject(ILogService) private logger: ILogServiceInterface
  ) {}

  async initialize(canvas: HTMLCanvasElement, config: any): Promise<void> {
    this.logger.info('Initializing canvas rendering service', { config });
    
    // TODO: 根据配置创建对应的渲染引擎
    try {
      const { RenderEngine } = require('@sky-canvas/render-engine');
      this.renderEngine = new RenderEngine(canvas, config);
      await this.renderEngine.initialize();
      
      this.eventBus.emit('rendering:initialized', { canvas, config });
      this.logger.info('Canvas rendering service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize rendering service', error);
      throw error;
    }
  }

  getRenderEngine(): any {
    return this.renderEngine;
  }

  addRenderable(renderable: any): void {
    if (renderable && renderable.id) {
      this.renderables.set(renderable.id, renderable);
      this.renderEngine?.addRenderable(renderable);
      this.logger.debug('Renderable added', renderable.id);
    }
  }

  removeRenderable(id: string): void {
    if (this.renderables.has(id)) {
      this.renderables.delete(id);
      this.renderEngine?.removeRenderable(id);
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
      this.eventBus.emit('rendering:started', {});
      this.logger.debug('Rendering started');
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

  getStats(): any {
    return {
      running: this.running,
      renderableCount: this.renderables.size,
      engineStats: this.renderEngine?.getStats() || {}
    };
  }

  dispose(): void {
    this.stop();
    this.renderables.clear();
    this.renderEngine?.dispose();
    this.logger.info('Canvas rendering service disposed');
  }
}