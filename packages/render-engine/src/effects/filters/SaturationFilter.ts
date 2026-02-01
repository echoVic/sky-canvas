/**
 * 饱和度调整滤镜实现
 * 支持饱和度的增减调整
 */

import { FilterType, type SaturationParameters } from '../types/FilterTypes'
import { PixelProcessor, type RGBProcessorFunction } from './PixelProcessor'

export class SaturationFilter extends PixelProcessor<SaturationParameters> {
  readonly type = FilterType.SATURATION
  readonly name = 'Saturation'
  readonly description = 'Adjusts the saturation of the image'
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp']
  readonly requiresWebGL = false

  /**
   * 检查是否应该跳过处理
   */
  protected shouldSkipProcessing(parameters: SaturationParameters): boolean {
    return parameters.saturation === 0
  }

  /**
   * 获取RGB处理函数
   */
  protected getRGBProcessor(parameters: SaturationParameters): RGBProcessorFunction {
    const saturation = 1 + parameters.saturation / 100
    const calculateLuminance = PixelProcessor.createLuminanceProcessor()

    return (r, g, b) => {
      const luminance = calculateLuminance(r, g, b)
      return [
        luminance + (r - luminance) * saturation,
        luminance + (g - luminance) * saturation,
        luminance + (b - luminance) * saturation,
      ]
    }
  }

  /**
   * 验证饱和度特定参数
   */
  protected validateSpecificParameters(parameters: SaturationParameters): boolean {
    if (
      typeof parameters.saturation !== 'number' ||
      parameters.saturation < -100 ||
      parameters.saturation > 100
    ) {
      return false
    }

    return true
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): SaturationParameters {
    return {
      type: FilterType.SATURATION,
      saturation: 0,
      enabled: true,
      opacity: 1,
    }
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: SaturationParameters): number {
    return 0.8 // 饱和度调整需要计算亮度，稍复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0008 // 需要更多计算
  }
}
