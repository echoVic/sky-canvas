/**
 * 矩形 ViewModel
 * 管理矩形的创建和交互逻辑
 */

import { proxy } from 'valtio';

import { IPoint, Rectangle } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../types/IViewModel';

/**
 * 矩形状态
 */
export interface IRectangleState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  currentShape: Rectangle | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 矩形 ViewModel 接口
 */
export interface IRectangleViewModel extends IViewModel {
  state: IRectangleState;

  // 形状控制
  activate(): void;
  deactivate(): void;
  
  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  // 状态查询
  isCurrentlyDrawing(): boolean;
  getCurrentShape(): Rectangle | null;
}

/**
 * 矩形 ViewModel 服务标识符
 */
export const IRectangleViewModel = createDecorator<IRectangleViewModel>('RectangleViewModel');

/**
 * 矩形 ViewModel 实现
 */
export class RectangleViewModel implements IRectangleViewModel {
  private readonly _state: IRectangleState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<IRectangleState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false
    });
  }

  get state(): IRectangleState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('rectangle-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('rectangle-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  // === 工具控制 ===

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'crosshair';
    this.eventBus.emit('tool:activated', { toolName: 'rectangle' });
  }

  deactivate(): void {
    this._state.enabled = false;
    this.reset();
  }

  // === 鼠标事件 ===

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled) return;
    
    this._state.isDrawing = true;
    this._state.startPoint = { x, y };
    
    // 使用 render-engine 的 Rectangle 类
    this._state.currentShape = new Rectangle({
      x, y,
      width: 0,
      height: 0,
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        opacity: 1
      }
    });
    
    this.eventBus.emit('tool:drawingStarted', {});
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing || !this._state.startPoint || !this._state.currentShape) return;
    
    // 计算矩形尺寸和位置
    const width = Math.abs(x - this._state.startPoint.x);
    const height = Math.abs(y - this._state.startPoint.y);
    const position = {
      x: Math.min(this._state.startPoint.x, x),
      y: Math.min(this._state.startPoint.y, y)
    };

    // 直接更新 Rectangle 对象的属性
    this._state.currentShape.x = position.x;
    this._state.currentShape.y = position.y;
    this._state.currentShape.width = width;
    this._state.currentShape.height = height;
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing || !this._state.currentShape) return;
    
    this._state.isDrawing = false;
    
    // 检查形状大小
    if (this._state.currentShape.width < 5 || this._state.currentShape.height < 5) {
      this.reset();
      return;
    }
    
    // 通过 CanvasManager 创建形状
    this.canvasManager.addShape(this._state.currentShape);
    this.eventBus.emit('tool:drawingEnded', {});
    
    this.reset();
  }

  // === 状态查询 ===

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing;
  }

  getCurrentShape(): Rectangle | null {
    return this._state.currentShape;
  }

  // === 私有方法 ===

  private reset(): void {
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
  }
}