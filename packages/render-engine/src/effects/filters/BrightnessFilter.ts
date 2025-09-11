/**
 * 亮度调整滤镜实现
 * 支持亮度的增减调整
 */

import {
    BrightnessParameters,
    FilterContext,
    FilterType
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export class BrightnessFilter extends BaseFilter<BrightnessParameters> {
  readonly type = FilterType.BRIGHTNESS;
  readonly name = 'Brightness';
  readonly description = 'Adjusts the brightness of the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理亮度调整滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: BrightnessParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    if (parameters.brightness === 0) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    const data = result.data;
    
    // 将亮度值从-100~100转换为调整因子
    const adjustment = parameters.brightness * 2.55; // 转换为0-255范围的调整值
    
    for (let i = 0; i < data.length; i += 4) {
      // 调整RGB通道，保持Alpha不变
      data[i] = this.clamp(data[i] + adjustment);     // Red
      data[i + 1] = this.clamp(data[i + 1] + adjustment); // Green
      data[i + 2] = this.clamp(data[i + 2] + adjustment); // Blue
      // data[i + 3] = data[i + 3]; // Alpha保持不变
    }

    // 应用不透明度
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(result, parameters.opacity);
    }
    
    return result;
  }

  /**
   * 验证亮度特定参数
   */
  protected validateSpecificParameters(parameters: BrightnessParameters): boolean {
    if (typeof parameters.brightness !== 'number' || 
        parameters.brightness < -100 || 
        parameters.brightness > 100) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): BrightnessParameters {
    return {
      type: FilterType.BRIGHTNESS,
      brightness: 0,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: BrightnessParameters): number {
    return 0.5; // 亮度调整是最简单的操作之一
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0005; // 亮度调整很快
  }
}