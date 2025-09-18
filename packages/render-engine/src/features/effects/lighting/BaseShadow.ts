/**
 * 阴影基础类
 */

import {
  IShadow,
  ShadowType,
  AnyShadowConfig,
  ShadowQuality
} from '../types/LightingTypes';
import { Point2D } from '../../animation/types/PathTypes';

export abstract class BaseShadow implements IShadow {
  readonly id: string;
  readonly type: ShadowType;
  protected _config: AnyShadowConfig;
  protected _enabled: boolean = true;

  constructor(type: ShadowType, config: AnyShadowConfig) {
    this.id = `shadow_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this._config = { ...config };
    this._enabled = config.enabled;
  }

  get config(): AnyShadowConfig {
    return { ...this._config };
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  updateConfig(config: Partial<AnyShadowConfig>): void {
    this._config = { ...this._config, ...config } as AnyShadowConfig;
  }

  abstract render(
    ctx: CanvasRenderingContext2D,
    target: HTMLCanvasElement | ImageData
  ): void;

  calculateOffset(lightPosition: Point2D, objectPosition: Point2D): Point2D {
    // 基础实现：根据光源和对象位置计算阴影偏移
    const direction = {
      x: objectPosition.x - lightPosition.x,
      y: objectPosition.y - lightPosition.y
    };
    
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length === 0) {
      return { x: 0, y: 0 };
    }
    
    const normalized = {
      x: direction.x / length,
      y: direction.y / length
    };
    
    const shadowDistance = this.getShadowDistance();
    return {
      x: normalized.x * shadowDistance,
      y: normalized.y * shadowDistance
    };
  }

  abstract clone(): IShadow;

  dispose(): void {
    // 默认清理实现
  }

  /**
   * 解析颜色字符串为RGBA值
   */
  protected parseColor(color: string, opacity: number = 1): {
    r: number; g: number; b: number; a: number;
  } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      let r: number, g: number, b: number;
      
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        r = g = b = 0;
      }
      
      return { r, g, b, a: opacity * 255 };
    }
    
    // 默认黑色
    return { r: 0, g: 0, b: 0, a: opacity * 255 };
  }

  /**
   * 获取阴影距离
   */
  protected getShadowDistance(): number {
    // 根据spread参数计算阴影距离
    return this._config.spread || 10;
  }

  /**
   * 获取模糊半径的采样数量
   */
  protected getBlurSamples(): number {
    const quality = this._config.quality;
    switch (quality) {
      case ShadowQuality.LOW:
        return Math.max(1, Math.ceil(this._config.blur / 4));
      case ShadowQuality.MEDIUM:
        return Math.max(1, Math.ceil(this._config.blur / 2));
      case ShadowQuality.HIGH:
        return Math.max(1, this._config.blur);
      case ShadowQuality.ULTRA:
        return Math.max(1, this._config.blur * 2);
      default:
        return Math.max(1, this._config.blur);
    }
  }

  /**
   * 创建模糊效果
   */
  protected applyBlur(
    ctx: CanvasRenderingContext2D,
    blurRadius: number
  ): void {
    if (blurRadius > 0) {
      ctx.filter = `blur(${blurRadius}px)`;
    }
  }

  /**
   * 重置Canvas滤镜
   */
  protected resetFilter(ctx: CanvasRenderingContext2D): void {
    ctx.filter = 'none';
  }

  /**
   * 设置阴影样式
   */
  protected setShadowStyle(ctx: CanvasRenderingContext2D): void {
    const color = this.parseColor(this._config.color, this._config.opacity);
    
    ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    ctx.shadowBlur = this._config.blur;
    
    // 子类可以重写以设置shadowOffsetX和shadowOffsetY
  }

  /**
   * 清除阴影样式
   */
  protected clearShadowStyle(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * 限制值在指定范围内
   */
  protected clamp(value: number, min: number = 0, max: number = 255): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 创建临时画布
   */
  protected createTempCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  /**
   * 高斯模糊实现
   */
  protected gaussianBlur(
    imageData: ImageData,
    radius: number
  ): ImageData {
    if (radius === 0) {
      return imageData;
    }

    const { width, height } = imageData;
    const input = new Uint8ClampedArray(imageData.data);
    const output = new Uint8ClampedArray(imageData.data.length);
    
    // 创建高斯核
    const kernel = this.createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);
    
    // 水平模糊
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let i = 0; i < kernelSize; i++) {
          const sampleX = this.clampCoordinate(x + i - half, width);
          const index = (y * width + sampleX) * 4;
          const weight = kernel[i];
          
          r += input[index] * weight;
          g += input[index + 1] * weight;
          b += input[index + 2] * weight;
          a += input[index + 3] * weight;
        }
        
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = r;
        output[outputIndex + 1] = g;
        output[outputIndex + 2] = b;
        output[outputIndex + 3] = a;
      }
    }
    
    // 垂直模糊
    const temp = new Uint8ClampedArray(output);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let i = 0; i < kernelSize; i++) {
          const sampleY = this.clampCoordinate(y + i - half, height);
          const index = (sampleY * width + x) * 4;
          const weight = kernel[i];
          
          r += temp[index] * weight;
          g += temp[index + 1] * weight;
          b += temp[index + 2] * weight;
          a += temp[index + 3] * weight;
        }
        
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = this.clamp(r);
        output[outputIndex + 1] = this.clamp(g);
        output[outputIndex + 2] = this.clamp(b);
        output[outputIndex + 3] = this.clamp(a);
      }
    }
    
    return new ImageData(output, width, height);
  }

  /**
   * 创建高斯核
   */
  private createGaussianKernel(radius: number): number[] {
    const size = Math.ceil(radius) * 2 + 1;
    const sigma = radius / 3;
    const kernel = new Array(size);
    let sum = 0;
    
    for (let i = 0; i < size; i++) {
      const distance = Math.abs(i - Math.floor(size / 2));
      kernel[i] = Math.exp(-(distance * distance) / (2 * sigma * sigma));
      sum += kernel[i];
    }
    
    // 归一化
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }

  /**
   * 限制坐标在有效范围内
   */
  private clampCoordinate(coord: number, max: number): number {
    return Math.max(0, Math.min(max - 1, coord));
  }
}