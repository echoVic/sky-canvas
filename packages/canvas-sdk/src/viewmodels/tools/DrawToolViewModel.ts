/**
 * 自由绘制工具 ViewModel
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
 * 自由绘制工具状态
 */
export interface IDrawToolState {
  isDrawing: boolean;
  points: IPoint[];
  currentShape: IPathEntity | null;
  cursor: string;
  enabled: boolean;
  strokeColor: string;
  strokeWidth: number;
}

/**
 * 自由绘制工具 ViewModel 接口
 */
export interface IDrawToolViewModel extends IViewModel {
  state: IDrawToolState;

  activate(): void;
  deactivate(): void;

  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  isCurrentlyDrawing(): boolean;
  getCurrentShape(): IPathEntity | null;

  // 设置绘制属性
  setStrokeColor(color: string): void;
  setStrokeWidth(width: number): void;
}

/**
 * 自由绘制工具 ViewModel 服务标识符
 */
export const IDrawToolViewModel = createDecorator<IDrawToolViewModel>('DrawToolViewModel');

/**
 * 自由绘制工具 ViewModel 实现
 */
export class DrawToolViewModel implements IDrawToolViewModel {
  private readonly _state: IDrawToolState;
  private readonly minDistance = 3; // 最小采样距离

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<IDrawToolState>({
      isDrawing: false,
      points: [],
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
      strokeColor: '#f59e0b',
      strokeWidth: 3
    });
  }

  get state(): IDrawToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('draw-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('draw-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'draw' });
  }

  deactivate(): void {
    this._state.enabled = false;
    this.reset();
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    this._state.isDrawing = true;
    this._state.points = [{ x, y }];

    // 创建初始路径
    const pathData = `M ${x} ${y}`;
    this._state.currentShape = ShapeEntityFactory.createPath(
      pathData,
      { x: 0, y: 0 },
      {
        strokeColor: this._state.strokeColor,
        strokeWidth: this._state.strokeWidth,
        opacity: 1
      }
    );

    this.eventBus.emit('tool:drawingStarted', { tool: 'draw' });
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.currentShape || this._state.points.length === 0) return;

    // 检查与上一个点的距离
    const lastPoint = this._state.points[this._state.points.length - 1];
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 只有距离足够远才添加新点（减少点数，优化性能）
    if (distance < this.minDistance) return;

    // 添加新点
    this._state.points.push({ x, y });

    // 更新路径
    const pathData = this.generateSmoothPath(this._state.points);
    this._state.currentShape = {
      ...this._state.currentShape,
      pathData
    };
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;
    if (!this._state.currentShape) return;

    this._state.isDrawing = false;

    // 添加最后一个点
    const lastPoint = this._state.points[this._state.points.length - 1];
    if (lastPoint.x !== x || lastPoint.y !== y) {
      this._state.points.push({ x, y });
    }

    // 检查路径是否足够长
    if (this._state.points.length < 2) {
      this.reset();
      return;
    }

    // 生成最终路径
    const pathData = this.generateSmoothPath(this._state.points);
    this._state.currentShape = {
      ...this._state.currentShape,
      pathData
    };

    this.canvasManager.addShape(this._state.currentShape);
    this.eventBus.emit('tool:drawingEnded', { tool: 'draw' });

    this.reset();
  }

  /**
   * 生成平滑的 SVG 路径
   * 使用二次贝塞尔曲线平滑连接各点
   */
  private generateSmoothPath(points: IPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    // 使用二次贝塞尔曲线平滑连接
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];

      // 控制点为当前点
      // 终点为当前点和下一点的中点
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      path += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`;
    }

    // 添加最后一个点
    const lastPoint = points[points.length - 1];
    path += ` L ${lastPoint.x} ${lastPoint.y}`;

    return path;
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): IPathEntity | null {
    return this._state.currentShape;
  }

  setStrokeColor(color: string): void {
    this._state.strokeColor = color;
  }

  setStrokeWidth(width: number): void {
    this._state.strokeWidth = Math.max(1, Math.min(50, width));
  }

  private reset(): void {
    this._state.isDrawing = false;
    this._state.points = [];
    this._state.currentShape = null;
  }
}
