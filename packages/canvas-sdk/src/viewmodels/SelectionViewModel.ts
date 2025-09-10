/**
 * 选择 ViewModel 实现
 * 使用 Valtio 管理选择状态
 */

import { proxy, snapshot } from 'valtio';
import { ShapeEntity } from '../models/entities/Shape';
import { ShapeAdapter } from '../models/entities/ShapeAdapter';
import { ISelectionViewModel, ISelectionState } from './interfaces/IViewModel';
import { IEventBusService } from '../di/ServiceIdentifiers';

export class SelectionViewModel implements ISelectionViewModel {
  private readonly _state: ISelectionState;

  constructor(
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<ISelectionState>({
      selectedShapeIds: [],
      isMultiSelect: false,
      selectionBounds: undefined
    });
  }

  get state(): ISelectionState {
    return this._state;
  }

  async initialize(): Promise<void> {
    // 发布初始化完成事件
    this.eventBus.emit('selection:initialized', {});
  }

  dispose(): void {
    // 清理资源
    this._state.selectedShapeIds = [];
    this._state.selectionBounds = undefined;
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  selectShape(id: string): void {
    if (this._state.selectedShapeIds.includes(id)) {
      return; // 已经选中
    }

    const oldSelection = this.getSelectedIds();
    
    // 如果不是多选模式，清空之前的选择
    if (!this._state.isMultiSelect) {
      this._state.selectedShapeIds = [];
    }
    
    this._state.selectedShapeIds.push(id);

    // 发布事件
    this.eventBus.emit('selection:shape-selected', {
      id,
      selectedIds: this.getSelectedIds(),
      previousSelection: oldSelection
    });
  }

  deselectShape(id: string): void {
    const index = this._state.selectedShapeIds.indexOf(id);
    if (index < 0) {
      return; // 未选中
    }

    const oldSelection = this.getSelectedIds();
    this._state.selectedShapeIds.splice(index, 1);

    // 发布事件
    this.eventBus.emit('selection:shape-deselected', {
      id,
      selectedIds: this.getSelectedIds(),
      previousSelection: oldSelection
    });
  }

  clearSelection(): void {
    if (this._state.selectedShapeIds.length === 0) {
      return; // 已经是空选择
    }

    const oldSelection = this.getSelectedIds();
    this._state.selectedShapeIds = [];
    this._state.selectionBounds = undefined;

    // 发布事件
    this.eventBus.emit('selection:cleared', {
      previousSelection: oldSelection
    });
  }

  selectMultiple(ids: string[]): void {
    const oldSelection = this.getSelectedIds();
    
    // 启用多选模式
    this._state.isMultiSelect = true;
    
    // 更新选择
    this._state.selectedShapeIds = [...new Set(ids)]; // 去重

    // 发布事件
    this.eventBus.emit('selection:multiple-selected', {
      ids,
      selectedIds: this.getSelectedIds(),
      previousSelection: oldSelection
    });
  }

  addToSelection(ids: string[]): void {
    const oldSelection = this.getSelectedIds();
    
    // 启用多选模式
    this._state.isMultiSelect = true;
    
    // 添加新的选择（去重）
    for (const id of ids) {
      if (!this._state.selectedShapeIds.includes(id)) {
        this._state.selectedShapeIds.push(id);
      }
    }

    // 发布事件
    this.eventBus.emit('selection:shapes-added', {
      addedIds: ids,
      selectedIds: this.getSelectedIds(),
      previousSelection: oldSelection
    });
  }

  removeFromSelection(ids: string[]): void {
    const oldSelection = this.getSelectedIds();
    let removed = false;
    
    // 移除指定的选择
    for (const id of ids) {
      const index = this._state.selectedShapeIds.indexOf(id);
      if (index >= 0) {
        this._state.selectedShapeIds.splice(index, 1);
        removed = true;
      }
    }

    if (removed) {
      // 如果只剩一个选择，退出多选模式
      if (this._state.selectedShapeIds.length <= 1) {
        this._state.isMultiSelect = false;
      }

      // 发布事件
      this.eventBus.emit('selection:shapes-removed', {
        removedIds: ids,
        selectedIds: this.getSelectedIds(),
        previousSelection: oldSelection
      });
    }
  }

  isSelected(id: string): boolean {
    return this._state.selectedShapeIds.includes(id);
  }

  getSelectedIds(): string[] {
    return [...this._state.selectedShapeIds];
  }

  updateSelectionBounds(shapes: ShapeEntity[]): void {
    if (this._state.selectedShapeIds.length === 0 || shapes.length === 0) {
      this._state.selectionBounds = undefined;
      return;
    }

    // 筛选出选中的形状
    const selectedShapes = shapes.filter(shape => 
      this._state.selectedShapeIds.includes(shape.id)
    );

    if (selectedShapes.length === 0) {
      this._state.selectionBounds = undefined;
      return;
    }

    // 计算选择边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of selectedShapes) {
      const bounds = ShapeAdapter.getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    this._state.selectionBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // 发布事件
    this.eventBus.emit('selection:bounds-updated', {
      bounds: this._state.selectionBounds,
      selectedShapeCount: selectedShapes.length
    });
  }

  // 移除这个方法，直接使用 ShapeAdapter
}