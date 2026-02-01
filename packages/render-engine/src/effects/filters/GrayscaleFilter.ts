/**
 * 灰度滤镜实现
 * 支持可调节的灰度化效果
 */

import { FilterType, type GrayscaleParameters } from '../types/FilterTypes'
import { PixelProcessor, type RGBProcessorFunction } from './PixelProcessor'

export class GrayscaleFilter extends PixelProcessor<GrayscaleParameters> {
  readonly type = FilterType.GRAYSCALE
  readonly name = 'Grayscale'
  readonly description = 'Converts the image to grayscale'
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp']
  readonly requiresWebGL = false

  /**
   * 检查是否应该跳过处理
   */
  protected shouldSkipProcessing(parameters: GrayscaleParameters): boolean {
    return parameters.amount === 0
  }

  /**
   * 获取RGB处理函数
   */
  protected getRGBProcessor(parameters: GrayscaleParameters): RGBProcessorFunction {
    const calculateLuminance = PixelProcessor.createLuminanceProcessor()

    return (r, g, b) => {
      const gray = calculateLuminance(r, g, b)
      return [
        r + (gray - r) * parameters.amount,
        g + (gray - g) * parameters.amount,
        b + (gray - b) * parameters.amount,
      ]
    }
  }

  /**
   * 验证灰度特定参数
   */
  protected validateSpecificParameters(parameters: GrayscaleParameters): boolean {
    if (typeof parameters.amount !== 'number' || parameters.amount < 0 || parameters.amount > 1) {
      return false
    }

    return true
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): GrayscaleParameters {
    return {
      type: FilterType.GRAYSCALE,
      amount: 1,
      enabled: true,
      opacity: 1,
    }
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: GrayscaleParameters): number {
    return 0.7 // 灰度转换相对简单
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0007
  }
}
