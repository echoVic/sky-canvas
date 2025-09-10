/**
 * 基础复合操作类
 */

import {
  ICompositeOperation,
  CompositeOperation,
  CompositeConfig
} from '../types/CompositeTypes';

export abstract class BaseCompositeOperation implements ICompositeOperation {
  private readonly _id: string;
  protected _operation: CompositeOperation;
  protected _config: CompositeConfig;

  constructor(operation: CompositeOperation, config: CompositeConfig) {
    this._id = this.generateId();
    this._operation = operation;
    this._config = { ...config };
  }

  get id(): string {
    return this._id;
  }

  get operation(): CompositeOperation {
    return this._operation;
  }

  get config(): CompositeConfig {
    return { ...this._config };
  }

  apply(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    if (!this._config.enabled) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = this._operation;
    ctx.globalAlpha = this._config.globalAlpha;

    if (bounds) {
      ctx.drawImage(
        sourceCanvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );
    } else {
      ctx.drawImage(sourceCanvas, 0, 0);
    }

    ctx.restore();
  }

  applyToImageData(
    destData: ImageData,
    sourceData: ImageData,
    targetData?: ImageData
  ): ImageData {
    const target = targetData || new ImageData(destData.width, destData.height);
    
    if (!this._config.enabled) {
      return this.copyImageData(destData, target);
    }

    return this.performImageDataComposite(destData, sourceData, target);
  }

  updateConfig(config: Partial<CompositeConfig>): void {
    this._config = { ...this._config, ...config };
  }

  abstract clone(): ICompositeOperation;

  dispose(): void {
    // 基础清理
  }

  protected generateId(): string {
    return `composite_${this._operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected copyImageData(source: ImageData, target: ImageData): ImageData {
    target.data.set(source.data);
    return target;
  }

  protected performImageDataComposite(
    dest: ImageData,
    source: ImageData,
    target: ImageData
  ): ImageData {
    const destData = dest.data;
    const srcData = source.data;
    const targetData = target.data;
    const alpha = this._config.globalAlpha;

    for (let i = 0; i < destData.length; i += 4) {
      const destR = destData[i] / 255;
      const destG = destData[i + 1] / 255;
      const destB = destData[i + 2] / 255;
      const destA = destData[i + 3] / 255;

      const srcR = srcData[i] / 255;
      const srcG = srcData[i + 1] / 255;
      const srcB = srcData[i + 2] / 255;
      const srcA = (srcData[i + 3] / 255) * alpha;

      const result = this.compositePixel(
        { r: destR, g: destG, b: destB, a: destA },
        { r: srcR, g: srcG, b: srcB, a: srcA }
      );

      targetData[i] = Math.round(result.r * 255);
      targetData[i + 1] = Math.round(result.g * 255);
      targetData[i + 2] = Math.round(result.b * 255);
      targetData[i + 3] = Math.round(result.a * 255);
    }

    return target;
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    switch (this._operation) {
      case CompositeOperation.SOURCE_OVER:
        return this.sourceOver(dest, src);
      case CompositeOperation.SOURCE_ATOP:
        return this.sourceAtop(dest, src);
      case CompositeOperation.SOURCE_IN:
        return this.sourceIn(dest, src);
      case CompositeOperation.SOURCE_OUT:
        return this.sourceOut(dest, src);
      case CompositeOperation.DESTINATION_OVER:
        return this.destinationOver(dest, src);
      case CompositeOperation.DESTINATION_ATOP:
        return this.destinationAtop(dest, src);
      case CompositeOperation.DESTINATION_IN:
        return this.destinationIn(dest, src);
      case CompositeOperation.DESTINATION_OUT:
        return this.destinationOut(dest, src);
      case CompositeOperation.LIGHTER:
        return this.lighter(dest, src);
      case CompositeOperation.COPY:
        return this.copy(dest, src);
      case CompositeOperation.XOR:
        return this.xor(dest, src);
      default:
        return dest;
    }
  }

  protected sourceOver(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    return {
      r: alpha === 0 ? 0 : (src.r * src.a + dest.r * dest.a * (1 - src.a)) / alpha,
      g: alpha === 0 ? 0 : (src.g * src.a + dest.g * dest.a * (1 - src.a)) / alpha,
      b: alpha === 0 ? 0 : (src.b * src.a + dest.b * dest.a * (1 - src.a)) / alpha,
      a: alpha
    };
  }

  protected sourceAtop(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: src.r * dest.a + dest.r * (1 - src.a),
      g: src.g * dest.a + dest.g * (1 - src.a),
      b: src.b * dest.a + dest.b * (1 - src.a),
      a: dest.a
    };
  }

  protected sourceIn(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: src.r,
      g: src.g,
      b: src.b,
      a: src.a * dest.a
    };
  }

  protected sourceOut(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: src.r,
      g: src.g,
      b: src.b,
      a: src.a * (1 - dest.a)
    };
  }

  protected destinationOver(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return this.sourceOver(src, dest);
  }

  protected destinationAtop(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: dest.r * src.a + src.r * (1 - dest.a),
      g: dest.g * src.a + src.g * (1 - dest.a),
      b: dest.b * src.a + src.b * (1 - dest.a),
      a: src.a
    };
  }

  protected destinationIn(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: dest.r,
      g: dest.g,
      b: dest.b,
      a: dest.a * src.a
    };
  }

  protected destinationOut(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: dest.r,
      g: dest.g,
      b: dest.b,
      a: dest.a * (1 - src.a)
    };
  }

  protected lighter(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: Math.min(1, dest.r + src.r),
      g: Math.min(1, dest.g + src.g),
      b: Math.min(1, dest.b + src.b),
      a: Math.min(1, dest.a + src.a)
    };
  }

  protected copy(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return { ...src };
  }

  protected xor(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    return {
      r: src.r * (1 - dest.a) + dest.r * (1 - src.a),
      g: src.g * (1 - dest.a) + dest.g * (1 - src.a),
      b: src.b * (1 - dest.a) + dest.b * (1 - src.a),
      a: src.a * (1 - dest.a) + dest.a * (1 - src.a)
    };
  }

  protected clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}