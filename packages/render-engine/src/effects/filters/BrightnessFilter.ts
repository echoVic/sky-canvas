/**
 * 亮度调整滤镜实现
 * 支持亮度的增减调整
 */

import { type BrightnessParameters, FilterType } from '../types/FilterTypes'
import { PixelProcessor, type RGBProcessorFunction } from './PixelProcessor'

export class BrightnessFilter extends PixelProcessor<BrightnessParameters> {
  readonly type = FilterType.BRIGHTNESS
  readonly name = 'Brightness'
  readonly description = 'Adjusts the brightness of the image'
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp']
  readonly requiresWebGL = false

  /**
   * 检查是否应该跳过处理
   */
  protected shouldSkipProcessing(parameters: BrightnessParameters): boolean {
    return parameters.brightness === 0
  }

  /**
   * 获取RGB处理函数
   */
  protected getRGBProcessor(parameters: BrightnessParameters): RGBProcessorFunction {
    const adjustment = parameters.brightness * 2.55
    return PixelProcessor.createAdjustmentProcessor(adjustment)
  }

  /**
   * 验证亮度特定参数
   */
  protected validateSpecificParameters(parameters: BrightnessParameters): boolean {
    if (
      typeof parameters.brightness !== 'number' ||
      parameters.brightness < -100 ||
      parameters.brightness > 100
    ) {
      return false
    }

    return true
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): BrightnessParameters {
    return {
      type: FilterType.BRIGHTNESS,
      brightness: 0,
      enabled: true,
      opacity: 1,
    }
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: BrightnessParameters): number {
    return 0.5 // 亮度调整是最简单的操作之一
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0005 // 亮度调整很快
  }
}
