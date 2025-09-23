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

// ViewModels
import { ISelectionViewModel, SelectionViewModel } from './viewmodels/interaction/SelectionViewModel';
import { CircleViewModel, ICircleViewModel } from './viewmodels/shapes/CircleViewModel';
import { IRectangleViewModel, RectangleViewModel } from './viewmodels/shapes/RectangleViewModel';

// 服务
import { RenderEngineType } from '@sky-canvas/render-engine';
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
  IShortcutService,
  IZIndexService,
  LogService,
  SelectionService,
  ShortcutService,
  ZIndexService,
  type LogLevel
} from './services';


/**
 * SDK 配置接口
 */
export interface SDKConfig {
  container: HTMLElement;
  renderEngine?: RenderEngineType;
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
    if (!this.config.container) {
      throw new Error('Container element is required');
    }

    // 设置默认配置
    this.config = {
      renderEngine: 'webgl', // 默认使用 webgl 渲染
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

    // 初始化Canvas和核心服务连接
    if (this.config.container) {
      await this.initializeCanvasServices();
    }

    this.logger.info('Canvas SDK Bootstrap core started');
  }

  /**
   * 初始化Canvas相关服务并建立连接
   */
  private async initializeCanvasServices(): Promise<void> {
    if (!this.config.container || !this.instantiationService) return;

    // 初始化渲染服务
    const renderingService = this.instantiationService.invokeFunction(accessor =>
      accessor.get(ICanvasRenderingService)
    );
    await renderingService.initialize(this.config.container, {
      renderEngine: this.config.renderEngine || 'webgl',
    });

    // 启动渲染服务
    renderingService.start();

    // 获取render engine创建的canvas用于交互服务
    const renderEngine = renderingService.getRenderEngine();
    const canvas = renderEngine?.getCanvas();

    // 初始化交互服务
    if (this.config.enableInteraction && canvas) {
      const interactionService = this.instantiationService.invokeFunction(accessor =>
        accessor.get(IInteractionService)
      );
      const toolManager = this.instantiationService.invokeFunction(accessor =>
        accessor.get(IToolManager)
      );

      // 初始化交互服务
      interactionService.initialize(canvas);

      // 连接InteractionService和ToolManager
      interactionService.setToolManager(toolManager);

      this.logger.info('Canvas services initialized and connected');
    }
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

    // 快捷键服务
    services.set(IShortcutService, new SyncDescriptor(ShortcutService));

    // 选择服务
    services.set(ISelectionService, new SyncDescriptor(SelectionService));

    // Z-Index服务
    services.set(IZIndexService, new SyncDescriptor(ZIndexService));

    // 剪贴板服务
    services.set(IClipboardService, new SyncDescriptor(ClipboardService));

    // ViewModels
    services.set(ISelectionViewModel, new SyncDescriptor(SelectionViewModel));
    services.set(IRectangleViewModel, new SyncDescriptor(RectangleViewModel));
    services.set(ICircleViewModel, new SyncDescriptor(CircleViewModel));

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

    if (this.config.enableInteraction) {
      services.set(IInteractionService, new SyncDescriptor(InteractionService));
    }

    // 总是注册渲染服务，因为我们会创建canvas
    services.set(ICanvasRenderingService, new SyncDescriptor(CanvasRenderingService));
  }
}



