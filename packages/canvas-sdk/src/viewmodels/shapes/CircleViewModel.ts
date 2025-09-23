/**
 * 圆形 ViewModel
 * 管理圆形的创建和交互逻辑
 */

import { proxy } from 'valtio';

import { IPoint, Circle } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../types/IViewModel';

/**
 * 圆形状态
 */
export interface ICircleState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  currentShape: Circle | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 圆形 ViewModel 接口
 */
export interface ICircleViewModel extends IViewModel {
  state: ICircleState;

  // 形状控制
  activate(): void;
  deactivate(): void;

  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  // 状态查询
  isCurrentlyDrawing(): boolean;
  getCurrentShape(): Circle | null;
}

/**
 * 圆形 ViewModel 服务标识符
 */
export const ICircleViewModel = createDecorator<ICircleViewModel>('CircleViewModel');

/**
 * 圆形 ViewModel 实现
 */
export class CircleViewModel implements ICircleViewModel {
  private _state: ICircleState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<ICircleState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): ICircleState {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'circle' });
  }

  deactivate(): void {
    // 如果正在绘制，完成当前形状
    if (this._state.isDrawing && this._state.currentShape) {
      this.finishDrawing();
    }

    this._state.enabled = false;
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
    this._state.cursor = 'default';
    this.eventBus.emit('tool:deactivated', { toolName: 'circle' });
  }

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;

    this._state.isDrawing = true;
    this._state.startPoint = { x, y };

    // 使用 render-engine 的 Circle 类
    const circle = new Circle({
      x, y,
      radius: 1,
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2
      }
    });

    this._state.currentShape = circle;
    this.canvasManager.addShape(circle);
    this.eventBus.emit('circle:drawStart', { point: { x, y } });
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing || !this._state.startPoint || !this._state.currentShape) {
      return;
    }

    // 计算半径（从起始点到当前点的距离）
    const deltaX = x - this._state.startPoint.x;
    const deltaY = y - this._state.startPoint.y;
    const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 直接更新 Circle 对象的半径
    this._state.currentShape.radius = Math.max(radius, 1); // 最小半径为1

    this.eventBus.emit('circle:drawUpdate', {
      startPoint: this._state.startPoint,
      currentPoint: { x, y },
      radius: this._state.currentShape.radius
    });
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return;

    this.finishDrawing();
    this.eventBus.emit('circle:drawEnd', { point: { x, y } });
  }

  private finishDrawing(): void {
    if (this._state.currentShape) {
      // 如果半径太小，删除这个圆形
      if (this._state.currentShape.radius < 5) {
        this.canvasManager.removeShape(this._state.currentShape.id);
      }
    }

    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): Circle | null {
    return this._state.currentShape;
  }

  async initialize(): Promise<void> {
    // 初始化逻辑（如果需要）
  }

  getSnapshot(): any {
    return {
      ...this._state,
      toolName: 'circle'
    };
  }

  dispose(): void {
    this.deactivate();
  }
}