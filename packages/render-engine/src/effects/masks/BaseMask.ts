/**
 * 遮罩基础类
 */

import { 
  IMask, 
  AnyMaskConfig, 
  MaskType,
  MaskShape,
  MaskBlendMode,
  MaskEdgeType 
} from '../types/MaskTypes';
import { Point2D } from '../../animation/types/PathTypes';
import { IShape } from '../../canvas-sdk/src/types/Shape';

export abstract class BaseMask implements IMask {
  readonly id: string;
  protected _config: AnyMaskConfig;
  protected _enabled: boolean = true;

  constructor(config: AnyMaskConfig) {
    this.id = `mask_${Math.random().toString(36).substr(2, 9)}`;
    this._config = { ...config };
    this._enabled = config.enabled;
  }

  get config(): AnyMaskConfig {
    return { ...this._config };
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  abstract apply(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void;

  updateConfig(config: Partial<AnyMaskConfig>): void {
    this._config = { ...this._config, ...config } as AnyMaskConfig;
  }

  abstract contains(point: Point2D): boolean;

  abstract getBounds(): { min: Point2D; max: Point2D };

  abstract clone(): IMask;

  dispose(): void {
    // 清理资源
  }

  /**
   * 设置Canvas2D上下文的混合模式
   */
  protected setBlendMode(ctx: CanvasRenderingContext2D): void {
    switch (this._config.blendMode) {
      case MaskBlendMode.NORMAL:
        ctx.globalCompositeOperation = 'source-over';
        break;
      case MaskBlendMode.MULTIPLY:
        ctx.globalCompositeOperation = 'multiply';
        break;
      case MaskBlendMode.SCREEN:
        ctx.globalCompositeOperation = 'screen';
        break;
      case MaskBlendMode.OVERLAY:
        ctx.globalCompositeOperation = 'overlay';
        break;
      case MaskBlendMode.DARKEN:
        ctx.globalCompositeOperation = 'darken';
        break;
      case MaskBlendMode.LIGHTEN:
        ctx.globalCompositeOperation = 'lighten';
        break;
    }
  }

  /**
   * 应用透明度
   */
  protected applyOpacity(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = this._config.opacity;
  }

  /**
   * 创建基础路径（子类实现具体形状）
   */
  protected abstract createPath(ctx: CanvasRenderingContext2D): void;

  /**
   * 应用羽化效果
   */
  protected applyFeathering(ctx: CanvasRenderingContext2D): void {
    if (this._config.edgeType === MaskEdgeType.FEATHERED && this._config.featherRadius) {
      // 创建羽化渐变
      const bounds = this.getBounds();
      const centerX = (bounds.min.x + bounds.max.x) / 2;
      const centerY = (bounds.min.y + bounds.max.y) / 2;
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, this._config.featherRadius
      );
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${this._config.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
    }
  }

  /**
   * 检查点是否在矩形内
   */
  protected isPointInRectangle(point: Point2D, x: number, y: number, width: number, height: number): boolean {
    return point.x >= x && 
           point.x <= x + width && 
           point.y >= y && 
           point.y <= y + height;
  }

  /**
   * 检查点是否在圆形内
   */
  protected isPointInCircle(point: Point2D, center: Point2D, radius: number): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  /**
   * 检查点是否在椭圆内
   */
  protected isPointInEllipse(point: Point2D, center: Point2D, radiusX: number, radiusY: number, rotation = 0): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    
    if (rotation !== 0) {
      // 旋转点到椭圆坐标系
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;
      
      return (rotatedX * rotatedX) / (radiusX * radiusX) + 
             (rotatedY * rotatedY) / (radiusY * radiusY) <= 1;
    }
    
    return (dx * dx) / (radiusX * radiusX) + 
           (dy * dy) / (radiusY * radiusY) <= 1;
  }

  /**
   * 检查点是否在多边形内（射线法）
   */
  protected isPointInPolygon(point: Point2D, vertices: Point2D[]): boolean {
    if (vertices.length < 3) return false;
    
    let inside = false;
    const x = point.x;
    const y = point.y;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;
      
      if (((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * 计算两点间距离
   */
  protected getDistance(p1: Point2D, p2: Point2D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 获取多边形边界框
   */
  protected getPolygonBounds(vertices: Point2D[]): { min: Point2D; max: Point2D } {
    if (vertices.length === 0) {
      return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    }
    
    let minX = vertices[0].x;
    let minY = vertices[0].y;
    let maxX = vertices[0].x;
    let maxY = vertices[0].y;
    
    for (let i = 1; i < vertices.length; i++) {
      minX = Math.min(minX, vertices[i].x);
      minY = Math.min(minY, vertices[i].y);
      maxX = Math.max(maxX, vertices[i].x);
      maxY = Math.max(maxY, vertices[i].y);
    }
    
    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY }
    };
  }

  /**
   * 应用遮罩变换
   */
  protected applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this._config.position.x, this._config.position.y);
  }

  /**
   * 恢复遮罩变换
   */
  protected restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(-this._config.position.x, -this._config.position.y);
  }
}