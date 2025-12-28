/**
 * 投影滤镜实现
 * 支持可配置的投影效果
 */

import {
    DropShadowParameters,
    FilterContext,
    FilterType
} from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';
import { GaussianBlurFilter } from './GaussianBlurFilter';
import { parseColor } from '../../utils/ColorUtils';

export class DropShadowFilter extends BaseFilter<DropShadowParameters> {
  readonly type = FilterType.DROP_SHADOW;
  readonly name = 'Drop Shadow';
  readonly description = 'Adds a drop shadow effect to the image';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = false;

  private blurFilter = new GaussianBlurFilter();

  /**
   * 处理投影滤镜
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: DropShadowParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    // 如果偏移和模糊都为0，返回原图
    if (parameters.offsetX === 0 && parameters.offsetY === 0 && parameters.blur === 0) {
      return this.cloneImageData(sourceImageData);
    }

    // 解析颜色
    const shadowColor = parseColor(parameters.color);
    const shadowOpacity = (parameters.opacity ?? 1) * shadowColor.a;
    
    // 计算扩展的画布尺寸以容纳阴影
    const blurRadius = Math.max(0, parameters.blur);
    const padding = Math.ceil(blurRadius * 2);
    const shadowOffsetX = Math.round(parameters.offsetX);
    const shadowOffsetY = Math.round(parameters.offsetY);
    
    const extendedWidth = sourceImageData.width + padding * 2 + Math.abs(shadowOffsetX);
    const extendedHeight = sourceImageData.height + padding * 2 + Math.abs(shadowOffsetY);
    
    // 创建扩展画布来绘制阴影
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
      const blurContext: FilterContext = {
        sourceImageData: shadowImageData,
        width: shadowImageData.width,
        height: shadowImageData.height,
        timestamp: Date.now()
      };
      const blurResult = await this.blurFilter.apply(blurContext, {
        type: FilterType.GAUSSIAN_BLUR,
        radius: blurRadius,
        enabled: true
      });
      if (blurResult.success && blurResult.processedImageData) {
        blurredShadow = blurResult.processedImageData;
      }
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
            
            targetData[targetIndex] = Math.round(color.r * 255);
            targetData[targetIndex + 1] = Math.round(color.g * 255);
            targetData[targetIndex + 2] = Math.round(color.b * 255);
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
   * 验证投影特定参数
   */
  protected validateSpecificParameters(parameters: DropShadowParameters): boolean {
    
    if (typeof parameters.offsetX !== 'number' ||
        typeof parameters.offsetY !== 'number' ||
        typeof parameters.blur !== 'number' ||
        typeof parameters.color !== 'string') {
      return false;
    }
    
    if (parameters.blur < 0) {
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
  protected getComplexityFactor(parameters: DropShadowParameters): number {
    return 2.5 + (parameters.blur / 10); // 阴影效果相对复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.002; // 阴影处理需要更多时间
  }
}