/**
 * 渲染服务
 */

import { createDecorator } from '../../di';
import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService, type ILogService as ILogServiceInterface } from '../logging/logService';

/**
 * 渲染服务接口
 */
export interface ICanvasRenderingService {
  initialize(canvas: HTMLCanvasElement, config: any): Promise<void>;
  getRenderEngine(): any;
  addObject(object: any): void;
  removeObject(id: string): void;
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
export const ICanvasRenderingService = createDecorator<ICanvasRenderingService>('CanvasRenderingService');

/**
 * 渲染服务实现
 */
export class CanvasRenderingService implements ICanvasRenderingService {
  private renderEngine: any;
  private running = false;
  private objects = new Map<string, any>();

  constructor(
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logger: ILogServiceInterface
  ) {}

  async initialize(canvas: HTMLCanvasElement, config: any): Promise<void> {
    this.logger.info('Initializing canvas rendering service', { config });

    try {
      const { RenderEngine } = await import('@sky-canvas/render-engine');

      // 创建渲染引擎配置
      const engineConfig = {
        renderer: config.renderEngine || 'webgl',
        debug: config.debug || false,
        enableBatching: true,
        targetFPS: config.targetFPS || 60,
        antialias: config.antialias !== false,
        alpha: config.alpha !== false
      };

      // 创建渲染引擎实例
      this.renderEngine = new RenderEngine(canvas, engineConfig);

      // 显式初始化渲染引擎
      await this.renderEngine.initialize();

      this.logger.info('RenderEngine created and initialized:', {
        renderer: this.renderEngine.getRendererType(),
        capabilities: this.renderEngine.getCapabilities()
      });

      // 监听形状变化事件并触发重绘
      this.eventBus.on('canvas:shapeAdded', () => {
        this.logger.debug('Shape added, triggering render');
        this.render();
      });

      this.eventBus.on('canvas:shapeUpdated', () => {
        this.logger.debug('Shape updated, triggering render');
        this.render();
      });

      this.eventBus.on('canvas:shapeRemoved', () => {
        this.logger.debug('Shape removed, triggering render');
        this.render();
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

  getRenderEngine(): any {
    return this.renderEngine;
  }

  addObject(object: any): void {
    this.logger.info('=== addObject called ===');
    this.logger.info('Object to add:', object);
    this.logger.info('Object type:', typeof object);
    this.logger.info('Object constructor:', object?.constructor?.name);
    this.logger.info('Object id:', object?.id);
    this.logger.info('RenderEngine available:', !!this.renderEngine);

    if (!this.renderEngine) {
      this.logger.error('RenderEngine is not initialized!');
      return;
    }

    if (!this.renderEngine.addObject) {
      this.logger.error('RenderEngine.addObject method is not available!', {
        renderEngine: this.renderEngine,
        methods: Object.getOwnPropertyNames(this.renderEngine)
      });
      return;
    }

    if (object && object.id) {
      this.logger.info('Adding object to local objects map:', object.id);
      this.objects.set(object.id, object);

      this.logger.info('Calling renderEngine.addObject...');
      this.renderEngine.addObject(object);

      this.logger.info('After adding - RenderEngine objects count:', this.renderEngine.getObjects?.()?.length || 0);
      this.logger.info('Local objects count:', this.objects.size);

      // 手动触发一次渲染
      this.logger.info('Manually triggering render...');
      this.render();

      this.logger.info('=== addObject completed ===');
    } else {
      this.logger.warn('Invalid object - missing id or object is null:', { object, hasId: !!object?.id });
    }
  }

  removeObject(id: string): void {
    if (this.objects.has(id)) {
      this.objects.delete(id);
      this.renderEngine?.removeObject(id);
      this.logger.debug('Object removed', id);
    }
  }

  render(): void {
    console.log(`[RenderingService] render() called, renderEngine available: ${!!this.renderEngine}`);
    console.log(`[RenderingService] renderEngine type:`, this.renderEngine?.constructor?.name);
    console.log(`[RenderingService] renderEngine.render exists:`, typeof this.renderEngine?.render);
    console.log(`[RenderingService] renderEngine methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(this.renderEngine)).filter(name => typeof this.renderEngine[name] === 'function'));
    if (this.renderEngine) {
      console.log(`[RenderingService] Calling renderEngine.render()`);
      try {
        // 在调用前检查 render 方法的源码
        console.log(`[RenderingService] render method source:`, this.renderEngine.render.toString().substring(0, 200));
        this.renderEngine.render();
        console.log(`[RenderingService] renderEngine.render() completed`);
      } catch (error) {
        console.error(`[RenderingService] Error calling renderEngine.render():`, error);
      }
    } else {
      console.warn(`[RenderingService] No render engine available!`);
    }
  }

  start(): void {
    this.logger.info('start() called, current running state:', this.running);
    this.logger.info('renderEngine available:', !!this.renderEngine);

    if (!this.running) {
      this.running = true;

      if (this.renderEngine) {
        this.logger.info('Starting render engine...');
        this.logger.info('RenderEngine isInitialized:', (this.renderEngine as any).isInitialized);
        this.logger.info('RenderEngine config:', this.renderEngine.getConfig?.());

        this.renderEngine.start();

        this.logger.info('RenderEngine isRunning after start:', this.renderEngine.isRunning?.());
        this.logger.info('RenderEngine objects count:', this.renderEngine.getObjects?.()?.length || 0);
      } else {
        this.logger.error('RenderEngine is null, cannot start!');
      }

      this.eventBus.emit('rendering:started', {});
      this.logger.info('Rendering started successfully');
    } else {
      this.logger.info('Rendering already running, skipping start');
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
      objectCount: this.objects.size,
      engineStats: this.renderEngine?.getStats() || {}
    };
  }

  dispose(): void {
    this.stop();
    this.objects.clear();
    this.renderEngine?.dispose();
    this.logger.info('Canvas rendering service disposed');
  }
}