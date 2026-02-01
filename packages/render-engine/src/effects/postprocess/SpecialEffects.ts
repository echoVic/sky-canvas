/**
 * 特殊效果
 */

import {
  type BloomConfig,
  type DepthOfFieldConfig,
  type GlowConfig,
  type HDRTonemapConfig,
  type IPostProcessEffect,
  PostProcessType,
} from '../types/PostProcessTypes'
import { BasePostProcessEffect } from './BasePostProcessEffect'

/**
 * Bloom 效果
 */
export class BloomEffect extends BasePostProcessEffect {
  constructor(config: BloomConfig) {
    super(PostProcessType.BLOOM, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { threshold, intensity, radius, passes } = (this._config as BloomConfig).parameters
    const effectIntensity = this._config.intensity

    // 第一步：提取亮部
    const brightParts = this.extractBrightParts(imageData, threshold)

    // 第二步：多次模糊处理
    let blurred = brightParts
    for (let i = 0; i < passes; i++) {
      blurred = this.gaussianBlur(blurred, radius)
    }

    // 第三步：与原图混合
    const bloomIntensity = intensity * effectIntensity
    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp(data[i] + blurred.data[i] * bloomIntensity)
      resultData[i + 1] = this.clamp(data[i + 1] + blurred.data[i + 1] * bloomIntensity)
      resultData[i + 2] = this.clamp(data[i + 2] + blurred.data[i + 2] * bloomIntensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  private extractBrightParts(imageData: ImageData, threshold: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const thresholdValue = threshold * 255

    for (let i = 0; i < data.length; i += 4) {
      const brightness = this.getLuminance(data[i], data[i + 1], data[i + 2])

      if (brightness > thresholdValue) {
        const factor = (brightness - thresholdValue) / (255 - thresholdValue)
        resultData[i] = data[i] * factor
        resultData[i + 1] = data[i + 1] * factor
        resultData[i + 2] = data[i + 2] * factor
        resultData[i + 3] = data[i + 3]
      } else {
        resultData[i] = 0
        resultData[i + 1] = 0
        resultData[i + 2] = 0
        resultData[i + 3] = 0
      }
    }

    return result
  }

  private gaussianBlur(imageData: ImageData, radius: number): ImageData {
    const kernelSize = Math.round(radius) * 2 + 1
    const sigma = radius / 3
    const kernel = this.createKernel(kernelSize, sigma)

    return this.convolve(imageData, kernel, kernelSize)
  }

  clone(): IPostProcessEffect {
    return new BloomEffect(this._config as BloomConfig)
  }
}

/**
 * 发光效果
 */
export class GlowEffect extends BasePostProcessEffect {
  constructor(config: GlowConfig) {
    super(PostProcessType.GLOW, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { intensity, radius, quality } = (this._config as GlowConfig).parameters
    const effectIntensity = this._config.intensity

    // 创建发光图层
    const glowLayer = this.createGlowLayer(imageData, radius, quality)

    // 与原图混合
    const glowIntensity = intensity * effectIntensity
    for (let i = 0; i < data.length; i += 4) {
      resultData[i] = this.clamp(data[i] + glowLayer.data[i] * glowIntensity)
      resultData[i + 1] = this.clamp(data[i + 1] + glowLayer.data[i + 1] * glowIntensity)
      resultData[i + 2] = this.clamp(data[i + 2] + glowLayer.data[i + 2] * glowIntensity)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  private createGlowLayer(imageData: ImageData, radius: number, quality: number): ImageData {
    // 简化版发光：多次模糊叠加
    let result = this.copyImageData(imageData)
    const passes = Math.round(quality)

    for (let i = 0; i < passes; i++) {
      const blurRadius = radius * (1 + i * 0.5)
      const kernelSize = Math.round(blurRadius) * 2 + 1
      const sigma = blurRadius / 3
      const kernel = this.createKernel(kernelSize, sigma)

      result = this.convolve(result, kernel, kernelSize)
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new GlowEffect(this._config as GlowConfig)
  }
}

/**
 * HDR 色调映射效果
 */
export class HDRTonemapEffect extends BasePostProcessEffect {
  constructor(config: HDRTonemapConfig) {
    super(PostProcessType.HDR_TONEMAP, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { exposure, gamma, whitePoint } = (this._config as HDRTonemapConfig).parameters
    const intensity = this._config.intensity

    const exposureMultiplier = 2 ** (exposure * intensity)
    const invGamma = 1 / Math.max(0.1, gamma)

    for (let i = 0; i < data.length; i += 4) {
      // 应用曝光
      let r = (data[i] / 255) * exposureMultiplier
      let g = (data[i + 1] / 255) * exposureMultiplier
      let b = (data[i + 2] / 255) * exposureMultiplier

      // Reinhard 色调映射
      r = r / (r + 1)
      g = g / (g + 1)
      b = b / (b + 1)

      // 白点调整
      const whiteScale = whitePoint * whitePoint
      r = (r * whiteScale) / (r * whiteScale + 1)
      g = (g * whiteScale) / (g * whiteScale + 1)
      b = (b * whiteScale) / (b * whiteScale + 1)

      // 伽马校正
      r = r ** invGamma
      g = g ** invGamma
      b = b ** invGamma

      resultData[i] = this.clamp(r * 255)
      resultData[i + 1] = this.clamp(g * 255)
      resultData[i + 2] = this.clamp(b * 255)
      resultData[i + 3] = data[i + 3]
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new HDRTonemapEffect(this._config as HDRTonemapConfig)
  }
}

/**
 * 景深效果
 */
export class DepthOfFieldEffect extends BasePostProcessEffect {
  constructor(config: DepthOfFieldConfig) {
    super(PostProcessType.DEPTH_OF_FIELD, config)
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData)
    }

    const result = targetData || new ImageData(imageData.width, imageData.height)
    const data = imageData.data
    const resultData = result.data
    const { focusDistance, maxBlur } = (this._config as DepthOfFieldConfig).parameters
    const intensity = this._config.intensity
    const { width, height } = imageData

    // 简化版景深：基于距离中心的距离计算模糊程度
    const centerX = width / 2
    const centerY = height / 2
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)

    // 创建模糊版本
    const blurRadius = maxBlur * intensity
    const kernelSize = Math.round(blurRadius) * 2 + 1
    const kernel = this.createKernel(kernelSize, blurRadius / 3)
    const blurredImage = this.convolve(imageData, kernel, kernelSize)

    // 根据距离混合原图和模糊图
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4

        // 计算到焦点的距离
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const normalizedDistance = distance / maxDistance

        // 计算模糊因子
        const focusRange = focusDistance
        let blurFactor = Math.abs(normalizedDistance - focusRange) * intensity
        blurFactor = this.clampFloat(blurFactor)

        // 混合原图和模糊图
        const invBlur = 1 - blurFactor
        resultData[index] = data[index] * invBlur + blurredImage.data[index] * blurFactor
        resultData[index + 1] =
          data[index + 1] * invBlur + blurredImage.data[index + 1] * blurFactor
        resultData[index + 2] =
          data[index + 2] * invBlur + blurredImage.data[index + 2] * blurFactor
        resultData[index + 3] = data[index + 3]
      }
    }

    return result
  }

  clone(): IPostProcessEffect {
    return new DepthOfFieldEffect(this._config as DepthOfFieldConfig)
  }
}
