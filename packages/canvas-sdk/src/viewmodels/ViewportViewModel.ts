/**
 * 视口 ViewModel 实现
 * 使用 Valtio 管理视口状态
 */

import { proxy, snapshot } from 'valtio';
import { ShapeEntity } from '../models/entities/Shape';
import { ShapeAdapter } from '../models/entities/ShapeAdapter';
import { IViewportViewModel, IViewportState } from './interfaces/IViewModel';
import { IEventBusService } from '../di/ServiceIdentifiers';

export class ViewportViewModel implements IViewportViewModel {
  private readonly _state: IViewportState;

  constructor(
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<IViewportState>({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      zoom: 1
    });
  }

  get state(): IViewportState {
    return this._state;
  }

  async initialize(): Promise<void> {
    // 发布初始化完成事件
    this.eventBus.emit('viewport:initialized', this.getSnapshot());
  }

  dispose(): void {
    // 清理资源
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  setViewport(viewport: Partial<IViewportState>): void {
    const oldViewport = this.getSnapshot();
    
    // 更新状态
    Object.assign(this._state, viewport);

    // 发布事件
    this.eventBus.emit('viewport:changed', {
      old: oldViewport,
      new: this.getSnapshot()
    });
  }

  pan(deltaX: number, deltaY: number): void {
    const oldViewport = this.getSnapshot();
    
    // 更新位置
    this._state.x += deltaX;
    this._state.y += deltaY;

    // 发布事件
    this.eventBus.emit('viewport:panned', {
      deltaX,
      deltaY,
      viewport: this.getSnapshot(),
      old: oldViewport
    });
  }

  zoom(factor: number, centerX?: number, centerY?: number): void {
    const oldViewport = this.getSnapshot();
    
    // 限制缩放范围
    const newZoom = Math.max(0.1, Math.min(10, this._state.zoom * factor));
    
    if (centerX !== undefined && centerY !== undefined) {
      // 以指定点为中心缩放
      const zoomDelta = newZoom - this._state.zoom;
      const worldCenterX = (centerX - this._state.x) / this._state.zoom;
      const worldCenterY = (centerY - this._state.y) / this._state.zoom;
      
      this._state.x -= worldCenterX * zoomDelta;
      this._state.y -= worldCenterY * zoomDelta;
    }
    
    this._state.zoom = newZoom;

    // 发布事件
    this.eventBus.emit('viewport:zoomed', {
      factor,
      zoom: newZoom,
      centerX,
      centerY,
      viewport: this.getSnapshot(),
      old: oldViewport
    });
  }

  fitToContent(shapes: ShapeEntity[]): void {
    if (shapes.length === 0) {
      this.reset();
      return;
    }

    const oldViewport = this.getSnapshot();

    // 计算所有形状的边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of shapes) {
      const bounds = ShapeAdapter.getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 计算适合的缩放比例（留10%边距）
    const padding = 0.9;
    const scaleX = (this._state.width * padding) / contentWidth;
    const scaleY = (this._state.height * padding) / contentHeight;
    const scale = Math.min(scaleX, scaleY);

    // 设置新的视口参数
    this._state.zoom = Math.max(0.1, Math.min(10, scale));
    this._state.x = (this._state.width - contentWidth * this._state.zoom) / 2 - minX * this._state.zoom;
    this._state.y = (this._state.height - contentHeight * this._state.zoom) / 2 - minY * this._state.zoom;

    // 发布事件
    this.eventBus.emit('viewport:fit-to-content', {
      shapeCount: shapes.length,
      contentBounds: { x: minX, y: minY, width: contentWidth, height: contentHeight },
      viewport: this.getSnapshot(),
      old: oldViewport
    });
  }

  reset(): void {
    const oldViewport = this.getSnapshot();
    
    // 重置到默认状态
    this._state.x = 0;
    this._state.y = 0;
    this._state.zoom = 1;

    // 发布事件
    this.eventBus.emit('viewport:reset', {
      viewport: this.getSnapshot(),
      old: oldViewport
    });
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this._state.x) / this._state.zoom,
      y: (y - this._state.y) / this._state.zoom
    };
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this._state.zoom + this._state.x,
      y: y * this._state.zoom + this._state.y
    };
  }

  // 移除这个方法，直接使用 ShapeAdapter
}