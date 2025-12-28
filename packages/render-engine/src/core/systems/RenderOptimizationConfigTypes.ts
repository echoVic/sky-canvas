/**
 * 渲染优化配置类型定义
 */

export interface LODConfig {
  enabled: boolean;
  maxDistance: number;
  lodLevels: number;
  biasMultiplier: number;
  hysteresis: number;
  adaptiveBias: boolean;
}

export interface BatchingConfig {
  enabled: boolean;
  maxBatchSize: number;
  maxVertices: number;
  maxIndices: number;
  enableInstancing: boolean;
  instanceThreshold: number;
  sortByMaterial: boolean;
  sortByDepth: boolean;
}

export interface CullingConfig {
  frustumCulling: boolean;
  occlusionCulling: boolean;
  backfaceCulling: boolean;
  smallObjectCulling: boolean;
  smallObjectThreshold: number;
  occlusionQueryDelay: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  maxAge: number;
  predictiveLoading: boolean;
  compressionEnabled: boolean;
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  preloadDistance: number;
}

export interface GPUResourceConfig {
  memoryBudget: number;
  texturePoolSize: number;
  bufferPoolSize: number;
  maxTextureSize: number;
  compressionFormats: string[];
  mipmapGeneration: boolean;
  anisotropicFiltering: number;
}

export interface ShaderConfig {
  asyncCompilation: boolean;
  cacheEnabled: boolean;
  variantCaching: boolean;
  preprocessorOptimization: boolean;
  deadCodeElimination: boolean;
  constantFolding: boolean;
  maxVariants: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  historySize: number;
  alertThresholds: {
    frameTime: number;
    memoryUsage: number;
    drawCalls: number;
    triangles: number;
  };
  profilingEnabled: boolean;
}

export interface MultiThreadConfig {
  enabled: boolean;
  workerCount: number;
  taskQueueSize: number;
  loadBalancing: boolean;
  affinityMask: number;
  priorityScheduling: boolean;
}

export interface QualitySettings {
  lodBias: number;
  shadowQuality: number;
  textureQuality: number;
  effectsQuality: number;
  antiAliasing: number;
  anisotropicFiltering: number;
  shadowResolution: number;
  maxLights: number;
}

export interface AdaptiveQualityConfig {
  enabled: boolean;
  targetFPS: number;
  qualityLevels: {
    low: QualitySettings;
    medium: QualitySettings;
    high: QualitySettings;
    ultra: QualitySettings;
  };
  adaptationSpeed: number;
  stabilityThreshold: number;
}

export interface PipelineConfig {
  deferredShading: boolean;
  forwardPlus: boolean;
  tileBasedRendering: boolean;
  clusteredShading: boolean;
  asyncCompute: boolean;
  gpuDrivenRendering: boolean;
  meshShaders: boolean;
  variableRateShading: boolean;
}

export interface RenderOptimizationConfig {
  lod: LODConfig;
  batching: BatchingConfig;
  culling: CullingConfig;
  cache: CacheConfig;
  gpuResource: GPUResourceConfig;
  shader: ShaderConfig;
  monitoring: MonitoringConfig;
  multiThread: MultiThreadConfig;
  adaptiveQuality: AdaptiveQualityConfig;
  pipeline: PipelineConfig;
}
