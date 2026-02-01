/**
 * 后处理效果类型定义
 */

// 后处理效果类型
export enum PostProcessType {
  // 色彩调整
  BRIGHTNESS = 'brightness',
  CONTRAST = 'contrast',
  SATURATION = 'saturation',
  HUE_SHIFT = 'hue-shift',
  GAMMA = 'gamma',
  EXPOSURE = 'exposure',
  COLOR_BALANCE = 'color-balance',

  // 图像增强
  SHARPEN = 'sharpen',
  NOISE = 'noise',
  GRAIN = 'grain',
  VIGNETTE = 'vignette',

  // 特殊效果
  BLOOM = 'bloom',
  GLOW = 'glow',
  HDR_TONEMAP = 'hdr-tonemap',
  DEPTH_OF_FIELD = 'depth-of-field',

  // 艺术效果
  SEPIA = 'sepia',
  VINTAGE = 'vintage',
  PIXELATE = 'pixelate',
  POSTERIZE = 'posterize',
  INVERT = 'invert',
  GRAYSCALE = 'grayscale',
}

// 后处理效果配置
export interface PostProcessConfig {
  type: PostProcessType
  enabled: boolean
  intensity: number
  parameters: Record<string, number>
}

// 颜色调整配置
export interface ColorAdjustmentConfig extends PostProcessConfig {
  type:
    | PostProcessType.BRIGHTNESS
    | PostProcessType.CONTRAST
    | PostProcessType.SATURATION
    | PostProcessType.HUE_SHIFT
    | PostProcessType.GAMMA
    | PostProcessType.EXPOSURE
  parameters: {
    amount: number
  }
}

// 色彩平衡配置
export interface ColorBalanceConfig extends PostProcessConfig {
  type: PostProcessType.COLOR_BALANCE
  parameters: {
    shadowsRed: number
    shadowsGreen: number
    shadowsBlue: number
    midtonesRed: number
    midtonesGreen: number
    midtonesBlue: number
    highlightsRed: number
    highlightsGreen: number
    highlightsBlue: number
  }
}

// 锐化配置
export interface SharpenConfig extends PostProcessConfig {
  type: PostProcessType.SHARPEN
  parameters: {
    strength: number
    radius: number
  }
}

// 噪点配置
export interface NoiseConfig extends PostProcessConfig {
  type: PostProcessType.NOISE
  parameters: {
    amount: number
    seed: number
    monochrome: number
  }
}

// 颗粒配置
export interface GrainConfig extends PostProcessConfig {
  type: PostProcessType.GRAIN
  parameters: {
    intensity: number
    size: number
    luminance: number
  }
}

// 暗角配置
export interface VignetteConfig extends PostProcessConfig {
  type: PostProcessType.VIGNETTE
  parameters: {
    strength: number
    radius: number
    centerX: number
    centerY: number
  }
}

// Bloom 配置
export interface BloomConfig extends PostProcessConfig {
  type: PostProcessType.BLOOM
  parameters: {
    threshold: number
    intensity: number
    radius: number
    passes: number
  }
}

// 发光配置
export interface GlowConfig extends PostProcessConfig {
  type: PostProcessType.GLOW
  parameters: {
    intensity: number
    radius: number
    quality: number
  }
}

// HDR 色调映射配置
export interface HDRTonemapConfig extends PostProcessConfig {
  type: PostProcessType.HDR_TONEMAP
  parameters: {
    exposure: number
    gamma: number
    whitePoint: number
  }
}

// 景深配置
export interface DepthOfFieldConfig extends PostProcessConfig {
  type: PostProcessType.DEPTH_OF_FIELD
  parameters: {
    focusDistance: number
    focalLength: number
    fstop: number
    maxBlur: number
  }
}

// 像素化配置
export interface PixelateConfig extends PostProcessConfig {
  type: PostProcessType.PIXELATE
  parameters: {
    pixelSize: number
  }
}

// 色调分离配置
export interface PosterizeConfig extends PostProcessConfig {
  type: PostProcessType.POSTERIZE
  parameters: {
    levels: number
  }
}

// 复古效果配置
export interface VintageConfig extends PostProcessConfig {
  type: PostProcessType.VINTAGE
  parameters: {
    sepia: number
    vignette: number
    noise: number
    desaturation: number
  }
}

// 后处理效果接口
export interface IPostProcessEffect {
  readonly id: string
  readonly type: PostProcessType
  readonly config: PostProcessConfig

  apply(imageData: ImageData, targetData?: ImageData): ImageData
  applyToCanvas(canvas: HTMLCanvasElement, targetCanvas?: HTMLCanvasElement): HTMLCanvasElement

  updateConfig(config: Partial<PostProcessConfig>): void
  clone(): IPostProcessEffect
  dispose(): void
}

// 后处理管理器接口
export interface IPostProcessManager {
  addEffect(effect: IPostProcessEffect): void
  removeEffect(effectId: string): boolean
  getEffect(effectId: string): IPostProcessEffect | undefined
  getAllEffects(): IPostProcessEffect[]

  process(canvas: HTMLCanvasElement): HTMLCanvasElement
  processImageData(imageData: ImageData): ImageData

  clear(): void
  dispose(): void
}

// 后处理层
export interface PostProcessLayer {
  id: string
  canvas: HTMLCanvasElement
  effects: IPostProcessEffect[]
  enabled: boolean
  blend?: {
    mode: GlobalCompositeOperation
    opacity: number
  }
}

// 后处理结果
export interface PostProcessResult {
  canvas: HTMLCanvasElement
  imageData?: ImageData
  processedEffects: number
  renderTime: number
}

// 后处理事件类型
export type PostProcessEvents = {
  effectAdded: (effect: IPostProcessEffect) => void
  effectRemoved: (effectId: string) => void
  effectUpdated: (effect: IPostProcessEffect) => void
  processStarted: (layers: PostProcessLayer[]) => void
  processCompleted: (result: PostProcessResult) => void
  processError: (error: Error) => void
}

// 后处理统计信息
export interface PostProcessStats {
  totalEffects: number
  activeEffects: number
  totalProcesses: number
  averageProcessTime: number
  memoryUsage: number
}

// 后处理性能配置
export interface PostProcessPerformanceConfig {
  useWebGL: boolean
  enableBatching: boolean
  maxBatchSize: number
  useOffscreenCanvas: boolean
  enableWorkers: boolean
}

// 后处理上下文
export interface PostProcessContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  webglContext?: WebGLRenderingContext
  offscreenCanvas?: OffscreenCanvas
  performanceConfig: PostProcessPerformanceConfig
}

// 后处理质量级别
export enum PostProcessQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

// 后处理效果分类
export enum PostProcessCategory {
  COLOR_ADJUSTMENT = 'color-adjustment',
  IMAGE_ENHANCEMENT = 'image-enhancement',
  SPECIAL_EFFECTS = 'special-effects',
  ARTISTIC = 'artistic',
}

// 后处理效果信息
export interface PostProcessEffectInfo {
  type: PostProcessType
  name: string
  description: string
  category: PostProcessCategory
  parameters: Record<
    string,
    {
      min: number
      max: number
      default: number
      step?: number
    }
  >
}

// 导出所有类型
export type AnyPostProcessConfig = PostProcessConfig
export type PostProcessEffectType = PostProcessType
