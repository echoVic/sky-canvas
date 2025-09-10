/**
 * 投影滤镜实现
 * 支持可配置的投影效果
 */

import { BaseFilter } from './BaseFilter';
import {
  FilterType,
  FilterParameters,
  FilterContext,
  DropShadowParameters
} from '../types/FilterTypes';

export class DropShadowFilter extends BaseFilter {
  readonly type = FilterType.DROP_SHADOW;
  readonly name = 'Drop Shadow';
  readonly description = 'Adds a drop shadow effect to the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  /**
   * 处理投影滤镜
   */
  protected async processFilter(
    context: FilterContext,
    parameters: FilterParameters
  ): Promise<ImageData> {
    const params = parameters as DropShadowParameters;
    const { sourceImageData } = context;
    
    // 如果偏移和模糊都为0，返回原图
    if (params.offsetX === 0 && params.offsetY === 0 && params.blur === 0) {
      return this.cloneImageData(sourceImageData);
    }

    // 解析颜色
    const shadowColor = this.parseColor(params.color);
    const shadowOpacity = (params.opacity ?? 1) * (shadowColor.a / 255);
    
    // 计算扩展的画布尺寸以容纳阴影
    const blurRadius = Math.max(0, params.blur);
    const padding = Math.ceil(blurRadius * 2);
    const shadowOffsetX = Math.round(params.offsetX);
    const shadowOffsetY = Math.round(params.offsetY);
    
    const extendedWidth = sourceImageData.width + padding * 2 + Math.abs(shadowOffsetX);
    const extendedHeight = sourceImageData.height + padding * 2 + Math.abs(shadowOffsetY);
    
    // 创建扩展画布来绘制阴影
    const shadowCanvas = this.createCanvas(extendedWidth, extendedHeight);
    const shadowImageData = new ImageData(extendedWidth, extendedHeight);
    
    // 计算原图在扩展画布中的位置
    const originalOffsetX = padding + Math.max(0, -shadowOffsetX);
    const originalOffsetY = padding + Math.max(0, -shadowOffsetY);
    
    // 计算阴影在扩展画布中的位置
    const shadowPosX = originalOffsetX + shadowOffsetX;
    const shadowPosY = originalOffsetY + shadowOffsetY;
    
    // 第一步：创建阴影形状（基于原图的alpha通道）
    this.createShadowShape(
      sourceImageData,
      shadowImageData,
      shadowPosX,
      shadowPosY,
      shadowColor,
      shadowOpacity
    );
    
    // 第二步：应用模糊效果
    let blurredShadow = shadowImageData;
    if (blurRadius > 0) {
      blurredShadow = await this.applyGaussianBlur(shadowImageData, blurRadius);
    }
    
    // 第三步：合成原图到阴影上方
    this.compositeImage(
      sourceImageData,
      blurredShadow,
      originalOffsetX,
      originalOffsetY
    );
    
    // 裁剪回原始尺寸（如果需要）
    return this.cropToOriginalSize(
      blurredShadow,
      originalOffsetX,
      originalOffsetY,
      sourceImageData.width,
      sourceImageData.height
    );
  }

  /**
   * 创建阴影形状
   */
  private createShadowShape(
    sourceImageData: ImageData,
    targetImageData: ImageData,
    offsetX: number,
    offsetY: number,
    color: { r: number; g: number; b: number; a: number },
    opacity: number
  ): void {
    const sourceData = sourceImageData.data;
    const targetData = targetImageData.data;
    const sourceWidth = sourceImageData.width;
    const targetWidth = targetImageData.width;
    
    for (let y = 0; y < sourceImageData.height; y++) {
      for (let x = 0; x < sourceImageData.width; x++) {
        const sourceIndex = (y * sourceWidth + x) * 4;
        const sourceAlpha = sourceData[sourceIndex + 3];
        
        if (sourceAlpha > 0) {
          const targetX = offsetX + x;
          const targetY = offsetY + y;
          
          if (targetX >= 0 && targetX < targetImageData.width &&
              targetY >= 0 && targetY < targetImageData.height) {
            const targetIndex = (targetY * targetWidth + targetX) * 4;
            
            // 使用原图的alpha通道来创建阴影
            const shadowAlpha = (sourceAlpha / 255) * opacity;
            
            targetData[targetIndex] = color.r;
            targetData[targetIndex + 1] = color.g;
            targetData[targetIndex + 2] = color.b;
            targetData[targetIndex + 3] = Math.round(shadowAlpha * 255);
          }
        }
      }
    }
  }

  /**
   * 合成原图到目标图像
   */
  private compositeImage(
    sourceImageData: ImageData,
    targetImageData: ImageData,
    offsetX: number,
    offsetY: number
  ): void {
    const sourceData = sourceImageData.data;
    const targetData = targetImageData.data;
    const sourceWidth = sourceImageData.width;
    const targetWidth = targetImageData.width;
    
    for (let y = 0; y < sourceImageData.height; y++) {
      for (let x = 0; x < sourceImageData.width; x++) {
        const sourceIndex = (y * sourceWidth + x) * 4;
        const sourceAlpha = sourceData[sourceIndex + 3] / 255;
        
        if (sourceAlpha > 0) {
          const targetX = offsetX + x;
          const targetY = offsetY + y;
          
          if (targetX >= 0 && targetX < targetImageData.width &&
              targetY >= 0 && targetY < targetImageData.height) {
            const targetIndex = (targetY * targetWidth + targetX) * 4;
            
            // Alpha混合
            const targetAlpha = targetData[targetIndex + 3] / 255;
            const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
            
            if (outAlpha > 0) {
              targetData[targetIndex] = Math.round(
                (sourceData[sourceIndex] * sourceAlpha + 
                 targetData[targetIndex] * targetAlpha * (1 - sourceAlpha)) / outAlpha
              );
              targetData[targetIndex + 1] = Math.round(
                (sourceData[sourceIndex + 1] * sourceAlpha + 
                 targetData[targetIndex + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha
              );
              targetData[targetIndex + 2] = Math.round(
                (sourceData[sourceIndex + 2] * sourceAlpha + 
                 targetData[targetIndex + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha
              );
              targetData[targetIndex + 3] = Math.round(outAlpha * 255);
            }
          }
        }
      }
    }
  }

  /**
   * 裁剪到原始尺寸
   */
  private cropToOriginalSize(
    imageData: ImageData,
    offsetX: number,
    offsetY: number,
    originalWidth: number,
    originalHeight: number
  ): ImageData {
    const result = new ImageData(originalWidth, originalHeight);
    const sourceData = imageData.data;
    const resultData = result.data;
    const sourceWidth = imageData.width;
    
    for (let y = 0; y < originalHeight; y++) {
      for (let x = 0; x < originalWidth; x++) {
        const sourceIndex = ((offsetY + y) * sourceWidth + (offsetX + x)) * 4;
        const resultIndex = (y * originalWidth + x) * 4;
        
        resultData[resultIndex] = sourceData[sourceIndex];
        resultData[resultIndex + 1] = sourceData[sourceIndex + 1];
        resultData[resultIndex + 2] = sourceData[sourceIndex + 2];
        resultData[resultIndex + 3] = sourceData[sourceIndex + 3];
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
        
        const kernelSize = Math.ceil(radius * 2);
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
        
        const kernelSize = Math.ceil(radius * 2);
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
   * 创建临时画布
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * 验证投影特定参数
   */
  protected validateSpecificParameters(parameters: FilterParameters): boolean {
    const params = parameters as DropShadowParameters;
    
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
  getDefaultParameters(): DropShadowParameters {
    return {
      type: FilterType.DROP_SHADOW,
      offsetX: 4,
      offsetY: 4,
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
    const params = parameters as DropShadowParameters;
    return 2.5 + (params.blur / 10); // 阴影效果相对复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.002; // 阴影处理需要更多时间
  }
}