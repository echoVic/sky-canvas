/**
 * 缩放服务 - 处理视口缩放功能
 * 功能单一：只负责缩放级别的管理和计算
 */

import { createDecorator } from '../../di';

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
  readonly _serviceBrand: undefined;
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
  dispose(): void;
}

/**
 * 缩放服务标识符
 */
export const IZoomService = createDecorator<IZoomService>('ZoomService');

/**
 * 缩放服务实现
 */
export class ZoomService implements IZoomService {
  readonly _serviceBrand: undefined;
  private currentZoom: number;
  private config: IZoomConfig;

  constructor() {
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

  setZoom(zoom: number, _centerX: number = 0, _centerY: number = 0): boolean {
    const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
    
    if (clampedZoom === this.currentZoom) {
      return false;
    }

    this.currentZoom = clampedZoom;

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
    this.setZoom(1);
  }

  zoomToActualSize(): void {
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
    
    if (this.currentZoom < this.config.minZoom) {
      this.setZoom(this.config.minZoom);
    } else if (this.currentZoom > this.config.maxZoom) {
      this.setZoom(this.config.maxZoom);
    }
  }

  dispose(): void {}
}
