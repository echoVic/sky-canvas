/**
 * 直线工具 ViewModel
 * 使用 CanvasManager 进行形状管理
 */

import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IPathEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../interfaces/IViewModel';

/**
 * 直线工具状态
 */
export interface ILineToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  endPoint: IPoint | null;
  currentShape: IPathEntity | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 直线工具 ViewModel 接口
 */
export interface ILineToolViewModel extends IViewModel {
  state: ILineToolState;

  activate(): void;
  deactivate(): void;

  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  isCurrentlyDrawing(): boolean;
  getCurrentShape(): IPathEntity | null;
}

/**
 * 直线工具 ViewModel 服务标识符
 */
export const ILineToolViewModel = createDecorator<ILineToolViewModel>('LineToolViewModel');

/**
 * 直线工具 ViewModel 实现
 */
export class LineToolViewModel implements ILineToolViewModel {
  private readonly _state: ILineToolState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<ILineToolState>({
      isDrawing: false,
      startPoint: null,
      endPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): ILineToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('line-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('line-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'line' });
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

    // 创建初始路径（起点到起点）
    const pathData = `M ${x} ${y} L ${x} ${y}`;
    this._state.currentShape = ShapeEntityFactory.createPath(
      pathData,
      { x: 0, y: 0 },
      {
        strokeColor: '#6366f1',
        strokeWidth: 2,
        opacity: 1
      }
    );

    this.eventBus.emit('tool:drawingStarted', { tool: 'line' });
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.startPoint || !this._state.currentShape) return;

    this._state.endPoint = { x, y };

    // 更新路径数据
    const pathData = `M ${this._state.startPoint.x} ${this._state.startPoint.y} L ${x} ${y}`;
    this._state.currentShape = {
      ...this._state.currentShape,
      pathData
    };
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.currentShape || !this._state.startPoint) return;

    this._state.isDrawing = false;

    // 计算线段长度
    const dx = x - this._state.startPoint.x;
    const dy = y - this._state.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // 检查长度是否足够
    if (length < 5) {
      this.reset();
      return;
    }

    this.canvasManager.addShape(this._state.currentShape);
    this.eventBus.emit('tool:drawingEnded', { tool: 'line' });

    this.reset();
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
