/**
 * 选择交互 ViewModel
 * 管理形状选择和拖拽交互逻辑
 */

import { proxy } from 'valtio';

import { IPoint, Shape } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { ISelectionService } from '../../services/selection/selectionService';
import { IViewModel } from '../types/IViewModel';

/**
 * 选择状态
 */
export interface ISelectionState {
  isSelecting: boolean;
  startPoint: IPoint | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 选择 ViewModel 接口
 */
export interface ISelectionViewModel extends IViewModel {
  state: ISelectionState;

  // 交互控制
  activate(): void;
  deactivate(): void;
  
  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  // 键盘事件
  handleKeyDown(event: KeyboardEvent): void;
  
  // 状态查询
  getSelectedShapes(): Shape[];
  getSelectionCount(): number;
}

/**
 * 选择 ViewModel 服务标识符
 */
export const ISelectionViewModel = createDecorator<ISelectionViewModel>('SelectionViewModel');

/**
 * 选择 ViewModel 实现
 */
export class SelectionViewModel implements ISelectionViewModel {
  private readonly _state: ISelectionState;

  constructor(
    @ISelectionService private selectionService: ISelectionService,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<ISelectionState>({
      isSelecting: false,
      startPoint: null,
      cursor: 'default',
      enabled: false
    });
  }

  get state(): ISelectionState {
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

  getSelectedShapes(): Shape[] {
    // TODO: 通过 CanvasManager 获取选中形状
    return [];
  }

  getSelectionCount(): number {
    // TODO: 通过 CanvasManager 获取选中数量
    return 0;
  }
}