import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IPathEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IViewModel } from '../interfaces/IViewModel';

export interface IArrowToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  endPoint: IPoint | null;
  currentShape: IPathEntity | null;
  cursor: string;
  enabled: boolean;
}

export interface IArrowToolViewModel extends IViewModel {
  state: IArrowToolState;

  activate(): void;
  deactivate(): void;

  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  isCurrentlyDrawing(): boolean;
  getCurrentShape(): IPathEntity | null;
}

export const IArrowToolViewModel = createDecorator<IArrowToolViewModel>('ArrowToolViewModel');

export class ArrowToolViewModel implements IArrowToolViewModel {
  private readonly _state: IArrowToolState;
  private readonly arrowHeadSize = 12;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager
  ) {
    this._state = proxy<IArrowToolState>({
      isDrawing: false,
      startPoint: null,
      endPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): IArrowToolState {
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
    this._state.cursor = 'crosshair';
  }

  deactivate(): void {
    this._state.enabled = false;
    this.reset();
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    this._state.isDrawing = true;
    this._state.startPoint = { x, y };
    this._state.endPoint = { x, y };

    const pathData = this.generateArrowPath(x, y, x, y);
    this._state.currentShape = ShapeEntityFactory.createPath(
      pathData,
      { x: 0, y: 0 },
      {
        strokeColor: '#8b5cf6',
        strokeWidth: 2,
        opacity: 1
      }
    );
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.startPoint || !this._state.currentShape) return;

    this._state.endPoint = { x, y };

    const pathData = this.generateArrowPath(
      this._state.startPoint.x,
      this._state.startPoint.y,
      x,
      y
    );

    this._state.currentShape = {
      ...this._state.currentShape,
      pathData
    };
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.currentShape || !this._state.startPoint) return;

    this._state.isDrawing = false;

    const dx = x - this._state.startPoint.x;
    const dy = y - this._state.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 10) {
      this.reset();
      return;
    }

    this.canvasManager.addShape(this._state.currentShape);

    this.reset();
  }

  private generateArrowPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const ux = dx / length;
    const uy = dy / length;

    const arrowBase = {
      x: x2 - ux * this.arrowHeadSize,
      y: y2 - uy * this.arrowHeadSize
    };

    const perpX = -uy * (this.arrowHeadSize * 0.5);
    const perpY = ux * (this.arrowHeadSize * 0.5);

    const arrowLeft = {
      x: arrowBase.x + perpX,
      y: arrowBase.y + perpY
    };
    const arrowRight = {
      x: arrowBase.x - perpX,
      y: arrowBase.y - perpY
    };

    return `M ${x1} ${y1} L ${x2} ${y2} M ${arrowLeft.x} ${arrowLeft.y} L ${x2} ${y2} L ${arrowRight.x} ${arrowRight.y}`;
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): IPathEntity | null {
    return this._state.currentShape;
  }

  private reset(): void {
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.endPoint = null;
    this._state.currentShape = null;
  }
}
