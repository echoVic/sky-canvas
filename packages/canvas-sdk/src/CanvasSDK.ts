/**
 * 基于依赖注入的 Canvas SDK 实现
 * 采用 VSCode DI 架构设计
 */

import { injectable, inject, optional } from './di/ServiceIdentifier';
import type { ServicesAccessor } from './di/ServiceIdentifier';
import { ServiceCollection } from './di/ServiceCollection';
import { InstantiationService } from './di/InstantiationService';
import * as ServiceIds from './di/ServiceIdentifiers';
import {
  ICanvasRenderingService,
  IInteractionService,
  IHistoryService,
  IAnimationService,
  IEventBusService,
  IShapeService,
  ILayerService,
  ISelectionService,
  IViewportService,
  IToolService,
  IImportExportService,
  IConfigurationService,
  ILogService
} from './di/ServiceIdentifiers';

/**
 * SDK 配置选项
 */
export interface ICanvasSDKConfig {
  renderEngine?: 'webgl' | 'canvas2d' | 'webgpu';
  enableInteraction?: boolean;
  enableAnimation?: boolean;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  viewport?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zoom?: number;
  };
}

/**
 * SDK 事件类型
 */
export interface ICanvasSDKEvents {
  'sdk:initialized': { canvas: HTMLCanvasElement; config: ICanvasSDKConfig };
  'sdk:disposing': {};
  'shape:added': { shape: any };
  'shape:removed': { shape: any };
  'shape:updated': { shape: any; updates: any };
  'shape:selected': { shape: any; selected: boolean };
  'shape:deselected': { shape: any; selected: boolean };
  'selection:cleared': {};
  'viewport:changed': { viewport: any; oldViewport?: any };
  'interaction:mode:changed': { mode: any };
  'render:started': {};
  'render:stopped': {};
  'error': { error: Error; context: string };
}

/**
 * 基于依赖注入的 Canvas SDK
 */
@injectable
export class CanvasSDK {
  private isInitialized = false;
  private canvas: HTMLCanvasElement | null = null;
  private config: ICanvasSDKConfig = {};

  private renderingService: ICanvasRenderingService;
  private eventBus: IEventBusService;
  private configService: IConfigurationService;
  private logger: ILogService;
  private interactionService?: IInteractionService;
  private shapeService?: IShapeService;
  private selectionService?: ISelectionService;
  private viewportService?: IViewportService;
  private historyService?: IHistoryService;
  private animationService?: IAnimationService;
  private layerService?: ILayerService;
  private toolService?: IToolService;
  private importExportService?: IImportExportService;

  constructor(accessor: ServicesAccessor) {
    // 获取所有必需的服务
    this.renderingService = accessor.get(ServiceIds.ICanvasRenderingService);
    this.eventBus = accessor.get(ServiceIds.IEventBusService);
    this.configService = accessor.get(ServiceIds.IConfigurationService);
    this.logger = accessor.get(ServiceIds.ILogService);
    
    // 获取所有可选的服务（使用 try-catch 处理可选服务）
    try { this.interactionService = accessor.get(ServiceIds.IInteractionService); } catch {}
    try { this.shapeService = accessor.get(ServiceIds.IShapeService); } catch {}
    try { this.selectionService = accessor.get(ServiceIds.ISelectionService); } catch {}
    try { this.viewportService = accessor.get(ServiceIds.IViewportService); } catch {}
    try { this.historyService = accessor.get(ServiceIds.IHistoryService); } catch {}
    try { this.animationService = accessor.get(ServiceIds.IAnimationService); } catch {}
    try { this.layerService = accessor.get(ServiceIds.ILayerService); } catch {}
    try { this.toolService = accessor.get(ServiceIds.IToolService); } catch {}
    try { this.importExportService = accessor.get(ServiceIds.IImportExportService); } catch {}
    
    this.setupEventHandlers();
    this.logger.info('CanvasSDK instance created');
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
      enableAnimation: true,
      logLevel: 'info',
      ...config
    };

    this.logger.info('Initializing Canvas SDK', { config: this.config });

    try {
      // 设置配置
      this.configService.set('renderEngine', this.config.renderEngine);
      this.configService.set('enableInteraction', this.config.enableInteraction);
      this.configService.set('enableAnimation', this.config.enableAnimation);

      if (this.config.logLevel) {
        this.logger.setLevel(this.config.logLevel);
      }

      // 初始化渲染服务
      await this.renderingService.initialize(canvas, this.config);
      this.logger.debug('Rendering service initialized');

      // 初始化交互服务
      if (this.config.enableInteraction && this.interactionService) {
        this.interactionService.initialize(canvas);
        this.logger.debug('Interaction service initialized');
      }

      // 设置初始视口
      if (this.config.viewport && this.viewportService) {
        this.viewportService.setViewport(this.config.viewport);
        this.logger.debug('Viewport initialized', this.config.viewport);
      }

      this.isInitialized = true;
      this.eventBus.emit('sdk:initialized', { canvas, config: this.config });
      this.logger.info('Canvas SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Canvas SDK', error);
      this.eventBus.emit('error', { error: error as Error, context: 'initialization' });
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听各种服务事件并转发或处理
    this.eventBus.on('shape:added', (data: any) => {
      this.logger.debug('Shape added', data.shape?.id);
    });

    this.eventBus.on('shape:selected', (data: any) => {
      this.logger.debug('Shape selected', data.shape?.id);
    });

    this.eventBus.on('error', (data: any) => {
      this.logger.error(`Error in ${data.context}:`, data.error);
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
  addShape(shape: any): void {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    this.shapeService.addShape(shape);
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    this.shapeService.removeShape(id);
  }

  /**
   * 获取形状
   */
  getShape(id: string): any | undefined {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    return this.shapeService.getShape(id);
  }

  /**
   * 获取所有形状
   */
  getShapes(): any[] {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    return this.shapeService.getShapes();
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: any): void {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    this.shapeService.updateShape(id, updates);
  }

  /**
   * 清空所有形状
   */
  clearShapes(): void {
    if (!this.shapeService) {
      throw new Error('Shape service not available');
    }
    this.shapeService.clearShapes();
  }

  // ============== 选择系统 API ==============

  /**
   * 选择形状
   */
  selectShape(id: string): void {
    if (!this.selectionService) {
      throw new Error('Selection service not available');
    }
    this.selectionService.selectShape(id);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    if (!this.selectionService) {
      throw new Error('Selection service not available');
    }
    this.selectionService.deselectShape(id);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    if (!this.selectionService) {
      throw new Error('Selection service not available');
    }
    this.selectionService.clearSelection();
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): any[] {
    if (!this.selectionService) {
      throw new Error('Selection service not available');
    }
    return this.selectionService.getSelectedShapes();
  }

  /**
   * 检查形状是否被选中
   */
  isSelected(id: string): boolean {
    if (!this.selectionService) {
      throw new Error('Selection service not available');
    }
    return this.selectionService.isSelected(id);
  }

  // ============== 视口控制 API ==============

  /**
   * 获取视口
   */
  getViewport(): any {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    return this.viewportService.getViewport();
  }

  /**
   * 设置视口
   */
  setViewport(viewport: any): void {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    this.viewportService.setViewport(viewport);
  }

  /**
   * 平移视口
   */
  panViewport(delta: any): void {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    this.viewportService.panViewport(delta);
  }

  /**
   * 缩放视口
   */
  zoomViewport(factor: number, center?: any): void {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    this.viewportService.zoomViewport(factor, center);
  }

  /**
   * 适应到内容
   */
  fitToContent(): void {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    this.viewportService.fitToContent();
  }

  /**
   * 重置视口
   */
  resetViewport(): void {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    this.viewportService.resetViewport();
  }

  // ============== 坐标转换 API ==============

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(point: any): any {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    return this.viewportService.screenToWorld(point);
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(point: any): any {
    if (!this.viewportService) {
      throw new Error('Viewport service not available');
    }
    return this.viewportService.worldToScreen(point);
  }

  // ============== 历史记录 API ==============

  /**
   * 撤销操作
   */
  undo(): void {
    if (!this.historyService) {
      throw new Error('History service not available');
    }
    this.historyService.undo();
  }

  /**
   * 重做操作
   */
  redo(): void {
    if (!this.historyService) {
      throw new Error('History service not available');
    }
    this.historyService.redo();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    if (!this.historyService) {
      return false;
    }
    return this.historyService.canUndo();
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    if (!this.historyService) {
      return false;
    }
    return this.historyService.canRedo();
  }

  // ============== 交互系统 API ==============

  /**
   * 设置活动工具
   */
  setActiveTool(toolName: string | null): boolean {
    if (!this.interactionService) {
      throw new Error('Interaction service not available');
    }
    return this.interactionService.setActiveTool(toolName);
  }

  /**
   * 获取当前工具
   */
  getActiveTool(): any {
    if (!this.interactionService) {
      throw new Error('Interaction service not available');
    }
    return this.interactionService.getActiveTool();
  }

  /**
   * 注册工具
   */
  registerTool(tool: any): void {
    if (!this.interactionService) {
      throw new Error('Interaction service not available');
    }
    this.interactionService.registerTool(tool);
  }

  // ============== 渲染控制 API ==============

  /**
   * 开始渲染
   */
  startRender(): void {
    this.renderingService.start();
    this.eventBus.emit('render:started', {});
    this.logger.debug('Rendering started');
  }

  /**
   * 停止渲染
   */
  stopRender(): void {
    this.renderingService.stop();
    this.eventBus.emit('render:stopped', {});
    this.logger.debug('Rendering stopped');
  }

  /**
   * 手动渲染一帧
   */
  render(): void {
    this.renderingService.render();
  }

  /**
   * 检查是否在渲染
   */
  isRendering(): boolean {
    return this.renderingService.isRunning();
  }

  /**
   * 获取渲染统计
   */
  getRenderStats(): any {
    return this.renderingService.getStats();
  }

  // ============== 动画 API ==============

  /**
   * 创建动画
   */
  animate(target: any, props: any, config?: any): any {
    if (!this.animationService) {
      throw new Error('Animation service not available');
    }
    return this.animationService.animate(target, props, config);
  }

  /**
   * 创建时间线
   */
  createTimeline(): any {
    if (!this.animationService) {
      throw new Error('Animation service not available');
    }
    return this.animationService.createTimeline();
  }

  // ============== 导入导出 API ==============

  /**
   * 导出为 SVG
   */
  exportToSVG(options?: any): string {
    if (!this.importExportService || !this.shapeService) {
      throw new Error('Import/Export service or Shape service not available');
    }
    const shapes = this.shapeService.getShapes();
    return this.importExportService.exportToSVG(shapes, options);
  }

  /**
   * 导出为 PNG
   */
  async exportToPNG(options?: any): Promise<Blob> {
    if (!this.importExportService || !this.canvas) {
      throw new Error('Import/Export service not available or canvas not initialized');
    }
    return this.importExportService.exportToPNG(this.canvas, options);
  }

  /**
   * 导出为 JSON
   */
  exportToJSON(): string {
    if (!this.importExportService) {
      throw new Error('Import/Export service not available');
    }
    // 需要构建场景对象
    const scene = {
      shapes: this.shapeService?.getShapes() || [],
      viewport: this.viewportService?.getViewport() || {},
      config: this.config
    };
    return this.importExportService.exportToJSON(scene);
  }

  // ============== 事件系统 API ==============

  /**
   * 监听事件
   */
  on<K extends keyof ICanvasSDKEvents>(event: K, handler: (data: ICanvasSDKEvents[K]) => void): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 取消监听事件
   */
  off<K extends keyof ICanvasSDKEvents>(event: K, handler?: (data: ICanvasSDKEvents[K]) => void): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 监听事件（一次性）
   */
  once<K extends keyof ICanvasSDKEvents>(event: K, handler: (data: ICanvasSDKEvents[K]) => void): void {
    this.eventBus.once(event, handler);
  }

  /**
   * 发出事件
   */
  emit<K extends keyof ICanvasSDKEvents>(event: K, data: ICanvasSDKEvents[K]): void {
    this.eventBus.emit(event, data);
  }

  // ============== 配置 API ==============

  /**
   * 获取配置值
   */
  getConfigValue<T>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }

  /**
   * 设置配置值
   */
  setConfigValue<T>(key: string, value: T): void {
    this.configService.set(key, value);
  }

  // ============== 资源管理 ==============

  /**
   * 销毁 SDK
   */
  dispose(): void {
    this.logger.info('Disposing Canvas SDK');
    this.eventBus.emit('sdk:disposing', {});

    // 停止渲染
    if (this.renderingService.isRunning()) {
      this.renderingService.stop();
    }

    // 停止动画
    if (this.animationService) {
      this.animationService.stopAll();
    }

    // 清理事件监听器
    this.eventBus.removeAllListeners();

    this.canvas = null;
    this.isInitialized = false;
    this.logger.info('Canvas SDK disposed');
  }
}
