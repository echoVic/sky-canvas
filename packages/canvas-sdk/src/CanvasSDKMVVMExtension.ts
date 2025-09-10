/**
 * CanvasSDK的MVVM扩展
 * 为现有CanvasSDK添加MVVM模式支持
 */

import { CanvasSDK } from './CanvasSDK';
import type { ServicesAccessor } from './di/ServiceIdentifier';
import { ICanvasViewModelService, IShapeRepositoryService } from './di/MVVMServiceIdentifiers';
import { ICanvasState, IViewportState } from './viewmodels/canvas/CanvasViewModel';
import { ShapeEntity, ShapeEntityFactory } from './models/entities/Shape';

/**
 * MVVM扩展配置
 */
export interface IMVVMExtensionConfig {
  enableMVVM?: boolean;
  initialViewport?: Partial<IViewportState>;
}

/**
 * CanvasSDK的MVVM扩展类
 * 为现有SDK添加MVVM模式功能，不破坏原有架构
 */
export class CanvasSDKMVVMExtension {
  private sdk: CanvasSDK;
  private viewModelService: ICanvasViewModelService | null = null;
  private repositoryService: IShapeRepositoryService | null = null;
  private enabled = false;

  constructor(sdk: CanvasSDK) {
    this.sdk = sdk;
  }

  /**
   * 启用MVVM模式
   */
  async enable(config: IMVVMExtensionConfig = {}): Promise<void> {
    if (this.enabled) return;

    try {
      // 获取MVVM服务
      const accessor = (this.sdk as any).accessor as ServicesAccessor;
      
      this.repositoryService = accessor.get(IShapeRepositoryService);
      this.viewModelService = accessor.get(ICanvasViewModelService);

      // 初始化视图模型服务
      await this.viewModelService.initialize(config.initialViewport);

      this.enabled = true;

      console.log('CanvasSDK MVVM模式已启用');
    } catch (error) {
      console.error('启用MVVM模式失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否启用了MVVM模式
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取当前状态 (MVVM模式)
   */
  getState(): Readonly<ICanvasState> | null {
    if (!this.enabled || !this.viewModelService) {
      throw new Error('MVVM模式未启用');
    }
    return this.viewModelService.getState();
  }

  /**
   * 获取视图模型服务
   */
  getViewModelService(): ICanvasViewModelService | null {
    if (!this.enabled) {
      throw new Error('MVVM模式未启用');
    }
    return this.viewModelService;
  }

  /**
   * 获取仓储服务
   */
  getRepositoryService(): IShapeRepositoryService | null {
    if (!this.enabled) {
      throw new Error('MVVM模式未启用');
    }
    return this.repositoryService;
  }

  // ========================================
  // 形状操作API (MVVM模式)
  // ========================================

  /**
   * 添加形状
   */
  async addShape(shape: ShapeEntity): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.addShape(shape);
  }

  /**
   * 批量添加形状
   */
  async addShapes(shapes: ShapeEntity[]): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.addShapes(shapes);
  }

  /**
   * 更新形状
   */
  async updateShape(id: string, updates: Partial<ShapeEntity>): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.updateShape(id, updates);
  }

  /**
   * 删除形状
   */
  async removeShape(id: string): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.removeShape(id);
  }

  /**
   * 批量删除形状
   */
  async removeShapes(ids: string[]): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.removeShapes(ids);
  }

  /**
   * 清空所有形状
   */
  async clearShapes(): Promise<void> {
    this.ensureEnabled();
    await this.viewModelService!.clearShapes();
  }

  // ========================================
  // 选择操作API (MVVM模式)
  // ========================================

  /**
   * 选择形状
   */
  selectShape(id: string): void {
    this.ensureEnabled();
    this.viewModelService!.selectShape(id);
  }

  /**
   * 批量选择形状
   */
  selectShapes(ids: string[]): void {
    this.ensureEnabled();
    this.viewModelService!.selectShapes(ids);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    this.ensureEnabled();
    this.viewModelService!.deselectShape(id);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    this.ensureEnabled();
    this.viewModelService!.clearSelection();
  }

  /**
   * 全选
   */
  selectAll(): void {
    this.ensureEnabled();
    this.viewModelService!.selectAll();
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeEntity[] {
    this.ensureEnabled();
    return this.viewModelService!.getSelectedShapes();
  }

  // ========================================
  // 视口操作API (MVVM模式)
  // ========================================

  /**
   * 设置视口
   */
  setViewport(viewport: Partial<IViewportState>): void {
    this.ensureEnabled();
    this.viewModelService!.setViewport(viewport);
  }

  /**
   * 获取视口
   */
  getViewport(): IViewportState | null {
    this.ensureEnabled();
    return this.viewModelService!.getViewport();
  }

  /**
   * 放大
   */
  zoomIn(factor?: number): void {
    this.ensureEnabled();
    this.viewModelService!.zoomIn(factor);
  }

  /**
   * 缩小
   */
  zoomOut(factor?: number): void {
    this.ensureEnabled();
    this.viewModelService!.zoomOut(factor);
  }

  /**
   * 重置缩放
   */
  resetZoom(): void {
    this.ensureEnabled();
    this.viewModelService!.resetZoom();
  }

  /**
   * 平移视口
   */
  panViewport(deltaX: number, deltaY: number): void {
    this.ensureEnabled();
    this.viewModelService!.panViewport(deltaX, deltaY);
  }

  // ========================================
  // 工具操作API (MVVM模式)
  // ========================================

  /**
   * 设置当前工具
   */
  setCurrentTool(tool: string): void {
    this.ensureEnabled();
    this.viewModelService!.setCurrentTool(tool);
  }

  /**
   * 获取当前工具
   */
  getCurrentTool(): string {
    this.ensureEnabled();
    return this.viewModelService!.getCurrentTool();
  }

  // ========================================
  // 形状工厂方法 (MVVM模式)
  // ========================================

  /**
   * 创建矩形
   */
  createRectangle(x: number, y: number, width: number, height: number): ShapeEntity {
    return ShapeEntityFactory.createRectangle(
      { x, y },
      { width, height }
    );
  }

  /**
   * 创建圆形
   */
  createCircle(x: number, y: number, radius: number): ShapeEntity {
    return ShapeEntityFactory.createCircle({ x, y }, radius);
  }

  /**
   * 创建文本
   */
  createText(x: number, y: number, text: string): ShapeEntity {
    return ShapeEntityFactory.createText(text, { x, y });
  }

  /**
   * 创建路径
   */
  createPath(pathData: string, x: number = 0, y: number = 0): ShapeEntity {
    return ShapeEntityFactory.createPath(pathData, { x, y });
  }

  // ========================================
  // 事件订阅API (MVVM模式)
  // ========================================

  /**
   * 订阅状态变化
   */
  onStateChanged(callback: (state: ICanvasState, changes: Partial<ICanvasState>) => void): () => void {
    this.ensureEnabled();
    return this.viewModelService!.onStateChanged(callback);
  }

  /**
   * 订阅选择变化
   */
  onSelectionChanged(callback: (selectedIds: string[]) => void): () => void {
    this.ensureEnabled();
    return this.viewModelService!.onSelectionChanged(callback);
  }

  /**
   * 订阅视口变化
   */
  onViewportChanged(callback: (viewport: IViewportState) => void): () => void {
    this.ensureEnabled();
    return this.viewModelService!.onViewportChanged(callback);
  }

  // ========================================
  // 统计和调试API (MVVM模式)
  // ========================================

  /**
   * 获取仓储统计信息
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    visible: number;
    selected: number;
  }> {
    this.ensureEnabled();
    return await this.repositoryService!.getStats();
  }

  /**
   * 禁用MVVM模式
   */
  disable(): void {
    if (!this.enabled) return;

    if (this.viewModelService) {
      this.viewModelService.dispose();
      this.viewModelService = null;
    }

    this.repositoryService = null;
    this.enabled = false;

    console.log('CanvasSDK MVVM模式已禁用');
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new Error('MVVM模式未启用，请先调用 enable() 方法');
    }
  }
}

/**
 * 为CanvasSDK实例添加MVVM扩展
 */
export function addMVVMExtension(sdk: CanvasSDK): CanvasSDKMVVMExtension {
  return new CanvasSDKMVVMExtension(sdk);
}

/**
 * 扩展CanvasSDK类型声明
 */
declare module './CanvasSDK' {
  interface CanvasSDK {
    /**
     * MVVM扩展实例
     */
    mvvm?: CanvasSDKMVVMExtension;
  }
}