/**
 * 高斯模糊滤镜实现
 * 支持可配置的模糊半径和质量设置
 */

import {
    FilterContext,
    FilterType,
    GaussianBlurParameters
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export class GaussianBlurFilter extends BaseFilter<GaussianBlurParameters> {
  readonly type = FilterType.GAUSSIAN_BLUR;
  readonly name = 'Gaussian Blur';
  readonly description = 'Applies Gaussian blur effect with configurable radius and quality';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理高斯模糊滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: GaussianBlurParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    if (parameters.radius <= 0) {
      return this.cloneImageData(sourceImageData);
    }

    // 根据质量设置调整实际半径
    const actualRadius = this.adjustRadiusForQuality(parameters.radius, parameters.quality);
    
    // 生成高斯核
    const kernel = this.generateGaussianKernel(actualRadius);
    
    // 应用可分离的高斯滤镜（水平 + 垂直）
    const horizontalBlurred = this.applyHorizontalBlur(sourceImageData, kernel);
    const verticalBlurred = this.applyVerticalBlur(horizontalBlurred, kernel);
    
    // 应用不透明度
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(verticalBlurred, parameters.opacity);
    }
    
    return verticalBlurred;
  }

  /**
   * 根据质量调整半径
   */
  private adjustRadiusForQuality(radius: number, quality: string = 'medium'): number {
    switch (quality) {
      case 'low':
        return Math.max(1, Math.round(radius * 0.5));
      case 'high':
        return Math.round(radius * 1.5);
      case 'medium':
      default:
        return Math.round(radius);
    }
  }

  /**
   * 生成高斯核
   */
  private generateGaussianKernel(radius: number): number[] {
    const sigma = radius / 3; // 标准偏差
    const size = Math.ceil(radius) * 2 + 1; // 核大小（奇数）
    const kernel: number[] = new Array(size);
    const center = Math.floor(size / 2);
    
    let sum = 0;
    
    // 生成高斯权重
    for (let i = 0; i < size; i++) {
      const x = i - center;
      const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel[i] = weight;
      sum += weight;
    }
    
    // 归一化（确保权重总和为1）
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }

  /**
   * 应用水平模糊
   */
  private applyHorizontalBlur(imageData: ImageData, kernel: number[]): ImageData {
    const { width, height } = imageData;
    const sourceData = imageData.data;
    const outputData = new Uint8ClampedArray(sourceData.length);
    
    const radius = Math.floor(kernel.length / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outputIndex = (y * width + x) * 4;
        
        let r = 0, g = 0, b = 0, a = 0;
        
        // 应用核卷积
        for (let i = 0; i < kernel.length; i++) {
          const sampleX = this.clampCoordinate(x - radius + i, width);
          const sampleIndex = (y * width + sampleX) * 4;
          const weight = kernel[i];
          
          r += sourceData[sampleIndex] * weight;
          g += sourceData[sampleIndex + 1] * weight;
          b += sourceData[sampleIndex + 2] * weight;
          a += sourceData[sampleIndex + 3] * weight;
        }
        
        outputData[outputIndex] = Math.round(r);
        outputData[outputIndex + 1] = Math.round(g);
        outputData[outputIndex + 2] = Math.round(b);
        outputData[outputIndex + 3] = Math.round(a);
      }
    }
    
    return new ImageData(outputData, width, height);
  }

  /**
   * 应用垂直模糊
   */
  private applyVerticalBlur(imageData: ImageData, kernel: number[]): ImageData {
    const { width, height } = imageData;
    const sourceData = imageData.data;
    const outputData = new Uint8ClampedArray(sourceData.length);
    
    const radius = Math.floor(kernel.length / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outputIndex = (y * width + x) * 4;
        
        let r = 0, g = 0, b = 0, a = 0;
        
        // 应用核卷积
        for (let i = 0; i < kernel.length; i++) {
          const sampleY = this.clampCoordinate(y - radius + i, height);
          const sampleIndex = (sampleY * width + x) * 4;
          const weight = kernel[i];
          
          r += sourceData[sampleIndex] * weight;
          g += sourceData[sampleIndex + 1] * weight;
          b += sourceData[sampleIndex + 2] * weight;
          a += sourceData[sampleIndex + 3] * weight;
        }
        
        outputData[outputIndex] = Math.round(r);
        outputData[outputIndex + 1] = Math.round(g);
        outputData[outputIndex + 2] = Math.round(b);
        outputData[outputIndex + 3] = Math.round(a);
      }
    }
    
    return new ImageData(outputData, width, height);
  }

  /**
   * 限制坐标在有效范围内（镜像模式）
   */
  private clampCoordinate(coord: number, max: number): number {
    if (coord < 0) {
      return -coord;
    }
    if (coord >= max) {
      return max - 1 - (coord - max);
    }
    return coord;
  }

  /**
   * 验证高斯模糊特定参数
   */
  protected validateSpecificParameters(parameters: GaussianBlurParameters): boolean {
    
    if (typeof parameters.radius !== 'number' || parameters.radius < 0 || parameters.radius > 100) {
      return false;
    }
    
    if (parameters.quality && !['low', 'medium', 'high'].includes(parameters.quality)) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): GaussianBlurParameters {
    return {
      type: FilterType.GAUSSIAN_BLUR,
      radius: 5,
      quality: 'medium',
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: GaussianBlurParameters): number {
    const quality = parameters.quality || 'medium';
    
    let factor = Math.max(1, parameters.radius / 5); // 基于半径的因子
    
    switch (quality) {
      case 'low':
        factor *= 0.5;
        break;
      case 'high':
        factor *= 2;
        break;
      case 'medium':
      default:
        factor *= 1;
        break;
    }
    
    return factor;
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.002; // 高斯模糊相对较慢
  }
}