/**
 * 增强的服务管理器
 * 在现有 DI 系统基础上集成 MVVM 架构
 */

import { Container } from '../di';
import { MVVMIntegrationService } from './MVVMIntegrationService';
import {
  IShapeService,
  ISelectionService,
  IViewportService,
  IHistoryService,
  IEventBusService,
  ILogService
} from '../di/ServiceIdentifiers';

/**
 * 增强的服务管理器配置
 */
export interface IEnhancedServiceConfig {
  /** 调试模式 */
  debug?: boolean;
  /** 自动保存间隔 */
  autoSaveInterval?: number;
  /** 用户上下文 */
  userContext?: {
    userId?: string;
    projectId?: string;
    sceneId?: string;
  };
}

/**
 * 增强的服务管理器
 * 基于 MVVM 架构的服务管理器，完全替换传统服务
 */
export class EnhancedServiceManager {
  private container: Container;
  private mvvmIntegration: MVVMIntegrationService;
  private isInitialized: boolean = false;
  private config: IEnhancedServiceConfig = {};

  constructor(container: Container) {
    this.container = container;
    this.mvvmIntegration = this.container.get(MVVMIntegrationService);
  }

  /**
   * 初始化增强服务管理器
   */
  async initialize(config: IEnhancedServiceConfig = {}): Promise<void> {
    if (this.isInitialized) return;

    this.config = {
      debug: false,
      autoSaveInterval: 30000,
      ...config
    };

    try {
      // 初始化 MVVM 集成 - 直接启用 MVVM，无渐进式迁移
      await this.mvvmIntegration.initialize({
        enableMVVM: true,
        enableMigration: false,
        debug: this.config.debug!,
        autoSaveInterval: this.config.autoSaveInterval!
      });

      // 设置用户上下文
      if (this.config.userContext) {
        await this.mvvmIntegration.setApplicationContext(this.config.userContext);
      }

      this.isInitialized = true;

      const logger = this.container.get<ILogService>(ILogService);
      logger.info('Enhanced service manager initialized successfully');

    } catch (error) {
      const logger = this.container.get<ILogService>(ILogService);
      logger.error('Failed to initialize enhanced service manager', error);
      throw error;
    }
  }

  /**
   * 获取图形服务
   * 直接返回基于 MVVM 的图形服务
   */
  getShapeService(): IShapeService {
    return this.mvvmIntegration.getShapeService();
  }

  /**
   * 获取选择服务
   * 直接返回基于 MVVM 的选择服务
   */
  getSelectionService(): ISelectionService {
    return this.mvvmIntegration.getSelectionService();
  }

  /**
   * 获取视口服务
   * 直接返回基于 MVVM 的视口服务
   */
  getViewportService(): IViewportService {
    return this.mvvmIntegration.getViewportService();
  }

  /**
   * 获取历史服务
   * 直接返回基于 MVVM 的历史服务
   */
  getHistoryService(): IHistoryService {
    return this.mvvmIntegration.getHistoryService();
  }

  /**
   * 获取 MVVM 管理器
   */
  getMVVMManager() {
    return this.mvvmIntegration.getMVVMManager();
  }

  /**
   * 设置应用上下文
   */
  async setApplicationContext(context: {
    userId?: string;
    projectId?: string;
    sceneId?: string;
  }): Promise<void> {
    this.config.userContext = { ...this.config.userContext, ...context };
    await this.mvvmIntegration.setApplicationContext(context);
  }


  /**
   * 保存所有状态
   */
  async saveAll(): Promise<void> {
    await this.mvvmIntegration.saveAll();
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): any {
    return {
      initialized: this.isInitialized,
      config: this.config,
      mvvmEnabled: true,
      mvvm: this.mvvmIntegration.getSystemStatus()
    };
  }

  /**
   * 是否启用 MVVM 模式
   */
  isMVVMEnabled(): boolean {
    return true;
  }

  /**
   * 获取配置
   */
  getConfig(): IEnhancedServiceConfig {
    return { ...this.config };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.mvvmIntegration.dispose();
    this.isInitialized = false;
    
    const logger = this.container.get<ILogService>(ILogService);
    logger.info('Enhanced service manager disposed');
  }
}

/**
 * 创建增强服务管理器的工厂函数
 */
export function createEnhancedServiceManager(container: Container): EnhancedServiceManager {
  return new EnhancedServiceManager(container);
}

/**
 * 服务管理器单例
 */
let serviceManagerInstance: EnhancedServiceManager | null = null;

/**
 * 获取服务管理器单例
 */
export function getServiceManager(container?: Container): EnhancedServiceManager {
  if (!serviceManagerInstance && container) {
    serviceManagerInstance = createEnhancedServiceManager(container);
  }
  
  if (!serviceManagerInstance) {
    throw new Error('Service manager not initialized. Please provide a DI container.');
  }
  
  return serviceManagerInstance;
}

/**
 * 初始化全局服务管理器
 */
export async function initializeGlobalServiceManager(
  container: Container, 
  config?: IEnhancedServiceConfig
): Promise<EnhancedServiceManager> {
  const manager = getServiceManager(container);
  await manager.initialize(config);
  return manager;
}