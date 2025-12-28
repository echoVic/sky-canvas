/**
 * 箭头工具 ViewModel
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
 * 箭头工具状态
 */
export interface IArrowToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  endPoint: IPoint | null;
  currentShape: IPathEntity | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 箭头工具 ViewModel 接口
 */
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

/**
 * 箭头工具 ViewModel 服务标识符
 */
export const IArrowToolViewModel = createDecorator<IArrowToolViewModel>('ArrowToolViewModel');

/**
 * 箭头工具 ViewModel 实现
 */
export class ArrowToolViewModel implements IArrowToolViewModel {
  private readonly _state: IArrowToolState;
  private readonly arrowHeadSize = 12;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
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

  async initialize(): Promise<void> {
    this.eventBus.emit('arrow-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('arrow-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'arrow' });
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

    // 创建初始箭头路径
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

    this.eventBus.emit('tool:drawingStarted', { tool: 'arrow' });
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.startPoint || !this._state.currentShape) return;

    this._state.endPoint = { x, y };

    // 更新箭头路径
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

    // 计算长度
    const dx = x - this._state.startPoint.x;
    const dy = y - this._state.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // 检查长度是否足够
    if (length < 10) {
      this.reset();
      return;
    }

    this.canvasManager.addShape(this._state.currentShape);
    this.eventBus.emit('tool:drawingEnded', { tool: 'arrow' });

    this.reset();
  }

  /**
   * 生成箭头 SVG 路径
   */
  private generateArrowPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    // 计算箭头方向的单位向量
    const ux = dx / length;
    const uy = dy / length;

    // 箭头头部的基点（在终点前方）
    const arrowBase = {
      x: x2 - ux * this.arrowHeadSize,
      y: y2 - uy * this.arrowHeadSize
    };

    // 垂直于箭头方向的向量
    const perpX = -uy * (this.arrowHeadSize * 0.5);
    const perpY = ux * (this.arrowHeadSize * 0.5);

    // 箭头两侧的点
    const arrowLeft = {
      x: arrowBase.x + perpX,
      y: arrowBase.y + perpY
    };
    const arrowRight = {
      x: arrowBase.x - perpX,
      y: arrowBase.y - perpY
    };

    // 构建路径：线段 + 箭头头部
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
