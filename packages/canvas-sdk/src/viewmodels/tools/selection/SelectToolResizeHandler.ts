import { ShapeEntity } from '../../../models/entities/Shape';
import { ICanvasManager } from '../../../managers/CanvasManager';
import { HandlePosition, IInitialShapeState, ISelectToolState } from './SelectToolTypes';

export class SelectToolResizeHandler {
  constructor(
    private state: ISelectToolState,
    private canvasManager: ICanvasManager,
    private initialShapeStates: Map<string, IInitialShapeState>
  ) {}

  startResize(handle: HandlePosition, x: number, y: number): void {
    this.state.isResizing = true;
    this.state.activeHandle = handle;
    this.state.startPoint = { x, y };
    this.state.lastPoint = { x, y };
    this.saveInitialShapeStates();
  }

  handleResize(x: number, y: number): void {
    if (!this.state.startPoint || !this.state.activeHandle) return;

    const deltaX = x - this.state.startPoint.x;
    const deltaY = y - this.state.startPoint.y;
    const handle = this.state.activeHandle;

    const selectedShapes = this.canvasManager.getSelectedShapes();

    for (const shape of selectedShapes) {
      const initial = this.initialShapeStates.get(shape.id);
      if (!initial) continue;

      if (shape.type === 'rectangle' && initial.size) {
        const updates = this.calculateRectResize(initial, handle, deltaX, deltaY);
        this.canvasManager.updateShape(shape.id, updates);
      } else if (shape.type === 'circle' && initial.radius !== undefined) {
        const updates = this.calculateCircleResize(initial, deltaX, deltaY);
        this.canvasManager.updateShape(shape.id, updates);
      }
    }
  }

  saveInitialShapeStates(): void {
    this.initialShapeStates.clear();
    const selectedShapes = this.canvasManager.getSelectedShapes();

    for (const shape of selectedShapes) {
      const state: IInitialShapeState = {
        transform: {
          ...shape.transform,
          position: { ...shape.transform.position },
          scale: { ...shape.transform.scale }
        }
      };

      if (shape.type === 'rectangle') {
        state.size = { width: shape.size.width, height: shape.size.height };
      } else if (shape.type === 'circle') {
        state.radius = shape.radius;
      }

      this.initialShapeStates.set(shape.id, state);
    }
  }

  private calculateRectResize(
    initial: IInitialShapeState,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const size = initial.size!;
    const pos = initial.transform.position;
    let newWidth = size.width;
    let newHeight = size.height;
    let newX = pos.x;
    let newY = pos.y;

    switch (handle) {
      case 'e':
        newWidth = Math.max(10, size.width + deltaX);
        break;
      case 'w':
        newWidth = Math.max(10, size.width - deltaX);
        newX = pos.x + deltaX;
        break;
      case 's':
        newHeight = Math.max(10, size.height + deltaY);
        break;
      case 'n':
        newHeight = Math.max(10, size.height - deltaY);
        newY = pos.y + deltaY;
        break;
      case 'se':
        newWidth = Math.max(10, size.width + deltaX);
        newHeight = Math.max(10, size.height + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(10, size.width - deltaX);
        newHeight = Math.max(10, size.height + deltaY);
        newX = pos.x + deltaX;
        break;
      case 'ne':
        newWidth = Math.max(10, size.width + deltaX);
        newHeight = Math.max(10, size.height - deltaY);
        newY = pos.y + deltaY;
        break;
      case 'nw':
        newWidth = Math.max(10, size.width - deltaX);
        newHeight = Math.max(10, size.height - deltaY);
        newX = pos.x + deltaX;
        newY = pos.y + deltaY;
        break;
    }

    return {
      transform: { ...initial.transform, position: { x: newX, y: newY } },
      size: { width: newWidth, height: newHeight }
    } as Partial<ShapeEntity>;
  }

  private calculateCircleResize(
    initial: IInitialShapeState,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const radius = initial.radius!;
    const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    const sign = deltaX + deltaY > 0 ? 1 : -1;
    const newRadius = Math.max(5, radius + delta * sign);

    return { radius: newRadius } as Partial<ShapeEntity>;
  }
}
