/**
 * 画布视图模型服务 - DI集成的MVVM ViewModel
 */

import { injectable, Inject } from '../di/ServiceIdentifier';
import { CanvasViewModel, ICanvasState, IViewportState } from '../viewmodels/canvas/CanvasViewModel';
import { IShapeRepositoryService } from './ShapeRepositoryService';
import { IEventBusService } from '../di/ServiceIdentifiers';
import { ShapeEntity } from '../models/entities/Shape';

/**
 * 画布视图模型服务接口
 */
export interface ICanvasViewModelService {
  /**
   * 初始化视图模型
   */
  initialize(initialViewport?: Partial<IViewportState>): Promise<void>;

  /**
   * 获取当前状态
   */
  getState(): Readonly<ICanvasState> | null;

  /**
   * 获取底层视图模型
   */
  getViewModel(): CanvasViewModel | null;

  /**
   * 形状操作
   */
  addShape(shape: ShapeEntity): Promise<void>;
  addShapes(shapes: ShapeEntity[]): Promise<void>;
  updateShape(id: string, updates: Partial<ShapeEntity>): Promise<void>;
  removeShape(id: string): Promise<void>;
  removeShapes(ids: string[]): Promise<void>;
  clearShapes(): Promise<void>;

  /**
   * 选择操作
   */
  selectShape(id: string): void;
  selectShapes(ids: string[]): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  selectAll(): void;
  getSelectedShapes(): ShapeEntity[];

  /**
   * 视口操作
   */
  setViewport(viewport: Partial<IViewportState>): void;
  getViewport(): IViewportState | null;
  zoomIn(factor?: number): void;
  zoomOut(factor?: number): void;
  resetZoom(): void;
  panViewport(deltaX: number, deltaY: number): void;

  /**
   * 工具操作
   */
  setCurrentTool(tool: string): void;
  getCurrentTool(): string;

  /**
   * 事件订阅
   */
  onStateChanged(callback: (state: ICanvasState, changes: Partial<ICanvasState>) => void): () => void;
  onSelectionChanged(callback: (selectedIds: string[]) => void): () => void;
  onViewportChanged(callback: (viewport: IViewportState) => void): () => void;

  /**
   * 销毁
   */
  dispose(): void;
}

/**
 * 画布视图模型服务实现
 */
@injectable
export class CanvasViewModelService implements ICanvasViewModelService {
  private viewModel: CanvasViewModel | null = null;
  private initialized = false;

  constructor(
    @Inject('IShapeRepositoryService') private shapeRepository: IShapeRepositoryService,
    @Inject('IEventBusService') private eventBus: IEventBusService
  ) {}

  async initialize(initialViewport: Partial<IViewportState> = {}): Promise<void> {
    if (this.initialized) return;

    // 确保仓储已初始化
    await this.shapeRepository.initialize();

    // 创建视图模型
    const defaultViewport: IViewportState = {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      zoom: 1,
      ...initialViewport
    };

    this.viewModel = new CanvasViewModel(this.shapeRepository, defaultViewport);

    // 桥接视图模型事件到全局事件总线
    this.bridgeEvents();

    this.initialized = true;

    // 通知全局事件总线
    this.eventBus.emit('viewmodel:initialized', { 
      viewport: defaultViewport 
    });
  }

  private bridgeEvents(): void {
    if (!this.viewModel) return;

    this.viewModel.on('state:changed', (data) => {
      this.eventBus.emit('canvas:state:changed', data);
    });

    this.viewModel.on('shapes:changed', (data) => {
      this.eventBus.emit('canvas:shapes:changed', data);
    });

    this.viewModel.on('selection:changed', (data) => {
      this.eventBus.emit('canvas:selection:changed', data);
    });

    this.viewModel.on('viewport:changed', (data) => {
      this.eventBus.emit('canvas:viewport:changed', data);
    });

    this.viewModel.on('tool:changed', (data) => {
      this.eventBus.emit('canvas:tool:changed', data);
    });
  }

  getState(): Readonly<ICanvasState> | null {
    return this.viewModel?.getState() || null;
  }

  getViewModel(): CanvasViewModel | null {
    return this.viewModel;
  }

  // 形状操作
  async addShape(shape: ShapeEntity): Promise<void> {
    await this.viewModel?.addShape(shape);
    this.eventBus.emit('shape:added', { shape });
  }

  async addShapes(shapes: ShapeEntity[]): Promise<void> {
    await this.viewModel?.addShapes(shapes);
    this.eventBus.emit('shapes:added', { shapes });
  }

  async updateShape(id: string, updates: Partial<ShapeEntity>): Promise<void> {
    await this.viewModel?.updateShape(id, updates);
    this.eventBus.emit('shape:updated', { id, updates });
  }

  async removeShape(id: string): Promise<void> {
    await this.viewModel?.removeShape(id);
    this.eventBus.emit('shape:removed', { id });
  }

  async removeShapes(ids: string[]): Promise<void> {
    await this.viewModel?.removeShapes(ids);
    this.eventBus.emit('shapes:removed', { ids });
  }

  async clearShapes(): Promise<void> {
    await this.viewModel?.clearShapes();
    this.eventBus.emit('shapes:cleared', {});
  }

  // 选择操作
  selectShape(id: string): void {
    this.viewModel?.selectShape(id);
  }

  selectShapes(ids: string[]): void {
    this.viewModel?.selectShapes(ids);
  }

  deselectShape(id: string): void {
    this.viewModel?.deselectShape(id);
  }

  clearSelection(): void {
    this.viewModel?.clearSelection();
  }

  selectAll(): void {
    this.viewModel?.selectAll();
  }

  getSelectedShapes(): ShapeEntity[] {
    return this.viewModel?.getSelectedShapes() || [];
  }

  // 视口操作
  setViewport(viewport: Partial<IViewportState>): void {
    this.viewModel?.setViewport(viewport);
  }

  getViewport(): IViewportState | null {
    return this.getState()?.viewport || null;
  }

  zoomIn(factor?: number): void {
    this.viewModel?.zoomIn(factor);
  }

  zoomOut(factor?: number): void {
    this.viewModel?.zoomOut(factor);
  }

  resetZoom(): void {
    this.viewModel?.resetZoom();
  }

  panViewport(deltaX: number, deltaY: number): void {
    this.viewModel?.panViewport(deltaX, deltaY);
  }

  // 工具操作
  setCurrentTool(tool: string): void {
    this.viewModel?.setCurrentTool(tool);
  }

  getCurrentTool(): string {
    return this.getState()?.currentTool || 'select';
  }

  // 事件订阅
  onStateChanged(callback: (state: ICanvasState, changes: Partial<ICanvasState>) => void): () => void {
    return this.eventBus.on('canvas:state:changed', (data: any) => {
      callback(data.state, data.changes);
    });
  }

  onSelectionChanged(callback: (selectedIds: string[]) => void): () => void {
    return this.eventBus.on('canvas:selection:changed', (data: any) => {
      callback(data.selectedIds);
    });
  }

  onViewportChanged(callback: (viewport: IViewportState) => void): () => void {
    return this.eventBus.on('canvas:viewport:changed', (data: any) => {
      callback(data.viewport);
    });
  }

  dispose(): void {
    if (this.viewModel) {
      this.viewModel.dispose();
      this.viewModel = null;
    }
    this.initialized = false;
    this.eventBus.emit('viewmodel:disposed', {});
  }
}