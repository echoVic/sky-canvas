/**
 * 对比度调整滤镜实现
 * 支持对比度的增减调整
 */

import {
    ContrastParameters,
    FilterContext,
    FilterType
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export class ContrastFilter extends BaseFilter<ContrastParameters> {
  readonly type = FilterType.CONTRAST;
  readonly name = 'Contrast';
  readonly description = 'Adjusts the contrast of the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理对比度调整滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: ContrastParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    if (parameters.contrast === 0) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    const data = result.data;
    
    // 将对比度值从-100~100转换为调整因子
    // 对比度公式: newValue = (oldValue - 128) * factor + 128
    // factor = (100 + contrast) / 100
    const factor = (100 + parameters.contrast) / 100;
    
    for (let i = 0; i < data.length; i += 4) {
      // 调整RGB通道，保持Alpha不变
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 应用对比度调整
      data[i] = this.clamp((r - 128) * factor + 128);
      data[i + 1] = this.clamp((g - 128) * factor + 128);
      data[i + 2] = this.clamp((b - 128) * factor + 128);
      // data[i + 3] = data[i + 3]; // Alpha保持不变
    }

    // 应用不透明度
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(result, parameters.opacity);
    }
    
    return result;
  }

  /**
   * 验证对比度特定参数
   */
  protected validateSpecificParameters(parameters: ContrastParameters): boolean {
    
    if (typeof parameters.contrast !== 'number' || 
        parameters.contrast < -100 || 
        parameters.contrast > 100) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): ContrastParameters {
    return {
      type: FilterType.CONTRAST,
      contrast: 0,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: ContrastParameters): number {
    return 0.6; // 对比度调整比亮度稍复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0006; // 略比亮度调整慢一点
  }
}