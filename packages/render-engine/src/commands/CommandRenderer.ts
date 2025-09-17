/**
 * 命令模式渲染器
 * 集成命令队列到渲染引擎中
 */
import { IRect, IGraphicsContext } from '../core/interface/IGraphicsContext';
import { IViewport } from '../core/types';
import { IRenderCommand } from './IRenderCommand';
import { IRenderQueue, RenderQueue, IRenderQueueConfig } from './RenderQueue';

/**
 * 命令渲染器接口
 */
export interface ICommandRenderer {
  /** 渲染队列 */
  readonly queue: IRenderQueue;
  
  /** 是否启用 */
  enabled: boolean;
  
  /**
   * 添加渲染命令
   * @param command 渲染命令
   */
  submit(command: IRenderCommand): void;
  
  /**
   * 批量添加渲染命令
   * @param commands 渲染命令数组
   */
  submitBatch(commands: IRenderCommand[]): void;
  
  /**
   * 设置视口用于剔除
   * @param viewport 视口
   */
  setViewport(viewport: IViewport): void;
  
  /**
   * 渲染所有命令
   * @param context 图形上下文
   */
  render(context: IGraphicsContext): void;
  
  /**
   * 清空渲染队列
   */
  clear(): void;
  
  /**
   * 获取渲染统计
   */
  getStats(): any;
  
  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<IRenderQueueConfig>): void;
}

/**
 * 命令渲染器实现
 */
export class CommandRenderer implements ICommandRenderer {
  readonly queue: IRenderQueue;
  enabled: boolean = true;
  
  constructor(config?: Partial<IRenderQueueConfig>) {
    this.queue = new RenderQueue(config);
  }
  
  submit(command: IRenderCommand): void {
    if (!this.enabled) return;
    this.queue.addCommand(command);
  }
  
  submitBatch(commands: IRenderCommand[]): void {
    if (!this.enabled) return;
    for (const command of commands) {
      this.queue.addCommand(command);
    }
  }
  
  setViewport(viewport: IViewport): void {
    const rect: IRect = {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height
    };
    this.queue.setViewport(rect);
  }
  
  render(context: IGraphicsContext): void {
    if (!this.enabled) return;
    
    try {
      this.queue.flush(context);
    } catch (error) {
      console.error('CommandRenderer: Failed to render commands', error);
    } finally {
      this.queue.clear();
    }
  }
  
  clear(): void {
    this.queue.clear();
  }
  
  getStats(): any {
    return {
      enabled: this.enabled,
      queueStats: this.queue.getStats(),
      config: this.queue.config
    };
  }
  
  updateConfig(config: Partial<IRenderQueueConfig>): void {
    Object.assign(this.queue.config, config);
  }
}

/**
 * 渲染引擎命令扩展
 * 为现有渲染引擎添加命令模式支持
 */
export interface IRenderEngineWithCommands {
  /** 命令渲染器 */
  readonly commandRenderer: ICommandRenderer;

  /**
   * 启用/禁用命令模式渲染
   * @param enabled 是否启用
   */
  setCommandModeEnabled(enabled: boolean): void;

  /**
   * 提交渲染命令
   * @param command 渲染命令
   */
  submitCommand(command: IRenderCommand): void;

  /**
   * 批量提交渲染命令
   * @param commands 渲染命令数组
   */
  submitCommands(commands: IRenderCommand[]): void;
}

/**
 * 命令渲染器工厂
 */
export class CommandRendererFactory {
  private static defaultConfig: IRenderQueueConfig = {
    enableBatching: true,
    enableCulling: true,
    enableDepthSorting: true,
    maxBatches: 100,
    cullMargin: 50
  };
  
  /**
   * 创建命令渲染器
   * @param config 配置选项
   * @returns 命令渲染器实例
   */
  static create(config?: Partial<IRenderQueueConfig>): ICommandRenderer {
    return new CommandRenderer({
      ...this.defaultConfig,
      ...config
    });
  }
  
  /**
   * 创建高性能配置的命令渲染器
   * @returns 高性能命令渲染器
   */
  static createHighPerformance(): ICommandRenderer {
    return new CommandRenderer({
      ...this.defaultConfig,
      enableBatching: true,
      enableCulling: true,
      enableDepthSorting: true,
      maxBatches: 500,
      cullMargin: 100
    });
  }
  
  /**
   * 创建调试配置的命令渲染器
   * @returns 调试用命令渲染器
   */
  static createDebug(): ICommandRenderer {
    return new CommandRenderer({
      ...this.defaultConfig,
      enableBatching: false, // 禁用批处理便于调试
      enableCulling: false,  // 禁用剔除便于调试
      enableDepthSorting: true,
      maxBatches: 10,
      cullMargin: 0
    });
  }
  
  /**
   * 更新默认配置
   * @param config 新的默认配置
   */
  static setDefaultConfig(config: Partial<IRenderQueueConfig>): void {
    Object.assign(this.defaultConfig, config);
  }
}

/**
 * 渲染命令工具函数
 */
export class CommandUtils {
  /**
   * 从形状创建渲染命令
   * @param shape 形状对象
   * @returns 渲染命令数组
   */
  static createCommandsFromShape(shape: any): IRenderCommand[] {
    // 这个方法将在后续实现中与Shape系统集成
    // 现在返回空数组作为占位符
    return [];
  }
  
  /**
   * 估算命令的渲染成本
   * @param command 渲染命令
   * @returns 成本估算值
   */
  static estimateRenderCost(command: IRenderCommand): number {
    // 基础成本
    let cost = 1;
    
    // 根据命令类型调整成本
    switch (command.type) {
      case 'path':
        cost *= 3; // 路径渲染相对昂贵
        break;
      case 'text':
        cost *= 2; // 文本渲染中等成本
        break;
      case 'clear':
        cost *= 0.1; // 清屏成本很低
        break;
    }
    
    // 根据边界框大小调整成本
    const bounds = command.getBounds();
    const area = bounds.width * bounds.height;
    cost *= Math.min(area / 10000, 5); // 面积影响，但有上限
    
    return cost;
  }
  
  /**
   * 优化命令序列
   * @param commands 原命令序列
   * @returns 优化后的命令序列
   */
  static optimizeCommands(commands: IRenderCommand[]): IRenderCommand[] {
    // 移除不可见的命令
    const visibleCommands = commands.filter(cmd => {
      const bounds = cmd.getBounds();
      return bounds.width > 0 && bounds.height > 0;
    });
    
    // 按z-index排序
    visibleCommands.sort((a, b) => a.zIndex - b.zIndex);
    
    // 其他优化...
    return visibleCommands;
  }
}