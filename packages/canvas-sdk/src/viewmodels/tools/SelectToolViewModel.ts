import { proxy } from 'valtio';

import { ShapeEntity } from '../../models/entities/Shape';
import { createDecorator } from '../../di';
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

export type { HandleType, HandlePosition, IBounds, ISelectToolState, IInitialShapeState } from './selection';

export type ISelectToolViewModel = ISelectToolViewModelType;

export const ISelectToolViewModel = createDecorator<ISelectToolViewModelType>('SelectToolViewModel');

export class SelectToolViewModel implements ISelectToolViewModelType {
  private readonly _state: ISelectToolStateType;
  private draggedShapeId: string | null = null;
  private initialShapeStates: Map<string, IInitialShapeState> = new Map();
  private resizeHandler: SelectToolResizeHandler;
  private rotateHandler: SelectToolRotateHandler;

  constructor(
    @ISelectionService private selectionService: ISelectionService,
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
      this.initialShapeStates
    );
    this.rotateHandler = new SelectToolRotateHandler(
      this._state,
      canvasManager,
      this.initialShapeStates
    );
  }

  get state(): ISelectToolStateType {
    return this._state;
  }

  async initialize(): Promise<void> {}

  dispose(): void {
    this.deactivate();
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'default';
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
    }
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    if (this._state.isSelecting && this._state.startPoint) {
      this.completeMarqueeSelect(x, y);
    }

    this.emitEndEvents();
    this.resetState();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this._state.enabled) return;

    switch (event.key) {
      case 'Escape':
        this.canvasManager.clearSelection();
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

  startResize(handle: HandlePosition, x: number, y: number): void {
    this.resizeHandler.startResize(handle, x, y);
  }

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
    for (const shape of this.canvasManager.getShapesByZOrder()) {
      if (shape.locked) continue;
      if (boundsIntersect(bounds, getShapeBounds(shape))) {
        this.canvasManager.selectShape(shape.id);
      }
    }
  }

  private deleteSelectedShapes(): void {
    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length === 0) return;

    for (const shape of selectedShapes) {
      this.canvasManager.removeShape(shape.id);
    }
  }

  private selectAllShapes(): void {
    const allShapes = this.canvasManager.getShapesByZOrder();
    for (const shape of allShapes) {
      if (!shape.locked) {
        this.canvasManager.selectShape(shape.id);
      }
    }
  }

  private emitEndEvents(): void {
    if (this._state.isResizing) {
      this.initialShapeStates.clear();
    }
    if (this._state.isRotating) {
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
