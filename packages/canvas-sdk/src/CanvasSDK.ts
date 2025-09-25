/**
 * Canvas SDK - 业务 API 类
 * 由 DI 容器创建，通过构造函数注入获取服务
 */

import { ActionProcessor } from './actions/processor';
import { Action, ActionResult } from './actions/types';
import { createDecorator } from './di/instantiation';
import { ActionErrorEventData, HistoryChangedEventData, SDKChangeEvent, SDKEventListener, SelectionChangedEventData, ShapesChangedEventData, SystemErrorEventData } from './events/types';
import { ICanvasManager } from './managers/CanvasManager';
import { IToolManager } from './managers/ToolManager';
import { CanvasModel, ChangeDescription } from './models/CanvasModel';
import { PluginManagerImpl } from './plugins/PluginManager';
import { Plugin, PluginConfig, PluginManager } from './plugins/types';
import type { LogLevel } from './services';
import { IEventBusService, ILogService } from './services';
import { HistoryService, IHistoryService } from './services/history/historyService';

/**
 * Canvas SDK 服务标识符
 */
export const ICanvasSDK = createDecorator<ICanvasSDK>('canvasSDK');

/**
 * SDK 配置选项
 */
export interface ICanvasSDKConfig {
  renderEngine?: 'webgl' | 'canvas2d' | 'webgpu';
  enableInteraction?: boolean;
  enableHistory?: boolean;
  logLevel?: LogLevel;
  viewport?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zoom?: number;
  };
  errorHandling?: {
    maxRetries?: number;
    retryableErrors?: string[];
    backoffMs?: number;
    enableErrorEvents?: boolean;
  };
  plugins?: PluginConfig;
}

/**
 * Canvas SDK 接口
 */
export interface ICanvasSDK {
  dispatch(action: Action): Promise<ActionResult>;
  subscribe(listener: SDKEventListener): () => void;
  getShapeData(): any[];
  getShapeDataById(shapeId: string): any | null;
  getSelection(): string[];
  getHistoryStats(): any;
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  clearHistory(): void;
  registerPlugin(plugin: Plugin): Promise<void>;
  unregisterPlugin(pluginId: string): Promise<void>;
  activatePlugin(pluginId: string): Promise<void>;
  deactivatePlugin(pluginId: string): Promise<void>;
  getPlugins(): Plugin[];
  getActivePlugins(): Plugin[];
  isPluginActive(pluginId: string): boolean;
  getPluginManager(): PluginManager;
  dispose(): void;
}

/**
 * Canvas SDK 主类 - 业务 API
 * 通过 DI 容器创建，所有依赖通过构造函数注入
 */
export class CanvasSDK implements ICanvasSDK {
  private actionProcessor: ActionProcessor;
  private model: CanvasModel;
  private historyService: IHistoryService;
  private pluginManager: PluginManager;
  private sdkListeners: SDKEventListener[] = [];
  private modelUnsubscribe?: () => void;
  private historyUnsubscribe?: () => void;
  private config: ICanvasSDKConfig;

  constructor(
    @ICanvasManager private canvasManager: any,
    @IToolManager private toolManager: any,
    @IEventBusService private eventBus: any,
    @ILogService private logger: any,
    config: ICanvasSDKConfig = {}
  ) {
    this.config = config;
    this.logger.info('Canvas SDK instance created via DI container');

    // 初始化服务
    this.model = new CanvasModel();
    this.historyService = new HistoryService(this.eventBus, this.logger);

    // 配置错误处理
    const errorRetryConfig = this.config?.errorHandling ? {
      maxRetries: this.config.errorHandling.maxRetries || 3,
      retryableErrors: this.config.errorHandling.retryableErrors || ['NetworkError', 'TimeoutError', 'TemporaryError'],
      backoffMs: this.config.errorHandling.backoffMs || 1000
    } : undefined;

    this.actionProcessor = new ActionProcessor(this.model, {
      historyService: this.historyService,
      enableLogging: true,
      errorRetry: errorRetryConfig
    });

    // 初始化插件管理器
    const dispatchForPlugin = async (action: Action): Promise<void> => {
      await this.dispatch(action);
    };
    this.pluginManager = new PluginManagerImpl(
      this.model,
      dispatchForPlugin,
      this.config.plugins || {}
    );

    // 订阅 Model 事件并转换为 SDK 事件
    this.setupModelEventMapping();
    // 订阅历史服务事件
    this.setupHistoryEventMapping();
    // 订阅Action处理器错误事件
    this.setupActionProcessorEventMapping(this.config);
  }

  /**
   * 核心 API：分发 Action
   */
  async dispatch(action: Action): Promise<ActionResult> {
    try {
      const result = await this.actionProcessor.process(action);

      if (this.logger) {
        this.logger.debug(`Action dispatched: ${action.type}`, { action, result });
      }

      return {
        success: result.success,
        timestamp: Date.now(),
        actionId: result.actionId,
        error: result.error
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (this.logger) {
        this.logger.error(`Failed to dispatch action: ${action.type}`, error);
      }

      return {
        success: false,
        timestamp: Date.now(),
        actionId: action.metadata?.id,
        error: errorMsg
      };
    }
  }

  /**
   * 订阅接口 - 完全封装 Model
   */
  subscribe(listener: SDKEventListener): () => void {
    this.sdkListeners.push(listener);
    return () => {
      const index = this.sdkListeners.indexOf(listener);
      if (index > -1) {
        this.sdkListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取序列化的形状数据（推荐）
   * 返回前端可用的数据结构，避免直接依赖 Shape 类
   */
  getShapeData() {
    const shapes = this.model.getShapes();
    return shapes.map(shape => this.serializeShape(shape));
  }

  /**
   * 获取指定形状的数据
   */
  getShapeDataById(shapeId: string) {
    const shape = this.model.getShape(shapeId);
    return shape ? this.serializeShape(shape) : null;
  }

  /**
   * 序列化形状为前端可用的数据格式
   */
  private serializeShape(shape: any): any {
    const transform = shape.transform;
    const position = transform.position;

    const baseData = {
      id: shape.id,
      type: this.getShapeType(shape),
      x: position.x,
      y: position.y,
      visible: shape.visible,
      zIndex: shape.zIndex,
      style: { ...shape.style() }
    };

    // 根据形状类型添加特定属性
    switch (baseData.type) {
      case 'rectangle':
        return {
          ...baseData,
          width: (shape as any).width || 100,
          height: (shape as any).height || 50
        };
      case 'circle':
        return {
          ...baseData,
          radius: (shape as any).radius || 25
        };
      case 'text':
        return {
          ...baseData,
          text: (shape as any).text || '',
          fontSize: (shape as any).fontSize || 14,
          fontFamily: (shape as any).fontFamily || 'Arial'
        };
      default:
        return baseData;
    }
  }

  /**
   * 获取形状类型名称
   */
  private getShapeType(shape: any): string {
    return shape.constructor.name.toLowerCase();
  }

  /**
   * 获取当前选择（只读）
   */
  getSelection(): string[] {
    return this.model.getSelection();
  }

  /**
   * 获取历史状态（只读）
   */
  getHistoryStats() {
    return this.actionProcessor.getHistoryStats();
  }

  /**
   * 撤销操作
   */
  async undo(): Promise<boolean> {
    return this.actionProcessor.undo();
  }

  /**
   * 重做操作
   */
  async redo(): Promise<boolean> {
    return this.actionProcessor.redo();
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.actionProcessor.clearHistory();
  }

  /**
   * 插件管理 API
   */

  /**
   * 注册插件
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    await this.pluginManager.register(plugin);
  }

  /**
   * 取消注册插件
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    await this.pluginManager.unregister(pluginId);
  }

  /**
   * 激活插件
   */
  async activatePlugin(pluginId: string): Promise<void> {
    await this.pluginManager.activate(pluginId);
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    await this.pluginManager.deactivate(pluginId);
  }

  /**
   * 获取所有插件
   */
  getPlugins(): Plugin[] {
    return this.pluginManager.getPlugins();
  }

  /**
   * 获取激活的插件
   */
  getActivePlugins(): Plugin[] {
    return this.pluginManager.getActivePlugins();
  }

  /**
   * 检查插件是否激活
   */
  isPluginActive(pluginId: string): boolean {
    return this.pluginManager.isActive(pluginId);
  }

  /**
   * 获取插件管理器（用于高级操作）
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }


  /**
   * 销毁 SDK
   */
  dispose(): void {
    // 清理 Model 事件订阅
    if (this.modelUnsubscribe) {
      this.modelUnsubscribe();
    }

    // 清理历史服务事件订阅
    if (this.historyUnsubscribe) {
      this.historyUnsubscribe();
    }

    // 清理 SDK 监听器
    this.sdkListeners = [];

    // 清理历史记录
    this.actionProcessor.clearHistory();

    if (this.logger) {
      this.logger.info('Canvas SDK disposed');
    }
  }

  /**
   * 设置 Model 事件到 SDK 事件的映射
   */
  private setupModelEventMapping(): void {
    this.modelUnsubscribe = this.model.subscribe((change: ChangeDescription) => {
      let sdkEvent: SDKChangeEvent;

      switch (change.type) {
        case 'shape-added':
        case 'shape-removed':
        case 'shape-updated':
          sdkEvent = {
            type: 'shapes-changed',
            data: this.mapToShapesChangedData(change),
            timestamp: change.timestamp
          };
          break;

        case 'selection-changed':
          sdkEvent = {
            type: 'selection-changed',
            data: {
              current: this.model.getSelection()
            } as SelectionChangedEventData,
            timestamp: change.timestamp
          };
          break;

        default:
          return; // 忽略未知事件类型
      }

      this.emitSDKEvent(sdkEvent);
    });
  }

  /**
   * 设置历史服务事件映射
   */
  private setupHistoryEventMapping(): void {
    // 监听历史服务事件，转换为 SDK 事件
    this.eventBus.on('history:executed', (data: any) => {
      this.emitSDKEvent({
        type: 'history-changed',
        data: {
          canUndo: this.historyService.canUndo(),
          canRedo: this.historyService.canRedo(),
          historySize: this.historyService.getHistory().length
        } as HistoryChangedEventData,
        timestamp: Date.now()
      });
    });

    this.eventBus.on('history:undone', (data: any) => {
      this.emitSDKEvent({
        type: 'history-changed',
        data: {
          canUndo: this.historyService.canUndo(),
          canRedo: this.historyService.canRedo(),
          historySize: this.historyService.getHistory().length
        } as HistoryChangedEventData,
        timestamp: Date.now()
      });
    });

    this.eventBus.on('history:redone', (data: any) => {
      this.emitSDKEvent({
        type: 'history-changed',
        data: {
          canUndo: this.historyService.canUndo(),
          canRedo: this.historyService.canRedo(),
          historySize: this.historyService.getHistory().length
        } as HistoryChangedEventData,
        timestamp: Date.now()
      });
    });

    this.eventBus.on('history:cleared', (data: any) => {
      this.emitSDKEvent({
        type: 'history-changed',
        data: {
          canUndo: false,
          canRedo: false,
          historySize: 0
        } as HistoryChangedEventData,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 映射 Model 变化为形状变化数据
   */
  private mapToShapesChangedData(change: ChangeDescription): ShapesChangedEventData {
    const data: ShapesChangedEventData = {};

    switch (change.type) {
      case 'shape-added':
        data.added = [change.shapeId!];
        break;
      case 'shape-removed':
        data.removed = [change.shapeId!];
        break;
      case 'shape-updated':
        data.updated = [change.shapeId!];
        break;
    }

    return data;
  }

  /**
   * 设置ActionProcessor事件映射
   */
  private setupActionProcessorEventMapping(config: ICanvasSDKConfig = {}): void {
    const enableErrorEvents = config.errorHandling?.enableErrorEvents !== false;

    if (enableErrorEvents) {
      // 监听Action错误事件
      this.actionProcessor.on('action-error', (action, error, retryCount) => {
        this.emitSDKEvent({
          type: 'action-error',
          data: {
            actionType: action.type,
            actionId: action.metadata?.id,
            error,
            payload: action.payload,
            retryCount,
            canRetry: retryCount < (config.errorHandling?.maxRetries || 3)
          } as ActionErrorEventData,
          timestamp: Date.now(),
          error
        });
      });

      // 监听Action重试事件
      this.actionProcessor.on('action-retry', (action, retryCount) => {
        if (this.logger) {
          this.logger.info(`Action retry: ${action.type} (attempt ${retryCount})`);
        }
      });

      // 监听命令失败事件
      this.actionProcessor.on('command-failed', (command, error) => {
        this.emitSDKEvent({
          type: 'system-error',
          data: {
            component: 'ActionProcessor',
            error,
            context: {
              commandType: command.constructor.name
            },
            severity: 'medium'
          } as SystemErrorEventData,
          timestamp: Date.now(),
          error
        });
      });
    }
  }

  /**
   * 发出 SDK 事件给所有监听器
   */
  private emitSDKEvent(event: SDKChangeEvent): void {
    this.sdkListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        if (this.logger) {
          this.logger.error('Error in SDK event listener:', error);
        }

        // 发出系统错误事件（避免递归）
        if (event.type !== 'system-error') {
          const systemErrorEvent: SDKChangeEvent = {
            type: 'system-error',
            data: {
              component: 'SDKEventSystem',
              error: error as Error,
              context: { originalEvent: event },
              severity: 'high'
            } as SystemErrorEventData,
            timestamp: Date.now(),
            error: error as Error
          };

          // 直接调用其他监听器，跳过出错的监听器
          this.sdkListeners.forEach(otherListener => {
            if (otherListener !== listener) {
              try {
                otherListener(systemErrorEvent);
              } catch (e) {
                // 防止错误传播，静默处理
                console.error('Critical error in SDK event system:', e);
              }
            }
          });
        }
      }
    });
  }

}


/**
 * 默认导出
 */
export default CanvasSDK;