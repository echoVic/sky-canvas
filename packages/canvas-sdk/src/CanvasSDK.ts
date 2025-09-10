/**
 * Canvas SDK - 完全重构版本
 * 使用 DI 容器管理基础设施服务，直接管理业务组件
 */

import { Container, ContainerConfig } from './container/Container';
import { CanvasManager } from './managers/CanvasManager';
import { 
  IEventBusService,
  ICanvasRenderingService,
  IConfigurationService,
  ILogService,
  IHistoryService,
  IInteractionService,
  type LogLevel
} from './services';

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
 * Canvas SDK 主类
 */
export class CanvasSDK {
  private container: Container;
  private canvasManager?: CanvasManager;
  private isInitialized = false;
  private canvas: HTMLCanvasElement | null = null;
  private config: ICanvasSDKConfig = {};

  // 基础设施服务（通过 DI 获取）
  private eventBus?: IEventBusService;
  private renderingService?: ICanvasRenderingService;
  private configService?: IConfigurationService;
  private logger?: ILogService;
  private historyService?: IHistoryService;
  private interactionService?: IInteractionService;

  constructor() {
    this.container = new Container();
  }

  /**
   * 初始化 SDK
   */
  async initialize(canvas: HTMLCanvasElement, config: ICanvasSDKConfig = {}): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Canvas SDK already initialized');
    }

    if (!canvas) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvas;
    this.config = {
      renderEngine: 'webgl',
      enableInteraction: true,
      enableHistory: true,
      logLevel: 'info',
      ...config
    };

    // 配置并初始化 DI 容器
    const containerConfig: ContainerConfig = {
      canvas,
      logLevel: this.config.logLevel,
      enableHistory: this.config.enableHistory,
      enableInteraction: this.config.enableInteraction,
    };

    this.container.configure(containerConfig);
    this.container.initialize();

    // 获取基础设施服务
    this.eventBus = this.container.get(IEventBusService);
    this.configService = this.container.get(IConfigurationService);
    this.logger = this.container.get(ILogService);
    
    if (this.container.has(ICanvasRenderingService)) {
      this.renderingService = this.container.get(ICanvasRenderingService);
    }

    if (this.container.has(IHistoryService)) {
      this.historyService = this.container.get(IHistoryService);
    }

    if (this.container.has(IInteractionService)) {
      this.interactionService = this.container.get(IInteractionService);
    }

    this.logger?.info('Initializing Canvas SDK', this.config);

    try {
      // 设置配置
      this.configService?.set('renderEngine', this.config.renderEngine);
      this.configService?.set('enableInteraction', this.config.enableInteraction);
      this.configService?.set('enableHistory', this.config.enableHistory);

      // 初始化渲染服务
      if (this.renderingService) {
        await this.renderingService.initialize(canvas, this.config);
        this.logger?.debug('Rendering service initialized');
      }

      // 初始化交互服务
      if (this.config.enableInteraction && this.interactionService) {
        this.interactionService.initialize(canvas);
        this.logger?.debug('Interaction service initialized');
      }

      // 创建 Canvas 管理器（需要在服务初始化后）
      this.canvasManager = new CanvasManager(this.container);
      
      this.setupEventHandlers();
      this.isInitialized = true;

      this.eventBus?.emit('sdk:initialized', { canvas, config: this.config });
      this.logger?.info('Canvas SDK initialized successfully');
    } catch (error) {
      this.logger?.error('Failed to initialize Canvas SDK', error);
      this.eventBus?.emit('sdk:error', { error: error as Error, context: 'initialization' });
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.eventBus) return;

    this.eventBus.on('shape:added', (data: any) => {
      this.logger?.debug('Shape added', data.shape?.id);
    });

    this.eventBus.on('shape:selected', (data: any) => {
      this.logger?.debug('Shape selected', data.shape?.id);
    });

    this.eventBus.on('sdk:error', (data: any) => {
      this.logger?.error(`SDK Error in ${data.context}:`, data.error);
    });
  }

  // ============== 公共 API 方法 ==============

  /**
   * 检查是否已初始化
   */
  isSDKInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * 获取配置
   */
  getConfig(): ICanvasSDKConfig {
    return { ...this.config };
  }

  // ============== 形状管理 API ==============

  /**
   * 添加形状
   */
  addShape(shapeData: any): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.addShape(shapeData);
    
    // 将可渲染对象添加到渲染服务
    const renderables = this.canvasManager.getRenderables();
    const newRenderable = renderables.find(r => (r as any).id === shapeData.id);
    if (newRenderable) {
      this.renderingService?.addRenderable(newRenderable);
    }
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.renderingService?.removeRenderable(id);
    this.canvasManager.removeShape(id);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: any): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.updateShape(id, updates);
  }

  /**
   * 获取形状
   */
  getShape(id: string): any | undefined {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.getSelectedShapes().find(s => s.id === id);
  }

  /**
   * 获取所有形状
   */
  getShapes(): any[] {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.getRenderables();
  }

  /**
   * 清空所有形状
   */
  clearShapes(): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.clear();
  }

  // ============== 选择系统 API ==============

  /**
   * 选择形状
   */
  selectShape(id: string): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.selectShape(id);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.deselectShape(id);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    this.canvasManager.clearSelection();
    this.eventBus?.emit('selection:cleared', {});
  }

  /**
   * 获取选中的形状ID
   */
  getSelectedShapeIds(): string[] {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.getSelectedShapes().map(s => s.id);
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): any[] {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.getSelectedShapes();
  }

  /**
   * 检查形状是否被选中
   */
  isSelected(id: string): boolean {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.isShapeSelected(id);
  }

  // ============== 交互系统 API ==============

  /**
   * 设置形状悬停状态
   */
  setShapeHovered(id: string, hovered: boolean): void {
    // TODO: 实现 hover 状态管理
    // this.canvasManager.setShapeHovered(id, hovered);
  }

  /**
   * 点击测试
   */
  hitTest(x: number, y: number): string | null {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.hitTest(x, y);
  }

  /**
   * 设置活动工具
   */
  setActiveTool(toolName: string | null): boolean {
    if (!this.interactionService) {
      this.logger?.warn('Interaction service not available');
      return false;
    }
    return this.interactionService.setActiveTool(toolName);
  }

  /**
   * 获取当前工具
   */
  getActiveTool(): any {
    return this.interactionService?.getActiveTool();
  }

  /**
   * 注册工具
   */
  registerTool(tool: any): void {
    this.interactionService?.registerTool(tool);
  }

  // ============== 历史记录 API ==============

  /**
   * 撤销操作
   */
  undo(): void {
    this.historyService?.undo();
  }

  /**
   * 重做操作
   */
  redo(): void {
    this.historyService?.redo();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.historyService?.canUndo() || false;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.historyService?.canRedo() || false;
  }

  // ============== 渲染控制 API ==============

  /**
   * 开始渲染
   */
  startRender(): void {
    this.renderingService?.start();
    this.eventBus?.emit('render:started', {});
    this.logger?.debug('Rendering started');
  }

  /**
   * 停止渲染
   */
  stopRender(): void {
    this.renderingService?.stop();
    this.eventBus?.emit('render:stopped', {});
    this.logger?.debug('Rendering stopped');
  }

  /**
   * 手动渲染一帧
   */
  render(): void {
    this.renderingService?.render();
  }

  /**
   * 检查是否在渲染
   */
  isRendering(): boolean {
    return this.renderingService?.isRunning() || false;
  }

  /**
   * 获取渲染统计
   */
  getRenderStats(): any {
    return this.renderingService?.getStats();
  }

  // ============== 统计信息 API ==============

  /**
   * 获取形状统计信息
   */
  getShapeStats(): any {
    if (!this.canvasManager) {
      throw new Error('Canvas SDK not initialized');
    }
    
    return this.canvasManager.getStats();
  }

  /**
   * 获取容器统计信息
   */
  getContainerStats(): any {
    return this.container.getStats();
  }

  // ============== 事件系统 API ==============

  /**
   * 监听事件
   */
  on(event: string, handler: (data: any) => void): void {
    this.eventBus?.on(event, handler);
  }

  /**
   * 取消监听事件
   */
  off(event: string, handler?: (data: any) => void): void {
    this.eventBus?.off(event, handler);
  }

  /**
   * 监听事件（一次性）
   */
  once(event: string, handler: (data: any) => void): void {
    this.eventBus?.once(event, handler);
  }

  /**
   * 发出事件
   */
  emit(event: string, data: any): void {
    this.eventBus?.emit(event, data);
  }

  // ============== 配置 API ==============

  /**
   * 获取配置值
   */
  getConfigValue<T>(key: string): T | undefined {
    return this.configService?.get<T>(key);
  }

  /**
   * 设置配置值
   */
  setConfigValue<T>(key: string, value: T): void {
    this.configService?.set(key, value);
  }

  // ============== 资源管理 ==============

  /**
   * 销毁 SDK
   */
  dispose(): void {
    this.logger?.info('Disposing Canvas SDK');
    this.eventBus?.emit('sdk:disposing', {});

    // 停止渲染
    if (this.renderingService?.isRunning()) {
      this.renderingService.stop();
    }

    // 清理形状管理器
    if (!this.canvasManager) {
      return;
    }
    
    this.canvasManager.dispose();

    // 清理 DI 容器
    this.container.dispose();

    this.canvas = null;
    this.isInitialized = false;
    this.logger?.info('Canvas SDK disposed');
  }
}

// 删除工厂函数，直接使用 new CanvasSDK() 创建实例