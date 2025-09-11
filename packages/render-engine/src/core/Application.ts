/**
 * 应用程序主类 - 基于VSCode的应用架构
 * 统一管理所有核心服务和生命周期
 */

import { EventBus, IDisposable } from '../events/EventBus';
import { LazyLoadingService } from './LazyLoadingService';
import { InstantiationService, ServiceCollection, ServiceIdentifier } from './ServiceCollection';
import {
  ICanvasService,
  IConfigurationService,
  IEventBusService,
  IExtensionService,
  IInteractionService,
  IRenderEngineService,
  ServiceRegistry
} from './ServiceRegistry';
import { ExtensionRegistry } from './systems/ExtensionSystem';
import { VirtualizationManager } from './VirtualizationManager';

export interface IApplicationServices {
  canvasService: ICanvasService;
  renderEngineService: IRenderEngineService;
  interactionService: IInteractionService;
  configurationService: IConfigurationService;
  eventBusService: IEventBusService;
  extensionService: IExtensionService;
}

export interface IApplicationOptions {
  enableExtensions?: boolean;
  enableVirtualization?: boolean;
  enableLazyLoading?: boolean;
  extensionPaths?: string[];
}

/**
 * 应用程序状态
 */
export enum ApplicationState {
  Uninitialized = 0,
  Initializing = 1,
  Running = 2,
  Disposing = 3,
  Disposed = 4
}

/**
 * Sky Canvas应用程序主类
 */
export class SkyCanvasApplication {
  private _state = ApplicationState.Uninitialized;
  private _services?: IApplicationServices;
  private _serviceCollection: ServiceCollection;
  private _instantiationService?: InstantiationService;
  
  // 核心组件
  private _eventBus: EventBus;
  private _lazyLoadingService: LazyLoadingService;
  private _virtualizationManager: VirtualizationManager;
  
  // 扩展系统
  private _extensionRegistry: ExtensionRegistry;
  
  private _options: IApplicationOptions;

  constructor(options: IApplicationOptions = {}) {
    this._options = {
      enableExtensions: true,
      enableVirtualization: true,
      enableLazyLoading: true,
      extensionPaths: [],
      ...options
    };

    this._serviceCollection = new ServiceCollection();
    this._eventBus = new EventBus();
    this._lazyLoadingService = new LazyLoadingService();
    this._virtualizationManager = new VirtualizationManager();
    
    // 初始化扩展系统
    this._extensionRegistry = new ExtensionRegistry();
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    if (this._state !== ApplicationState.Uninitialized) {
      throw new Error(`Cannot initialize application in state ${this._state}`);
    }

    this._state = ApplicationState.Initializing;

    try {
      // 1. 注册核心服务
      this._registerCoreServices();
      
      // 2. 创建服务实例
      this._instantiationService = new InstantiationService(this._serviceCollection);
      this._services = this._createServiceInstances();
      
      // 3. 初始化核心服务
      await this._initializeCoreServices();
      
      // 4. 初始化扩展系统
      if (this._options.enableExtensions) {
        await this._initializeExtensionSystem();
      }
      
      // 5. 触发启动完成事件
      this._eventBus.emit('applicationStarted', {
        timestamp: Date.now(),
        services: Object.keys(this._services)
      });

      this._state = ApplicationState.Running;
      
    } catch (error) {
      this._state = ApplicationState.Uninitialized;
      throw new Error(`Failed to initialize application: ${error}`);
    }
  }

  /**
   * 获取服务实例
   */
  getServices(): IApplicationServices {
    if (!this._services) {
      throw new Error('Application is not initialized');
    }
    return this._services;
  }

  /**
   * 获取特定服务
   */
  getService<T>(serviceId: ServiceIdentifier<T>): T {
    if (!this._instantiationService) {
      throw new Error('Application is not initialized');
    }
    return this._instantiationService.createInstance(serviceId);
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }



  /**
   * 获取懒加载服务
   */
  getLazyLoadingService(): LazyLoadingService {
    return this._lazyLoadingService;
  }

  /**
   * 获取虚拟化管理器
   */
  getVirtualizationManager(): VirtualizationManager {
    return this._virtualizationManager;
  }

  /**
   * 获取扩展注册表
   */
  getExtensionRegistry(): ExtensionRegistry {
    return this._extensionRegistry;
  }



  /**
   * 获取应用程序状态
   */
  getState(): ApplicationState {
    return this._state;
  }

  /**
   * 销毁应用程序
   */
  async dispose(): Promise<void> {
    if (this._state === ApplicationState.Disposed || this._state === ApplicationState.Disposing) {
      return;
    }

    this._state = ApplicationState.Disposing;

    try {
      // 1. 停用所有扩展
      if (this._options.enableExtensions) {
        // Extension deactivation logic would go here
      }

      // 2. 销毁核心服务
      if (this._services) {
        await this._disposeCoreServices();
      }

      // 3. 销毁系统组件
      this._virtualizationManager.dispose();
      this._lazyLoadingService.dispose();
      this._eventBus.dispose();
      
      // 4. 销毁扩展系统
      this._extensionRegistry.dispose();

      this._state = ApplicationState.Disposed;
      
    } catch (error) {
      console.error('Error during application disposal:', error);
      this._state = ApplicationState.Disposed;
    }
  }

  private _registerCoreServices(): void {
    // 注册基础服务
    this._serviceCollection.set(IEventBusService, this._eventBus);
    
    // 注册其他核心服务（具体实现类需要在各自模块中定义）
    ServiceRegistry.registerServices(this._serviceCollection);
  }

  private _createServiceInstances(): IApplicationServices {
    if (!this._instantiationService) {
      throw new Error('InstantiationService is not available');
    }

    return {
      canvasService: this._instantiationService.createInstance(ICanvasService),
      renderEngineService: this._instantiationService.createInstance(IRenderEngineService),
      interactionService: this._instantiationService.createInstance(IInteractionService),
      configurationService: this._instantiationService.createInstance(IConfigurationService),
      eventBusService: this._eventBus,
      extensionService: this._instantiationService.createInstance(IExtensionService)
    };
  }

  private async _initializeCoreServices(): Promise<void> {
    if (!this._services) {
      throw new Error('Services are not created');
    }

    // 按依赖顺序初始化服务
    // 配置服务没有initialize方法，跳过
    await this._services.renderEngineService.initialize();
    await this._services.canvasService.initialize();
    await this._services.interactionService.initialize();
    await this._services.extensionService.initialize();
  }

  private async _initializeExtensionSystem(): Promise<void> {
    // 加载扩展
    for (const extensionPath of this._options.extensionPaths || []) {
      try {
        // 这里需要实现扩展加载逻辑
        console.log(`Loading extension from ${extensionPath}`);
      } catch (error) {
        console.error(`Failed to load extension from ${extensionPath}:`, error);
      }
    }

    // 触发启动完成激活事件
    // Extension activation logic would go here
  }

  private async _disposeCoreServices(): Promise<void> {
    if (!this._services) {
      return;
    }

    // 按相反顺序销毁服务
    const disposableServices = [
      this._services.extensionService,
      this._services.interactionService,
      this._services.canvasService,
      this._services.renderEngineService,
      this._services.configurationService
    ];

    for (const service of disposableServices) {
      try {
        if (service && typeof (service as IDisposable).dispose === 'function') {
          await (service as IDisposable).dispose();
        }
      } catch (error) {
        console.error('Error disposing service:', error);
      }
    }
  }
}

/**
 * 全局应用程序实例
 */
let _applicationInstance: SkyCanvasApplication | undefined;

/**
 * 获取全局应用程序实例
 */
export function getApplication(): SkyCanvasApplication {
  if (!_applicationInstance) {
    throw new Error('Application is not initialized. Call createApplication() first.');
  }
  return _applicationInstance;
}

/**
 * 创建应用程序实例
 */
export function createApplication(options?: IApplicationOptions): SkyCanvasApplication {
  if (_applicationInstance) {
    throw new Error('Application instance already exists');
  }
  
  _applicationInstance = new SkyCanvasApplication(options);
  return _applicationInstance;
}

/**
 * 销毁全局应用程序实例
 */
export async function disposeApplication(): Promise<void> {
  if (_applicationInstance) {
    await _applicationInstance.dispose();
    _applicationInstance = undefined;
  }
}
