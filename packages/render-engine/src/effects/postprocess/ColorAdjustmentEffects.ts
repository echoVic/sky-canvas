/**
 * 颜色调整效果
 */

import {
  type ColorAdjustmentConfig,
  type ColorBalanceConfig,
  type IPostProcessEffect,
  PostProcessType,
} from '../types/PostProcessTypes'
import { BasePostProcessEffect } from './BasePostProcessEffect'

/**
 * 亮度调整效果
 */
export class BrightnessEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.BRIGHTNESS, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const brightness = amount * this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp(data[i] + brightness) // R
      resultData[i + 1] = this.clamp(data[i + 1] + brightness) // G
      resultData[i + 2] = this.clamp(data[i + 2] + brightness) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new BrightnessEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 对比度调整效果
 */
export class ContrastEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.CONTRAST, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const contrast = amount * this._config.intensity * 2.55 // 转换为-255到255的范围
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp(factor * (data[i] - 128) + 128) // R
      resultData[i + 1] = this.clamp(factor * (data[i + 1] - 128) + 128) // G
      resultData[i + 2] = this.clamp(factor * (data[i + 2] - 128) + 128) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new ContrastEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 饱和度调整效果
 */
export class SaturationEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.SATURATION, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const saturation = amount * this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 计算灰度值
      const gray = 0.299 * r + 0.587 * g + 0.114 * b

      // 调整饱和度
      resultData[i] = this.clamp(gray + saturation * (r - gray)) // R
      resultData[i + 1] = this.clamp(gray + saturation * (g - gray)) // G
      resultData[i + 2] = this.clamp(gray + saturation * (b - gray)) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new SaturationEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 色相偏移效果
 */
export class HueShiftEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.HUE_SHIFT, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const hueShift = (amount * this._config.intensity) / 360 // 转换为0-1的范围

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255

      const hsl = this.rgbToHsl(r * 255, g * 255, b * 255)
      hsl.h = (hsl.h + hueShift) % 1
      if (hsl.h < 0) hsl.h += 1

      const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l)

      resultData[i] = rgb.r // R
      resultData[i + 1] = rgb.g // G
      resultData[i + 2] = rgb.b // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new HueShiftEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 伽马校正效果
 */
export class GammaEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.GAMMA, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const gamma = Math.max(0.1, amount * this._config.intensity)
    const invGamma = 1 / gamma

    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp((data[i] / 255) ** invGamma * 255) // R
      resultData[i + 1] = this.clamp((data[i + 1] / 255) ** invGamma * 255) // G
      resultData[i + 2] = this.clamp((data[i + 2] / 255) ** invGamma * 255) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new GammaEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 曝光调整效果
 */
export class ExposureEffect extends BasePostProcessEffect {
  constructor(config: ColorAdjustmentConfig) {
    super(PostProcessType.EXPOSURE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const amount = (this._config as ColorAdjustmentConfig).parameters.amount
    const exposure = 2 ** (amount * this._config.intensity)

    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp(data[i] * exposure) // R
      resultData[i + 1] = this.clamp(data[i + 1] * exposure) // G
      resultData[i + 2] = this.clamp(data[i + 2] * exposure) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new ExposureEffect(this._config as ColorAdjustmentConfig)
  }
}

/**
 * 色彩平衡效果
 */
export class ColorBalanceEffect extends BasePostProcessEffect {
  constructor(config: ColorBalanceConfig) {
    super(PostProcessType.COLOR_BALANCE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const params = (this._config as ColorBalanceConfig).parameters
    const intensity = this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 计算亮度以确定是阴影、中间调还是高光
      const luminance = this.getLuminance(r, g, b)
      const shadowWeight = Math.max(0, 1 - luminance / 85)
      const midtoneWeight = 1 - Math.abs(luminance - 127.5) / 127.5
      const highlightWeight = Math.max(0, (luminance - 170) / 85)

      // 应用色彩平衡
      const newR =
        r +
        intensity *
          (shadowWeight * params.shadowsRed +
            midtoneWeight * params.midtonesRed +
            highlightWeight * params.highlightsRed)
      const newG =
        g +
        intensity *
          (shadowWeight * params.shadowsGreen +
            midtoneWeight * params.midtonesGreen +
            highlightWeight * params.highlightsGreen)
      const newB =
        b +
        intensity *
          (shadowWeight * params.shadowsBlue +
            midtoneWeight * params.midtonesBlue +
            highlightWeight * params.highlightsBlue)

      resultData[i] = this.clamp(newR) // R
      resultData[i + 1] = this.clamp(newG) // G
      resultData[i + 2] = this.clamp(newB) // B
      resultData[i + 3] = data[i + 3] // A
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new ColorBalanceEffect(this._config as ColorBalanceConfig)
  }
}
