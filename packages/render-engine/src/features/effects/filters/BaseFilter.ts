/**
 * 基础滤镜抽象类
 * 为所有滤镜提供通用功能和接口实现
 */

import {
    FilterContext,
    FilterParameters,
    FilterResult,
    FilterType,
    IFilter
} from '../types/FilterTypes';

export abstract class BaseFilter<T extends FilterParameters = FilterParameters> implements IFilter {
  abstract readonly type: FilterType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly supportedInputFormats: string[];
  abstract readonly requiresWebGL: boolean;

  protected performanceStats = {
    totalExecutions: 0,
    totalProcessingTime: 0,
    successfulExecutions: 0,
    errors: 0
  };

  /**
   * 应用滤镜的通用入口点
   */
  async apply(context: FilterContext, parameters: FilterParameters): Promise<FilterResult> {
    const startTime = performance.now();
    this.performanceStats.totalExecutions++;

    try {
      // 验证参数
      if (!this.validateParameters(parameters)) {
        throw new Error(`Invalid parameters for filter ${this.type}`);
      }

      // 检查上下文有效性
      if (!this.validateContext(context)) {
        throw new Error(`Invalid context for filter ${this.type}`);
      }

      // 执行具体的滤镜处理
      const processedImageData = await this.processFilter(context, parameters as T);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      this.performanceStats.totalProcessingTime += processingTime;
      this.performanceStats.successfulExecutions++;

      return {
        success: true,
        processedImageData,
        processingTime,
        memoryUsage: this.estimateMemoryUsage(context.width, context.height)
      };

    } catch (error) {
      this.performanceStats.errors++;
      const endTime = performance.now();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: endTime - startTime
      };
    }
  }

  /**
   * 抽象方法：具体的滤镜处理逻辑
   */
  protected abstract processFilter(
    context: FilterContext, 
    parameters: T
  ): Promise<ImageData>;

  /**
   * 验证滤镜上下文
   */
  protected validateContext(context: FilterContext): boolean {
    if (!context.sourceImageData) {
      return false;
    }

    if (context.width <= 0 || context.height <= 0) {
      return false;
    }

    if (context.sourceImageData.width !== context.width || 
        context.sourceImageData.height !== context.height) {
      return false;
    }

    return true;
  }

  /**
   * 验证基础参数
   */
  validateParameters(parameters: FilterParameters): boolean {
    if (parameters.type !== this.type) {
      return false;
    }

    if (parameters.opacity !== undefined) {
      if (parameters.opacity < 0 || parameters.opacity > 1) {
        return false;
      }
    }

    return this.validateSpecificParameters(parameters as T);
  }

  /**
   * 验证特定滤镜的参数（子类实现）
   */
  protected abstract validateSpecificParameters(parameters: T): boolean;

  /**
   * 获取默认参数（子类实现）
   */
  abstract getDefaultParameters(): T;

  /**
   * 预估处理时间
   */
  estimateProcessingTime(width: number, height: number, parameters: FilterParameters): number {
    const pixelCount = width * height;
    const baseTimePerPixel = this.getBaseProcessingTimePerPixel();
    const complexityFactor = this.getComplexityFactor(parameters);
    
    return pixelCount * baseTimePerPixel * complexityFactor;
  }

  /**
   * 获取基础处理时间（每像素，毫秒）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.001; // 默认每像素1微秒
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: FilterParameters): number {
    return 1; // 默认复杂度因子
  }

  /**
   * 预估内存使用量
   */
  protected estimateMemoryUsage(width: number, height: number): number {
    // 基本计算：原图 + 处理图 + 临时缓冲区
    const bytesPerPixel = 4; // RGBA
    const baseMemory = width * height * bytesPerPixel;
    return baseMemory * 3; // 3倍内存使用（原图+结果+临时）
  }

  /**
   * 检查硬件加速支持
   */
  supportsAcceleration(): boolean {
    return false; // 基础实现不支持硬件加速
  }

  /**
   * 创建输出ImageData
   */
  protected createOutputImageData(width: number, height: number): ImageData {
    try {
      return new ImageData(width, height);
    } catch (error) {
      // 备用方法
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot create 2D context');
      }
      return ctx.createImageData(width, height);
    }
  }

  /**
   * 复制ImageData
   */
  protected cloneImageData(source: ImageData): ImageData {
    const output = this.createOutputImageData(source.width, source.height);
    output.data.set(source.data);
    return output;
  }

  /**
   * 应用不透明度
   */
  protected applyOpacity(imageData: ImageData, opacity: number): ImageData {
    if (opacity >= 1) {
      return imageData;
    }

    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * opacity);
    }
    
    return imageData;
  }

  /**
   * 混合两个ImageData
   */
  protected blendImageData(
    base: ImageData, 
    overlay: ImageData, 
    mode: string = 'normal'
  ): ImageData {
    if (base.width !== overlay.width || base.height !== overlay.height) {
      throw new Error('Image dimensions must match for blending');
    }

    const result = this.cloneImageData(base);
    const resultData = result.data;
    const baseData = base.data;
    const overlayData = overlay.data;

    for (let i = 0; i < resultData.length; i += 4) {
      const baseR = baseData[i];
      const baseG = baseData[i + 1];
      const baseB = baseData[i + 2];
      const baseA = baseData[i + 3] / 255;

      const overlayR = overlayData[i];
      const overlayG = overlayData[i + 1];
      const overlayB = overlayData[i + 2];
      const overlayA = overlayData[i + 3] / 255;

      // 简化的混合实现（正常模式）
      const alpha = overlayA;
      const invAlpha = 1 - alpha;

      resultData[i] = Math.round(overlayR * alpha + baseR * invAlpha);
      resultData[i + 1] = Math.round(overlayG * alpha + baseG * invAlpha);
      resultData[i + 2] = Math.round(overlayB * alpha + baseB * invAlpha);
      resultData[i + 3] = Math.round((overlayA + baseA * invAlpha) * 255);
    }

    return result;
  }

  /**
   * 限制值在指定范围内
   */
  protected clamp(value: number, min: number = 0, max: number = 255): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const avgProcessingTime = this.performanceStats.totalExecutions > 0 
      ? this.performanceStats.totalProcessingTime / this.performanceStats.totalExecutions 
      : 0;
    
    const successRate = this.performanceStats.totalExecutions > 0
      ? this.performanceStats.successfulExecutions / this.performanceStats.totalExecutions
      : 0;

    return {
      filterType: this.type,
      averageProcessingTime: avgProcessingTime,
      totalExecutions: this.performanceStats.totalExecutions,
      successRate: successRate,
      memoryPeakUsage: 0 // 简化实现
    };
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats(): void {
    this.performanceStats = {
      totalExecutions: 0,
      totalProcessingTime: 0,
      successfulExecutions: 0,
      errors: 0
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.resetPerformanceStats();
  }
}