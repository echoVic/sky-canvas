/**
 * Canvas SDK - 业务 API 类
 * 由 DI 容器创建，通过构造函数注入获取服务
 */

import { ICanvasManager } from './managers/CanvasManager';
import { IToolManager } from './managers/ToolManager';
import type { LogLevel } from './services';
import { IEventBusService, ILogService } from './services';

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
}

/**
 * Canvas SDK 主类 - 业务 API
 * 通过 DI 容器创建，所有依赖通过构造函数注入
 */
export class CanvasSDK {
  constructor(
    @ICanvasManager private canvasManager: any,
    @IToolManager private toolManager: any,
    @IEventBusService private eventBus: any,
    @ILogService private logger: any
  ) {
    this.logger.info('Canvas SDK instance created via DI container');
  }

  /**
   * 获取 Canvas Manager - 主要 API 入口
   */
  getCanvasManager(): any {
    return this.canvasManager;
  }

  /**
   * 获取 Tool Manager - 工具管理
   */
  getToolManager(): any {
    return this.toolManager;
  }

  /**
   * 销毁 SDK
   */
  dispose(): void {
    this.logger.info('Canvas SDK disposed');
  }

  /**
   * 事件监听
   */
  on(eventName: string, callback: Function): void {
    this.eventBus.on(eventName, callback);
  }

  /**
   * 移除事件监听
   */
  off(eventName: string, callback?: Function): void {
    this.eventBus.off(eventName, callback);
  }
}


/**
 * 默认导出
 */
export default CanvasSDK;