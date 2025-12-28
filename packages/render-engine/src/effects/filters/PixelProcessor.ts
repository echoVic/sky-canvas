/**
 * 像素处理器抽象类
 * 为基于像素处理的滤镜提供通用的处理模板
 */

import { FilterContext, FilterParameters } from '../types/FilterTypes';
import { BaseFilter } from './BaseFilter';

export type PixelProcessorFunction = (
  r: number, 
  g: number, 
  b: number, 
  a: number, 
  index: number
) => [number, number, number, number];

export type RGBProcessorFunction = (
  r: number, 
  g: number, 
  b: number
) => [number, number, number];

/**
 * 像素处理器抽象类
 * 提供通用的像素遍历和处理逻辑
 */
export abstract class PixelProcessor<T extends FilterParameters> extends BaseFilter<T> {

  /**
   * 处理过滤器的通用入口点
   */
  protected async processFilter(
    context: FilterContext, 
    parameters: T
  ): Promise<ImageData> {
    const { sourceImageData } = context;
    
    // 如果参数表明无需处理，直接返回原图
    if (this.shouldSkipProcessing(parameters)) {
      return this.cloneImageData(sourceImageData);
    }

    const result = this.cloneImageData(sourceImageData);
    
    // 执行像素处理
    this.processPixels(result.data, parameters);

    // 应用不透明度
    return this.applyOpacityIfNeeded(result, parameters);
  }

  /**
   * 检查是否应该跳过处理
   */
  protected abstract shouldSkipProcessing(parameters: T): boolean;

  /**
   * 使用完整的像素处理函数处理所有像素
   */
  protected processPixels(
    data: Uint8ClampedArray,
    parameters: T,
    processor?: PixelProcessorFunction
  ): void {
    const pixelProcessor = processor || this.getPixelProcessor(parameters);
    
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = pixelProcessor(
        data[i], 
        data[i + 1], 
        data[i + 2], 
        data[i + 3], 
        i
      );
      
      data[i] = this.clamp(r);
      data[i + 1] = this.clamp(g);
      data[i + 2] = this.clamp(b);
      data[i + 3] = this.clamp(a);
    }
  }

  /**
   * 使用RGB处理函数处理像素（保持alpha不变）
   */
  protected processRGBPixels(
    data: Uint8ClampedArray,
    parameters: T,
    processor?: RGBProcessorFunction
  ): void {
    const rgbProcessor = processor || this.getRGBProcessor(parameters);
    
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = rgbProcessor(
        data[i], 
        data[i + 1], 
        data[i + 2]
      );
      
      data[i] = this.clamp(r);
      data[i + 1] = this.clamp(g);
      data[i + 2] = this.clamp(b);
      // data[i + 3] 保持不变
    }
  }

  /**
   * 获取像素处理函数（子类可选实现）
   */
  protected getPixelProcessor(parameters: T): PixelProcessorFunction {
    // 默认实现：使用RGB处理器并保持alpha不变
    const rgbProcessor = this.getRGBProcessor(parameters);
    return (r, g, b, a) => {
      const [newR, newG, newB] = rgbProcessor(r, g, b);
      return [newR, newG, newB, a];
    };
  }

  /**
   * 获取RGB处理函数（子类实现）
   */
  protected getRGBProcessor(parameters: T): RGBProcessorFunction {
    throw new Error('子类必须实现 getRGBProcessor 或 getPixelProcessor 方法');
  }

  /**
   * 应用不透明度（如果需要）
   */
  protected applyOpacityIfNeeded(imageData: ImageData, parameters: T): ImageData {
    if (parameters.opacity !== undefined && parameters.opacity < 1) {
      return this.applyOpacity(imageData, parameters.opacity);
    }
    return imageData;
  }

  /**
   * 创建简单的调整函数
   */
  protected static createAdjustmentProcessor(
    adjustment: number | ((value: number) => number)
  ): RGBProcessorFunction {
    const adjustFn = typeof adjustment === 'function' ? adjustment : (value: number) => value + adjustment;
    return (r, g, b) => [adjustFn(r), adjustFn(g), adjustFn(b)];
  }

  /**
   * 创建基于因子的处理函数
   */
  protected static createFactorProcessor(
    factor: number | ((value: number) => number),
    center: number = 0
  ): RGBProcessorFunction {
    const factorFn = typeof factor === 'function' ? factor : (value: number) => (value - center) * factor + center;
    return (r, g, b) => [factorFn(r), factorFn(g), factorFn(b)];
  }

  /**
   * 创建基于权重的灰度处理函数
   */
  protected static createLuminanceProcessor(
    lumR: number = 0.2126,
    lumG: number = 0.7152,
    lumB: number = 0.0722
  ): (r: number, g: number, b: number) => number {
    return (r, g, b) => r * lumR + g * lumG + b * lumB;
  }
}