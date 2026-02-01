/**
 * 滤镜管理器
 * 统一管理和执行各种图像滤镜
 */

import { EventEmitter } from 'eventemitter3'
import { BrightnessFilter } from './filters/BrightnessFilter'
import { ContrastFilter } from './filters/ContrastFilter'
import { CustomShaderFilter } from './filters/CustomShaderFilter'
import { DropShadowFilter } from './filters/DropShadowFilter'
// 导入具体的滤镜实现
import { GaussianBlurFilter } from './filters/GaussianBlurFilter'
import { GlowFilter } from './filters/GlowFilter'
import { GrayscaleFilter } from './filters/GrayscaleFilter'
import { HueRotateFilter } from './filters/HueRotateFilter'
import { InnerShadowFilter } from './filters/InnerShadowFilter'
import { SaturationFilter } from './filters/SaturationFilter'
import type {
  FilterChainConfig,
  FilterContext,
  FilterParameters,
  FilterProcessingOptions,
  FilterResult,
  FilterType,
  IFilter,
} from './types/FilterTypes'

export class FilterManager extends EventEmitter {
  private filters = new Map<FilterType, IFilter>()
  private resultCache = new Map<string, ImageData>()
  private maxCacheSize = 50 // 最大缓存数量

  constructor() {
    super()
    this.initializeFilters()
  }

  /**
   * 初始化所有可用的滤镜
   */
  private initializeFilters(): void {
    // 注册基础滤镜
    this.registerFilter(new GaussianBlurFilter())
    this.registerFilter(new BrightnessFilter())
    this.registerFilter(new ContrastFilter())
    this.registerFilter(new SaturationFilter())
    this.registerFilter(new HueRotateFilter())
    this.registerFilter(new GrayscaleFilter())

    // 注册阴影和发光滤镜
    this.registerFilter(new DropShadowFilter())
    this.registerFilter(new InnerShadowFilter())
    this.registerFilter(new GlowFilter())

    // 注册自定义着色器滤镜
    this.registerFilter(new CustomShaderFilter())
  }

  /**
   * 注册新的滤镜
   */
  registerFilter(filter: IFilter): void {
    this.filters.set(filter.type, filter)
  }

  /**
   * 获取滤镜实例
   */
  getFilter(type: FilterType): IFilter | undefined {
    return this.filters.get(type)
  }

  /**
   * 获取所有已注册的滤镜类型
   */
  getAvailableFilters(): FilterType[] {
    return Array.from(this.filters.keys())
  }

  /**
   * 应用单个滤镜
   */
  async applyFilter(
    imageData: ImageData,
    parameters: FilterParameters,
    _options?: FilterProcessingOptions
  ): Promise<FilterResult> {
    const filter = this.filters.get(parameters.type)
    if (!filter) {
      return {
        success: false,
        error: `Filter type ${parameters.type} not found`,
      }
    }

    // 检查滤镜是否启用
    if (parameters.enabled === false) {
      return {
        success: true,
        processedImageData: imageData,
        processingTime: 0,
      }
    }

    // 创建滤镜上下文
    const context: FilterContext = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    // 触发开始事件
    this.emit('filter-start', parameters.type, context)

    try {
      const result = await filter.apply(context, parameters)

      // 触发完成事件
      this.emit('filter-complete', parameters.type, result)

      return result
    } catch (error) {
      const errorResult: FilterResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      this.emit('filter-error', parameters.type, error as Error)
      return errorResult
    }
  }

  /**
   * 应用滤镜链
   */
  async applyFilterChain(imageData: ImageData, config: FilterChainConfig): Promise<FilterResult[]> {
    if (config.filters.length === 0) {
      return [
        {
          success: true,
          processedImageData: imageData,
          processingTime: 0,
        },
      ]
    }

    // 触发链开始事件
    this.emit('chain-start', config.filters)

    const results: FilterResult[] = []
    let currentImageData = imageData

    // 按优先级排序滤镜
    const sortedFilters = [...config.filters].sort((a, b) => {
      const priorityA = a.priority || 1
      const priorityB = b.priority || 1
      return priorityB - priorityA // 高优先级先执行
    })

    for (const filterParams of sortedFilters) {
      const result = await this.applyFilter(
        currentImageData,
        filterParams,
        config.processingOptions
      )

      results.push(result)

      if (result.success && result.processedImageData) {
        currentImageData = result.processedImageData
      } else {
        // 如果某个滤镜失败，停止处理链
        break
      }
    }

    // 触发链完成事件
    this.emit('chain-complete', results)

    return results
  }

  /**
   * 创建滤镜预览
   */
  async createPreview(
    imageData: ImageData,
    parameters: FilterParameters,
    previewSize: { width: number; height: number } = { width: 200, height: 200 }
  ): Promise<FilterResult> {
    // 缩放图像到预览尺寸
    const scaledImageData = this.scaleImageData(imageData, previewSize.width, previewSize.height)

    // 应用滤镜
    return this.applyFilter(scaledImageData, parameters)
  }

  /**
   * 缩放ImageData
   */
  private scaleImageData(
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number
  ): ImageData {
    if (imageData.width === targetWidth && imageData.height === targetHeight) {
      return imageData
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Cannot create 2D context')
    }

    // 设置原始尺寸
    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)

    // 创建目标画布
    const targetCanvas = document.createElement('canvas')
    const targetCtx = targetCanvas.getContext('2d')
    if (!targetCtx) {
      throw new Error('Cannot create target 2D context')
    }

    targetCanvas.width = targetWidth
    targetCanvas.height = targetHeight

    // 缩放绘制
    targetCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)

    return targetCtx.getImageData(0, 0, targetWidth, targetHeight)
  }

  /**
   * 估算滤镜处理时间
   */
  estimateProcessingTime(imageData: ImageData, parameters: FilterParameters[]): number {
    let totalTime = 0

    for (const params of parameters) {
      const filter = this.filters.get(params.type)
      if (filter) {
        totalTime += filter.estimateProcessingTime(imageData.width, imageData.height, params)
      }
    }

    return totalTime
  }

  /**
   * 获取滤镜性能统计
   */
  getPerformanceStats() {
    const stats: Array<unknown> = []

    for (const [_type, filter] of this.filters) {
      if ('getPerformanceStats' in filter && typeof filter.getPerformanceStats === 'function') {
        stats.push(filter.getPerformanceStats())
      }
    }

    return stats
  }

  /**
   * 重置所有性能统计
   */
  resetPerformanceStats(): void {
    for (const filter of this.filters.values()) {
      if ('resetPerformanceStats' in filter && typeof filter.resetPerformanceStats === 'function') {
        filter.resetPerformanceStats()
      }
    }
  }

  /**
   * 生成缓存键
   */
  /**
   * 清理缓存
   */
  clearCache(): void {
    this.resultCache.clear()
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.resultCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // 简化实现，实际应该跟踪缓存命中率
    }
  }

  /**
   * 检查是否支持WebGL加速
   */
  static supportsWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  }

  /**
   * 检查是否支持WebGPU加速
   */
  static async supportsWebGPU(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        return false
      }
      const navigatorWithGpu = navigator as unknown as {
        gpu?: { requestAdapter: () => Promise<unknown> }
      }
      const adapter = await navigatorWithGpu.gpu?.requestAdapter()
      return !!adapter
    } catch {
      return false
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    // 清理所有滤镜
    for (const filter of this.filters.values()) {
      filter.dispose()
    }

    this.filters.clear()
    this.resultCache.clear()
    this.removeAllListeners()
  }
}

/**
 * 创建默认滤镜管理器
 */
export function createFilterManager(): FilterManager {
  return new FilterManager()
}
