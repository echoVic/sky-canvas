/**
 * 图像增强效果
 */

import { BasePostProcessEffect } from './BasePostProcessEffect';
import {
  PostProcessType,
  SharpenConfig,
  NoiseConfig,
  GrainConfig,
  VignetteConfig,
  IPostProcessEffect
} from '../types/PostProcessTypes';

/**
 * 锐化效果
 */
export class SharpenEffect extends BasePostProcessEffect {
  constructor(config: SharpenConfig) {
    super(PostProcessType.SHARPEN, config);
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData);
    }

    const result = targetData || new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const resultData = result.data;
    const { strength, radius } = (this._config as SharpenConfig).parameters;
    const intensity = this._config.intensity;

    // 锐化卷积核
    const kernelSize = Math.round(radius) * 2 + 1;
    const center = Math.floor(kernelSize / 2);
    const kernel: number[] = new Array(kernelSize * kernelSize).fill(0);
    
    // 创建锐化核心
    const sharpAmount = strength * intensity;
    for (let i = 0; i < kernelSize * kernelSize; i++) {
      kernel[i] = -sharpAmount / (kernelSize * kernelSize - 1);
    }
    kernel[center * kernelSize + center] = sharpAmount + 1;

    return this.convolve(imageData, kernel, kernelSize, result);
  }

  clone(): IPostProcessEffect {
    return new SharpenEffect(this._config as SharpenConfig);
  }
}

/**
 * 噪点效果
 */
export class NoiseEffect extends BasePostProcessEffect {
  constructor(config: NoiseConfig) {
    super(PostProcessType.NOISE, config);
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData);
    }

    const result = targetData || new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const resultData = result.data;
    const { amount, seed, monochrome } = (this._config as NoiseConfig).parameters;
    const intensity = this._config.intensity;
    const noiseAmount = amount * intensity * 255;

    // 复制原始数据
    resultData.set(data);

    for (let i = 0; i < data.length; i += 4) {
      // 生成噪点
      const noise1 = (this.random((seed + i) * 0.1) - 0.5) * noiseAmount;
      const noise2 = (this.random((seed + i + 1) * 0.1) - 0.5) * noiseAmount;
      const noise3 = (this.random((seed + i + 2) * 0.1) - 0.5) * noiseAmount;

      if (monochrome > 0.5) {
        // 单色噪点
        resultData[i] = this.clamp(data[i] + noise1);
        resultData[i + 1] = this.clamp(data[i + 1] + noise1);
        resultData[i + 2] = this.clamp(data[i + 2] + noise1);
      } else {
        // 彩色噪点
        resultData[i] = this.clamp(data[i] + noise1);
        resultData[i + 1] = this.clamp(data[i + 1] + noise2);
        resultData[i + 2] = this.clamp(data[i + 2] + noise3);
      }
    }

    return result;
  }

  clone(): IPostProcessEffect {
    return new NoiseEffect(this._config as NoiseConfig);
  }
}

/**
 * 颗粒效果
 */
export class GrainEffect extends BasePostProcessEffect {
  constructor(config: GrainConfig) {
    super(PostProcessType.GRAIN, config);
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData);
    }

    const result = targetData || new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const resultData = result.data;
    const { intensity: grainIntensity, size, luminance } = (this._config as GrainConfig).parameters;
    const effectIntensity = this._config.intensity;
    const { width, height } = imageData;

    // 复制原始数据
    resultData.set(data);

    const grainSize = Math.max(1, Math.round(size));
    const grainAmount = grainIntensity * effectIntensity * 128;

    for (let y = 0; y < height; y += grainSize) {
      for (let x = 0; x < width; x += grainSize) {
        // 为每个颗粒块生成统一的噪点值
        const grainValue = (this.random(x * 0.1 + y * 0.01) - 0.5) * grainAmount;
        
        // 应用到颗粒块中的所有像素
        for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
          for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
            const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
            
            if (luminance > 0.5) {
              // 基于亮度的颗粒
              const currentLuminance = this.getLuminance(
                data[pixelIndex], 
                data[pixelIndex + 1], 
                data[pixelIndex + 2]
              );
              const grainFactor = (currentLuminance / 255) * grainValue;
              
              resultData[pixelIndex] = this.clamp(data[pixelIndex] + grainFactor);
              resultData[pixelIndex + 1] = this.clamp(data[pixelIndex + 1] + grainFactor);
              resultData[pixelIndex + 2] = this.clamp(data[pixelIndex + 2] + grainFactor);
            } else {
              // 均匀颗粒
              resultData[pixelIndex] = this.clamp(data[pixelIndex] + grainValue);
              resultData[pixelIndex + 1] = this.clamp(data[pixelIndex + 1] + grainValue);
              resultData[pixelIndex + 2] = this.clamp(data[pixelIndex + 2] + grainValue);
            }
          }
        }
      }
    }

    return result;
  }

  clone(): IPostProcessEffect {
    return new GrainEffect(this._config as GrainConfig);
  }
}

/**
 * 暗角效果
 */
export class VignetteEffect extends BasePostProcessEffect {
  constructor(config: VignetteConfig) {
    super(PostProcessType.VIGNETTE, config);
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    if (!this._config.enabled) {
      return this.copyImageData(imageData, targetData);
    }

    const result = targetData || new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const resultData = result.data;
    const { strength, radius, centerX, centerY } = (this._config as VignetteConfig).parameters;
    const intensity = this._config.intensity;
    const { width, height } = imageData;

    // 计算中心点
    const cx = width * centerX;
    const cy = height * centerY;
    const maxDistance = Math.sqrt((width / 2) * (width / 2) + (height / 2) * (height / 2));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // 计算到中心的距离
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 计算暗角因子
        const normalizedDistance = distance / maxDistance;
        const vignetteRadius = Math.max(0.1, radius);
        let vignetteFactor = 1;
        
        if (normalizedDistance > vignetteRadius) {
          const fadeDistance = normalizedDistance - vignetteRadius;
          const maxFadeDistance = 1 - vignetteRadius;
          const fadeRatio = Math.min(1, fadeDistance / maxFadeDistance);
          vignetteFactor = 1 - (strength * intensity * fadeRatio);
        }
        
        vignetteFactor = Math.max(0, vignetteFactor);

        resultData[index] = this.clamp(data[index] * vignetteFactor);
        resultData[index + 1] = this.clamp(data[index + 1] * vignetteFactor);
        resultData[index + 2] = this.clamp(data[index + 2] * vignetteFactor);
        resultData[index + 3] = data[index + 3];
      }
    }

    return result;
  }

  clone(): IPostProcessEffect {
    return new VignetteEffect(this._config as VignetteConfig);
  }
}