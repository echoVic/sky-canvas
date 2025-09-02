/**
 * 渲染优化配置管理
 * 统一管理所有渲染优化系统的配置参数
 */

/**
 * LOD配置
 */
export interface LODConfig {
  enabled: boolean;
  maxDistance: number;
  lodLevels: number;
  biasMultiplier: number;
  hysteresis: number;
  adaptiveBias: boolean;
}

/**
 * 批处理配置
 */
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

/**
 * 剔除配置
 */
export interface CullingConfig {
  frustumCulling: boolean;
  occlusionCulling: boolean;
  backfaceCulling: boolean;
  smallObjectCulling: boolean;
  smallObjectThreshold: number;
  occlusionQueryDelay: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  maxAge: number;
  predictiveLoading: boolean;
  compressionEnabled: boolean;
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  preloadDistance: number;
}

/**
 * GPU资源配置
 */
export interface GPUResourceConfig {
  memoryBudget: number;
  texturePoolSize: number;
  bufferPoolSize: number;
  maxTextureSize: number;
  compressionFormats: string[];
  mipmapGeneration: boolean;
  anisotropicFiltering: number;
}

/**
 * 着色器配置
 */
export interface ShaderConfig {
  asyncCompilation: boolean;
  cacheEnabled: boolean;
  variantCaching: boolean;
  preprocessorOptimization: boolean;
  deadCodeElimination: boolean;
  constantFolding: boolean;
  maxVariants: number;
}

/**
 * 性能监控配置
 */
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

/**
 * 多线程配置
 */
export interface MultiThreadConfig {
  enabled: boolean;
  workerCount: number;
  taskQueueSize: number;
  loadBalancing: boolean;
  affinityMask: number;
  priorityScheduling: boolean;
}

/**
 * 自适应质量配置
 */
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

/**
 * 质量设置
 */
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

/**
 * 渲染管线配置
 */
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

/**
 * 完整的渲染优化配置
 */
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

/**
 * 预设配置
 */
export const PRESET_CONFIGS = {
  /**
   * 低端设备配置
   */
  LOW_END: {
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
      evictionPolicy: 'LRU' as const,
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
  } as RenderOptimizationConfig,

  /**
   * 中端设备配置
   */
  MEDIUM_END: {
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
      evictionPolicy: 'LRU' as const,
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
  } as RenderOptimizationConfig,

  /**
   * 高端设备配置
   */
  HIGH_END: {
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
      evictionPolicy: 'LFU' as const,
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
  } as RenderOptimizationConfig
};

/**
 * 配置管理器
 */
export class RenderOptimizationConfigManager {
  private config: RenderOptimizationConfig;
  private listeners: Array<(config: RenderOptimizationConfig) => void> = [];
  
  constructor(initialConfig?: RenderOptimizationConfig) {
    this.config = initialConfig || this.detectOptimalConfig();
  }
  
  /**
   * 检测最优配置
   */
  private detectOptimalConfig(): RenderOptimizationConfig {
    // 基于设备性能检测最优配置
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return PRESET_CONFIGS.LOW_END;
    }
    
    // 检测GPU信息
    const renderer = gl.getParameter(gl.RENDERER) || '';
    
    // 检测纹理和视口信息
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    
    // 简单的性能评估
    let performanceScore = 0;
    
    // 基于纹理大小评分
    if (maxTextureSize >= 4096) performanceScore += 3;
    else if (maxTextureSize >= 2048) performanceScore += 2;
    else performanceScore += 1;
    
    // 基于视口大小评分
    const maxViewport = Math.max(maxViewportDims[0], maxViewportDims[1]);
    if (maxViewport >= 4096) performanceScore += 2;
    else if (maxViewport >= 2048) performanceScore += 1;
    
    // 基于GPU厂商评分
    if (renderer.toLowerCase().includes('nvidia') || renderer.toLowerCase().includes('amd')) {
      performanceScore += 2;
    } else if (renderer.toLowerCase().includes('intel')) {
      performanceScore += 1;
    }
    
    // 基于WebGL版本评分
    if (gl instanceof WebGL2RenderingContext) {
      performanceScore += 2;
    }
    
    // 选择配置
    if (performanceScore >= 8) {
      return PRESET_CONFIGS.HIGH_END;
    } else if (performanceScore >= 5) {
      return PRESET_CONFIGS.MEDIUM_END;
    } else {
      return PRESET_CONFIGS.LOW_END;
    }
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): RenderOptimizationConfig {
    return { ...this.config };
  }
  
  /**
   * 设置配置
   */
  setConfig(config: RenderOptimizationConfig): void {
    this.config = { ...config };
    this.notifyListeners();
  }
  
  /**
   * 更新部分配置
   */
  updateConfig(updates: Partial<RenderOptimizationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }
  
  /**
   * 应用预设配置
   */
  applyPreset(preset: keyof typeof PRESET_CONFIGS): void {
    this.config = { ...PRESET_CONFIGS[preset] };
    this.notifyListeners();
  }
  
  /**
   * 添加配置变更监听器
   */
  addListener(listener: (config: RenderOptimizationConfig) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * 移除配置变更监听器
   */
  removeListener(listener: (config: RenderOptimizationConfig) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }
  
  /**
   * 导出配置为JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * 从JSON导入配置
   */
  importConfig(json: string): void {
    try {
      const config = JSON.parse(json) as RenderOptimizationConfig;
      this.setConfig(config);
    } catch (error) {
      console.error('Failed to import config:', error);
      throw new Error('Invalid configuration JSON');
    }
  }
  
  /**
   * 验证配置
   */
  validateConfig(config: RenderOptimizationConfig): boolean {
    try {
      // 基本类型检查
      if (typeof config !== 'object' || config === null) return false;
      
      // 检查必需的顶级属性
      const requiredKeys = ['lod', 'batching', 'culling', 'cache', 'gpuResource', 'shader', 'monitoring', 'multiThread', 'adaptiveQuality', 'pipeline'];
      for (const key of requiredKeys) {
        if (!(key in config)) return false;
      }
      
      // 检查数值范围
      if (config.lod.maxDistance < 0 || config.lod.lodLevels < 1) return false;
      if (config.batching.maxBatchSize < 1 || config.batching.maxVertices < 1) return false;
      if (config.cache.maxSize < 0 || config.cache.maxAge < 0) return false;
      if (config.gpuResource.memoryBudget < 0) return false;
      if (config.adaptiveQuality.targetFPS < 1) return false;
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取配置摘要
   */
  getConfigSummary(): {
    preset: string;
    memoryBudget: string;
    targetFPS: number;
    enabledFeatures: string[];
  } {
    const enabledFeatures: string[] = [];
    
    if (this.config.lod.enabled) enabledFeatures.push('LOD');
    if (this.config.batching.enabled) enabledFeatures.push('Batching');
    if (this.config.culling.frustumCulling) enabledFeatures.push('Frustum Culling');
    if (this.config.culling.occlusionCulling) enabledFeatures.push('Occlusion Culling');
    if (this.config.cache.enabled) enabledFeatures.push('Smart Cache');
    if (this.config.shader.asyncCompilation) enabledFeatures.push('Async Shaders');
    if (this.config.multiThread.enabled) enabledFeatures.push('Multi-Threading');
    if (this.config.adaptiveQuality.enabled) enabledFeatures.push('Adaptive Quality');
    if (this.config.pipeline.deferredShading) enabledFeatures.push('Deferred Shading');
    if (this.config.pipeline.gpuDrivenRendering) enabledFeatures.push('GPU-Driven Rendering');
    
    // 确定预设类型
    let preset = 'Custom';
    for (const [name, presetConfig] of Object.entries(PRESET_CONFIGS)) {
      if (JSON.stringify(this.config) === JSON.stringify(presetConfig)) {
        preset = name.replace('_', ' ');
        break;
      }
    }
    
    return {
      preset,
      memoryBudget: `${Math.round(this.config.gpuResource.memoryBudget / (1024 * 1024))}MB`,
      targetFPS: this.config.adaptiveQuality.targetFPS,
      enabledFeatures
    };
  }
}

// 导出单例实例
export const renderOptimizationConfig = new RenderOptimizationConfigManager();