/**
 * 内阴影滤镜实现
 * 在图像内部创建阴影效果
 */

import { BaseFilter } from './BaseFilter';
import {
  FilterType,
  FilterParameters,
  FilterContext,
  InnerShadowParameters
} from '../types/FilterTypes';

export class InnerShadowFilter extends BaseFilter {
  readonly type = FilterType.INNER_SHADOW;
  readonly name = 'Inner Shadow';
  readonly description = 'Adds an inner shadow effect to the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理内阴影滤镜
   */
  protected async processFilter(
    context: FilterContext,
    parameters: FilterParameters
  ): Promise<ImageData> {
    const params = parameters as InnerShadowParameters;
    const { sourceImageData } = context;
    
    // 如果偏移和模糊都为0，返回原图
    if (params.offsetX === 0 && params.offsetY === 0 && params.blur === 0) {
      return this.cloneImageData(sourceImageData);
    }

    // 解析颜色
    const shadowColor = this.parseColor(params.color);
    const shadowOpacity = (params.opacity ?? 1) * (shadowColor.a / 255);
    
    const result = this.cloneImageData(sourceImageData);
    
    // 第一步：创建反向蒙版（边缘检测）
    const edgeMask = this.createEdgeMask(sourceImageData, params.offsetX, params.offsetY);
    
    // 第二步：对边缘蒙版应用模糊
    let blurredMask = edgeMask;
    if (params.blur > 0) {
      blurredMask = await this.applyGaussianBlur(edgeMask, params.blur);
    }
    
    // 第三步：将内阴影合成到原图上
    this.applyInnerShadow(result, blurredMask, shadowColor, shadowOpacity);
    
    return result;
  }

  /**
   * 创建边缘蒙版用于内阴影
   */
  private createEdgeMask(
    sourceImageData: ImageData,
    offsetX: number,
    offsetY: number
  ): ImageData {
    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const sourceData = sourceImageData.data;
    const maskData = new ImageData(width, height);
    const mask = maskData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const currentIndex = (y * width + x) * 4;
        const currentAlpha = sourceData[currentIndex + 3];
        
        if (currentAlpha > 0) {
          // 检查偏移位置的像素
          const offsetPosX = x - Math.round(offsetX);
          const offsetPosY = y - Math.round(offsetY);
          
          let offsetAlpha = 0;
          if (offsetPosX >= 0 && offsetPosX < width &&
              offsetPosY >= 0 && offsetPosY < height) {
            const offsetIndex = (offsetPosY * width + offsetPosX) * 4;
            offsetAlpha = sourceData[offsetIndex + 3];
          }
          
          // 如果当前像素有内容但偏移位置没有内容，则创建内阴影
          if (currentAlpha > 0 && offsetAlpha === 0) {
            mask[currentIndex] = 255;     // R
            mask[currentIndex + 1] = 255; // G
            mask[currentIndex + 2] = 255; // B
            mask[currentIndex + 3] = currentAlpha; // A
          } else {
            // 根据alpha差值创建渐变内阴影
            const alphaDiff = Math.max(0, currentAlpha - offsetAlpha);
            const intensity = alphaDiff / 255;
            
            mask[currentIndex] = 255;
            mask[currentIndex + 1] = 255;
            mask[currentIndex + 2] = 255;
            mask[currentIndex + 3] = Math.round(intensity * currentAlpha);
          }
        }
      }
    }
    
    return maskData;
  }

  /**
   * 应用内阴影效果
   */
  private applyInnerShadow(
    targetImageData: ImageData,
    maskImageData: ImageData,
    color: { r: number; g: number; b: number; a: number },
    opacity: number
  ): void {
    const targetData = targetImageData.data;
    const maskData = maskImageData.data;
    const width = targetImageData.width;
    const height = targetImageData.height;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const maskAlpha = (maskData[index + 3] / 255) * opacity;
        const targetAlpha = targetData[index + 3] / 255;
        
        if (maskAlpha > 0 && targetAlpha > 0) {
          // 使用multiply混合模式创建阴影效果
          const shadowStrength = maskAlpha;
          
          // 混合阴影颜色
          targetData[index] = Math.round(
            targetData[index] * (1 - shadowStrength) + 
            color.r * shadowStrength * 0.5
          );
          targetData[index + 1] = Math.round(
            targetData[index + 1] * (1 - shadowStrength) + 
            color.g * shadowStrength * 0.5
          );
          targetData[index + 2] = Math.round(
            targetData[index + 2] * (1 - shadowStrength) + 
            color.b * shadowStrength * 0.5
          );
        }
      }
    }
  }

  /**
   * 应用高斯模糊
   */
  private async applyGaussianBlur(imageData: ImageData, radius: number): Promise<ImageData> {
    if (radius <= 0) return imageData;
    
    // 简化的高斯模糊实现
    const result = this.cloneImageData(imageData);
    const data = result.data;
    const width = result.width;
    const height = result.height;
    
    // 水平模糊
    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
        let totalWeight = 0;
        
        const kernelSize = Math.ceil(radius);
        for (let kx = -kernelSize; kx <= kernelSize; kx++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + kx));
          const weight = Math.exp(-(kx * kx) / (2 * radius * radius));
          const index = (y * width + sampleX) * 4;
          
          totalR += data[index] * weight;
          totalG += data[index + 1] * weight;
          totalB += data[index + 2] * weight;
          totalA += data[index + 3] * weight;
          totalWeight += weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        temp[targetIndex] = totalR / totalWeight;
        temp[targetIndex + 1] = totalG / totalWeight;
        temp[targetIndex + 2] = totalB / totalWeight;
        temp[targetIndex + 3] = totalA / totalWeight;
      }
    }
    
    // 垂直模糊
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
        let totalWeight = 0;
        
        const kernelSize = Math.ceil(radius);
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          const sampleY = Math.max(0, Math.min(height - 1, y + ky));
          const weight = Math.exp(-(ky * ky) / (2 * radius * radius));
          const index = (sampleY * width + x) * 4;
          
          totalR += temp[index] * weight;
          totalG += temp[index + 1] * weight;
          totalB += temp[index + 2] * weight;
          totalA += temp[index + 3] * weight;
          totalWeight += weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        data[targetIndex] = Math.round(totalR / totalWeight);
        data[targetIndex + 1] = Math.round(totalG / totalWeight);
        data[targetIndex + 2] = Math.round(totalB / totalWeight);
        data[targetIndex + 3] = Math.round(totalA / totalWeight);
      }
    }
    
    return result;
  }

  /**
   * 解析颜色字符串
   */
  private parseColor(colorStr: string): { r: number; g: number; b: number; a: number } {
    // 简单的颜色解析，支持 hex 和 rgba
    if (colorStr.startsWith('#')) {
      const hex = colorStr.substring(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
          a: 255
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
          a: 255
        };
      }
    } else if (colorStr.startsWith('rgba(')) {
      const values = colorStr.match(/rgba?\(([^)]+)\)/)?.[1].split(',');
      if (values && values.length >= 3) {
        return {
          r: parseInt(values[0].trim()),
          g: parseInt(values[1].trim()),
          b: parseInt(values[2].trim()),
          a: values.length > 3 ? Math.round(parseFloat(values[3].trim()) * 255) : 255
        };
      }
    }
    
    // 默认黑色
    return { r: 0, g: 0, b: 0, a: 255 };
  }

  /**
   * 验证内阴影特定参数
   */
  protected validateSpecificParameters(parameters: FilterParameters): boolean {
    const params = parameters as InnerShadowParameters;
    
    if (typeof params.offsetX !== 'number' ||
        typeof params.offsetY !== 'number' ||
        typeof params.blur !== 'number' ||
        typeof params.color !== 'string') {
      return false;
    }
    
    if (params.blur < 0) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): InnerShadowParameters {
    return {
      type: FilterType.INNER_SHADOW,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: '#000000',
      opacity: 0.5,
      enabled: true
    };
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: FilterParameters): number {
    const params = parameters as InnerShadowParameters;
    return 2.0 + (params.blur / 10); // 内阴影处理较复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0018; // 内阴影处理需要较多时间
  }
}