/**
 * Canvas SDK 主入口 - 基于 VSCode DI 架构
 * 类似 VSCode 的 main.ts，控制整个启动流程和服务装转
 */

import type { CanvasSDK } from './CanvasSDK';
import { InstantiationService } from './di/InstantiationService';
import { ServiceCollection } from './di/ServiceCollection';
import { SyncDescriptor } from './di/descriptors';
import { getSingletonServiceDescriptors } from './di/instantiation';

// 管理器
import { CanvasManager, ICanvasManager } from './managers/CanvasManager';
import { IToolManager, ToolManager } from './managers/ToolManager';

// 服务
import {
  CanvasRenderingService,
  ClipboardService,
  ConfigurationService,
  EventBusService,
  HistoryService,
  ICanvasRenderingService,
  IClipboardService,
  IConfigurationService,
  IEventBusService,
  IHistoryService,
  IInteractionService,
  // 服务标识符
  ILogService,
  InteractionService,
  ISelectionService,
  IShapeService,
  LogService,
  SelectionService,
  ShapeService,
  type LogLevel
} from './services';

/**
 * SDK 配置接口
 */
export interface SDKConfig {
  canvas: HTMLCanvasElement;
  logLevel?: LogLevel;
  enableHistory?: boolean;
  enableInteraction?: boolean;
}

/**
 * 创建并初始化一个 Canvas SDK 实例。
 * 这是使用 aky-canvas SDK 的主要入口点。
 * @param config - SDK 的配置选项。
 * @returns 一个 Promise，它解析为完全初始化的 CanvasSDK 实例。
 */
export async function createCanvasSDK(config: SDKConfig): Promise<CanvasSDK> {
  const bootstrap = new CanvasSDKBootstrap(config);
  const sdk = await bootstrap.startup();
  return sdk;
}

/**
 * Canvas SDK 内部启动引导类 - 不再对外导出
 * 控制整个 SDK 的启动流程
 */
class CanvasSDKBootstrap {
  private instantiationService?: InstantiationService;
  private logger?: any;
  private canvasManager?: any;
  private isInitialized = false;

  constructor(private config: SDKConfig) {}

  /**
   * 启动引导程序
   */
  async startup(): Promise<CanvasSDK> {
    console.log('=== CANVAS SDK BOOTSTRAP STARTUP ===');

    // 1. 应用准备阶段
    await this.prepare();

    // 2. 创建服务
    this.createServices();

    // 3. 初始化服务
    await this.initServices();

    // 4. 启动核心功能
    await this.startCore();

    // 5. 创建 CanvasSDK 实例 - 在 DI 容器中创建
    const { CanvasSDK } = await import('./CanvasSDK');
    const canvasSDK = this.instantiationService!.createInstance(CanvasSDK);

    this.isInitialized = true;
    console.log('=== CANVAS SDK BOOTSTRAP STARTUP COMPLETE ===');

    return canvasSDK;
  }

  /**
   * 应用准备阶段
   */
  private async prepare(): Promise<void> {
    console.log('Canvas SDK Bootstrap: Preparing...');

    // 验证必要配置
    if (!this.config.canvas) {
      throw new Error('Canvas element is required');
    }

    // 设置默认配置
    this.config = {
      logLevel: 'info',
      enableHistory: true,
      enableInteraction: true,
      ...this.config
    };
  }

  /**
   * 创建服务
   */
  private createServices(): void {
    console.log('Canvas SDK Bootstrap: Creating services...');

    // 1. 创建服务集合
    const services = new ServiceCollection();

    // 2. 注册通过 registerSingleton 注册的服务
    for (const [id, descriptor] of getSingletonServiceDescriptors()) {
      services.set(id, descriptor);
    }

    // 3. 注册核心服务
    this.registerCoreServices(services);

    // 4. 根据配置注册可选服务
    this.registerOptionalServices(services);

    // 5. 创建实例化服务
    this.instantiationService = new InstantiationService(services);
  }

  /**
   * 初始化服务
   */
  private async initServices(): Promise<void> {
    console.log('Canvas SDK Bootstrap: Initializing services...');

    if (!this.instantiationService) {
      throw new Error('InstantiationService not created');
    }

    // 获取核心服务
    this.logger = this.instantiationService.invokeFunction(accessor =>
      accessor.get(ILogService)
    );

    this.logger.info('Canvas SDK Bootstrap services initialized');
  }

  /**
   * 启动核心功能
   */
  private async startCore(): Promise<void> {
    console.log('Canvas SDK Bootstrap: Starting core...');

    if (!this.instantiationService) {
      throw new Error('InstantiationService not available');
    }

    // 获取核心管理器
    this.canvasManager = this.instantiationService.invokeFunction(accessor =>
      accessor.get(ICanvasManager)
    );

    this.logger.info('Canvas SDK Bootstrap core started');
  }

  /**
   * 获取服务实例 - 公开 API
   */
  getService<T>(serviceIdentifier: any): T {
    if (!this.instantiationService) {
      throw new Error('Application not started');
    }

    return this.instantiationService.invokeFunction(accessor =>
      accessor.get(serviceIdentifier)
    );
  }

  /**
   * 获取 Canvas Manager
   */
  getCanvasManager(): any {
    return this.canvasManager;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 销毁应用
   */
  dispose(): void {
    if (this.instantiationService) {
      this.instantiationService.dispose();
    }
    this.isInitialized = false;
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(services: ServiceCollection): void {
    // 日志服务 - 最先注册
    services.set(ILogService, new SyncDescriptor(LogService));

    // 事件总线服务
    services.set(IEventBusService, new SyncDescriptor(EventBusService));

    // 配置服务
    services.set(IConfigurationService, new SyncDescriptor(ConfigurationService));

    // 选择服务
    services.set(ISelectionService, new SyncDescriptor(SelectionService));

    // 形状服务
    services.set(IShapeService, new SyncDescriptor(ShapeService));

    // 剪贴板服务
    services.set(IClipboardService, new SyncDescriptor(ClipboardService));

    // 工具管理器
    services.set(IToolManager, new SyncDescriptor(ToolManager));

    // Canvas 管理器
    services.set(ICanvasManager, new SyncDescriptor(CanvasManager));
  }

  /**
   * 注册可选服务
   */
  private registerOptionalServices(services: ServiceCollection): void {
    if (this.config.enableHistory) {
      services.set(IHistoryService, new SyncDescriptor(HistoryService));
    }

    if (this.config.enableInteraction && this.config.canvas) {
      services.set(IInteractionService, new SyncDescriptor(InteractionService));
    }

    if (this.config.canvas) {
      services.set(ICanvasRenderingService, new SyncDescriptor(CanvasRenderingService));
    }
  }
}



