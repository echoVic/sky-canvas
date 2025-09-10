/**
 * 颜色复合操作
 */

import { BaseCompositeOperation } from './BaseCompositeOperation';
import {
  CompositeOperation,
  CompositeConfig,
  ICompositeOperation
} from '../types/CompositeTypes';

/**
 * Hue 复合操作
 */
export class HueComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.HUE, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const destHsl = this.rgbToHsl(dest);
    const srcHsl = this.rgbToHsl(src);

    // 使用源的色相，保留目标的饱和度和亮度
    const result = this.hslToRgb(srcHsl.h, destHsl.s, destHsl.l);
    
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    return {
      r: alpha === 0 ? 0 : (result.r * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (result.g * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (result.b * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  private rgbToHsl(color: { r: number; g: number; b: number; a: number }): { h: number; s: number; l: number } {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    
    const l = sum / 2;
    
    if (diff === 0) {
      return { h: 0, s: 0, l };
    }
    
    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      return { r: l, g: l, b: l };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1/3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1/3)
    };
  }

  clone(): ICompositeOperation {
    return new HueComposite({ ...this._config });
  }
}

/**
 * Saturation 复合操作
 */
export class SaturationComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SATURATION, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const destHsl = this.rgbToHsl(dest);
    const srcHsl = this.rgbToHsl(src);

    // 使用源的饱和度，保留目标的色相和亮度
    const result = this.hslToRgb(destHsl.h, srcHsl.s, destHsl.l);
    
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    return {
      r: alpha === 0 ? 0 : (result.r * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (result.g * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (result.b * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  private rgbToHsl(color: { r: number; g: number; b: number; a: number }): { h: number; s: number; l: number } {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    
    const l = sum / 2;
    
    if (diff === 0) {
      return { h: 0, s: 0, l };
    }
    
    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      return { r: l, g: l, b: l };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1/3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1/3)
    };
  }

  clone(): ICompositeOperation {
    return new SaturationComposite({ ...this._config });
  }
}

/**
 * Color 复合操作
 */
export class ColorComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.COLOR, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const destHsl = this.rgbToHsl(dest);
    const srcHsl = this.rgbToHsl(src);

    // 使用源的色相和饱和度，保留目标的亮度
    const result = this.hslToRgb(srcHsl.h, srcHsl.s, destHsl.l);
    
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    return {
      r: alpha === 0 ? 0 : (result.r * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (result.g * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (result.b * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  private rgbToHsl(color: { r: number; g: number; b: number; a: number }): { h: number; s: number; l: number } {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    
    const l = sum / 2;
    
    if (diff === 0) {
      return { h: 0, s: 0, l };
    }
    
    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      return { r: l, g: l, b: l };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1/3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1/3)
    };
  }

  clone(): ICompositeOperation {
    return new ColorComposite({ ...this._config });
  }
}

/**
 * Luminosity 复合操作
 */
export class LuminosityComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.LUMINOSITY, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const destHsl = this.rgbToHsl(dest);
    const srcHsl = this.rgbToHsl(src);

    // 使用源的亮度，保留目标的色相和饱和度
    const result = this.hslToRgb(destHsl.h, destHsl.s, srcHsl.l);
    
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    return {
      r: alpha === 0 ? 0 : (result.r * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (result.g * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (result.b * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  private rgbToHsl(color: { r: number; g: number; b: number; a: number }): { h: number; s: number; l: number } {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    
    const l = sum / 2;
    
    if (diff === 0) {
      return { h: 0, s: 0, l };
    }
    
    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      return { r: l, g: l, b: l };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1/3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1/3)
    };
  }

  clone(): ICompositeOperation {
    return new LuminosityComposite({ ...this._config });
  }
}