/**
 * 饱和度调整滤镜实现
 * 支持饱和度的增减调整
 */

import { BaseFilter } from './BaseFilter';
import {
  FilterType,
  FilterParameters,
  FilterContext,
  SaturationParameters
} from '../types/FilterTypes';

export class SaturationFilter extends BaseFilter {
  readonly type = FilterType.SATURATION;
  readonly name = 'Saturation';
  readonly description = 'Adjusts the saturation of the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理饱和度调整滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: FilterParameters
  ): Promise<ImageData> {
    const params = parameters as SaturationParameters;
    const { sourceImageData } = context;
    
    if (params.saturation === 0) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    const data = result.data;
    
    // 将饱和度值从-100~100转换为调整因子
    const saturation = 1 + (params.saturation / 100);
    
    // 计算灰度权重 (ITU-R BT.709标准)
    const lumR = 0.2126;
    const lumG = 0.7152;
    const lumB = 0.0722;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 计算亮度
      const luminance = r * lumR + g * lumG + b * lumB;
      
      // 应用饱和度调整
      // newColor = luminance + (originalColor - luminance) * saturation
      data[i] = this.clamp(luminance + (r - luminance) * saturation);
      data[i + 1] = this.clamp(luminance + (g - luminance) * saturation);
      data[i + 2] = this.clamp(luminance + (b - luminance) * saturation);
      // data[i + 3] = data[i + 3]; // Alpha保持不变
    }

    // 应用不透明度
    if (params.opacity !== undefined && params.opacity < 1) {
      return this.applyOpacity(result, params.opacity);
    }
    
    return result;
  }

  /**
   * 验证饱和度特定参数
   */
  protected validateSpecificParameters(parameters: FilterParameters): boolean {
    const params = parameters as SaturationParameters;
    
    if (typeof params.saturation !== 'number' || 
        params.saturation < -100 || 
        params.saturation > 100) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): SaturationParameters {
    return {
      type: FilterType.SATURATION,
      saturation: 0,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: FilterParameters): number {
    return 0.8; // 饱和度调整需要计算亮度，稍复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0008; // 需要更多计算
  }
}