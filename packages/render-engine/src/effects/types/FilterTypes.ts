/**
 * 滤镜系统类型定义
 * 支持各种图像处理滤镜和效果
 */

// 滤镜类型枚举
export enum FilterType {
  // 模糊类滤镜
  GAUSSIAN_BLUR = 'gaussianBlur',
  BOX_BLUR = 'boxBlur',
  MOTION_BLUR = 'motionBlur',
  RADIAL_BLUR = 'radialBlur',
  
  // 颜色调整滤镜
  BRIGHTNESS = 'brightness',
  CONTRAST = 'contrast',
  SATURATION = 'saturation',
  HUE_ROTATE = 'hueRotate',
  INVERT = 'invert',
  SEPIA = 'sepia',
  GRAYSCALE = 'grayscale',
  
  // 色彩滤镜
  COLOR_MATRIX = 'colorMatrix',
  THRESHOLD = 'threshold',
  POSTERIZE = 'posterize',
  
  // 锐化和边缘检测
  SHARPEN = 'sharpen',
  UNSHARP_MASK = 'unsharpMask',
  EDGE_DETECT = 'edgeDetect',
  
  // 噪点和纹理
  NOISE = 'noise',
  GRAIN = 'grain',
  
  // 光照效果
  DROP_SHADOW = 'dropShadow',
  INNER_SHADOW = 'innerShadow',
  GLOW = 'glow',
  
  // 变形效果
  DISTORTION = 'distortion',
  WAVE = 'wave',
  RIPPLE = 'ripple',
  
  // 自定义着色器
  CUSTOM_SHADER = 'customShader'
}

// 滤镜优先级
export enum FilterPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// 滤镜处理模式
export enum FilterMode {
  REPLACE = 'replace',      // 替换原图
  MULTIPLY = 'multiply',    // 正片叠底
  SCREEN = 'screen',        // 滤色
  OVERLAY = 'overlay',      // 叠加
  SOFT_LIGHT = 'softLight', // 柔光
  HARD_LIGHT = 'hardLight', // 强光
  COLOR_DODGE = 'colorDodge', // 颜色减淡
  COLOR_BURN = 'colorBurn',   // 颜色加深
  DARKEN = 'darken',        // 变暗
  LIGHTEN = 'lighten',      // 变亮
  DIFFERENCE = 'difference', // 差值
  EXCLUSION = 'exclusion'   // 排除
}

// 基础滤镜参数接口
export interface IFilterParameters {
  type: FilterType;
  enabled?: boolean;
  opacity?: number;          // 滤镜不透明度 (0-1)
  mode?: FilterMode;         // 混合模式
  priority?: FilterPriority; // 处理优先级
}

// 高斯模糊参数
export interface GaussianBlurParameters extends IFilterParameters {
  type: FilterType.GAUSSIAN_BLUR;
  radius: number;            // 模糊半径 (0-100)
  quality?: 'low' | 'medium' | 'high'; // 质量设置
}

// 盒式模糊参数
export interface BoxBlurParameters extends IFilterParameters {
  type: FilterType.BOX_BLUR;
  radius: number;            // 模糊半径
  iterations?: number;       // 迭代次数
}

// 运动模糊参数
export interface MotionBlurParameters extends IFilterParameters {
  type: FilterType.MOTION_BLUR;
  angle: number;             // 运动角度 (度)
  distance: number;          // 运动距离 (像素)
}

// 径向模糊参数
export interface RadialBlurParameters extends IFilterParameters {
  type: FilterType.RADIAL_BLUR;
  centerX: number;           // 中心点X (0-1)
  centerY: number;           // 中心点Y (0-1)
  radius: number;            // 模糊半径
  quality?: number;          // 质量 (采样次数)
}

// 亮度参数
export interface BrightnessParameters extends IFilterParameters {
  type: FilterType.BRIGHTNESS;
  brightness: number;        // 亮度调整 (-100 到 100)
}

// 对比度参数
export interface ContrastParameters extends IFilterParameters {
  type: FilterType.CONTRAST;
  contrast: number;          // 对比度调整 (-100 到 100)
}

// 饱和度参数
export interface SaturationParameters extends IFilterParameters {
  type: FilterType.SATURATION;
  saturation: number;        // 饱和度调整 (-100 到 100)
}

// 色相旋转参数
export interface HueRotateParameters extends IFilterParameters {
  type: FilterType.HUE_ROTATE;
  angle: number;             // 旋转角度 (0-360度)
}

// 反相参数
export interface InvertParameters extends IFilterParameters {
  type: FilterType.INVERT;
  amount: number;            // 反相程度 (0-1)
}

// 深褐色滤镜参数
export interface SepiaParameters extends IFilterParameters {
  type: FilterType.SEPIA;
  amount: number;            // 深褐色程度 (0-1)
}

// 灰度滤镜参数
export interface GrayscaleParameters extends IFilterParameters {
  type: FilterType.GRAYSCALE;
  amount: number;            // 灰度程度 (0-1)
}

// 颜色矩阵参数
export interface ColorMatrixParameters extends IFilterParameters {
  type: FilterType.COLOR_MATRIX;
  matrix: number[];          // 4x5颜色变换矩阵
}

// 阈值滤镜参数
export interface ThresholdParameters extends IFilterParameters {
  type: FilterType.THRESHOLD;
  threshold: number;         // 阈值 (0-1)
  type_mode?: 'binary' | 'binary_inverted' | 'truncate' | 'tozero' | 'tozero_inverted';
}

// 色调分离参数
export interface PosterizeParameters extends IFilterParameters {
  type: FilterType.POSTERIZE;
  levels: number;            // 色阶数量 (2-256)
}

// 锐化参数
export interface SharpenParameters extends IFilterParameters {
  type: FilterType.SHARPEN;
  amount: number;            // 锐化强度 (0-10)
  threshold?: number;        // 锐化阈值 (0-1)
}

// 非锐化蒙版参数
export interface UnsharpMaskParameters extends IFilterParameters {
  type: FilterType.UNSHARP_MASK;
  amount: number;            // 锐化强度
  radius: number;            // 锐化半径
  threshold: number;         // 锐化阈值
}

// 边缘检测参数
export interface EdgeDetectParameters extends IFilterParameters {
  type: FilterType.EDGE_DETECT;
  algorithm?: 'sobel' | 'prewitt' | 'roberts' | 'laplacian' | 'canny';
  threshold?: number;        // 边缘阈值
}

// 噪点参数
export interface NoiseParameters extends IFilterParameters {
  type: FilterType.NOISE;
  amount: number;            // 噪点强度 (0-1)
  type_mode?: 'gaussian' | 'uniform' | 'salt_pepper';
  monochrome?: boolean;      // 单色噪点
}

// 颗粒参数
export interface GrainParameters extends IFilterParameters {
  type: FilterType.GRAIN;
  amount: number;            // 颗粒强度
  size: number;              // 颗粒大小
  roughness?: number;        // 粗糙度
}

// 投影参数
export interface DropShadowParameters extends IFilterParameters {
  type: FilterType.DROP_SHADOW;
  offsetX: number;           // X偏移
  offsetY: number;           // Y偏移
  blur: number;              // 模糊半径
  color: string;             // 阴影颜色
  opacity?: number;          // 阴影不透明度
}

// 内阴影参数
export interface InnerShadowParameters extends IFilterParameters {
  type: FilterType.INNER_SHADOW;
  offsetX: number;           // X偏移
  offsetY: number;           // Y偏移
  blur: number;              // 模糊半径
  color: string;             // 阴影颜色
  opacity?: number;          // 阴影不透明度
}

// 发光参数
export interface GlowParameters extends IFilterParameters {
  type: FilterType.GLOW;
  color: string;             // 发光颜色
  blur: number;              // 发光模糊半径
  strength: number;          // 发光强度
  quality?: 'low' | 'medium' | 'high';
}

// 自定义着色器参数
export interface CustomShaderParameters extends IFilterParameters {
  type: FilterType.CUSTOM_SHADER;
  vertexShader: string;      // 顶点着色器代码
  fragmentShader: string;    // 片段着色器代码
  uniforms?: Record<string, any>; // 着色器uniform参数
}

// 滤镜参数联合类型
export type FilterParameters = 
  | GaussianBlurParameters
  | BoxBlurParameters
  | MotionBlurParameters
  | RadialBlurParameters
  | BrightnessParameters
  | ContrastParameters
  | SaturationParameters
  | HueRotateParameters
  | InvertParameters
  | SepiaParameters
  | GrayscaleParameters
  | ColorMatrixParameters
  | ThresholdParameters
  | PosterizeParameters
  | SharpenParameters
  | UnsharpMaskParameters
  | EdgeDetectParameters
  | NoiseParameters
  | GrainParameters
  | DropShadowParameters
  | InnerShadowParameters
  | GlowParameters
  | CustomShaderParameters;

// 滤镜处理结果
export interface FilterResult {
  success: boolean;
  processedImageData?: ImageData;
  error?: string;
  processingTime?: number;   // 处理时间(毫秒)
  memoryUsage?: number;      // 内存使用量(字节)
}

// 滤镜性能统计
export interface FilterPerformanceStats {
  filterType: FilterType;
  averageProcessingTime: number;  // 平均处理时间
  totalExecutions: number;        // 执行次数
  successRate: number;            // 成功率
  memoryPeakUsage: number;       // 峰值内存使用
}

// 滤镜处理选项
export interface FilterProcessingOptions {
  useWebGL?: boolean;        // 是否使用WebGL加速
  useWebGPU?: boolean;       // 是否使用WebGPU加速
  useWorker?: boolean;       // 是否使用Web Worker
  maxConcurrency?: number;   // 最大并发数
  timeout?: number;          // 超时时间(毫秒)
  enableProfiling?: boolean; // 是否启用性能分析
}

// 滤镜链配置
export interface FilterChainConfig {
  filters: FilterParameters[]; // 滤镜列表
  processingOptions?: FilterProcessingOptions;
  cacheKey?: string;          // 缓存键
  enableCache?: boolean;      // 是否启用缓存
}

// 滤镜处理上下文
export interface FilterContext {
  sourceImageData: ImageData;
  targetImageData?: ImageData;
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  webglContext?: WebGLRenderingContext;
  width: number;
  height: number;
  timestamp: number;
}

// 滤镜事件类型
export interface FilterEvents {
  'filter-start': (filterType: FilterType, context: FilterContext) => void;
  'filter-progress': (filterType: FilterType, progress: number) => void;
  'filter-complete': (filterType: FilterType, result: FilterResult) => void;
  'filter-error': (filterType: FilterType, error: Error) => void;
  'chain-start': (filters: FilterParameters[]) => void;
  'chain-complete': (results: FilterResult[]) => void;
  [key: string]: (...args: any[]) => void;
}

// 滤镜接口
export interface IFilter {
  readonly type: FilterType;
  readonly name: string;
  readonly description: string;
  readonly supportedInputFormats: string[];
  readonly requiresWebGL: boolean;
  
  // 应用滤镜
  apply(context: FilterContext, parameters: FilterParameters): Promise<FilterResult>;
  
  // 验证参数
  validateParameters(parameters: FilterParameters): boolean;
  
  // 获取默认参数
  getDefaultParameters(): FilterParameters;
  
  // 预估处理时间
  estimateProcessingTime(width: number, height: number, parameters: FilterParameters): number;
  
  // 检查是否支持硬件加速
  supportsAcceleration(): boolean;
  
  // 清理资源
  dispose(): void;
}