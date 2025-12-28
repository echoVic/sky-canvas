/**
 * 缩放 ViewModel - 简单模式
 * 直接使用 ZoomService，不需要 Manager
 */

import { proxy, snapshot } from 'valtio';
// ViewModel不需要DI装饰器，使用构造函数注入
import { IZoomService, IZoomConfig } from '../services/zoom/zoomService';
import { IEventBusService } from '../services/eventBus/eventBusService';
import { IViewModel } from './interfaces/IViewModel';

/**
 * 缩放状态
 */
export interface IZoomState {
  currentZoom: number;
  config: IZoomConfig;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomPercentage: string;
}

/**
 * 缩放 ViewModel 接口
 */
export interface IZoomViewModel extends IViewModel {
  state: IZoomState;
  setZoom(zoom: number, centerX?: number, centerY?: number): void;
  zoomIn(centerX?: number, centerY?: number): void;
  zoomOut(centerX?: number, centerY?: number): void;
  zoomToFit(): void;
  zoomToActualSize(): void;
  updateZoomConfig(config: Partial<IZoomConfig>): void;
}

/**
 * 缩放 ViewModel 实现
 */
export class ZoomViewModel implements IZoomViewModel {
  private readonly _state: IZoomState;

  constructor(
    private zoomService: IZoomService,
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<IZoomState>({
      currentZoom: this.zoomService.getCurrentZoom(),
      config: this.zoomService.getZoomConfig(),
      canZoomIn: this.zoomService.canZoomIn(),
      canZoomOut: this.zoomService.canZoomOut(),
      zoomPercentage: this.formatZoomPercentage(this.zoomService.getCurrentZoom())
    });

    this.setupEventListeners();
  }

  get state(): IZoomState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.updateState();
    this.eventBus.emit('zoom-viewmodel:initialized', {});
  }

  dispose(): void {
    this.eventBus.emit('zoom-viewmodel:disposed', {});
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number, centerX?: number, centerY?: number): void {
    this.zoomService.setZoom(zoom, centerX, centerY);
  }

  /**
   * 放大
   */
  zoomIn(centerX?: number, centerY?: number): void {
    this.zoomService.zoomIn(centerX, centerY);
  }

  /**
   * 缩小
   */
  zoomOut(centerX?: number, centerY?: number): void {
    this.zoomService.zoomOut(centerX, centerY);
  }

  /**
   * 缩放到适合大小
   */
  zoomToFit(): void {
    this.zoomService.zoomToFit();
  }

  /**
   * 缩放到实际大小
   */
  zoomToActualSize(): void {
    this.zoomService.zoomToActualSize();
  }

  /**
   * 更新缩放配置
   */
  updateZoomConfig(config: Partial<IZoomConfig>): void {
    this.zoomService.updateZoomConfig(config);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听缩放服务的变化
    this.eventBus.on('zoom:changed', () => {
      this.updateState();
    });
  }

  /**
   * 更新状态
   */
  private updateState(): void {
    const currentZoom = this.zoomService.getCurrentZoom();
    this._state.currentZoom = currentZoom;
    this._state.config = this.zoomService.getZoomConfig();
    this._state.canZoomIn = this.zoomService.canZoomIn();
    this._state.canZoomOut = this.zoomService.canZoomOut();
    this._state.zoomPercentage = this.formatZoomPercentage(currentZoom);
  }

  /**
   * 格式化缩放百分比
   */
  private formatZoomPercentage(zoom: number): string {
    return `${Math.round(zoom * 100)}%`;
  }
}