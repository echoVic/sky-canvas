/**
 * 圆形遮罩
 */

import { BaseMask } from './BaseMask';
import { 
  CircleMaskConfig, 
  MaskType,
  IMask 
} from '../types/MaskTypes';
import { Point2D } from '../../animation/types/PathTypes';
import { IShape } from '../../canvas-sdk/src/types/Shape';

export class CircleMask extends BaseMask {
  protected _config: CircleMaskConfig;

  constructor(config: CircleMaskConfig) {
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
    const { radius } = this._config;
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
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
    
    // 创建径向渐变用于羽化
    if (this._config.featherRadius && this._config.featherRadius > 0) {
      const { radius } = this._config;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius + this._config.featherRadius);
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${this._config.opacity})`);
      gradient.addColorStop(radius / (radius + this._config.featherRadius), `rgba(255, 255, 255, ${this._config.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
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
    ctx.arc(0, 0, this._config.radius, 0, Math.PI * 2);
    ctx.clip('evenodd');
  }

  contains(point: Point2D): boolean {
    const result = this.isPointInCircle(point, this._config.position, this._config.radius);
    return this._config.inverted ? !result : result;
  }

  getBounds(): { min: Point2D; max: Point2D } {
    const { position, radius } = this._config;
    
    return {
      min: { 
        x: position.x - radius, 
        y: position.y - radius 
      },
      max: { 
        x: position.x + radius, 
        y: position.y + radius 
      }
    };
  }

  clone(): IMask {
    return new CircleMask({ ...this._config });
  }
}