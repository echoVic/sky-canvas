/**
 * 混合模式类型定义
 */

// 混合模式枚举
export enum BlendMode {
  // 标准混合模式
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  SOFT_LIGHT = 'soft-light',
  HARD_LIGHT = 'hard-light',

  // 暗色混合模式
  DARKEN = 'darken',
  COLOR_BURN = 'color-burn',
  LINEAR_BURN = 'linear-burn',
  DARKER_COLOR = 'darker-color',

  // 亮色混合模式
  LIGHTEN = 'lighten',
  COLOR_DODGE = 'color-dodge',
  LINEAR_DODGE = 'linear-dodge',
  LIGHTER_COLOR = 'lighter-color',

  // 差值混合模式
  DIFFERENCE = 'difference',
  EXCLUSION = 'exclusion',
  SUBTRACT = 'subtract',
  DIVIDE = 'divide',

  // 颜色混合模式
  HUE = 'hue',
  SATURATION = 'saturation',
  COLOR = 'color',
  LUMINOSITY = 'luminosity',

  // 特殊混合模式
  VIVID_LIGHT = 'vivid-light',
  PIN_LIGHT = 'pin-light',
  HARD_MIX = 'hard-mix',
}

// 混合模式配置
export interface BlendModeConfig {
  mode: BlendMode
  opacity: number
  enabled: boolean
  preserveAlpha?: boolean
  clipToLayer?: boolean
}

// 混合颜色结构
export interface BlendColor {
  r: number
  g: number
  b: number
  a: number
}

// 混合函数类型
export type BlendFunction = (base: BlendColor, overlay: BlendColor) => BlendColor

// 混合操作接口
export interface IBlendOperation {
  readonly id: string
  readonly mode: BlendMode
  readonly config: BlendModeConfig

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor
  applyToImageData(baseData: ImageData, overlayData: ImageData, targetData?: ImageData): ImageData
  applyToCanvas(
    baseCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    targetCanvas?: HTMLCanvasElement
  ): HTMLCanvasElement

  updateConfig(config: Partial<BlendModeConfig>): void
  clone(): IBlendOperation
  dispose(): void
}

// 混合管理器接口
export interface IBlendManager {
  addBlendOperation(operation: IBlendOperation): void
  removeBlendOperation(operationId: string): boolean
  getBlendOperation(operationId: string): IBlendOperation | undefined
  getAllBlendOperations(): IBlendOperation[]

  blend(layers: BlendLayer[]): HTMLCanvasElement | ImageData
  blendColors(colors: BlendColorWithMode[]): BlendColor

  clear(): void
  dispose(): void
}

// 混合层数据
export interface BlendLayer {
  id: string
  canvas: HTMLCanvasElement
  imageData?: ImageData
  blendMode: BlendMode
  opacity: number
  visible: boolean
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

// 带混合模式的颜色
export interface BlendColorWithMode {
  color: BlendColor
  blendMode: BlendMode
  opacity: number
}

// 混合结果
export interface BlendResult {
  canvas?: HTMLCanvasElement
  imageData?: ImageData
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  blendedLayers: number
  renderTime: number
}

// 混合性能配置
export interface BlendPerformanceConfig {
  useWebGL: boolean
  enableCaching: boolean
  maxCacheSize: number
  enableWorkers: boolean
  workerCount: number
  chunkSize: number
}

// 混合事件类型
export type BlendEvents = {
  blendOperationAdded: (operation: IBlendOperation) => void
  blendOperationRemoved: (operationId: string) => void
  blendOperationUpdated: (operation: IBlendOperation) => void
  blendStarted: (layers: BlendLayer[]) => void
  blendCompleted: (result: BlendResult) => void
  blendError: (error: Error) => void
}

// 混合统计信息
export interface BlendStats {
  totalOperations: number
  activeOperations: number
  totalBlends: number
  averageBlendTime: number
  cacheHits: number
  cacheMisses: number
  memoryUsage: number
}

// 混合质量级别
export enum BlendQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

// 混合上下文
export interface BlendContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  webglContext?: WebGLRenderingContext
  quality: BlendQuality
  performanceConfig: BlendPerformanceConfig
}

// 导出所有类型
export type AnyBlendConfig = BlendModeConfig
export type BlendModeType = BlendMode
