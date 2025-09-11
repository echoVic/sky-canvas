/**
 * Canvas SDK - 业务 API 类
 * 由 DI 容器创建，通过构造函数注入获取服务
 */

import { ICanvasManager, IEventBusService, ILogService } from './main';
import type { LogLevel } from './services';

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
   * 销毁 SDK
   */
  dispose(): void {
    this.logger.info('Canvas SDK disposed');
  }

  // === 便民方法 - 直接委托给 CanvasManager ===

  /**
   * 添加形状
   */
  addShape(shapeData: any): void {
    const manager = this.getCanvasManager();
    manager.addShape(shapeData);
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    const manager = this.getCanvasManager();
    manager.removeShape(id);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: any): void {
    const manager = this.getCanvasManager();
    manager.updateShape(id, updates);
  }

  /**
   * 获取形状
   */
  getShape(id: string): any | undefined {
    const manager = this.getCanvasManager();
    return manager.getShape?.(id);
  }

  /**
   * 获取所有形状
   */
  getShapes(): any[] {
    const manager = this.getCanvasManager();
    return manager.getShapes?.() || [];
  }

  /**
   * 选择形状
   */
  selectShape(id: string): void {
    const manager = this.getCanvasManager();
    manager.selectShape(id);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    const manager = this.getCanvasManager();
    manager.deselectShape(id);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    const manager = this.getCanvasManager();
    manager.clearSelection();
  }

  /**
   * 撤销
   */
  undo(): void {
    const manager = this.getCanvasManager();
    manager.undo();
  }

  /**
   * 重做
   */
  redo(): void {
    const manager = this.getCanvasManager();
    manager.redo();
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    const manager = this.getCanvasManager();
    return manager.getStats();
  }
}


/**
 * 默认导出
 */
export default CanvasSDK;