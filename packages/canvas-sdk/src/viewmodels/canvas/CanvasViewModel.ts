/**
 * 画布视图模型
 * MVVM架构中的ViewModel层 - 连接View和Model，管理状态和业务逻辑
 */

import { ShapeEntity } from '../../models/entities/Shape';
import { IRepositoryEvent, IShapeRepository } from '../../models/repositories/IShapeRepository';

export interface IViewportState {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface ICanvasState {
  shapes: ShapeEntity[];
  selectedShapes: string[];
  viewport: IViewportState;
  currentTool: string;
  isDrawing: boolean;
  isDragging: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface ICanvasViewModelEvents {
  'state:changed': { state: ICanvasState; changes: Partial<ICanvasState> };
  'shapes:changed': { shapes: ShapeEntity[] };
  'selection:changed': { selectedIds: string[] };
  'viewport:changed': { viewport: IViewportState };
  'tool:changed': { tool: string };
}

/**
 * 画布视图模型
 */
export class CanvasViewModel {
  private state: ICanvasState;
  private shapeRepository: IShapeRepository;
  private eventListeners = new Map<string, Set<Function>>();
  private repositoryUnsubscribe?: () => void;

  constructor(
    shapeRepository: IShapeRepository,
    initialViewport: IViewportState = { x: 0, y: 0, width: 800, height: 600, zoom: 1 }
  ) {
    this.shapeRepository = shapeRepository;
    this.state = {
      shapes: [],
      selectedShapes: [],
      viewport: initialViewport,
      currentTool: 'select',
      isDrawing: false,
      isDragging: false,
      showGrid: false,
      snapToGrid: false,
      gridSize: 20
    };

    this.initializeRepository();
  }

  private async initializeRepository(): Promise<void> {
    // 加载现有形状
    const shapes = await this.shapeRepository.getAll();
    this.updateState({ shapes });

    // 订阅仓储变化
    this.repositoryUnsubscribe = this.shapeRepository.subscribe((event) => {
      this.handleRepositoryEvent(event);
    });
  }

  private handleRepositoryEvent(event: IRepositoryEvent): void {
    switch (event.type) {
      case 'added':
      case 'updated':
      case 'removed':
      case 'cleared':
        // 重新加载所有形状以保持同步
        this.refreshShapes();
        break;
    }
  }

  private async refreshShapes(): Promise<void> {
    const shapes = await this.shapeRepository.getAll();
    this.updateState({ shapes });
    this.emit('shapes:changed', { shapes });
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<ICanvasState> {
    return { ...this.state };
  }

  /**
   * 更新状态
   */
  private updateState(changes: Partial<ICanvasState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...changes };
    
    this.emit('state:changed', { 
      state: this.getState(), 
      changes 
    });

    // 发出特定变化事件
    if (changes.selectedShapes) {
      this.emit('selection:changed', { selectedIds: changes.selectedShapes });
    }
    if (changes.viewport) {
      this.emit('viewport:changed', { viewport: changes.viewport });
    }
    if (changes.currentTool) {
      this.emit('tool:changed', { tool: changes.currentTool });
    }
  }

  /**
   * 形状管理
   */
  async addShape(shape: ShapeEntity): Promise<void> {
    await this.shapeRepository.add(shape);
  }

  async addShapes(shapes: ShapeEntity[]): Promise<void> {
    await this.shapeRepository.addBatch(shapes);
  }

  async updateShape(id: string, updates: Partial<ShapeEntity>): Promise<void> {
    await this.shapeRepository.update(id, updates);
  }

  async updateShapes(updates: Array<{ id: string; updates: Partial<ShapeEntity> }>): Promise<void> {
    await this.shapeRepository.updateBatch(updates);
  }

  async removeShape(id: string): Promise<void> {
    await this.shapeRepository.remove(id);
    // 如果删除的形状被选中，从选择中移除
    if (this.state.selectedShapes.includes(id)) {
      this.updateState({
        selectedShapes: this.state.selectedShapes.filter(shapeId => shapeId !== id)
      });
    }
  }

  async removeShapes(ids: string[]): Promise<void> {
    await this.shapeRepository.removeBatch(ids);
    // 从选择中移除被删除的形状
    const remainingSelected = this.state.selectedShapes.filter(id => !ids.includes(id));
    if (remainingSelected.length !== this.state.selectedShapes.length) {
      this.updateState({ selectedShapes: remainingSelected });
    }
  }

  async clearShapes(): Promise<void> {
    await this.shapeRepository.clear();
    this.updateState({ selectedShapes: [] });
  }

  /**
   * 选择管理
   */
  selectShape(id: string): void {
    if (!this.state.selectedShapes.includes(id)) {
      this.updateState({
        selectedShapes: [...this.state.selectedShapes, id]
      });
    }
  }

  selectShapes(ids: string[]): void {
    const newSelection = Array.from(new Set([...this.state.selectedShapes, ...ids]));
    if (newSelection.length !== this.state.selectedShapes.length) {
      this.updateState({ selectedShapes: newSelection });
    }
  }

  deselectShape(id: string): void {
    const newSelection = this.state.selectedShapes.filter(shapeId => shapeId !== id);
    if (newSelection.length !== this.state.selectedShapes.length) {
      this.updateState({ selectedShapes: newSelection });
    }
  }

  deselectShapes(ids: string[]): void {
    const newSelection = this.state.selectedShapes.filter(id => !ids.includes(id));
    if (newSelection.length !== this.state.selectedShapes.length) {
      this.updateState({ selectedShapes: newSelection });
    }
  }

  clearSelection(): void {
    if (this.state.selectedShapes.length > 0) {
      this.updateState({ selectedShapes: [] });
    }
  }

  selectAll(): void {
    const allIds = this.state.shapes.map(shape => shape.id);
    this.updateState({ selectedShapes: allIds });
  }

  /**
   * 工具管理
   */
  setCurrentTool(tool: string): void {
    if (this.state.currentTool !== tool) {
      this.updateState({ currentTool: tool });
    }
  }

  /**
   * 视口管理
   */
  setViewport(viewport: Partial<IViewportState>): void {
    this.updateState({
      viewport: { ...this.state.viewport, ...viewport }
    });
  }

  zoomIn(factor: number = 1.2): void {
    const newZoom = Math.min(this.state.viewport.zoom * factor, 10);
    this.setViewport({ zoom: newZoom });
  }

  zoomOut(factor: number = 0.8): void {
    const newZoom = Math.max(this.state.viewport.zoom * factor, 0.1);
    this.setViewport({ zoom: newZoom });
  }

  resetZoom(): void {
    this.setViewport({ zoom: 1 });
  }

  panViewport(deltaX: number, deltaY: number): void {
    this.setViewport({
      x: this.state.viewport.x + deltaX,
      y: this.state.viewport.y + deltaY
    });
  }

  /**
   * 绘制状态管理
   */
  setDrawing(isDrawing: boolean): void {
    if (this.state.isDrawing !== isDrawing) {
      this.updateState({ isDrawing });
    }
  }

  setDragging(isDragging: boolean): void {
    if (this.state.isDragging !== isDragging) {
      this.updateState({ isDragging });
    }
  }

  /**
   * 网格管理
   */
  toggleGrid(): void {
    this.updateState({ showGrid: !this.state.showGrid });
  }

  toggleSnapToGrid(): void {
    this.updateState({ snapToGrid: !this.state.snapToGrid });
  }

  setGridSize(size: number): void {
    if (this.state.gridSize !== size && size > 0) {
      this.updateState({ gridSize: size });
    }
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeEntity[] {
    return this.state.shapes.filter(shape => 
      this.state.selectedShapes.includes(shape.id)
    );
  }

  /**
   * 获取可见形状
   */
  getVisibleShapes(): ShapeEntity[] {
    return this.state.shapes.filter(shape => shape.visible);
  }

  /**
   * 事件系统
   */
  on<K extends keyof ICanvasViewModelEvents>(
    event: K, 
    listener: (data: ICanvasViewModelEvents[K]) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }

  private emit<K extends keyof ICanvasViewModelEvents>(
    event: K, 
    data: ICanvasViewModelEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(data);
        } catch {
        }
      });
    }
  }

  /**
   * 销毁
   */
  dispose(): void {
    if (this.repositoryUnsubscribe) {
      this.repositoryUnsubscribe();
    }
    this.eventListeners.clear();
  }
}