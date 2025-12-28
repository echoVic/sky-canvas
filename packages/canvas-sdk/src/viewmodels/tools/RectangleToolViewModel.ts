/**
 * 矩形工具 ViewModel
 * 使用 CanvasManager 进行形状管理 - 需要 Manager 协调的工具 ViewModel
 */

import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { IRectangleEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../interfaces/IViewModel';

/**
 * 矩形工具状态
 */
export interface IRectangleToolState {
  isDrawing: boolean;
  startPoint: IPoint | null;
  currentShape: IRectangleEntity | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 矩形工具 ViewModel 接口
 */
export interface IRectangleToolViewModel extends IViewModel {
  state: IRectangleToolState;
  
  // 工具控制
  activate(): void;
  deactivate(): void;
  
  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  // 状态查询
  isCurrentlyDrawing(): boolean;
  getCurrentShape(): IRectangleEntity | null;
}

/**
 * 矩形工具 ViewModel 服务标识符
 */
export const IRectangleToolViewModel = createDecorator<IRectangleToolViewModel>('RectangleToolViewModel');

/**
 * 矩形工具 ViewModel 实现
 */
export class RectangleToolViewModel implements IRectangleToolViewModel {
  private readonly _state: IRectangleToolState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
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
    
    // 创建临时形状
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

    // 更新形状
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
    
    // 检查形状大小
    if (this._state.currentShape.size.width < 5 || this._state.currentShape.size.height < 5) {
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

  getCurrentShape(): IRectangleEntity | null {
    return this._state.currentShape;
  }

  // === 私有方法 ===

  private reset(): void {
    this._state.isDrawing = false;
    this._state.startPoint = null;
    this._state.currentShape = null;
  }
}