/**
 * 选择工具 ViewModel
 * 直接使用 SelectionService - 简单的工具 ViewModel
 */

import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { ShapeEntity } from '../../models/entities/Shape';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { ISelectionService } from '../../services/selection/selectionService';
import { IViewModel } from '../interfaces/IViewModel';

/**
 * 选择工具状态
 */
export interface ISelectToolState {
  isSelecting: boolean;
  startPoint: IPoint | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 选择工具 ViewModel 接口
 */
export interface ISelectToolViewModel extends IViewModel {
  state: ISelectToolState;
  
  // 工具控制
  activate(): void;
  deactivate(): void;
  
  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  // 键盘事件
  handleKeyDown(event: KeyboardEvent): void;
  
  // 状态查询
  getSelectedShapes(): ShapeEntity[];
  getSelectionCount(): number;
}

/**
 * 选择工具 ViewModel 实现
 */
export class SelectToolViewModel implements ISelectToolViewModel {
  private readonly _state: ISelectToolState;

  constructor(
    private selectionService: ISelectionService,
    private eventBus: IEventBusService
  ) {
    this._state = proxy<ISelectToolState>({
      isSelecting: false,
      startPoint: null,
      cursor: 'default',
      enabled: false
    });
  }

  get state(): ISelectToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('select-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('select-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  // === 工具控制 ===

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'default';
    this.eventBus.emit('tool:activated', { toolName: 'select' });
  }

  deactivate(): void {
    this._state.enabled = false;
    this._state.isSelecting = false;
    this._state.startPoint = null;
  }

  // === 鼠标事件 ===

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;
    
    this._state.isSelecting = true;
    this._state.startPoint = { x, y };
    
    // 实现点选逻辑
    // TODO: 需要通过 CanvasManager 进行 hitTest 和选择操作
    // const hitShapeId = this.canvasManager.hitTest(x, y);
    // if (hitShapeId) {
    //   if (!event?.shiftKey) {
    //     this.selectionService.clearSelection();
    //   }
    //   this.selectionService.select(hitShapeId);
    // } else {
    //   if (!event?.shiftKey) {
    //     this.selectionService.clearSelection();
    //   }
    // }
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isSelecting) return;
    
    // TODO: 实现拖选逻辑
    // 这里可以实现选择框的绘制
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;
    
    if (this._state.isSelecting) {
      this._state.isSelecting = false;
      // TODO: 完成选择操作
    }
    
    this._state.startPoint = null;
  }

  // === 键盘事件 ===

  handleKeyDown(event: KeyboardEvent): void {
    if (!this._state.enabled) return;
    
    switch (event.key) {
      case 'Escape':
        this.selectionService.clearSelection();
        break;
      case 'Delete':
      case 'Backspace':
        // TODO: 通过 CanvasManager 删除选中元素
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          // TODO: 通过 CanvasManager 全选
          event.preventDefault();
        }
        break;
    }
  }

  // === 状态查询 ===

  getSelectedShapes(): ShapeEntity[] {
    // TODO: 通过 CanvasManager 获取选中形状
    return [];
  }

  getSelectionCount(): number {
    // TODO: 通过 CanvasManager 获取选中数量
    return 0;
  }
}