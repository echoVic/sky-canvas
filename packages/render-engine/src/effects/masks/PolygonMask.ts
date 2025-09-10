/**
 * 多边形遮罩
 */

import { BaseMask } from './BaseMask';
import { 
  PolygonMaskConfig, 
  MaskType,
  IMask 
} from '../types/MaskTypes';
import { Point2D } from '../../animation/types/PathTypes';
import { IShape } from '../../canvas-sdk/src/types/Shape';

export class PolygonMask extends BaseMask {
  protected _config: PolygonMaskConfig;

  constructor(config: PolygonMaskConfig) {
    super(config);
    this._config = config;
  }

  apply(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void {
    if (!this._enabled || !(ctx instanceof CanvasRenderingContext2D)) {
      return;
    }

    ctx.save();
    
    this.applyTransform(ctx);
    this.setBlendMode(ctx);
    this.applyOpacity(ctx);

    switch (this._config.type) {
      case MaskType.CLIP:
        this.applyClipMask(ctx);
        break;
      case MaskType.ALPHA:
        this.applyAlphaMask(ctx);
        break;
      case MaskType.STENCIL:
        this.applyStencilMask(ctx);
        break;
      case MaskType.INVERTED:
        this.applyInvertedMask(ctx);
        break;
    }

    ctx.restore();
  }

  protected createPath(ctx: CanvasRenderingContext2D): void {
    const { points } = this._config;
    
    if (points.length < 3) {
      return;
    }
    
    // 将点转换为相对于遮罩中心的坐标
    const center = this._config.position;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x - center.x, points[0].y - center.y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x - center.x, points[i].y - center.y);
    }
    
    ctx.closePath();
  }

  private applyClipMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx);
    if (this._config.inverted) {
      const canvas = ctx.canvas;
      ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);
      ctx.clip('evenodd');
    } else {
      ctx.clip();
    }
  }

  private applyAlphaMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx);
    
    // 多边形羽化通过描边实现
    if (this._config.featherRadius && this._config.featherRadius > 0) {
      ctx.shadowColor = `rgba(255, 255, 255, ${this._config.opacity})`;
      ctx.shadowBlur = this._config.featherRadius;
      ctx.fillStyle = `rgba(255, 255, 255, ${this._config.opacity})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${this._config.opacity})`;
    }
    
    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'destination-in';
    }
    
    ctx.fill();
  }

  private applyStencilMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx);
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fill();
    
    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'source-out';
    } else {
      ctx.globalCompositeOperation = 'source-in';
    }
  }

  private applyInvertedMask(ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas;
    
    ctx.beginPath();
    ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);
    this.createPath(ctx);
    ctx.clip('evenodd');
  }

  contains(point: Point2D): boolean {
    const result = this.isPointInPolygon(point, this._config.points);
    return this._config.inverted ? !result : result;
  }

  getBounds(): { min: Point2D; max: Point2D } {
    return this.getPolygonBounds(this._config.points);
  }

  clone(): IMask {
    return new PolygonMask({ 
      ...this._config,
      points: [...this._config.points.map(p => ({ ...p }))]
    });
  }

  /**
   * 添加顶点
   */
  addVertex(point: Point2D): void {
    this._config.points.push({ ...point });
  }

  /**
   * 移除顶点
   */
  removeVertex(index: number): boolean {
    if (index >= 0 && index < this._config.points.length) {
      this._config.points.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 更新顶点
   */
  updateVertex(index: number, point: Point2D): boolean {
    if (index >= 0 && index < this._config.points.length) {
      this._config.points[index] = { ...point };
      return true;
    }
    return false;
  }

  /**
   * 获取顶点数量
   */
  getVertexCount(): number {
    return this._config.points.length;
  }

  /**
   * 获取所有顶点
   */
  getVertices(): Point2D[] {
    return [...this._config.points];
  }

  /**
   * 设置顶点
   */
  setVertices(points: Point2D[]): void {
    this._config.points = [...points];
  }
}