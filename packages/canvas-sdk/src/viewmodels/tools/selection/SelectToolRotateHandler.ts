import { ICanvasManager } from '../../../managers/CanvasManager';
import { IInitialShapeState, ISelectToolState } from './SelectToolTypes';
import { getSelectionBounds } from './SelectToolBoundsUtils';

export class SelectToolRotateHandler {
  constructor(
    private state: ISelectToolState,
    private canvasManager: ICanvasManager,
    private initialShapeStates: Map<string, IInitialShapeState>
  ) {}

  startRotate(x: number, y: number): void {
    this.state.isRotating = true;
    this.state.activeHandle = 'rotate';
    this.state.startPoint = { x, y };
    this.state.lastPoint = { x, y };
    this.saveInitialShapeStates();
  }

  handleRotate(x: number, y: number): void {
    if (!this.state.startPoint) return;

    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length === 0) return;

    const bounds = getSelectionBounds(selectedShapes);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const startAngle = Math.atan2(
      this.state.startPoint.y - centerY,
      this.state.startPoint.x - centerX
    );
    const currentAngle = Math.atan2(y - centerY, x - centerX);
    const deltaAngle = currentAngle - startAngle;

    for (const shape of selectedShapes) {
      const initial = this.initialShapeStates.get(shape.id);
      if (!initial) continue;

      const newRotation = initial.transform.rotation + deltaAngle;
      this.canvasManager.updateShape(shape.id, {
        transform: { ...shape.transform, rotation: newRotation }
      });
    }
  }

  private saveInitialShapeStates(): void {
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
}
