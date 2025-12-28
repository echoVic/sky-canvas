/**
 * 选择工具 ViewModel
 * 实现点选、拖拽、框选和删除功能
 */

import { proxy } from 'valtio';

import { ShapeEntity } from '../../models/entities/Shape';
import { createDecorator } from '../../di';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { ISelectionService } from '../../services/selection/selectionService';
import { ICanvasManager } from '../../managers/CanvasManager';
import {
  ISelectToolState as ISelectToolStateType,
  ISelectToolViewModel as ISelectToolViewModelType,
  IInitialShapeState,
  HandlePosition,
  getShapeBounds,
  boundsIntersect,
  getCursorForHandle,
  hitTestControlHandle,
  SelectToolResizeHandler,
  SelectToolRotateHandler
} from './selection';

// 重新导出类型
export type { HandleType, HandlePosition, IBounds, ISelectToolState, IInitialShapeState } from './selection';

/**
 * 选择工具 ViewModel 接口类型
 */
export type ISelectToolViewModel = ISelectToolViewModelType;

/**
 * 选择工具 ViewModel 服务标识符
 */
export const ISelectToolViewModel = createDecorator<ISelectToolViewModelType>('SelectToolViewModel');

/**
 * 选择工具 ViewModel 实现
 */
export class SelectToolViewModel implements ISelectToolViewModelType {
  private readonly _state: ISelectToolStateType;
  private draggedShapeId: string | null = null;
  private initialShapeStates: Map<string, IInitialShapeState> = new Map();
  private resizeHandler: SelectToolResizeHandler;
  private rotateHandler: SelectToolRotateHandler;

  constructor(
    @ISelectionService private selectionService: ISelectionService,
    @IEventBusService private eventBus: IEventBusService,
    @ICanvasManager private canvasManager: ICanvasManager
  ) {
    this._state = proxy<ISelectToolStateType>({
      isSelecting: false,
      isDragging: false,
      isResizing: false,
      isRotating: false,
      startPoint: null,
      lastPoint: null,
      cursor: 'default',
      enabled: false,
      activeHandle: null
    });

    this.resizeHandler = new SelectToolResizeHandler(
      this._state,
      canvasManager,
      eventBus,
      this.initialShapeStates
    );
    this.rotateHandler = new SelectToolRotateHandler(
      this._state,
      canvasManager,
      eventBus,
      this.initialShapeStates
    );
  }

  get state(): ISelectToolStateType {
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

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;

    this._state.startPoint = { x, y };
    this._state.lastPoint = { x, y };

    // 检查控制手柄
    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length > 0) {
      const handle = hitTestControlHandle(x, y, selectedShapes);
      if (handle) {
        if (handle.type === 'rotate') {
          this.rotateHandler.startRotate(x, y);
          return;
        } else if (handle.type === 'resize') {
          this.resizeHandler.startResize(handle.position, x, y);
          return;
        }
      }
    }

    // hitTest
    const hitShapeId = this.canvasManager.hitTest(x, y);

    if (hitShapeId) {
      const isAlreadySelected = this.canvasManager.isShapeSelected(hitShapeId);

      if (event?.shiftKey) {
        if (isAlreadySelected) {
          this.canvasManager.deselectShape(hitShapeId);
        } else {
          this.canvasManager.selectShape(hitShapeId);
        }
      } else {
        if (!isAlreadySelected) {
          this.canvasManager.clearSelection();
          this.canvasManager.selectShape(hitShapeId);
        }
        this._state.isDragging = true;
        this.draggedShapeId = hitShapeId;
        this._state.cursor = 'move';
      }
    } else {
      if (!event?.shiftKey) {
        this.canvasManager.clearSelection();
      }
      this._state.isSelecting = true;
    }

    this.eventBus.emit('select-tool:mousedown', { x, y, hitShapeId });
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    if (this._state.isResizing) {
      this.resizeHandler.handleResize(x, y);
    } else if (this._state.isRotating) {
      this.rotateHandler.handleRotate(x, y);
    } else if (!this._state.isDragging && !this._state.isSelecting) {
      this.updateHoverCursor(x, y);
    }

    if (this._state.isDragging && this._state.lastPoint) {
      this.handleDrag(x, y);
    } else if (this._state.isSelecting && this._state.startPoint) {
      this.eventBus.emit('select-tool:marquee', {
        startX: this._state.startPoint.x,
        startY: this._state.startPoint.y,
        currentX: x,
        currentY: y
      });
    }
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    if (this._state.isSelecting && this._state.startPoint) {
      this.completeMarqueeSelect(x, y);
    }

    this.emitEndEvents(x, y);
    this.resetState();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this._state.enabled) return;

    switch (event.key) {
      case 'Escape':
        this.canvasManager.clearSelection();
        this.eventBus.emit('select-tool:escape', {});
        break;
      case 'Delete':
      case 'Backspace':
        this.deleteSelectedShapes();
        event.preventDefault();
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          this.selectAllShapes();
          event.preventDefault();
        }
        break;
    }
  }

  getSelectedShapes(): ShapeEntity[] {
    return this.canvasManager.getSelectedShapes();
  }

  getSelectionCount(): number {
    return this.canvasManager.getSelectedShapes().length;
  }

  /**
   * 开始缩放（供外部调用或测试）
   */
  startResize(handle: HandlePosition, x: number, y: number): void {
    this.resizeHandler.startResize(handle, x, y);
  }

  /**
   * 开始旋转（供外部调用或测试）
   */
  startRotate(x: number, y: number): void {
    this.rotateHandler.startRotate(x, y);
  }

  private updateHoverCursor(x: number, y: number): void {
    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length > 0) {
      const handle = hitTestControlHandle(x, y, selectedShapes);
      this._state.cursor = handle ? getCursorForHandle(handle.position) : 'default';
    }
  }

  private handleDrag(x: number, y: number): void {
    const deltaX = x - this._state.lastPoint!.x;
    const deltaY = y - this._state.lastPoint!.y;

    for (const shape of this.canvasManager.getSelectedShapes()) {
      const newPosition = {
        x: shape.transform.position.x + deltaX,
        y: shape.transform.position.y + deltaY
      };
      this.canvasManager.updateShape(shape.id, {
        transform: { ...shape.transform, position: newPosition }
      });
    }

    this._state.lastPoint = { x, y };
    this.eventBus.emit('select-tool:drag', { x, y, deltaX, deltaY });
  }

  private completeMarqueeSelect(x: number, y: number): void {
    const minX = Math.min(this._state.startPoint!.x, x);
    const minY = Math.min(this._state.startPoint!.y, y);
    const maxX = Math.max(this._state.startPoint!.x, x);
    const maxY = Math.max(this._state.startPoint!.y, y);

    if (maxX - minX > 5 || maxY - minY > 5) {
      this.performMarqueeSelect({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }
  }

  private performMarqueeSelect(bounds: { x: number; y: number; width: number; height: number }): void {
    let selectedCount = 0;

    for (const shape of this.canvasManager.getShapesByZOrder()) {
      if (shape.locked) continue;
      if (boundsIntersect(bounds, getShapeBounds(shape))) {
        this.canvasManager.selectShape(shape.id);
        selectedCount++;
      }
    }

    this.eventBus.emit('select-tool:marquee-complete', { bounds, selectedCount });
  }

  private deleteSelectedShapes(): void {
    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length === 0) return;

    const deletedIds = selectedShapes.map(s => s.id);
    for (const shape of selectedShapes) {
      this.canvasManager.removeShape(shape.id);
    }
    this.eventBus.emit('select-tool:shapes-deleted', { ids: deletedIds });
  }

  private selectAllShapes(): void {
    const allShapes = this.canvasManager.getShapesByZOrder();
    for (const shape of allShapes) {
      if (!shape.locked) {
        this.canvasManager.selectShape(shape.id);
      }
    }
    this.eventBus.emit('select-tool:select-all', { count: allShapes.length });
  }

  private emitEndEvents(x: number, y: number): void {
    if (this._state.isDragging) {
      this.eventBus.emit('select-tool:drag-end', { x, y });
    }
    if (this._state.isResizing) {
      this.eventBus.emit('select-tool:resize-end', { x, y });
      this.initialShapeStates.clear();
    }
    if (this._state.isRotating) {
      this.eventBus.emit('select-tool:rotate-end', { x, y });
      this.initialShapeStates.clear();
    }
  }

  private resetState(): void {
    this._state.isSelecting = false;
    this._state.isDragging = false;
    this._state.isResizing = false;
    this._state.isRotating = false;
    this._state.startPoint = null;
    this._state.lastPoint = null;
    this._state.cursor = 'default';
    this._state.activeHandle = null;
    this.draggedShapeId = null;
  }
}
