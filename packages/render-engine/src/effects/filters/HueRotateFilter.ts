/**
 * 色相旋转滤镜实现
 * 支持色相的旋转调整
 */

import {
    FilterContext,
    FilterType,
    HueRotateParameters
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export class HueRotateFilter extends BaseFilter<HueRotateParameters> {
  readonly type = FilterType.HUE_ROTATE;
  readonly name = 'Hue Rotate';
  readonly description = 'Rotates the hue of the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理色相旋转滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: HueRotateParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    if (parameters.angle === 0 || parameters.angle === 360) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    const data = result.data;
    
    // 将角度转换为弧度
    const angleRad = (parameters.angle * Math.PI) / 180;
    
    // 预计算色相旋转矩阵的值
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // RGB到YIQ转换矩阵和色相旋转
    // 使用YIQ色彩空间进行色相旋转，因为它能更好地保持亮度
    const lumR = 0.299;
    const lumG = 0.587;
    const lumB = 0.114;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      // 计算HSL值进行色相旋转
      const hsl = this.rgbToHsl(r, g, b);
      
      // 旋转色相
      hsl.h = (hsl.h + parameters.angle) % 360;
      if (hsl.h < 0) hsl.h += 360;
      
      // 转换回RGB
      const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
      
      data[i] = Math.round(rgb.r * 255);
      data[i + 1] = Math.round(rgb.g * 255);
      data[i + 2] = Math.round(rgb.b * 255);
      // data[i + 3] = data[i + 3]; // Alpha保持不变
    }

    // 应用不透明度
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(result, parameters.opacity);
    }
    
    return result;
  }

  /**
   * RGB转HSL
   */
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / delta + 2) / 6;
          break;
        case b:
          h = ((r - g) / delta + 4) / 6;
          break;
      }
    }
    
    return { h: h * 360, s, l };
  }

  /**
   * HSL转RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = h / 360; // 转换为0-1范围
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // 无色相，灰度
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  /**
   * 验证色相旋转特定参数
   */
  protected validateSpecificParameters(parameters: HueRotateParameters): boolean {
    
    if (typeof parameters.angle !== 'number') {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): HueRotateParameters {
    return {
      type: FilterType.HUE_ROTATE,
      angle: 0,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: HueRotateParameters): number {
    return 1.5; // 色相旋转需要RGB-HSL转换，较复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0015; // 颜色空间转换较耗时
  }
}