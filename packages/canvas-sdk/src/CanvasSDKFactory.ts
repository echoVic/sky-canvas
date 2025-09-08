/**
 * Canvas SDK 工厂
 * 负责创建和配置 DI 容器，以及 SDK 实例的创建
 */

import { CanvasSDK, ICanvasSDKConfig } from './CanvasSDK';
import { InstantiationService } from './di/InstantiationService';
import { ServiceCollection } from './di/ServiceCollection';
import * as ServiceIds from './di/ServiceIdentifiers';

// 重新导出 CanvasSDK 以供其他模块使用
export { CanvasSDK } from './CanvasSDK';

// 导入服务实现
import { CanvasRenderingService } from './services/CanvasRenderingService';
import { ConfigurationService } from './services/ConfigurationService';
import {
  AnimationService,
  HistoryService,
  ImportExportService,
  InteractionService,
  LayerService,
  SelectionService,
  ToolService,
  ViewportService
} from './services/CoreServices';
import { EventBusService } from './services/EventBusService';
import { LogService } from './services/LogService';
import { ShapeService } from './services/ShapeService';

/**
 * 插件接口
 */
export interface ICanvasSDKPlugin {
  name: string;
  version: string;
  install(services: ServiceCollection): void;
  activate?(sdk: CanvasSDK): void;
  deactivate?(): void;
}

/**
 * SDK 创建选项
 */
export interface CanvasSDKFactoryOptions {
  /** 自定义服务配置 */
  customServices?: (services: ServiceCollection) => void;
  /** 插件列表 */
  plugins?: ICanvasSDKPlugin[];
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否预加载单例服务 */
  preloadSingletons?: boolean;
}

/**
 * Canvas SDK 工厂类
 */
export class CanvasSDKFactory {
  private static instance: CanvasSDKFactory;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  static getInstance(): CanvasSDKFactory {
    if (!CanvasSDKFactory.instance) {
      CanvasSDKFactory.instance = new CanvasSDKFactory();
    }
    return CanvasSDKFactory.instance;
  }
  
  /**
   * 创建默认服务配置
   */
  createDefaultServiceCollection(): ServiceCollection {
    const services = new ServiceCollection();
    
    // 注册核心服务（单例）
    services.addSingleton(ServiceIds.IEventBusService, (accessor: any) => new EventBusService());
    services.addSingleton(ServiceIds.IConfigurationService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      return new ConfigurationService(eventBus);
    });
    services.addSingleton(ServiceIds.ILogService, (accessor: any) => new LogService());
    services.addSingleton(ServiceIds.ICanvasRenderingService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new CanvasRenderingService(eventBus, logger);
    });
    
    // 注册业务服务（单例）
    services.addSingleton(ServiceIds.IShapeService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new ShapeService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.ISelectionService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new SelectionService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.IViewportService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new ViewportService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.IHistoryService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new HistoryService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.IAnimationService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new AnimationService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.ILayerService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new LayerService(eventBus, logger);
    });
    
    // 注册可选服务（单例）
    services.addSingleton(ServiceIds.IInteractionService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new InteractionService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.IToolService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new ToolService(eventBus, logger);
    });
    services.addSingleton(ServiceIds.IImportExportService, (accessor: any) => {
      const eventBus = accessor.get(ServiceIds.IEventBusService);
      const logger = accessor.get(ServiceIds.ILogService);
      return new ImportExportService(eventBus, logger);
    });
    
    // 注册 SDK 本身
    services.addSingleton(ServiceIds.ICanvasSDK, (accessor: any) => new CanvasSDK(accessor as any));
    
    return services;
  }
  
  /**
   * 验证服务配置
   */
  private validateServiceCollection(services: ServiceCollection): void {
    const validation = services.validate();
    if (!validation.isValid) {
      throw new Error(`Service collection validation failed:\n${validation.errors.join('\n')}`);
    }
  }
  
  /**
   * 安装插件
   */
  private installPlugins(services: ServiceCollection, plugins: ICanvasSDKPlugin[]): void {
    for (const plugin of plugins) {
      try {
        plugin.install(services);
        console.log(`Plugin ${plugin.name} v${plugin.version} installed`);
      } catch (error) {
        console.error(`Failed to install plugin ${plugin.name}:`, error);
        throw error;
      }
    }
  }
  
  /**
   * 激活插件
   */
  private activatePlugins(sdk: CanvasSDK, plugins: ICanvasSDKPlugin[]): void {
    for (const plugin of plugins) {
      try {
        if (plugin.activate) {
          plugin.activate(sdk);
          console.log(`Plugin ${plugin.name} activated`);
        }
      } catch (error) {
        console.error(`Failed to activate plugin ${plugin.name}:`, error);
        // 插件激活失败不应该影响 SDK 创建
      }
    }
  }
  
  /**
   * 创建 Canvas SDK 实例
   */
  async createSDK(
    canvas: HTMLCanvasElement,
    config: ICanvasSDKConfig = {},
    options: CanvasSDKFactoryOptions = {}
  ): Promise<CanvasSDK> {
    const {
      customServices,
      plugins = [],
      debug = false,
      preloadSingletons = true
    } = options;
    
    try {
      // 创建服务集合
      const services = this.createDefaultServiceCollection();
      
      // 应用自定义服务配置
      if (customServices) {
        customServices(services);
      }
      
      // 安装插件
      if (plugins.length > 0) {
        this.installPlugins(services, plugins);
      }
      
      // 验证服务配置
      this.validateServiceCollection(services);
      
      // 创建实例化服务
      const instantiationService = new InstantiationService(services);
      
      // 预加载单例服务
      if (preloadSingletons) {
        instantiationService.preloadSingletons();
      }
      
      // 获取 SDK 实例
      const sdk = instantiationService.get(ServiceIds.ICanvasSDK) as CanvasSDK;
      
      // 初始化 SDK
      await sdk.initialize(canvas, {
        logLevel: debug ? 'debug' : 'info',
        ...config
      });
      
      // 激活插件
      if (plugins.length > 0) {
        this.activatePlugins(sdk, plugins);
      }
      
      // 输出调试信息
      if (debug) {
        const stats = instantiationService.getStats();
        console.log('Canvas SDK created:', stats);
      }
      
      return sdk;
    } catch (error) {
      console.error('Failed to create Canvas SDK:', error);
      throw error;
    }
  }
  
  /**
   * 创建作用域 SDK 实例
   */
  createScopedSDK(
    parentSDK: CanvasSDK,
    canvas: HTMLCanvasElement,
    config: ICanvasSDKConfig = {}
  ): Promise<CanvasSDK> {
    // 实现作用域 SDK 创建逻辑
    // 这里可以复用父 SDK 的一些服务实例
    throw new Error('Scoped SDK creation not implemented yet');
  }
}

/**
 * 便捷的工厂函数
 */
export async function createCanvasSDK(
  canvas: HTMLCanvasElement,
  config: ICanvasSDKConfig = {},
  options: CanvasSDKFactoryOptions = {}
): Promise<CanvasSDK> {
  const factory = CanvasSDKFactory.getInstance();
  return factory.createSDK(canvas, config, options);
}

/**
 * 创建带有自定义服务的 SDK
 */
export async function createCanvasSDKWithServices(
  canvas: HTMLCanvasElement,
  config: ICanvasSDKConfig,
  customServices: (services: ServiceCollection) => void
): Promise<CanvasSDK> {
  return createCanvasSDK(canvas, config, { customServices });
}

/**
 * 创建带有插件的 SDK
 */
export async function createCanvasSDKWithPlugins(
  canvas: HTMLCanvasElement,
  config: ICanvasSDKConfig,
  plugins: ICanvasSDKPlugin[]
): Promise<CanvasSDK> {
  return createCanvasSDK(canvas, config, { plugins });
}

/**
 * 创建调试模式的 SDK
 */
export async function createDebugCanvasSDK(
  canvas: HTMLCanvasElement,
  config: ICanvasSDKConfig = {}
): Promise<CanvasSDK> {
  return createCanvasSDK(canvas, config, { 
    debug: true,
    preloadSingletons: true
  });
}

// 导出默认实例
export const canvasSDKFactory = CanvasSDKFactory.getInstance();
