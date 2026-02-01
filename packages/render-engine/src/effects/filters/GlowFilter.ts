/**
 * 发光滤镜实现
 * 支持外发光和内发光效果
 */

import { parseColor } from '../../utils/ColorUtils'
import { type FilterContext, FilterType, type GlowParameters } from '../types/FilterTypes'
import { BaseFilter } from './BaseFilter'

export class GlowFilter extends BaseFilter<GlowParameters> {
  readonly type = FilterType.GLOW
  readonly name = 'Glow'
  readonly description = 'Adds a glow effect around the image'
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp']
  readonly requiresWebGL = false

  /**
   * 处理发光滤镜
   */
  protected async processFilter(
    context: FilterContext,
    parameters: GlowParameters
  ): Promise<ImageData> {
    const { sourceImageData } = context

    // 如果模糊半径和强度都为0，返回原图
    if (parameters.blur === 0 && parameters.strength === 0) {
      return this.cloneImageData(sourceImageData)
    }

    // 解析发光颜色
    const glowColor = parseColor(parameters.color)
    const quality = parameters.quality || 'medium'

    // 计算扩展的画布尺寸以容纳发光效果
    const blurRadius = Math.max(0, parameters.blur)
    const padding = Math.ceil(blurRadius * 2)

    const extendedWidth = sourceImageData.width + padding * 2
    const extendedHeight = sourceImageData.height + padding * 2

    // 创建发光层
    const glowImageData = new ImageData(extendedWidth, extendedHeight)
    const originalOffsetX = padding
    const originalOffsetY = padding

    // 第一步：创建发光形状
    this.createGlowShape(
      sourceImageData,
      glowImageData,
      originalOffsetX,
      originalOffsetY,
      glowColor,
      parameters.strength
    )

    // 第二步：应用多次模糊来增强发光效果
    let blurredGlow = glowImageData
    if (blurRadius > 0) {
      blurredGlow = await this.applyMultiPassBlur(glowImageData, blurRadius, quality)
    }

    // 第三步：合成原图到发光效果上方
    this.compositeImage(sourceImageData, blurredGlow, originalOffsetX, originalOffsetY)

    // 第四步：增强发光强度
    if (parameters.strength > 1) {
      this.enhanceGlow(
        blurredGlow,
        parameters.strength,
        originalOffsetX,
        originalOffsetY,
        sourceImageData
      )
    }

    // 裁剪回原始尺寸（保持发光效果）
    return this.cropWithGlow(
      blurredGlow,
      originalOffsetX,
      originalOffsetY,
      sourceImageData.width,
      sourceImageData.height,
      Math.min(padding, 20) // 保留部分发光边缘
    )
  }

  /**
   * 创建发光形状
   */
  private createGlowShape(
    sourceImageData: ImageData,
    targetImageData: ImageData,
    offsetX: number,
    offsetY: number,
    color: { r: number; g: number; b: number; a: number },
    strength: number
  ): void {
    const sourceData = sourceImageData.data
    const targetData = targetImageData.data
    const sourceWidth = sourceImageData.width
    const targetWidth = targetImageData.width

    for (let y = 0; y < sourceImageData.height; y++) {
      for (let x = 0; x < sourceImageData.width; x++) {
        const sourceIndex = (y * sourceWidth + x) * 4
        const sourceAlpha = sourceData[sourceIndex + 3]

        if (sourceAlpha > 0) {
          const targetX = offsetX + x
          const targetY = offsetY + y
          const targetIndex = (targetY * targetWidth + targetX) * 4

          // 使用原图的alpha通道创建发光
          const glowAlpha = (sourceAlpha / 255) * strength

          targetData[targetIndex] = Math.round(color.r * 255)
          targetData[targetIndex + 1] = Math.round(color.g * 255)
          targetData[targetIndex + 2] = Math.round(color.b * 255)
          targetData[targetIndex + 3] = Math.min(255, Math.round(glowAlpha * 255))
        }
      }
    }
  }

  /**
   * 应用多次模糊来增强发光效果
   */
  private async applyMultiPassBlur(
    imageData: ImageData,
    radius: number,
    quality: 'low' | 'medium' | 'high'
  ): Promise<ImageData> {
    let result = imageData

    // 根据质量设置决定模糊次数
    const passes = quality === 'low' ? 1 : quality === 'medium' ? 2 : 3
    const radiusPerPass = radius / Math.sqrt(passes)

    for (let i = 0; i < passes; i++) {
      result = await this.applyGaussianBlur(result, radiusPerPass)
    }

    return result
  }

  /**
   * 应用高斯模糊
   */
  private async applyGaussianBlur(imageData: ImageData, radius: number): Promise<ImageData> {
    if (radius <= 0) return imageData

    // 简化的高斯模糊实现
    const result = this.cloneImageData(imageData)
    const data = result.data
    const width = result.width
    const height = result.height

    // 水平模糊
    const temp = new Uint8ClampedArray(data.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalR = 0,
          totalG = 0,
          totalB = 0,
          totalA = 0
        let totalWeight = 0

        const kernelSize = Math.ceil(radius)
        for (let kx = -kernelSize; kx <= kernelSize; kx++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + kx))
          const weight = Math.exp(-(kx * kx) / (2 * radius * radius))
          const index = (y * width + sampleX) * 4

          totalR += data[index] * weight
          totalG += data[index + 1] * weight
          totalB += data[index + 2] * weight
          totalA += data[index + 3] * weight
          totalWeight += weight
        }

        const targetIndex = (y * width + x) * 4
        temp[targetIndex] = totalR / totalWeight
        temp[targetIndex + 1] = totalG / totalWeight
        temp[targetIndex + 2] = totalB / totalWeight
        temp[targetIndex + 3] = totalA / totalWeight
      }
    }

    // 垂直模糊
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let totalR = 0,
          totalG = 0,
          totalB = 0,
          totalA = 0
        let totalWeight = 0

        const kernelSize = Math.ceil(radius)
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          const sampleY = Math.max(0, Math.min(height - 1, y + ky))
          const weight = Math.exp(-(ky * ky) / (2 * radius * radius))
          const index = (sampleY * width + x) * 4

          totalR += temp[index] * weight
          totalG += temp[index + 1] * weight
          totalB += temp[index + 2] * weight
          totalA += temp[index + 3] * weight
          totalWeight += weight
        }

        const targetIndex = (y * width + x) * 4
        data[targetIndex] = Math.round(totalR / totalWeight)
        data[targetIndex + 1] = Math.round(totalG / totalWeight)
        data[targetIndex + 2] = Math.round(totalB / totalWeight)
        data[targetIndex + 3] = Math.round(totalA / totalWeight)
      }
    }

    return result
  }

  /**
   * 增强发光强度
   */
  private enhanceGlow(
    imageData: ImageData,
    strength: number,
    originalOffsetX: number,
    originalOffsetY: number,
    sourceImageData: ImageData
  ): void {
    const data = imageData.data
    const sourceData = sourceImageData.data
    const width = imageData.width
    const sourceWidth = sourceImageData.width
    const enhanceFactor = Math.min(strength, 3) // 限制最大增强倍数

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const index = (y * width + x) * 4
        const alpha = data[index + 3]

        if (alpha > 0) {
          // 检查是否在原图区域内
          const sourceX = x - originalOffsetX
          const sourceY = y - originalOffsetY
          let isOriginalPixel = false

          if (
            sourceX >= 0 &&
            sourceX < sourceImageData.width &&
            sourceY >= 0 &&
            sourceY < sourceImageData.height
          ) {
            const sourceIndex = (sourceY * sourceWidth + sourceX) * 4
            isOriginalPixel = sourceData[sourceIndex + 3] > 0
          }

          // 只增强发光区域（非原图像素）
          if (!isOriginalPixel) {
            data[index + 3] = Math.min(255, Math.round(alpha * enhanceFactor))
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
    const sourceData = sourceImageData.data
    const targetData = targetImageData.data
    const sourceWidth = sourceImageData.width
    const targetWidth = targetImageData.width

    for (let y = 0; y < sourceImageData.height; y++) {
      for (let x = 0; x < sourceImageData.width; x++) {
        const sourceIndex = (y * sourceWidth + x) * 4
        const sourceAlpha = sourceData[sourceIndex + 3] / 255

        if (sourceAlpha > 0) {
          const targetX = offsetX + x
          const targetY = offsetY + y
          const targetIndex = (targetY * targetWidth + targetX) * 4

          // Alpha混合
          const targetAlpha = targetData[targetIndex + 3] / 255
          const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha)

          if (outAlpha > 0) {
            targetData[targetIndex] = Math.round(
              (sourceData[sourceIndex] * sourceAlpha +
                targetData[targetIndex] * targetAlpha * (1 - sourceAlpha)) /
                outAlpha
            )
            targetData[targetIndex + 1] = Math.round(
              (sourceData[sourceIndex + 1] * sourceAlpha +
                targetData[targetIndex + 1] * targetAlpha * (1 - sourceAlpha)) /
                outAlpha
            )
            targetData[targetIndex + 2] = Math.round(
              (sourceData[sourceIndex + 2] * sourceAlpha +
                targetData[targetIndex + 2] * targetAlpha * (1 - sourceAlpha)) /
                outAlpha
            )
            targetData[targetIndex + 3] = Math.round(outAlpha * 255)
          }
        }
      }
    }
  }

  /**
   * 裁剪时保留发光边缘
   */
  private cropWithGlow(
    imageData: ImageData,
    offsetX: number,
    offsetY: number,
    originalWidth: number,
    originalHeight: number,
    glowPadding: number
  ): ImageData {
    const newWidth = originalWidth + glowPadding * 2
    const newHeight = originalHeight + glowPadding * 2
    const result = new ImageData(newWidth, newHeight)

    const sourceData = imageData.data
    const resultData = result.data
    const sourceWidth = imageData.width

    const startX = offsetX - glowPadding
    const startY = offsetY - glowPadding

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const sourceIndex = ((startY + y) * sourceWidth + (startX + x)) * 4
        const resultIndex = (y * newWidth + x) * 4

        if (
          startX + x >= 0 &&
          startX + x < imageData.width &&
          startY + y >= 0 &&
          startY + y < imageData.height
        ) {
          resultData[resultIndex] = sourceData[sourceIndex]
          resultData[resultIndex + 1] = sourceData[sourceIndex + 1]
          resultData[resultIndex + 2] = sourceData[sourceIndex + 2]
          resultData[resultIndex + 3] = sourceData[sourceIndex + 3]
        }
      }
    }

    return result
  }

  /**
   * 验证发光特定参数
   */
  protected validateSpecificParameters(parameters: GlowParameters): boolean {
    if (
      typeof parameters.blur !== 'number' ||
      typeof parameters.strength !== 'number' ||
      typeof parameters.color !== 'string'
    ) {
      return false
    }

    if (parameters.blur < 0 || parameters.strength < 0) {
      return false
    }

    if (parameters.quality && !['low', 'medium', 'high'].includes(parameters.quality)) {
      return false
    }

    return true
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): GlowParameters {
    return {
      type: FilterType.GLOW,
      color: '#ffffff',
      blur: 8,
      strength: 1.5,
      quality: 'medium',
      enabled: true,
      opacity: 1,
    }
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: GlowParameters): number {
    return 3.0 + parameters.blur / 5 + parameters.strength / 2 // 发光效果计算复杂
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.0025 // 发光效果需要更多处理时间
  }
}
