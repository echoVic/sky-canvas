/**
 * 选择工具旋转处理器
 */

import { ICanvasManager } from '../../../managers/CanvasManager';
import { IEventBusService } from '../../../services/eventBus/eventBusService';
import { IInitialShapeState, ISelectToolState } from './SelectToolTypes';
import { getSelectionBounds } from './SelectToolBoundsUtils';

/**
 * 旋转处理器
 */
export class SelectToolRotateHandler {
  constructor(
    private state: ISelectToolState,
    private canvasManager: ICanvasManager,
    private eventBus: IEventBusService,
    private initialShapeStates: Map<string, IInitialShapeState>
  ) {}

  /**
   * 开始旋转操作
   */
  startRotate(x: number, y: number): void {
    this.state.isRotating = true;
    this.state.activeHandle = 'rotate';
    this.state.startPoint = { x, y };
    this.state.lastPoint = { x, y };
    this.saveInitialShapeStates();
    this.eventBus.emit('select-tool:rotate-start', { x, y });
  }

  /**
   * 处理旋转
   */
  handleRotate(x: number, y: number): void {
    if (!this.state.startPoint) return;

    const selectedShapes = this.canvasManager.getSelectedShapes();
    if (selectedShapes.length === 0) return;

    // 计算选择区域中心
    const bounds = getSelectionBounds(selectedShapes);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // 计算旋转角度
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

    this.eventBus.emit('select-tool:rotating', { angle: deltaAngle });
  }

  /**
   * 保存初始形状状态
   */
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
