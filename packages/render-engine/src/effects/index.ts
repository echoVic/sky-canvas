/**
 * 滤镜和效果系统导出
 */

// 混合模式
export { BlendModeManager } from './blends/BlendModeManager'
// 复合效果
export { CompositeEffectManager } from './composites/CompositeEffectManager'
// 滤镜管理器
export { FilterManager } from './FilterManager'
export { BrightnessFilter } from './filters/BrightnessFilter'
export { ContrastFilter } from './filters/ContrastFilter'
export { CustomShaderFilter } from './filters/CustomShaderFilter'
// 高级滤镜
export { DropShadowFilter } from './filters/DropShadowFilter'

// 基础滤镜
export { GaussianBlurFilter } from './filters/GaussianBlurFilter'
export { GlowFilter } from './filters/GlowFilter'
export { GrayscaleFilter } from './filters/GrayscaleFilter'
export { HueRotateFilter } from './filters/HueRotateFilter'
export { InnerShadowFilter } from './filters/InnerShadowFilter'
export { SaturationFilter } from './filters/SaturationFilter'
// 光照系统
export { LightingManager } from './lighting/LightingManager'
// 遮罩系统
export { MaskManager } from './masks/MaskManager'
// 后处理管道
export { PostProcessPipeline } from './postprocess/PostProcessPipeline'
// 预设效果
export { FilterPresets } from './presets/FilterPresets'
export * from './types/BlendTypes'
export * from './types/CompositeTypes'
// 核心类型定义
export * from './types/FilterTypes'
export * from './types/LightingTypes'
export * from './types/MaskTypes'
export * from './types/PostProcessTypes'

// 工具函数
export { FilterUtils } from './utils/FilterUtils'

// WebGL 着色器
export { FilterShaderLibrary } from './webgl/FilterShaderLibrary'
