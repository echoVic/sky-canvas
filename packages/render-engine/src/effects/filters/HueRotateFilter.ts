/**
 * 色相旋转滤镜实现
 * 支持色相的旋转调整
 */

import {
    FilterType,
    HueRotateParameters
} from '../types/FilterTypes';
import { PixelProcessor, RGBProcessorFunction } from './PixelProcessor';
import { rgbToHsl, hslToRgb } from '../../utils/ColorUtils';

export class HueRotateFilter extends PixelProcessor<HueRotateParameters> {
  readonly type = FilterType.HUE_ROTATE;
  readonly name = 'Hue Rotate';
  readonly description = 'Rotates the hue of the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 检查是否应该跳过处理
   */
  protected shouldSkipProcessing(parameters: HueRotateParameters): boolean {
    return parameters.angle === 0 || parameters.angle === 360;
  }

  /**
   * 获取RGB处理函数
   */
  protected getRGBProcessor(parameters: HueRotateParameters): RGBProcessorFunction {
    return (r, g, b) => {
      // 转换为0-1范围
      const normalizedRgb = { r: r / 255, g: g / 255, b: b / 255, a: 1 };
      
      // 转换到HSL空间
      const hsl = rgbToHsl(normalizedRgb);
      
      // 旋转色相
      hsl.h = (hsl.h + parameters.angle) % 360;
      if (hsl.h < 0) hsl.h += 360;
      
      // 转换回RGB空间
      const rgb = hslToRgb(hsl);
      
      return [
        Math.round(rgb.r * 255),
        Math.round(rgb.g * 255),
        Math.round(rgb.b * 255)
      ];
    };
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