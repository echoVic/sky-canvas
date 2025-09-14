/**
 * WebGL高级功能统一导出
 * 提供便捷的高级功能使用方式
 */

import { AdvancedShaderManager } from './AdvancedShaderManager';
import { WebGLOptimizer, createGlobalWebGLOptimizer, getGlobalWebGLOptimizer } from './WebGLOptimizer';
import { WebGLResourceManager } from './WebGLResourceManager';
import { IShaderManager } from './ShaderManager';
import { IBufferManager } from './BufferManager';

/**
 * WebGL高级功能管理器
 * 整合所有高级功能模块的便捷接口
 */
export class WebGLAdvancedManager {
  private gl: WebGLRenderingContext;
  private advancedShaderManager?: AdvancedShaderManager;
  private optimizer?: WebGLOptimizer;
  private resourceManager?: WebGLResourceManager;

  constructor(
    gl: WebGLRenderingContext,
    shaderManager: IShaderManager,
    bufferManager: IBufferManager
  ) {
    this.gl = gl;
  }

  /**
   * 启用高级着色器管理
   */
  enableAdvancedShaders(config?: {
    enableHotReload?: boolean;
    precompileCommonVariants?: boolean;
    enableAsyncCompilation?: boolean;
    cacheMemoryLimit?: number;
  }): AdvancedShaderManager {
    if (!this.advancedShaderManager) {
      this.advancedShaderManager = new AdvancedShaderManager(this.gl, config);
    }
    return this.advancedShaderManager;
  }

  /**
   * 启用WebGL优化器
   */
  enableOptimizer(
    shaderManager: IShaderManager,
    bufferManager: IBufferManager,
    config?: {
      enableStateTracking?: boolean;
      enableBatchOptimization?: boolean;
      enableShaderWarmup?: boolean;
      enableBufferPooling?: boolean;
    }
  ): WebGLOptimizer {
    if (!this.optimizer) {
      this.optimizer = new WebGLOptimizer(this.gl, shaderManager, bufferManager, config);
    }
    return this.optimizer;
  }

  /**
   * 启用资源管理器
   */
  enableResourceManager(config?: any): WebGLResourceManager {
    if (!this.resourceManager) {
      this.resourceManager = new WebGLResourceManager(this.gl, config);
    }
    return this.resourceManager;
  }

  /**
   * 获取高级着色器管理器
   */
  getAdvancedShaderManager(): AdvancedShaderManager | undefined {
    return this.advancedShaderManager;
  }

  /**
   * 获取优化器
   */
  getOptimizer(): WebGLOptimizer | undefined {
    return this.optimizer;
  }

  /**
   * 获取资源管理器
   */
  getResourceManager(): WebGLResourceManager | undefined {
    return this.resourceManager;
  }

  /**
   * 获取所有功能的性能统计
   */
  getPerformanceStats() {
    return {
      advancedShaders: this.advancedShaderManager?.getCacheStats(),
      optimizer: this.optimizer?.getDetailedStats(),
      resourceManager: this.resourceManager ? {} : undefined // 简化实现
    };
  }

  /**
   * 销毁所有高级功能
   */
  dispose(): void {
    if (this.advancedShaderManager) {
      this.advancedShaderManager.dispose();
      this.advancedShaderManager = undefined;
    }

    if (this.optimizer) {
      this.optimizer.dispose();
      this.optimizer = undefined;
    }

    if (this.resourceManager) {
      this.resourceManager.dispose();
      this.resourceManager = undefined;
    }
  }
}

// 导出便捷工厂函数
export function createWebGLAdvancedManager(
  gl: WebGLRenderingContext,
  shaderManager: IShaderManager,
  bufferManager: IBufferManager
): WebGLAdvancedManager {
  return new WebGLAdvancedManager(gl, shaderManager, bufferManager);
}

// 导出高级功能预设配置
export const WebGLAdvancedPresets = {
  /**
   * 高性能配置 - 启用所有优化功能
   */
  highPerformance: {
    advancedShaders: {
      enableHotReload: false,
      precompileCommonVariants: true,
      enableAsyncCompilation: true,
      cacheMemoryLimit: 100 * 1024 * 1024 // 100MB
    },
    optimizer: {
      enableStateTracking: true,
      enableBatchOptimization: true,
      enableShaderWarmup: true,
      enableBufferPooling: true
    },
    resourceManager: {
      maxTextureMemory: 200 * 1024 * 1024, // 200MB
      maxBufferMemory: 50 * 1024 * 1024, // 50MB
      enableAutoCleanup: true,
      cleanupInterval: 30000 // 30秒
    }
  },

  /**
   * 开发配置 - 启用调试和热重载功能
   */
  development: {
    advancedShaders: {
      enableHotReload: true,
      precompileCommonVariants: false,
      enableAsyncCompilation: false,
      cacheMemoryLimit: 50 * 1024 * 1024 // 50MB
    },
    optimizer: {
      enableStateTracking: true,
      enableBatchOptimization: false, // 便于调试
      enableShaderWarmup: false,
      enableBufferPooling: false
    },
    resourceManager: {
      maxTextureMemory: 100 * 1024 * 1024, // 100MB
      maxBufferMemory: 25 * 1024 * 1024, // 25MB
      enableAutoCleanup: false, // 便于调试
      cleanupInterval: 60000
    }
  },

  /**
   * 平衡配置 - 性能与功能的平衡
   */
  balanced: {
    advancedShaders: {
      enableHotReload: false,
      precompileCommonVariants: true,
      enableAsyncCompilation: true,
      cacheMemoryLimit: 75 * 1024 * 1024 // 75MB
    },
    optimizer: {
      enableStateTracking: true,
      enableBatchOptimization: true,
      enableShaderWarmup: true,
      enableBufferPooling: true
    },
    resourceManager: {
      maxTextureMemory: 150 * 1024 * 1024, // 150MB
      maxBufferMemory: 40 * 1024 * 1024, // 40MB
      enableAutoCleanup: true,
      cleanupInterval: 45000 // 45秒
    }
  }
};

// 重新导出主要类
export { AdvancedShaderManager } from './AdvancedShaderManager';
export { WebGLOptimizer, createGlobalWebGLOptimizer, getGlobalWebGLOptimizer } from './WebGLOptimizer';
export { WebGLResourceManager } from './WebGLResourceManager';