/**
 * 圆形工具 ViewModel
 * 使用 CanvasManager 进行形状管理
 */

import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { ICircleEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../interfaces/IViewModel';

/**
 * 圆形工具状态
 */
export interface ICircleToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  currentShape: ICircleEntity | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 圆形工具 ViewModel 接口
 */
export interface ICircleToolViewModel extends IViewModel {
  state: ICircleToolState;

  activate(): void;
  deactivate(): void;

  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  isCurrentlyDrawing(): boolean;
  getCurrentShape(): ICircleEntity | null;
}

/**
 * 圆形工具 ViewModel 服务标识符
 */
export const ICircleToolViewModel = createDecorator<ICircleToolViewModel>('CircleToolViewModel');

/**
 * 圆形工具 ViewModel 实现
 */
export class CircleToolViewModel implements ICircleToolViewModel {
  private readonly _state: ICircleToolState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<ICircleToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): ICircleToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('circle-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('circle-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'circle' });
  }

  deactivate(): void {
    this._state.enabled = false;
    this.reset();
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    this._state.isDrawing = true;
    this._state.startPoint = { x, y };

    this._state.currentShape = ShapeEntityFactory.createCircle(
      { x, y },
      0,
      {
        fillColor: '#10b981',
        strokeColor: '#047857',
        strokeWidth: 2,
        opacity: 1
      }
    );

    this.eventBus.emit('tool:drawingStarted', { tool: 'circle' });
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.startPoint || !this._state.currentShape) return;

    // 计算半径（从起点到当前点的距离）
    const dx = x - this._state.startPoint.x;
    const dy = y - this._state.startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    this._state.currentShape = {
      ...this._state.currentShape,
      radius
    };
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.currentShape) return;

    this._state.isDrawing = false;

    // 检查半径是否足够大
    if (this._state.currentShape.radius < 5) {
      this.reset();
      return;
    }

    this.canvasManager.addShape(this._state.currentShape);
    this.eventBus.emit('tool:drawingEnded', { tool: 'circle' });

    this.reset();
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): ICircleEntity | null {
    return this._state.currentShape;
  }

  private reset(): void {
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
  }
}
