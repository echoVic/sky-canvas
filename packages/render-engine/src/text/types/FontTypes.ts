/**
 * 字体相关类型定义
 * 为高级文本渲染系统提供完整的字体类型支持
 */

/**
 * 支持的字体格式
 */
export enum FontFormat {
  WOFF = 'woff',
  WOFF2 = 'woff2',
  TTF = 'truetype',
  OTF = 'opentype',
  EOT = 'embedded-opentype',
  SVG = 'svg',
}

/**
 * 字体加载状态
 */
export enum FontLoadingState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  FALLBACK = 'fallback',
}

/**
 * 字体权重
 */
export enum FontWeight {
  THIN = 100,
  EXTRA_LIGHT = 200,
  LIGHT = 300,
  NORMAL = 400,
  MEDIUM = 500,
  SEMI_BOLD = 600,
  BOLD = 700,
  EXTRA_BOLD = 800,
  BLACK = 900,
}

/**
 * 字体样式
 */
export enum FontStyle {
  NORMAL = 'normal',
  ITALIC = 'italic',
  OBLIQUE = 'oblique',
}

/**
 * 字体拉伸
 */
export enum FontStretch {
  ULTRA_CONDENSED = 'ultra-condensed',
  EXTRA_CONDENSED = 'extra-condensed',
  CONDENSED = 'condensed',
  SEMI_CONDENSED = 'semi-condensed',
  NORMAL = 'normal',
  SEMI_EXPANDED = 'semi-expanded',
  EXPANDED = 'expanded',
  EXTRA_EXPANDED = 'extra-expanded',
  ULTRA_EXPANDED = 'ultra-expanded',
}

/**
 * 字体加载策略
 */
export enum FontLoadingStrategy {
  EAGER = 'eager', // 立即加载
  LAZY = 'lazy', // 懒加载（需要时才加载）
  PRELOAD = 'preload', // 预加载
  OPTIONAL = 'optional', // 可选加载
}

/**
 * 字体显示策略
 */
export enum FontDisplayStrategy {
  AUTO = 'auto',
  BLOCK = 'block',
  SWAP = 'swap',
  FALLBACK = 'fallback',
  OPTIONAL = 'optional',
}

/**
 * 字体源定义
 */
export interface FontSource {
  url: string
  format: FontFormat
  weight?: FontWeight | string
  style?: FontStyle
  stretch?: FontStretch
}

/**
 * 字体描述符
 */
export interface FontDescriptor {
  family: string
  weight?: FontWeight | string
  style?: FontStyle
  stretch?: FontStretch
  unicodeRange?: string
  variant?: string
  featureSettings?: string
  display?: FontDisplayStrategy
}

/**
 * 字体配置
 */
export interface FontConfig extends FontDescriptor {
  sources: FontSource[]
  fallbacks?: string[] // 回退字体列表
  loadingStrategy?: FontLoadingStrategy
  timeout?: number // 加载超时时间（毫秒）
  retries?: number // 重试次数
  preload?: boolean // 是否预加载
  priority?: number // 加载优先级 (0-100)
}

/**
 * 字体加载选项
 */
export interface FontLoadingOptions {
  timeout?: number
  signal?: AbortSignal
  priority?: number
  display?: FontDisplayStrategy
  onProgress?: (progress: FontLoadingProgress) => void
  onStateChange?: (state: FontLoadingState) => void
}

/**
 * 字体加载进度
 */
export interface FontLoadingProgress {
  loaded: number
  total: number
  percentage: number
  bytesLoaded: number
  bytesTotal: number
  speed?: number // 加载速度 (bytes/s)
  remainingTime?: number // 剩余时间 (s)
}

/**
 * 字体度量信息
 */
export interface FontMetrics {
  family: string
  size: number
  lineHeight: number
  ascent: number // 上升高度
  descent: number // 下降高度
  capHeight: number // 大写字母高度
  xHeight: number // 小写字母高度
  baseline: number // 基线位置
  unitsPerEm: number // 每em的单位数
  boundingBox: {
    left: number
    top: number
    right: number
    bottom: number
  }
}

/**
 * 字符度量信息
 */
export interface CharacterMetrics {
  character: string
  width: number
  height: number
  bearingX: number // 水平方向轴承
  bearingY: number // 垂直方向轴承
  advance: number // 前进宽度
  boundingBox: {
    left: number
    top: number
    right: number
    bottom: number
  }
}

/**
 * 字体实例接口
 */
export interface IFont {
  readonly id: string
  readonly family: string
  readonly config: FontConfig
  readonly state: FontLoadingState
  readonly metrics?: FontMetrics
  readonly loadTime?: number
  readonly size: number // 字体文件大小

  load(options?: FontLoadingOptions): Promise<void>
  unload(): void
  isLoaded(): boolean
  getMetrics(size: number): FontMetrics
  measureText(text: string, size: number): TextMetrics
  measureCharacter(char: string, size: number): CharacterMetrics
  getKerning(char1: string, char2: string, size: number): number
  supports(char: string): boolean
  clone(): IFont
}

/**
 * 文本度量结果
 */
export interface TextMetrics {
  width: number
  height: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
  fontBoundingBoxAscent: number
  fontBoundingBoxDescent: number
  emHeightAscent: number
  emHeightDescent: number
  hangingBaseline: number
  alphabeticBaseline: number
  ideographicBaseline: number
}

/**
 * 字体管理器接口
 */
export interface IFontManager {
  loadFont(config: FontConfig): Promise<IFont>
  getFont(family: string, weight?: FontWeight, style?: FontStyle): IFont | null
  getFallbackFont(family: string): IFont | null
  hasFont(family: string): boolean
  unloadFont(family: string): void
  preloadFonts(configs: FontConfig[]): Promise<void>
  getLoadedFonts(): IFont[]
  getLoadingProgress(family: string): FontLoadingProgress | null
  clearCache(): void
  dispose(): void
}

/**
 * 字体加载器接口
 */
export interface IFontLoader {
  load(source: FontSource, options?: FontLoadingOptions): Promise<ArrayBuffer>
  supports(format: FontFormat): boolean
  getLoadingProgress(url: string): FontLoadingProgress | null
  cancel(url: string): void
  clearCache(): void
}

/**
 * 字体缓存接口
 */
export interface IFontCache {
  get(key: string): IFont | null
  set(key: string, font: IFont, ttl?: number): void
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
  getStats(): FontCacheStats
  cleanup(): void
}

/**
 * 字体缓存统计
 */
export interface FontCacheStats {
  size: number
  hitCount: number
  missCount: number
  hitRate: number
  memoryUsage: number // 字节
  itemCount: number
}

/**
 * 字体事件类型
 */
export interface FontEvents {
  loading: { font: IFont }
  loaded: { font: IFont }
  error: { font: IFont | null; error: Error }
  fallback: { font: IFont; fallbackFont: IFont }
  progress: { font: IFont; progress: FontLoadingProgress }
  unload: { font: IFont }
}

/**
 * 字体错误类型
 */
export class FontError extends Error {
  constructor(
    message: string,
    public code: FontErrorCode,
    public font?: IFont,
    public source?: FontSource
  ) {
    super(message)
    this.name = 'FontError'
  }
}

/**
 * 字体错误代码
 */
export enum FontErrorCode {
  LOAD_FAILED = 'LOAD_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  PARSE_ERROR = 'PARSE_ERROR',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
  MEMORY_ERROR = 'MEMORY_ERROR',
}

/**
 * 系统字体信息
 */
export interface SystemFontInfo {
  family: string
  available: boolean
  generic?: boolean // 是否为通用字体族
  monospace?: boolean // 是否为等宽字体
  weights?: FontWeight[] // 支持的字重
  styles?: FontStyle[] // 支持的样式
}

/**
 * 字体回退配置
 */
export interface FontFallbackConfig {
  primary: string // 主要字体
  fallbacks: string[] // 回退字体列表
  generic: string // 通用字体族名
  detectTimeout?: number // 检测超时时间
  skipUnavailable?: boolean // 跳过不可用的字体
}

/**
 * 字体特性支持
 */
export interface FontFeatureSupport {
  openType: boolean // OpenType特性支持
  variableFont: boolean // 可变字体支持
  colorFont: boolean // 彩色字体支持
  ligatures: boolean // 连字支持
  kerning: boolean // 字距调整支持
  substitution: boolean // 字符替换支持
}

/**
 * Web字体优化选项
 */
export interface WebFontOptimization {
  subset?: boolean // 字体子集化
  unicodeRange?: string // Unicode范围
  compression?: boolean // 压缩
  preconnect?: boolean // 预连接到字体服务器
  resourceHints?: boolean // 使用资源提示
  fontDisplay?: FontDisplayStrategy // 字体显示策略
}
