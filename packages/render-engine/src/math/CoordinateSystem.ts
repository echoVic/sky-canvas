/**
 * 坐标系统管理
 * 处理不同坐标系之间的转换
 */

import { Matrix2D } from './Matrix2D';
import { TransformStack } from './TransformStack';

/**
 * 坐标系统类型
 */
export enum CoordinateSystem {
  /** 设备坐标系（像素坐标） */
  DEVICE = 'device',
  /** 屏幕坐标系（视口坐标） */
  SCREEN = 'screen',
  /** 世界坐标系（逻辑坐标） */
  WORLD = 'world',
  /** 局部坐标系（对象坐标） */
  LOCAL = 'local'
}

/**
 * 视口配置
 */
export interface IViewportConfig {
  /** 视口位置和大小 */
  viewport: { x: number; y: number; width: number; height: number };
  /** 世界坐标范围 */
  worldBounds: { x: number; y: number; width: number; height: number };
  /** 设备像素比 */
  devicePixelRatio: number;
  /** 是否翻转Y轴（WebGL需要） */
  flipY: boolean;
}

/**
 * 坐标系统管理器
 */
export class CoordinateSystemManager {
  private viewportConfig: IViewportConfig;
  private transformStack = new TransformStack();

  // 预计算的变换矩阵（缓存）
  private deviceToScreen?: Matrix2D;
  private screenToWorld?: Matrix2D;
  private worldToScreen?: Matrix2D;
  private screenToDevice?: Matrix2D;

  constructor(config: IViewportConfig) {
    this.viewportConfig = { ...config };
    this.updateTransforms();
  }

  /** 更新视口配置 */
  updateViewport(config: Partial<IViewportConfig>): void {
    Object.assign(this.viewportConfig, config);
    this.updateTransforms();
  }

  /** 获取当前视口配置 */
  getViewportConfig(): Readonly<IViewportConfig> {
    return { ...this.viewportConfig };
  }

  /** 设备坐标转屏幕坐标 */
  deviceToScreenPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.deviceToScreen) this.updateTransforms();
    return this.deviceToScreen!.transformPoint(point);
  }

  /** 屏幕坐标转世界坐标 */
  screenToWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.screenToWorld) this.updateTransforms();
    return this.screenToWorld!.transformPoint(point);
  }

  /** 世界坐标转屏幕坐标 */
  worldToScreenPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.worldToScreen) this.updateTransforms();
    return this.worldToScreen!.transformPoint(point);
  }

  /** 屏幕坐标转设备坐标 */
  screenToDevicePoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.screenToDevice) this.updateTransforms();
    return this.screenToDevice!.transformPoint(point);
  }

  /** 设备坐标直接转世界坐标 */
  deviceToWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
    const screenPoint = this.deviceToScreenPoint(point);
    return this.screenToWorldPoint(screenPoint);
  }

  /** 世界坐标直接转设备坐标 */
  worldToDevicePoint(point: { x: number; y: number }): { x: number; y: number } {
    const screenPoint = this.worldToScreenPoint(point);
    return this.screenToDevicePoint(screenPoint);
  }

  /** 获取变换栈（用于局部变换） */
  getTransformStack(): TransformStack {
    return this.transformStack;
  }

  /** 获取完整的世界到设备变换矩阵 */
  getWorldToDeviceMatrix(): Matrix2D {
    if (!this.worldToScreen || !this.screenToDevice) this.updateTransforms();
    return this.worldToScreen!.multiply(this.screenToDevice!);
  }

  /** 获取完整的设备到世界变换矩阵 */
  getDeviceToWorldMatrix(): Matrix2D {
    const worldToDevice = this.getWorldToDeviceMatrix();
    return worldToDevice.inverse() || Matrix2D.identity();
  }

  /** 变换矩形 */
  transformRect(
    rect: { x: number; y: number; width: number; height: number },
    transform: Matrix2D
  ): { x: number; y: number; width: number; height: number } {
    const corners = [
      transform.transformPoint({ x: rect.x, y: rect.y }),
      transform.transformPoint({ x: rect.x + rect.width, y: rect.y }),
      transform.transformPoint({ x: rect.x + rect.width, y: rect.y + rect.height }),
      transform.transformPoint({ x: rect.x, y: rect.y + rect.height })
    ];

    let minX = corners[0].x, minY = corners[0].y;
    let maxX = corners[0].x, maxY = corners[0].y;

    for (let i = 1; i < corners.length; i++) {
      minX = Math.min(minX, corners[i].x);
      minY = Math.min(minY, corners[i].y);
      maxX = Math.max(maxX, corners[i].x);
      maxY = Math.max(maxY, corners[i].y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private updateTransforms(): void {
    const { viewport, worldBounds, devicePixelRatio, flipY } = this.viewportConfig;

    // 设备到屏幕变换（DPI缩放）
    this.deviceToScreen = Matrix2D.scale(1 / devicePixelRatio, 1 / devicePixelRatio);

    // 屏幕到设备变换
    this.screenToDevice = Matrix2D.scale(devicePixelRatio, devicePixelRatio);

    // 屏幕到世界变换
    const scaleX = worldBounds.width / viewport.width;
    const scaleY = worldBounds.height / viewport.height;

    this.screenToWorld = Matrix2D.identity()
      .translate(-viewport.x, -viewport.y)
      .scale(scaleX, flipY ? -scaleY : scaleY)
      .translate(worldBounds.x, flipY ? worldBounds.y + worldBounds.height : worldBounds.y);

    // 世界到屏幕变换
    this.worldToScreen = this.screenToWorld.inverse()!;
  }
}
