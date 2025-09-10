/**
 * 视口 ViewModel 实现 - 中等复杂度
 * 使用 ZoomService + ConfigurationService，不需要 Manager
 */

import { proxy, snapshot } from 'valtio';
import { inject, injectable } from '../di/ServiceIdentifier';
import { IZoomService } from '../services/zoom/zoomService';
import { IConfigurationService } from '../services/configuration/configurationService';
import { IEventBusService } from '../services/eventBus/eventBusService';
import { IViewportViewModel, IViewportState } from './interfaces/IViewModel';

@injectable
export class ViewportViewModel implements IViewportViewModel {
  private readonly _state: IViewportState;

  constructor(
    @inject(IZoomService) private zoomService: IZoomService,
    @inject(IConfigurationService) private configService: IConfigurationService,
    @inject(IEventBusService) private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<IViewportState>({
      x: this.configService.get('viewport.x', 0),
      y: this.configService.get('viewport.y', 0),
      width: this.configService.get('viewport.width', 800),
      height: this.configService.get('viewport.height', 600),
      zoom: this.zoomService.getCurrentZoom()
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听缩放服务的变化，同步缩放级别
    this.eventBus.on('zoom:changed', (data: any) => {
      this._state.zoom = data.zoom;
    });
  }

  /**
   * 保存视口位置到配置
   */
  private saveViewportPosition(): void {
    this.configService.set('viewport.x', this._state.x);
    this.configService.set('viewport.y', this._state.y);
  }

  /**
   * 保存视口尺寸到配置
   */
  private saveViewportSize(): void {
    this.configService.set('viewport.width', this._state.width);
    this.configService.set('viewport.height', this._state.height);
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

    // 保存到配置
    if (viewport.x !== undefined || viewport.y !== undefined) {
      this.saveViewportPosition();
    }
    if (viewport.width !== undefined || viewport.height !== undefined) {
      this.saveViewportSize();
    }
    
    // 如果设置了缩放，更新 ZoomService
    if (viewport.zoom !== undefined) {
      this.zoomService.setZoom(viewport.zoom);
    }

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

    // 保存位置到配置
    this.saveViewportPosition();

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
    const currentZoom = this._state.zoom;
    const newZoom = currentZoom * factor;
    
    // 使用 ZoomService 来管理缩放
    if (this.zoomService.setZoom(newZoom, centerX, centerY)) {
      // ZoomService 会发布 zoom:changed 事件，我们在事件监听器中更新状态
      
      // 如果有中心点，更新视口位置
      if (centerX !== undefined && centerY !== undefined) {
        const actualNewZoom = this.zoomService.getCurrentZoom();
        const zoomDelta = actualNewZoom - currentZoom;
        const worldCenterX = (centerX - this._state.x) / currentZoom;
        const worldCenterY = (centerY - this._state.y) / currentZoom;
        
        this._state.x -= worldCenterX * zoomDelta;
        this._state.y -= worldCenterY * zoomDelta;
        
        // 保存视口位置到配置
        this.saveViewportPosition();
      }

      // 发布视口特定的缩放事件
      this.eventBus.emit('viewport:zoomed', {
        factor,
        zoom: this.zoomService.getCurrentZoom(),
        centerX,
        centerY,
        viewport: this.getSnapshot(),
        old: oldViewport
      });
    }
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