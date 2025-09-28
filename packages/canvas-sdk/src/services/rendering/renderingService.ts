/**
 * 渲染服务
 */

import { IRenderable, RenderEngine } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService, type ILogService as ILogServiceInterface } from '../logging/logService';

/**
 * 渲染服务配置接口
 */
export interface IRenderingServiceConfig {
  /** 渲染引擎类型 */
  renderEngine?: 'webgl' | 'canvas2d' | 'webgpu';
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 目标帧率 */
  targetFPS?: number;
  /** 是否启用抗锯齿 */
  antialias?: boolean;
  /** 是否启用透明度 */
  alpha?: boolean;
  /** 是否启用调试日志 */
  enableDebugLogs?: boolean;
}

/**
 * 渲染统计信息接口
 */
export interface IRenderingStats {
  /** 渲染器类型 */
  rendererType: string;
  /** 对象数量 */
  graphicCount: number;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 当前帧率 */
  fps?: number;
  /** 渲染器能力信息 */
  capabilities?: Record<string, unknown>;
}

/**
 * 渲染服务接口
 */
export interface ICanvasRenderingService {
  initialize(container: HTMLElement, config: IRenderingServiceConfig): Promise<void>;
  getRenderEngine(): RenderEngine | null;
  addGraphic(graphic: IRenderable): void;
  removeGraphic(id: string): void;
  render(): void;
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getStats(): IRenderingStats;
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
  private renderEngine: RenderEngine | null = null;
  private running = false;
  private graphics = new Map<string, IRenderable>();

  constructor(
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logger: ILogServiceInterface
  ) {}

  async initialize(container: HTMLElement, config: IRenderingServiceConfig): Promise<void> {
    try {
      const { RenderEngine } = await import('@sky-canvas/render-engine');

      const engineConfig = {
        renderer: config.renderEngine || 'webgl',
        debug: config.debug || false,
        enableBatching: true,
        targetFPS: config.targetFPS || 60,
        antialias: config.antialias !== false,
        alpha: config.alpha !== false,
        enableDebugLogs: config.enableDebugLogs || false
      };

      this.renderEngine = new RenderEngine(container, engineConfig);
      await this.renderEngine.initialize();

      // 监听形状变化事件并触发重绘
      this.eventBus.on('canvas:shapeAdded', () => this.render());
      this.eventBus.on('canvas:shapeUpdated', () => this.render());
      this.eventBus.on('canvas:shapeRemoved', () => this.render());
      this.eventBus.on('canvas:cleared', () => this.render());

      this.eventBus.emit('rendering:initialized', { container, config });
      this.logger.info('Rendering service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize rendering service', error);
      throw error;
    }
  }

  getRenderEngine(): RenderEngine | null {
    return this.renderEngine;
  }

  addGraphic(graphic: IRenderable): void {
    if (!this.renderEngine) {
      this.logger.error('RenderEngine is not initialized');
      return;
    }

    if (!graphic?.id) {
      this.logger.warn('Cannot add graphic without id');
      return;
    }

    this.graphics.set(graphic.id, graphic);
    this.renderEngine.addGraphic(graphic);
    this.logger.debug(`Added graphic ${graphic.id} (total: ${this.graphics.size})`);

    // 手动触发一次渲染
    this.render();
  }

  removeGraphic(id: string): void {
    if (this.graphics.has(id)) {
      this.graphics.delete(id);
      this.renderEngine?.removeGraphic(id);
    }
  }

  render(): void {
    if (!this.renderEngine) {
      this.logger.warn('No render engine available');
      return;
    }

    try {
      this.renderEngine.render();
    } catch (error) {
      this.logger.error('Error during render:', error);
    }
  }

  start(): void {
    if (this.running) {
      this.logger.debug('Rendering already running');
      return;
    }

    if (!this.renderEngine) {
      this.logger.error('RenderEngine not initialized, cannot start');
      return;
    }

    this.running = true;
    this.renderEngine.start();
    this.eventBus.emit('rendering:started', {});
    this.logger.info('Rendering started');
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this.renderEngine?.stop();
      this.eventBus.emit('rendering:stopped', {});
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats(): IRenderingStats {
    const capabilities = this.renderEngine?.getCapabilities();
    return {
      rendererType: this.renderEngine?.getRendererType() || 'unknown',
      graphicCount: this.graphics.size,
      isRunning: this.running,
      capabilities: capabilities ? { ...capabilities } : undefined
    };
  }

  dispose(): void {
    this.stop();
    this.graphics.clear();
    this.renderEngine?.dispose();
  }
}