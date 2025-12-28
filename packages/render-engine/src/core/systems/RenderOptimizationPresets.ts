/**
 * 渲染优化预设配置
 */

import type { RenderOptimizationConfig } from './RenderOptimizationConfigTypes';

/**
 * 低端设备配置
 */
export const LOW_END_CONFIG: RenderOptimizationConfig = {
  lod: {
    enabled: true,
    maxDistance: 50,
    lodLevels: 3,
    biasMultiplier: 2.0,
    hysteresis: 0.1,
    adaptiveBias: true
  },
  batching: {
    enabled: true,
    maxBatchSize: 100,
    maxVertices: 1000,
    maxIndices: 3000,
    enableInstancing: true,
    instanceThreshold: 5,
    sortByMaterial: true,
    sortByDepth: false
  },
  culling: {
    frustumCulling: true,
    occlusionCulling: false,
    backfaceCulling: true,
    smallObjectCulling: true,
    smallObjectThreshold: 2.0,
    occlusionQueryDelay: 2
  },
  cache: {
    enabled: true,
    maxSize: 64 * 1024 * 1024, // 64MB
    maxAge: 30000,
    predictiveLoading: false,
    compressionEnabled: true,
    evictionPolicy: 'LRU',
    preloadDistance: 10
  },
  gpuResource: {
    memoryBudget: 128 * 1024 * 1024, // 128MB
    texturePoolSize: 50,
    bufferPoolSize: 20,
    maxTextureSize: 1024,
    compressionFormats: ['DXT1', 'DXT5'],
    mipmapGeneration: true,
    anisotropicFiltering: 2
  },
  shader: {
    asyncCompilation: false,
    cacheEnabled: true,
    variantCaching: true,
    preprocessorOptimization: true,
    deadCodeElimination: true,
    constantFolding: true,
    maxVariants: 50
  },
  monitoring: {
    enabled: true,
    sampleRate: 0.1,
    historySize: 100,
    alertThresholds: {
      frameTime: 33.33, // 30 FPS
      memoryUsage: 100 * 1024 * 1024,
      drawCalls: 200,
      triangles: 10000
    },
    profilingEnabled: false
  },
  multiThread: {
    enabled: false,
    workerCount: 1,
    taskQueueSize: 10,
    loadBalancing: false,
    affinityMask: 0x1,
    priorityScheduling: false
  },
  adaptiveQuality: {
    enabled: true,
    targetFPS: 30,
    qualityLevels: {
      low: {
        lodBias: 2.0,
        shadowQuality: 0.25,
        textureQuality: 0.5,
        effectsQuality: 0.25,
        antiAliasing: 0,
        anisotropicFiltering: 1,
        shadowResolution: 256,
        maxLights: 2
      },
      medium: {
        lodBias: 1.5,
        shadowQuality: 0.5,
        textureQuality: 0.75,
        effectsQuality: 0.5,
        antiAliasing: 2,
        anisotropicFiltering: 2,
        shadowResolution: 512,
        maxLights: 4
      },
      high: {
        lodBias: 1.0,
        shadowQuality: 0.75,
        textureQuality: 1.0,
        effectsQuality: 0.75,
        antiAliasing: 4,
        anisotropicFiltering: 4,
        shadowResolution: 1024,
        maxLights: 6
      },
      ultra: {
        lodBias: 0.5,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 8,
        anisotropicFiltering: 8,
        shadowResolution: 2048,
        maxLights: 8
      }
    },
    adaptationSpeed: 0.1,
    stabilityThreshold: 5
  },
  pipeline: {
    deferredShading: false,
    forwardPlus: false,
    tileBasedRendering: false,
    clusteredShading: false,
    asyncCompute: false,
    gpuDrivenRendering: false,
    meshShaders: false,
    variableRateShading: false
  }
};

/**
 * 中端设备配置
 */
export const MEDIUM_END_CONFIG: RenderOptimizationConfig = {
  lod: {
    enabled: true,
    maxDistance: 100,
    lodLevels: 4,
    biasMultiplier: 1.5,
    hysteresis: 0.15,
    adaptiveBias: true
  },
  batching: {
    enabled: true,
    maxBatchSize: 200,
    maxVertices: 2000,
    maxIndices: 6000,
    enableInstancing: true,
    instanceThreshold: 3,
    sortByMaterial: true,
    sortByDepth: true
  },
  culling: {
    frustumCulling: true,
    occlusionCulling: true,
    backfaceCulling: true,
    smallObjectCulling: true,
    smallObjectThreshold: 1.0,
    occlusionQueryDelay: 1
  },
  cache: {
    enabled: true,
    maxSize: 128 * 1024 * 1024, // 128MB
    maxAge: 60000,
    predictiveLoading: true,
    compressionEnabled: true,
    evictionPolicy: 'LRU',
    preloadDistance: 20
  },
  gpuResource: {
    memoryBudget: 256 * 1024 * 1024, // 256MB
    texturePoolSize: 100,
    bufferPoolSize: 40,
    maxTextureSize: 2048,
    compressionFormats: ['DXT1', 'DXT5', 'BC7'],
    mipmapGeneration: true,
    anisotropicFiltering: 4
  },
  shader: {
    asyncCompilation: true,
    cacheEnabled: true,
    variantCaching: true,
    preprocessorOptimization: true,
    deadCodeElimination: true,
    constantFolding: true,
    maxVariants: 100
  },
  monitoring: {
    enabled: true,
    sampleRate: 0.2,
    historySize: 200,
    alertThresholds: {
      frameTime: 16.67, // 60 FPS
      memoryUsage: 200 * 1024 * 1024,
      drawCalls: 500,
      triangles: 50000
    },
    profilingEnabled: true
  },
  multiThread: {
    enabled: true,
    workerCount: 2,
    taskQueueSize: 20,
    loadBalancing: true,
    affinityMask: 0x3,
    priorityScheduling: true
  },
  adaptiveQuality: {
    enabled: true,
    targetFPS: 60,
    qualityLevels: {
      low: {
        lodBias: 1.5,
        shadowQuality: 0.5,
        textureQuality: 0.75,
        effectsQuality: 0.5,
        antiAliasing: 2,
        anisotropicFiltering: 2,
        shadowResolution: 512,
        maxLights: 4
      },
      medium: {
        lodBias: 1.0,
        shadowQuality: 0.75,
        textureQuality: 1.0,
        effectsQuality: 0.75,
        antiAliasing: 4,
        anisotropicFiltering: 4,
        shadowResolution: 1024,
        maxLights: 6
      },
      high: {
        lodBias: 0.75,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 8,
        anisotropicFiltering: 8,
        shadowResolution: 2048,
        maxLights: 8
      },
      ultra: {
        lodBias: 0.5,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 16,
        anisotropicFiltering: 16,
        shadowResolution: 4096,
        maxLights: 12
      }
    },
    adaptationSpeed: 0.15,
    stabilityThreshold: 10
  },
  pipeline: {
    deferredShading: true,
    forwardPlus: false,
    tileBasedRendering: true,
    clusteredShading: false,
    asyncCompute: true,
    gpuDrivenRendering: false,
    meshShaders: false,
    variableRateShading: false
  }
};

/**
 * 高端设备配置
 */
export const HIGH_END_CONFIG: RenderOptimizationConfig = {
  lod: {
    enabled: true,
    maxDistance: 200,
    lodLevels: 5,
    biasMultiplier: 1.0,
    hysteresis: 0.2,
    adaptiveBias: true
  },
  batching: {
    enabled: true,
    maxBatchSize: 500,
    maxVertices: 5000,
    maxIndices: 15000,
    enableInstancing: true,
    instanceThreshold: 2,
    sortByMaterial: true,
    sortByDepth: true
  },
  culling: {
    frustumCulling: true,
    occlusionCulling: true,
    backfaceCulling: true,
    smallObjectCulling: true,
    smallObjectThreshold: 0.5,
    occlusionQueryDelay: 0
  },
  cache: {
    enabled: true,
    maxSize: 512 * 1024 * 1024, // 512MB
    maxAge: 120000,
    predictiveLoading: true,
    compressionEnabled: false,
    evictionPolicy: 'LFU',
    preloadDistance: 50
  },
  gpuResource: {
    memoryBudget: 1024 * 1024 * 1024, // 1GB
    texturePoolSize: 200,
    bufferPoolSize: 80,
    maxTextureSize: 4096,
    compressionFormats: ['BC7', 'ASTC'],
    mipmapGeneration: true,
    anisotropicFiltering: 16
  },
  shader: {
    asyncCompilation: true,
    cacheEnabled: true,
    variantCaching: true,
    preprocessorOptimization: true,
    deadCodeElimination: true,
    constantFolding: true,
    maxVariants: 500
  },
  monitoring: {
    enabled: true,
    sampleRate: 0.5,
    historySize: 500,
    alertThresholds: {
      frameTime: 8.33, // 120 FPS
      memoryUsage: 500 * 1024 * 1024,
      drawCalls: 2000,
      triangles: 200000
    },
    profilingEnabled: true
  },
  multiThread: {
    enabled: true,
    workerCount: 4,
    taskQueueSize: 50,
    loadBalancing: true,
    affinityMask: 0xF,
    priorityScheduling: true
  },
  adaptiveQuality: {
    enabled: true,
    targetFPS: 120,
    qualityLevels: {
      low: {
        lodBias: 1.0,
        shadowQuality: 0.75,
        textureQuality: 1.0,
        effectsQuality: 0.75,
        antiAliasing: 4,
        anisotropicFiltering: 4,
        shadowResolution: 1024,
        maxLights: 6
      },
      medium: {
        lodBias: 0.75,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 8,
        anisotropicFiltering: 8,
        shadowResolution: 2048,
        maxLights: 8
      },
      high: {
        lodBias: 0.5,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 16,
        anisotropicFiltering: 16,
        shadowResolution: 4096,
        maxLights: 12
      },
      ultra: {
        lodBias: 0.25,
        shadowQuality: 1.0,
        textureQuality: 1.0,
        effectsQuality: 1.0,
        antiAliasing: 32,
        anisotropicFiltering: 16,
        shadowResolution: 8192,
        maxLights: 16
      }
    },
    adaptationSpeed: 0.2,
    stabilityThreshold: 15
  },
  pipeline: {
    deferredShading: true,
    forwardPlus: true,
    tileBasedRendering: true,
    clusteredShading: true,
    asyncCompute: true,
    gpuDrivenRendering: true,
    meshShaders: true,
    variableRateShading: true
  }
};

/**
 * 预设配置集合
 */
export const PRESET_CONFIGS = {
  LOW_END: LOW_END_CONFIG,
  MEDIUM_END: MEDIUM_END_CONFIG,
  HIGH_END: HIGH_END_CONFIG
} as const;

export type PresetConfigKey = keyof typeof PRESET_CONFIGS;
