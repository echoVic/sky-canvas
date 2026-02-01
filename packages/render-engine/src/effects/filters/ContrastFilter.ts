/**
 * 对比度调整滤镜实现
 * 支持对比度的增减调整
 */

import { type ContrastParameters, FilterType } from '../types/FilterTypes'
import { PixelProcessor, type RGBProcessorFunction } from './PixelProcessor'

export class ContrastFilter extends PixelProcessor<ContrastParameters> {
  readonly type = FilterType.CONTRAST
  readonly name = 'Contrast'
  readonly description = 'Adjusts the contrast of the image'
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp']
  readonly requiresWebGL = false

  /**
   * 检查是否应该跳过处理
   */
  protected shouldSkipProcessing(parameters: ContrastParameters): boolean {
    return parameters.contrast === 0
  }

  /**
   * 获取RGB处理函数
   */
  protected getRGBProcessor(parameters: ContrastParameters): RGBProcessorFunction {
    const factor = (100 + parameters.contrast) / 100
    return PixelProcessor.createFactorProcessor(factor, 128)
  }

  /**
   * 验证对比度特定参数
   */
  protected validateSpecificParameters(parameters: ContrastParameters): boolean {
    if (
      typeof parameters.contrast !== 'number' ||
      parameters.contrast < -100 ||
      parameters.contrast > 100
    ) {
      return false
    }

    return true
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): ContrastParameters {
    return {
      type: FilterType.CONTRAST,
      contrast: 0,
      enabled: true,
      opacity: 1,
    }
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: ContrastParameters): number {
    return 0.6 // 对比度调整比亮度稍复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0006 // 略比亮度调整慢一点
  }
}
