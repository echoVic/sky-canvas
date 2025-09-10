/**
 * DI 容器 - 完全重构版本
 * 基于 VSCode DI 架构，管理基础设施服务
 */

import { InstantiationService } from '../di/InstantiationService';
import { ServiceCollection } from '../di/ServiceCollection';
import {
  CanvasRenderingService,
  ConfigurationService,
  EventBusService,
  HistoryService,
  ICanvasRenderingService,
  IConfigurationService,
  IEventBusService,
  IHistoryService,
  IInteractionService,
  ILogService,
  ISelectionService,
  InteractionService,
  LogService,
  SelectionService,
  type LogLevel
} from '../services';

/**
 * 容器配置
 */
export interface ContainerConfig {
  canvas?: HTMLCanvasElement;
  logLevel?: LogLevel;
  enableHistory?: boolean;
  enableInteraction?: boolean;
}

/**
 * DI 容器
 */
export class Container {
  private serviceCollection: ServiceCollection;
  private instantiationService: InstantiationService;

  constructor() {
    this.serviceCollection = new ServiceCollection();
    this.instantiationService = new InstantiationService(this.serviceCollection);
  }

  /**
   * 配置容器，注册基础设施服务
   */
  configure(config: ContainerConfig = {}): this {
    // 注册核心服务
    this.registerCoreServices(config);
    
    // 根据配置注册可选服务
    if (config.enableHistory) {
      this.registerHistoryService();
    }
    
    if (config.enableInteraction && config.canvas) {
      this.registerInteractionService();
    }
    
    if (config.canvas) {
      this.registerRenderingService();
    }

    return this;
  }

  /**
   * 注册核心服务（必需）
   */
  private registerCoreServices(config: ContainerConfig): void {
    // 日志服务 - 最先注册，其他服务可能需要它
    this.serviceCollection.addSingleton(ILogService, () => new LogService(config.logLevel));

    // 事件总线服务
    this.serviceCollection.addSingleton(IEventBusService, EventBusService);

    // 配置服务
    this.serviceCollection.addSingleton(IConfigurationService, ConfigurationService);
    
    // 选择服务
    this.serviceCollection.addSingleton(ISelectionService, SelectionService);
  }

  /**
   * 注册渲染服务
   */
  private registerRenderingService(): void {
    this.serviceCollection.addSingleton(ICanvasRenderingService, CanvasRenderingService);
  }

  /**
   * 注册历史服务
   */
  private registerHistoryService(): void {
    this.serviceCollection.addSingleton(IHistoryService, HistoryService);
  }

  /**
   * 注册交互服务
   */
  private registerInteractionService(): void {
    this.serviceCollection.addSingleton(IInteractionService, InteractionService);
  }

  /**
   * 获取服务实例
   */
  get<T>(identifier: any): T {
    return this.instantiationService.get(identifier);
  }

  /**
   * 检查服务是否已注册
   */
  has(identifier: any): boolean {
    return this.instantiationService.has(identifier);
  }

  /**
   * 预加载所有单例服务
   */
  initialize(): void {
    this.instantiationService.preloadSingletons();
  }

  /**
   * 销毁容器
   */
  dispose(): void {
    this.instantiationService.dispose();
  }

  /**
   * 获取容器统计信息
   */
  getStats() {
    return this.instantiationService.getStats();
  }

  /**
   * 创建子容器（作用域）
   */
  createScope(): Container {
    const scopedContainer = new Container();
    scopedContainer.serviceCollection = this.serviceCollection.clone();
    scopedContainer.instantiationService = new InstantiationService(scopedContainer.serviceCollection);
    return scopedContainer;
  }
}