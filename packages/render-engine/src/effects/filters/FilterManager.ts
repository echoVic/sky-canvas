/**
 * 滤镜管理器
 * 管理多个滤镜的应用和处理
 */

import { EventEmitter } from 'eventemitter3';
import {
  FilterChainConfig,
  FilterContext,
  FilterEvents,
  FilterParameters,
  FilterResult,
  FilterType,
  IFilter
} from '../types/FilterTypes';

// 导入滤镜实现
import { BaseFilter } from './BaseFilter';
import { BrightnessFilter } from './BrightnessFilter';
import { GaussianBlurFilter } from './GaussianBlurFilter';

export class FilterManager extends EventEmitter<FilterEvents> {
  private filters: Map<FilterType, IFilter> = new Map();
  private processingQueue: Array<{
    context: FilterContext;
    parameters: FilterParameters;
    resolve: (result: FilterResult) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private isProcessing = false;
  private maxConcurrency = 1;

  constructor() {
    super();
    this.initializeBuiltinFilters();
  }

  /**
   * 初始化内置滤镜
   */
  private initializeBuiltinFilters(): void {
    this.registerFilter(new GaussianBlurFilter());
    this.registerFilter(new BrightnessFilter());
  }

  /**
   * 注册滤镜
   */
  registerFilter(filter: IFilter): void {
    this.filters.set(filter.type, filter);
  }

  /**
   * 获取滤镜
   */
  getFilter(type: FilterType): IFilter | undefined {
    return this.filters.get(type);
  }

  /**
   * 获取所有可用滤镜
   */
  getAvailableFilters(): IFilter[] {
    return Array.from(this.filters.values());
  }

  /**
   * 应用单个滤镜
   */
  async applyFilter(
    context: FilterContext,
    parameters: FilterParameters
  ): Promise<FilterResult> {
    const filter = this.filters.get(parameters.type);
    if (!filter) {
      return {
        success: false,
        error: `Filter ${parameters.type} not found`
      };
    }

    this.emit('filter-start', parameters.type, context);

    try {
      const result = await filter.apply(context, parameters);
      
      if (result.success) {
        this.emit('filter-complete', parameters.type, result);
      } else {
        this.emit('filter-error', parameters.type, new Error(result.error || 'Unknown error'));
      }

      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.emit('filter-error', parameters.type, error instanceof Error ? error : new Error(String(error)));
      return errorResult;
    }
  }

  /**
   * 应用滤镜链
   */
  async applyFilterChain(
    sourceImageData: ImageData,
    chainConfig: FilterChainConfig
  ): Promise<FilterResult[]> {
    const { filters, processingOptions } = chainConfig;
    const results: FilterResult[] = [];
    
    if (filters.length === 0) {
      return results;
    }

    this.emit('chain-start', filters);

    let currentImageData = sourceImageData;
    
    for (let i = 0; i < filters.length; i++) {
      const filterParams = filters[i];
      
      // 跳过禁用的滤镜
      if (filterParams.enabled === false) {
        results.push({
          success: true,
          processedImageData: currentImageData,
          processingTime: 0
        });
        continue;
      }

      const context: FilterContext = {
        sourceImageData: currentImageData,
        width: currentImageData.width,
        height: currentImageData.height,
        timestamp: Date.now()
      };

      const result = await this.applyFilter(context, filterParams);
      results.push(result);
      
      if (result.success && result.processedImageData) {
        currentImageData = result.processedImageData;
      } else {
        // 滤镜失败时停止处理链
        break;
      }
    }

    this.emit('chain-complete', results);
    return results;
  }

  /**
   * 批量处理
   */
  async batchProcess(
    tasks: Array<{
      context: FilterContext;
      parameters: FilterParameters;
    }>
  ): Promise<FilterResult[]> {
    const results: FilterResult[] = [];
    
    for (const task of tasks) {
      const result = await this.applyFilter(task.context, task.parameters);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 获取滤镜预设参数
   */
  getFilterDefaults(type: FilterType): FilterParameters | null {
    const filter = this.filters.get(type);
    return filter ? filter.getDefaultParameters() : null;
  }

  /**
   * 验证滤镜参数
   */
  validateFilterParameters(parameters: FilterParameters): boolean {
    const filter = this.filters.get(parameters.type);
    return filter ? filter.validateParameters(parameters) : false;
  }

  /**
   * 预估处理时间
   */
  estimateProcessingTime(
    width: number,
    height: number,
    parameters: FilterParameters[]
  ): number {
    let totalTime = 0;
    
    for (const params of parameters) {
      if (params.enabled === false) continue;
      
      const filter = this.filters.get(params.type);
      if (filter) {
        totalTime += filter.estimateProcessingTime(width, height, params);
      }
    }
    
    return totalTime;
  }

  /**
   * 获取所有滤镜的性能统计
   */
  getAllPerformanceStats() {
    const stats: any[] = [];
    
    for (const filter of this.filters.values()) {
      if (filter instanceof BaseFilter) {
        stats.push(filter.getPerformanceStats());
      }
    }
    
    return stats;
  }

  /**
   * 重置所有性能统计
   */
  resetAllPerformanceStats(): void {
    for (const filter of this.filters.values()) {
      if (filter instanceof BaseFilter) {
        filter.resetPerformanceStats();
      }
    }
  }

  /**
   * 检查硬件加速支持
   */
  checkAccelerationSupport(): {
    webGL: boolean;
    webGPU: boolean;
    supportedFilters: FilterType[];
  } {
    const supportedFilters: FilterType[] = [];
    
    for (const [type, filter] of this.filters) {
      if (filter.supportsAcceleration()) {
        supportedFilters.push(type);
      }
    }
    
    return {
      webGL: this.checkWebGLSupport(),
      webGPU: this.checkWebGPUSupport(),
      supportedFilters
    };
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  private checkWebGPUSupport(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * 创建滤镜预览
   */
  async createPreview(
    imageData: ImageData,
    parameters: FilterParameters,
    previewSize: { width: number; height: number }
  ): Promise<ImageData | null> {
    // 缩放图像以生成预览
    const scaledImageData = this.scaleImageData(imageData, previewSize.width, previewSize.height);
    
    const context: FilterContext = {
      sourceImageData: scaledImageData,
      width: scaledImageData.width,
      height: scaledImageData.height,
      timestamp: Date.now()
    };
    
    const result = await this.applyFilter(context, parameters);
    return result.success ? result.processedImageData || null : null;
  }

  /**
   * 缩放ImageData
   */
  private scaleImageData(imageData: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // 设置原始尺寸
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    // 绘制原始图像
    ctx.putImageData(imageData, 0, 0);
    
    // 创建目标画布
    const targetCanvas = document.createElement('canvas');
    const targetCtx = targetCanvas.getContext('2d')!;
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    
    // 缩放绘制
    targetCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    
    return targetCtx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    // 清理所有滤镜
    for (const filter of this.filters.values()) {
      filter.dispose();
    }
    
    this.filters.clear();
    this.processingQueue.length = 0;
    this.removeAllListeners();
  }
}