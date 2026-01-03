/**
 * Canvas ViewModel - 复杂模式
 * 使用 CanvasManager 协调复杂的画布业务逻辑
 */

import { proxy, snapshot } from 'valtio';
import { ICanvasManager } from '../managers/CanvasManager';
import { IViewModel } from './interfaces/IViewModel';
import { ShapeEntity } from '../models/entities/Shape';

/**
 * Canvas 状态
 */
export interface ICanvasState {
  // 形状管理
  shapes: ShapeEntity[];
  selectedShapes: ShapeEntity[];
  
  // 画布状态
  isDrawing: boolean;
  isDragging: boolean;
  currentTool: string;
  
  // 剪贴板状态
  canPaste: boolean;
  clipboardCount: number;
  
  // 历史状态
  canUndo: boolean;
  canRedo: boolean;
  
  // 统计信息
  totalShapes: number;
  selectedCount: number;
}

/**
 * Canvas ViewModel 接口
 */
export interface ICanvasViewModel extends IViewModel {
  state: ICanvasState;
  
  // 形状操作
  addShape(shape: ShapeEntity): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<ShapeEntity>): void;
  
  // 选择操作
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  selectAll(): void;
  
  // 剪贴板操作
  copy(): void;
  cut(): void;
  paste(): void;
  
  // 历史操作
  undo(): void;
  redo(): void;
  
  // 点击测试
  hitTest(x: number, y: number): string | null;
  
  // 状态查询
  getSelectedShapes(): ShapeEntity[];
  canPerformAction(action: string): boolean;
}

/**
 * Canvas ViewModel 实现
 */
export class CanvasViewModel implements ICanvasViewModel {
  private readonly _state: ICanvasState;

  constructor(
    private canvasManager: ICanvasManager
  ) {
    this._state = proxy<ICanvasState>({
      shapes: [],
      selectedShapes: [],
      isDrawing: false,
      isDragging: false,
      currentTool: 'select',
      canPaste: false,
      clipboardCount: 0,
      canUndo: false,
      canRedo: false,
      totalShapes: 0,
      selectedCount: 0
    });
  }

  get state(): ICanvasState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.updateState();
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  dispose(): void {
  }

  // === 形状操作 ===

  addShape(shape: ShapeEntity): void {
    this.canvasManager.addShape(shape);
  }

  removeShape(id: string): void {
    this.canvasManager.removeShape(id);
  }

  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    this.canvasManager.updateShape(id, updates);
  }

  // === 选择操作 ===

  selectShape(id: string): void {
    this.canvasManager.selectShape(id);
  }

  deselectShape(id: string): void {
    this.canvasManager.deselectShape(id);
  }

  clearSelection(): void {
    this.canvasManager.clearSelection();
  }

  selectAll(): void {
    const renderables = this.canvasManager.getRenderables();
    renderables.forEach(renderable => {
      const id = (renderable as any).id;
      if (id) this.canvasManager.selectShape(id);
    });
  }

  // === 剪贴板操作 ===

  copy(): void {
    this.canvasManager.copySelectedShapes();
  }

  cut(): void {
    this.canvasManager.cutSelectedShapes();
  }

  paste(): void {
    this.canvasManager.paste();
  }

  // === 历史操作 ===

  undo(): void {
    this.canvasManager.undo();
  }

  redo(): void {
    this.canvasManager.redo();
  }

  // === 其他操作 ===

  hitTest(x: number, y: number): string | null {
    return this.canvasManager.hitTest(x, y);
  }

  getSelectedShapes(): ShapeEntity[] {
    return this.canvasManager.getSelectedShapes();
  }

  canPerformAction(action: string): boolean {
    switch (action) {
      case 'copy':
      case 'cut':
        return this._state.selectedCount > 0;
      case 'paste':
        return this._state.canPaste;
      case 'undo':
        return this._state.canUndo;
      case 'redo':
        return this._state.canRedo;
      case 'delete':
        return this._state.selectedCount > 0;
      case 'selectAll':
        return this._state.totalShapes > 0;
      default:
        return false;
    }
  }

  // === 私有方法 ===

  /**
   * 更新完整状态
   */
  private updateState(): void {
    this.updateShapesState();
    this.updateSelectionState();
    this.updateClipboardState();
    this.updateHistoryState();
  }

  /**
   * 更新形状相关状态
   */
  private updateShapesState(): void {
    const stats = this.canvasManager.getStats();
    this._state.totalShapes = stats.shapes.totalShapes;
  }

  /**
   * 更新选择相关状态
   */
  private updateSelectionState(): void {
    const selectedShapes = this.canvasManager.getSelectedShapes();
    this._state.selectedShapes = selectedShapes;
    this._state.selectedCount = selectedShapes.length;
  }

  /**
   * 更新剪贴板相关状态
   */
  private updateClipboardState(): void {
    this._state.canPaste = true;
  }

  /**
   * 更新历史相关状态
   */
  private updateHistoryState(): void {
    const stats = this.canvasManager.getStats();
    this._state.canUndo = stats.history.canUndo;
    this._state.canRedo = stats.history.canRedo;
  }
}
