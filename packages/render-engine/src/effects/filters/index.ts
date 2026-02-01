/**
 * 滤镜系统主入口
 */

// 类型导出
export * from '../types/FilterTypes'

// 基础类导出
export { BaseFilter } from './BaseFilter'
export { BrightnessFilter } from './BrightnessFilter'
// 管理器导出
export { FilterManager } from './FilterManager'
// 具体滤镜导出
export { GaussianBlurFilter } from './GaussianBlurFilter'

import {
  type BrightnessParameters,
  type FilterContext,
  type FilterParameters,
  FilterType,
  type GaussianBlurParameters,
} from '../types/FilterTypes'
// 便捷创建函数
import { FilterManager } from './FilterManager'

/**
 * 创建滤镜管理器实例
 */
export function createFilterManager(): FilterManager {
  return new FilterManager()
}

/**
 * 快速应用高斯模糊
 */
export async function applyGaussianBlur(
  imageData: ImageData,
  radius: number = 5,
  quality: 'low' | 'medium' | 'high' = 'medium'
) {
  const manager = new FilterManager()
  const context: FilterContext = {
    sourceImageData: imageData,
    width: imageData.width,
    height: imageData.height,
    timestamp: Date.now(),
  }

  const parameters: GaussianBlurParameters = {
    type: FilterType.GAUSSIAN_BLUR,
    radius,
    quality,
    enabled: true,
    opacity: 1,
  }

  const result = await manager.applyFilter(context, parameters)
  manager.dispose()

  return result
}

/**
 * 快速应用亮度调整
 */
export async function applyBrightness(imageData: ImageData, brightness: number = 0) {
  const manager = new FilterManager()
  const context: FilterContext = {
    sourceImageData: imageData,
    width: imageData.width,
    height: imageData.height,
    timestamp: Date.now(),
  }

  const parameters: BrightnessParameters = {
    type: FilterType.BRIGHTNESS,
    brightness,
    enabled: true,
    opacity: 1,
  }

  const result = await manager.applyFilter(context, parameters)
  manager.dispose()

  return result
}

/**
 * 创建常用滤镜预设
 */
export class FilterPresets {
  /**
   * 创建复古滤镜
   */
  static createVintage(): FilterParameters[] {
    return [
      {
        type: FilterType.SEPIA,
        amount: 0.8,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.BRIGHTNESS,
        brightness: -10,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.CONTRAST,
        contrast: 20,
        enabled: true,
        opacity: 1,
      },
    ]
  }

  /**
   * 创建黑白滤镜
   */
  static createBlackAndWhite(): FilterParameters[] {
    return [
      {
        type: FilterType.GRAYSCALE,
        amount: 1,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.CONTRAST,
        contrast: 15,
        enabled: true,
        opacity: 1,
      },
    ]
  }

  /**
   * 创建暖色调滤镜
   */
  static createWarmTone(): FilterParameters[] {
    return [
      {
        type: FilterType.HUE_ROTATE,
        angle: 10,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.SATURATION,
        saturation: 20,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.BRIGHTNESS,
        brightness: 5,
        enabled: true,
        opacity: 1,
      },
    ]
  }

  /**
   * 创建冷色调滤镜
   */
  static createCoolTone(): FilterParameters[] {
    return [
      {
        type: FilterType.HUE_ROTATE,
        angle: 190,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.SATURATION,
        saturation: 10,
        enabled: true,
        opacity: 1,
      },
      {
        type: FilterType.BRIGHTNESS,
        brightness: -5,
        enabled: true,
        opacity: 1,
      },
    ]
  }

  /**
   * 创建发光效果
   */
  static createGlowEffect(color: string = '#ffffff', strength: number = 10): FilterParameters[] {
    return [
      {
        type: FilterType.GLOW,
        color,
        blur: strength,
        strength: strength * 0.1,
        enabled: true,
        opacity: 1,
      },
    ]
  }

  /**
   * 创建模糊背景效果
   */
  static createBlurBackground(radius: number = 20): FilterParameters[] {
    return [
      {
        type: FilterType.GAUSSIAN_BLUR,
        radius,
        quality: 'medium',
        enabled: true,
        opacity: 1,
      },
    ]
  }
}
