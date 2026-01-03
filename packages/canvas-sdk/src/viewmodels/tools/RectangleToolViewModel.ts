import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IRectangleEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IViewModel } from '../interfaces/IViewModel';

export interface IRectangleToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  currentShape: IRectangleEntity | null;
  cursor: string;
  enabled: boolean;
}

export interface IRectangleToolViewModel extends IViewModel {
  state: IRectangleToolState;
  
  activate(): void;
  deactivate(): void;
  
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  isCurrentlyDrawing(): boolean;
  getCurrentShape(): IRectangleEntity | null;
}

export const IRectangleToolViewModel = createDecorator<IRectangleToolViewModel>('RectangleToolViewModel');

export class RectangleToolViewModel implements IRectangleToolViewModel {
  private readonly _state: IRectangleToolState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager
  ) {
    this._state = proxy<IRectangleToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): IRectangleToolState {
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

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;
    
    this._state.isDrawing = true;
    this._state.startPoint = { x, y };
    
    this._state.currentShape = ShapeEntityFactory.createRectangle(
      { x, y },
      { width: 0, height: 0 },
      {
        fillColor: '#3b82f6',
        strokeColor: '#1e40af',
        strokeWidth: 2,
        opacity: 1
      }
    );
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing || !this._state.startPoint || !this._state.currentShape) return;
    
    const width = Math.abs(x - this._state.startPoint.x);
    const height = Math.abs(y - this._state.startPoint.y);
    const position = {
      x: Math.min(this._state.startPoint.x, x),
      y: Math.min(this._state.startPoint.y, y)
    };

    this._state.currentShape = {
      ...this._state.currentShape,
      transform: {
        ...this._state.currentShape.transform,
        position
      },
      size: { width, height }
    };
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing || !this._state.currentShape) return;
    
    this._state.isDrawing = false;
    
    if (this._state.currentShape.size.width < 5 || this._state.currentShape.size.height < 5) {
      this.reset();
      return;
    }
    
    this.canvasManager.addShape(this._state.currentShape);
    
    this.reset();
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): IRectangleEntity | null {
    return this._state.currentShape;
  }

  private reset(): void {
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
  }
}
