/**
 * 缩放服务 - 处理视口缩放功能
 * 功能单一：只负责缩放级别的管理和计算
 */

import { createDecorator } from '../../di';
import { IEventBusService } from '../eventBus/eventBusService';

/**
 * 缩放配置
 */
export interface IZoomConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  defaultZoom: number;
}

/**
 * 缩放事件数据
 */
export interface IZoomEventData {
  zoom: number;
  previousZoom: number;
  centerX: number;
  centerY: number;
}

/**
 * 缩放服务接口
 */
export interface IZoomService {
  getCurrentZoom(): number;
  setZoom(zoom: number, centerX?: number, centerY?: number): boolean;
  zoomIn(centerX?: number, centerY?: number): boolean;
  zoomOut(centerX?: number, centerY?: number): boolean;
  zoomToFit(): void;
  zoomToActualSize(): void;
  canZoomIn(): boolean;
  canZoomOut(): boolean;
  getZoomConfig(): IZoomConfig;
  updateZoomConfig(config: Partial<IZoomConfig>): void;
}

/**
 * 缩放服务标识符
 */
export const IZoomService = createDecorator<IZoomService>('ZoomService');

/**
 * 缩放服务实现
 */
export class ZoomService implements IZoomService {
  private currentZoom: number;
  private config: IZoomConfig;

  constructor(
    @IEventBusService private eventBus: IEventBusService
  ) {
    this.config = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomStep: 0.1,
      defaultZoom: 1
    };
    this.currentZoom = this.config.defaultZoom;
  }

  getCurrentZoom(): number {
    return this.currentZoom;
  }

  setZoom(zoom: number, centerX: number = 0, centerY: number = 0): boolean {
    const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
    
    if (clampedZoom === this.currentZoom) {
      return false;
    }

    const previousZoom = this.currentZoom;
    this.currentZoom = clampedZoom;

    // 发布缩放变化事件
    this.eventBus.emit<IZoomEventData>('zoom:changed', {
      zoom: this.currentZoom,
      previousZoom,
      centerX,
      centerY
    });

    return true;
  }

  zoomIn(centerX: number = 0, centerY: number = 0): boolean {
    const newZoom = this.currentZoom + this.config.zoomStep;
    return this.setZoom(newZoom, centerX, centerY);
  }

  zoomOut(centerX: number = 0, centerY: number = 0): boolean {
    const newZoom = this.currentZoom - this.config.zoomStep;
    return this.setZoom(newZoom, centerX, centerY);
  }

  zoomToFit(): void {
    // 缩放到适合视口的大小 (1:1 比例)
    this.setZoom(1);
  }

  zoomToActualSize(): void {
    // 缩放到实际尺寸 (100%)
    this.setZoom(1);
  }

  canZoomIn(): boolean {
    return this.currentZoom < this.config.maxZoom;
  }

  canZoomOut(): boolean {
    return this.currentZoom > this.config.minZoom;
  }

  getZoomConfig(): IZoomConfig {
    return { ...this.config };
  }

  updateZoomConfig(config: Partial<IZoomConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 确保当前缩放级别在新的限制范围内
    if (this.currentZoom < this.config.minZoom) {
      this.setZoom(this.config.minZoom);
    } else if (this.currentZoom > this.config.maxZoom) {
      this.setZoom(this.config.maxZoom);
    }
  }
}