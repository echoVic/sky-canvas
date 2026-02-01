/**
 * 后处理效果系统导出
 */

// 类型定义
export * from '../types/PostProcessTypes'
// 艺术效果
export {
  GrayscaleEffect,
  InvertEffect,
  PixelateEffect,
  PosterizeEffect,
  SepiaEffect,
  VintageEffect,
} from './ArtisticEffects'
// 基础类
export { BasePostProcessEffect } from './BasePostProcessEffect'
// 颜色调整效果
export {
  BrightnessEffect,
  ColorBalanceEffect,
  ContrastEffect,
  ExposureEffect,
  GammaEffect,
  HueShiftEffect,
  SaturationEffect,
} from './ColorAdjustmentEffects'
// 图像增强效果
export {
  GrainEffect,
  NoiseEffect,
  SharpenEffect,
  VignetteEffect,
} from './ImageEnhancementEffects'
// 管理器
export { PostProcessManager } from './PostProcessManager'
// 特殊效果
export {
  BloomEffect,
  DepthOfFieldEffect,
  GlowEffect,
  HDRTonemapEffect,
} from './SpecialEffects'

// 导入具体实现
import {
  type BloomConfig,
  type ColorAdjustmentConfig,
  type ColorBalanceConfig,
  type DepthOfFieldConfig,
  type GlowConfig,
  type GrainConfig,
  type HDRTonemapConfig,
  type IPostProcessEffect,
  type NoiseConfig,
  type PixelateConfig,
  type PosterizeConfig,
  PostProcessCategory,
  type PostProcessConfig,
  type PostProcessEffectInfo,
  PostProcessType,
  type SharpenConfig,
  type VignetteConfig,
  type VintageConfig,
} from '../types/PostProcessTypes'
import {
  GrayscaleEffect,
  InvertEffect,
  PixelateEffect,
  PosterizeEffect,
  SepiaEffect,
  VintageEffect,
} from './ArtisticEffects'
import {
  BrightnessEffect,
  ColorBalanceEffect,
  ContrastEffect,
  ExposureEffect,
  GammaEffect,
  HueShiftEffect,
  SaturationEffect,
} from './ColorAdjustmentEffects'
import { GrainEffect, NoiseEffect, SharpenEffect, VignetteEffect } from './ImageEnhancementEffects'
import { BloomEffect, DepthOfFieldEffect, GlowEffect, HDRTonemapEffect } from './SpecialEffects'

/**
 * 后处理效果工厂函数
 */
export function createPostProcessEffect(
  type: PostProcessType,
  config: PostProcessConfig
): IPostProcessEffect {
  switch (type) {
    case PostProcessType.BRIGHTNESS:
      return new BrightnessEffect(config as ColorAdjustmentConfig)
    case PostProcessType.CONTRAST:
      return new ContrastEffect(config as ColorAdjustmentConfig)
    case PostProcessType.SATURATION:
      return new SaturationEffect(config as ColorAdjustmentConfig)
    case PostProcessType.HUE_SHIFT:
      return new HueShiftEffect(config as ColorAdjustmentConfig)
    case PostProcessType.GAMMA:
      return new GammaEffect(config as ColorAdjustmentConfig)
    case PostProcessType.EXPOSURE:
      return new ExposureEffect(config as ColorAdjustmentConfig)
    case PostProcessType.COLOR_BALANCE:
      return new ColorBalanceEffect(config as ColorBalanceConfig)
    case PostProcessType.SHARPEN:
      return new SharpenEffect(config as SharpenConfig)
    case PostProcessType.NOISE:
      return new NoiseEffect(config as NoiseConfig)
    case PostProcessType.GRAIN:
      return new GrainEffect(config as GrainConfig)
    case PostProcessType.VIGNETTE:
      return new VignetteEffect(config as VignetteConfig)
    case PostProcessType.BLOOM:
      return new BloomEffect(config as BloomConfig)
    case PostProcessType.GLOW:
      return new GlowEffect(config as GlowConfig)
    case PostProcessType.HDR_TONEMAP:
      return new HDRTonemapEffect(config as HDRTonemapConfig)
    case PostProcessType.DEPTH_OF_FIELD:
      return new DepthOfFieldEffect(config as DepthOfFieldConfig)
    case PostProcessType.SEPIA:
      return new SepiaEffect(config)
    case PostProcessType.VINTAGE:
      return new VintageEffect(config as VintageConfig)
    case PostProcessType.PIXELATE:
      return new PixelateEffect(config as PixelateConfig)
    case PostProcessType.POSTERIZE:
      return new PosterizeEffect(config as PosterizeConfig)
    case PostProcessType.INVERT:
      return new InvertEffect(config)
    case PostProcessType.GRAYSCALE:
      return new GrayscaleEffect(config)
    default:
      throw new Error(`Unsupported post-process effect type: ${type}`)
  }
}

/**
 * 获取所有支持的后处理效果类型
 */
export function getSupportedPostProcessTypes(): PostProcessType[] {
  return Object.values(PostProcessType)
}

/**
 * 检查后处理效果类型是否支持
 */
export function isPostProcessTypeSupported(type: PostProcessType): boolean {
  return Object.values(PostProcessType).includes(type)
}

/**
 * 获取后处理效果的描述信息
 */
export function getPostProcessEffectDescription(type: PostProcessType): string {
  const descriptions: Record<PostProcessType, string> = {
    [PostProcessType.BRIGHTNESS]: '调整图像的整体亮度',
    [PostProcessType.CONTRAST]: '调整图像的对比度，增强明暗对比',
    [PostProcessType.SATURATION]: '调整颜色饱和度，控制颜色鲜艳程度',
    [PostProcessType.HUE_SHIFT]: '偏移颜色色相，改变整体色调',
    [PostProcessType.GAMMA]: '伽马校正，调整中间调亮度',
    [PostProcessType.EXPOSURE]: '模拟相机曝光效果',
    [PostProcessType.COLOR_BALANCE]: '调整阴影、中间调、高光的色彩平衡',
    [PostProcessType.SHARPEN]: '锐化图像，增强边缘细节',
    [PostProcessType.NOISE]: '添加随机噪点效果',
    [PostProcessType.GRAIN]: '添加胶片颗粒效果',
    [PostProcessType.VIGNETTE]: '添加暗角效果，边缘变暗',
    [PostProcessType.BLOOM]: '高光溢出效果，模拟强光扩散',
    [PostProcessType.GLOW]: '发光效果，为亮部添加光晕',
    [PostProcessType.HDR_TONEMAP]: 'HDR色调映射，处理高动态范围',
    [PostProcessType.DEPTH_OF_FIELD]: '景深效果，模拟焦点模糊',
    [PostProcessType.SEPIA]: '复古棕褐色效果',
    [PostProcessType.VINTAGE]: '综合怀旧效果，包含色调、暗角、噪点',
    [PostProcessType.PIXELATE]: '像素化效果，降低图像分辨率',
    [PostProcessType.POSTERIZE]: '色调分离，减少颜色层次',
    [PostProcessType.INVERT]: '颜色反相效果',
    [PostProcessType.GRAYSCALE]: '转换为灰度图像',
  }

  return descriptions[type] || '未知后处理效果'
}

/**
 * 获取后处理效果分类
 */
export function getPostProcessEffectCategory(type: PostProcessType): PostProcessCategory {
  const categories: Record<PostProcessType, PostProcessCategory> = {
    [PostProcessType.BRIGHTNESS]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.CONTRAST]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.SATURATION]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.HUE_SHIFT]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.GAMMA]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.EXPOSURE]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.COLOR_BALANCE]: PostProcessCategory.COLOR_ADJUSTMENT,
    [PostProcessType.SHARPEN]: PostProcessCategory.IMAGE_ENHANCEMENT,
    [PostProcessType.NOISE]: PostProcessCategory.IMAGE_ENHANCEMENT,
    [PostProcessType.GRAIN]: PostProcessCategory.IMAGE_ENHANCEMENT,
    [PostProcessType.VIGNETTE]: PostProcessCategory.IMAGE_ENHANCEMENT,
    [PostProcessType.BLOOM]: PostProcessCategory.SPECIAL_EFFECTS,
    [PostProcessType.GLOW]: PostProcessCategory.SPECIAL_EFFECTS,
    [PostProcessType.HDR_TONEMAP]: PostProcessCategory.SPECIAL_EFFECTS,
    [PostProcessType.DEPTH_OF_FIELD]: PostProcessCategory.SPECIAL_EFFECTS,
    [PostProcessType.SEPIA]: PostProcessCategory.ARTISTIC,
    [PostProcessType.VINTAGE]: PostProcessCategory.ARTISTIC,
    [PostProcessType.PIXELATE]: PostProcessCategory.ARTISTIC,
    [PostProcessType.POSTERIZE]: PostProcessCategory.ARTISTIC,
    [PostProcessType.INVERT]: PostProcessCategory.ARTISTIC,
    [PostProcessType.GRAYSCALE]: PostProcessCategory.ARTISTIC,
  }

  return categories[type] || PostProcessCategory.ARTISTIC
}

/**
 * 获取后处理效果的完整信息
 */
export function getPostProcessEffectInfo(type: PostProcessType): PostProcessEffectInfo {
  const parameterDefinitions: Record<
    PostProcessType,
    Record<string, { min: number; max: number; default: number; step?: number }>
  > = {
    [PostProcessType.BRIGHTNESS]: {
      amount: { min: -100, max: 100, default: 0, step: 1 },
    },
    [PostProcessType.CONTRAST]: {
      amount: { min: -100, max: 100, default: 0, step: 1 },
    },
    [PostProcessType.SATURATION]: {
      amount: { min: -100, max: 100, default: 0, step: 1 },
    },
    [PostProcessType.HUE_SHIFT]: {
      amount: { min: -180, max: 180, default: 0, step: 1 },
    },
    [PostProcessType.GAMMA]: {
      amount: { min: 0.1, max: 3, default: 1, step: 0.1 },
    },
    [PostProcessType.EXPOSURE]: {
      amount: { min: -3, max: 3, default: 0, step: 0.1 },
    },
    [PostProcessType.COLOR_BALANCE]: {
      shadowsRed: { min: -100, max: 100, default: 0 },
      shadowsGreen: { min: -100, max: 100, default: 0 },
      shadowsBlue: { min: -100, max: 100, default: 0 },
      midtonesRed: { min: -100, max: 100, default: 0 },
      midtonesGreen: { min: -100, max: 100, default: 0 },
      midtonesBlue: { min: -100, max: 100, default: 0 },
      highlightsRed: { min: -100, max: 100, default: 0 },
      highlightsGreen: { min: -100, max: 100, default: 0 },
      highlightsBlue: { min: -100, max: 100, default: 0 },
    },
    [PostProcessType.SHARPEN]: {
      strength: { min: 0, max: 2, default: 1, step: 0.1 },
      radius: { min: 1, max: 10, default: 3, step: 1 },
    },
    [PostProcessType.NOISE]: {
      amount: { min: 0, max: 1, default: 0.1, step: 0.01 },
      seed: { min: 0, max: 1000, default: 0, step: 1 },
      monochrome: { min: 0, max: 1, default: 0, step: 1 },
    },
    [PostProcessType.GRAIN]: {
      intensity: { min: 0, max: 1, default: 0.5, step: 0.01 },
      size: { min: 1, max: 10, default: 3, step: 1 },
      luminance: { min: 0, max: 1, default: 0, step: 1 },
    },
    [PostProcessType.VIGNETTE]: {
      strength: { min: 0, max: 1, default: 0.5, step: 0.01 },
      radius: { min: 0.1, max: 1, default: 0.7, step: 0.01 },
      centerX: { min: 0, max: 1, default: 0.5, step: 0.01 },
      centerY: { min: 0, max: 1, default: 0.5, step: 0.01 },
    },
    [PostProcessType.BLOOM]: {
      threshold: { min: 0, max: 1, default: 0.8, step: 0.01 },
      intensity: { min: 0, max: 2, default: 1, step: 0.1 },
      radius: { min: 1, max: 20, default: 5, step: 1 },
      passes: { min: 1, max: 10, default: 3, step: 1 },
    },
    [PostProcessType.GLOW]: {
      intensity: { min: 0, max: 2, default: 1, step: 0.1 },
      radius: { min: 1, max: 20, default: 5, step: 1 },
      quality: { min: 1, max: 10, default: 3, step: 1 },
    },
    [PostProcessType.HDR_TONEMAP]: {
      exposure: { min: -3, max: 3, default: 0, step: 0.1 },
      gamma: { min: 0.1, max: 3, default: 2.2, step: 0.1 },
      whitePoint: { min: 0.1, max: 10, default: 1, step: 0.1 },
    },
    [PostProcessType.DEPTH_OF_FIELD]: {
      focusDistance: { min: 0, max: 1, default: 0.5, step: 0.01 },
      focalLength: { min: 10, max: 200, default: 50, step: 1 },
      fstop: { min: 1.4, max: 16, default: 2.8, step: 0.1 },
      maxBlur: { min: 1, max: 20, default: 5, step: 1 },
    },
    [PostProcessType.SEPIA]: {},
    [PostProcessType.VINTAGE]: {
      sepia: { min: 0, max: 1, default: 0.8, step: 0.01 },
      vignette: { min: 0, max: 1, default: 0.6, step: 0.01 },
      noise: { min: 0, max: 1, default: 0.3, step: 0.01 },
      desaturation: { min: 0, max: 1, default: 0.4, step: 0.01 },
    },
    [PostProcessType.PIXELATE]: {
      pixelSize: { min: 1, max: 50, default: 8, step: 1 },
    },
    [PostProcessType.POSTERIZE]: {
      levels: { min: 2, max: 32, default: 8, step: 1 },
    },
    [PostProcessType.INVERT]: {},
    [PostProcessType.GRAYSCALE]: {},
  }

  return {
    type,
    name: getPostProcessEffectName(type),
    description: getPostProcessEffectDescription(type),
    category: getPostProcessEffectCategory(type),
    parameters: parameterDefinitions[type] || {},
  }
}

/**
 * 获取后处理效果的名称
 */
function getPostProcessEffectName(type: PostProcessType): string {
  const names: Record<PostProcessType, string> = {
    [PostProcessType.BRIGHTNESS]: '亮度',
    [PostProcessType.CONTRAST]: '对比度',
    [PostProcessType.SATURATION]: '饱和度',
    [PostProcessType.HUE_SHIFT]: '色相偏移',
    [PostProcessType.GAMMA]: '伽马',
    [PostProcessType.EXPOSURE]: '曝光',
    [PostProcessType.COLOR_BALANCE]: '色彩平衡',
    [PostProcessType.SHARPEN]: '锐化',
    [PostProcessType.NOISE]: '噪点',
    [PostProcessType.GRAIN]: '颗粒',
    [PostProcessType.VIGNETTE]: '暗角',
    [PostProcessType.BLOOM]: 'Bloom',
    [PostProcessType.GLOW]: '发光',
    [PostProcessType.HDR_TONEMAP]: 'HDR色调映射',
    [PostProcessType.DEPTH_OF_FIELD]: '景深',
    [PostProcessType.SEPIA]: '复古',
    [PostProcessType.VINTAGE]: '怀旧',
    [PostProcessType.PIXELATE]: '像素化',
    [PostProcessType.POSTERIZE]: '色调分离',
    [PostProcessType.INVERT]: '反相',
    [PostProcessType.GRAYSCALE]: '灰度',
  }

  return names[type] || type
}

/**
 * 按分类获取后处理效果类型
 */
export function getPostProcessTypesByCategory(category: PostProcessCategory): PostProcessType[] {
  return getSupportedPostProcessTypes().filter(
    (type) => getPostProcessEffectCategory(type) === category
  )
}

/**
 * 创建默认配置
 */
export function createDefaultPostProcessConfig(type: PostProcessType): PostProcessConfig {
  const info = getPostProcessEffectInfo(type)
  const parameters: Record<string, number> = {}

  for (const [key, param] of Object.entries(info.parameters)) {
    parameters[key] = param.default
  }

  return {
    type,
    enabled: true,
    intensity: 1.0,
    parameters,
  }
}
