/**
 * 灰度滤镜实现
 * 支持可调节的灰度化效果
 */

import {
    FilterContext,
    FilterType,
    GrayscaleParameters
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export class GrayscaleFilter extends BaseFilter<GrayscaleParameters> {
  readonly type = FilterType.GRAYSCALE;
  readonly name = 'Grayscale';
  readonly description = 'Converts the image to grayscale';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理灰度滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: GrayscaleParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    if (parameters.amount === 0) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    const data = result.data;
    
    // 使用ITU-R BT.709标准的亮度权重
    const lumR = 0.2126;
    const lumG = 0.7152;
    const lumB = 0.0722;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 计算灰度值
      const gray = r * lumR + g * lumG + b * lumB;
      
      // 根据amount参数混合原色和灰度
      data[i] = this.clamp(r + (gray - r) * parameters.amount);
      data[i + 1] = this.clamp(g + (gray - g) * parameters.amount);
      data[i + 2] = this.clamp(b + (gray - b) * parameters.amount);
      // data[i + 3] = data[i + 3]; // Alpha保持不变
    }

    // 应用不透明度
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(result, parameters.opacity);
    }
    
    return result;
  }

  /**
   * 验证灰度特定参数
   */
  protected validateSpecificParameters(parameters: GrayscaleParameters): boolean {
    
    if (typeof parameters.amount !== 'number' || 
        parameters.amount < 0 || 
        parameters.amount > 1) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): GrayscaleParameters {
    return {
      type: FilterType.GRAYSCALE,
      amount: 1,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: GrayscaleParameters): number {
    return 0.7; // 灰度转换相对简单
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0007;
  }
}