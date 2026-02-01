/**
 * 艺术效果
 */

import {
  type IPostProcessEffect,
  type PixelateConfig,
  type PosterizeConfig,
  type PostProcessConfig,
  PostProcessType,
  type VintageConfig,
} from '../types/PostProcessTypes'
import { BasePostProcessEffect } from './BasePostProcessEffect'

/**
 * 复古效果
 */
export class SepiaEffect extends BasePostProcessEffect {
  constructor(config: PostProcessConfig) {
    super(PostProcessType.SEPIA, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const intensity = this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 复古色彩变换矩阵
      const newR = r * 0.393 + g * 0.769 + b * 0.189
      const newG = r * 0.349 + g * 0.686 + b * 0.168
      const newB = r * 0.272 + g * 0.534 + b * 0.131

      // 与原图混合
      resultData[i] = this.clamp(r + (newR - r) * intensity)
      resultData[i + 1] = this.clamp(g + (newG - g) * intensity)
      resultData[i + 2] = this.clamp(b + (newB - b) * intensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new SepiaEffect(this._config)
  }
}

/**
 * 怀旧效果
 */
export class VintageEffect extends BasePostProcessEffect {
  constructor(config: VintageConfig) {
    super(PostProcessType.VINTAGE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { sepia, vignette, noise, desaturation } = (this._config as VintageConfig).parameters
    const intensity = this._config.intensity
    const { width, height } = imageData

    // 复制原始数据
    resultData.set(data)

    // 应用去饱和度
    if (desaturation > 0) {
      for (let i = 0; i < data.length; i += 4) {
        const gray = this.getLuminance(data[i], data[i + 1], data[i + 2])
        const desatFactor = desaturation * intensity

        resultData[i] = this.clamp(data[i] + (gray - data[i]) * desatFactor)
        resultData[i + 1] = this.clamp(data[i + 1] + (gray - data[i + 1]) * desatFactor)
        resultData[i + 2] = this.clamp(data[i + 2] + (gray - data[i + 2]) * desatFactor)
      }
    }

    // 应用复古色调
    if (sepia > 0) {
      for (let i = 0; i < resultData.length; i += 4) {
        const r = resultData[i]
        const g = resultData[i + 1]
        const b = resultData[i + 2]

        const newR = r * 0.393 + g * 0.769 + b * 0.189
        const newG = r * 0.349 + g * 0.686 + b * 0.168
        const newB = r * 0.272 + g * 0.534 + b * 0.131

        const sepiaFactor = sepia * intensity
        resultData[i] = this.clamp(r + (newR - r) * sepiaFactor)
        resultData[i + 1] = this.clamp(g + (newG - g) * sepiaFactor)
        resultData[i + 2] = this.clamp(b + (newB - b) * sepiaFactor)
      }
    }

    // 应用暗角
    if (vignette > 0) {
      const centerX = width / 2
      const centerY = height / 2
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const vignetteFactor = vignette * intensity

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4
          const dx = x - centerX
          const dy = y - centerY
          const distance = Math.sqrt(dx * dx + dy * dy)
          const normalizedDistance = distance / maxDistance
          const darkening = 1 - normalizedDistance * vignetteFactor

          resultData[index] = this.clamp(resultData[index] * darkening)
          resultData[index + 1] = this.clamp(resultData[index + 1] * darkening)
          resultData[index + 2] = this.clamp(resultData[index + 2] * darkening)
        }
      }
    }

    // 应用噪点
    if (noise > 0) {
      const noiseFactor = noise * intensity * 50
      for (let i = 0; i < resultData.length; i += 4) {
        const noiseValue = (this.random(i * 0.1) - 0.5) * noiseFactor
        resultData[i] = this.clamp(resultData[i] + noiseValue)
        resultData[i + 1] = this.clamp(resultData[i + 1] + noiseValue)
        resultData[i + 2] = this.clamp(resultData[i + 2] + noiseValue)
      }
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new VintageEffect(this._config as VintageConfig)
  }
}

/**
 * 像素化效果
 */
export class PixelateEffect extends BasePostProcessEffect {
  constructor(config: PixelateConfig) {
    super(PostProcessType.PIXELATE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { pixelSize } = (this._config as PixelateConfig).parameters
    const intensity = this._config.intensity
    const { width, height } = imageData

    const effectivePixelSize = Math.max(1, Math.round(pixelSize * intensity))

    for (let y = 0; y < height; y += effectivePixelSize) {
      for (let x = 0; x < width; x += effectivePixelSize) {
        // 计算像素块的平均颜色
        let r = 0,
          g = 0,
          b = 0,
          a = 0
        let count = 0

        for (let dy = 0; dy < effectivePixelSize && y + dy < height; dy++) {
          for (let dx = 0; dx < effectivePixelSize && x + dx < width; dx++) {
            const index = ((y + dy) * width + (x + dx)) * 4
            r += data[index]
            g += data[index + 1]
            b += data[index + 2]
            a += data[index + 3]
            count++
          }
        }

        // 计算平均值
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        a = Math.round(a / count)

        // 应用到像素块中的所有像素
        for (let dy = 0; dy < effectivePixelSize && y + dy < height; dy++) {
          for (let dx = 0; dx < effectivePixelSize && x + dx < width; dx++) {
            const index = ((y + dy) * width + (x + dx)) * 4
            resultData[index] = r
            resultData[index + 1] = g
            resultData[index + 2] = b
            resultData[index + 3] = a
          }
        }
      }
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new PixelateEffect(this._config as PixelateConfig)
  }
}

/**
 * 色调分离效果
 */
export class PosterizeEffect extends BasePostProcessEffect {
  constructor(config: PosterizeConfig) {
    super(PostProcessType.POSTERIZE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { levels } = (this._config as PosterizeConfig).parameters
    const intensity = this._config.intensity

    const effectiveLevels = Math.max(2, Math.round(levels))
    const levelStep = 255 / (effectiveLevels - 1)

    for (let i = 0; i < data.length; i += 4) {
      // 量化每个颜色通道
      const r = Math.round(data[i] / levelStep) * levelStep
      const g = Math.round(data[i + 1] / levelStep) * levelStep
      const b = Math.round(data[i + 2] / levelStep) * levelStep

      // 与原图混合
      resultData[i] = this.clamp(data[i] + (r - data[i]) * intensity)
      resultData[i + 1] = this.clamp(data[i + 1] + (g - data[i + 1]) * intensity)
      resultData[i + 2] = this.clamp(data[i + 2] + (b - data[i + 2]) * intensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new PosterizeEffect(this._config as PosterizeConfig)
  }
}

/**
 * 反相效果
 */
export class InvertEffect extends BasePostProcessEffect {
  constructor(config: PostProcessConfig) {
    super(PostProcessType.INVERT, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const intensity = this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      const invR = 255 - data[i]
      const invG = 255 - data[i + 1]
      const invB = 255 - data[i + 2]

      resultData[i] = this.clamp(data[i] + (invR - data[i]) * intensity)
      resultData[i + 1] = this.clamp(data[i + 1] + (invG - data[i + 1]) * intensity)
      resultData[i + 2] = this.clamp(data[i + 2] + (invB - data[i + 2]) * intensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new InvertEffect(this._config)
  }
}

/**
 * 灰度效果
 */
export class GrayscaleEffect extends BasePostProcessEffect {
  constructor(config: PostProcessConfig) {
    super(PostProcessType.GRAYSCALE, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const intensity = this._config.intensity

    for (let i = 0; i < data.length; i += 4) {
      const gray = this.getLuminance(data[i], data[i + 1], data[i + 2])

      resultData[i] = this.clamp(data[i] + (gray - data[i]) * intensity)
      resultData[i + 1] = this.clamp(data[i + 1] + (gray - data[i + 1]) * intensity)
      resultData[i + 2] = this.clamp(data[i + 2] + (gray - data[i + 2]) * intensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new GrayscaleEffect(this._config)
  }
}
