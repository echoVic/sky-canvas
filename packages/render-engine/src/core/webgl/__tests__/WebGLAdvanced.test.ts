/**
 * WebGLAdvanced 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedShaderManager } from '../AdvancedShaderManager';
import type { IBufferManager } from '../BufferManager';
import type { IShaderManager } from '../ShaderManager';
import {
  createWebGLAdvancedManager,
  WebGLAdvancedManager,
  WebGLAdvancedPresets
} from '../WebGLAdvanced';
import { WebGLOptimizer } from '../WebGLOptimizer';
import { WebGLResourceManager } from '../WebGLResourceManager';

// Mock dependencies
vi.mock('../AdvancedShaderManager');
vi.mock('../WebGLOptimizer');
vi.mock('../WebGLResourceManager');

describe('WebGLAdvanced', () => {
  let mockGl: WebGLRenderingContext;
  let mockShaderManager: IShaderManager;
  let mockBufferManager: IBufferManager;
  let manager: WebGLAdvancedManager;

  beforeEach(() => {
    // Arrange: 创建模拟对象
    mockGl = {
      canvas: document.createElement('canvas'),
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      createProgram: vi.fn(),
      createBuffer: vi.fn(),
      createTexture: vi.fn(),
      createFramebuffer: vi.fn(),
      createRenderbuffer: vi.fn()
    } as unknown as WebGLRenderingContext;

    mockShaderManager = {
      createShader: vi.fn(),
      getShader: vi.fn(),
      deleteShader: vi.fn(),
      useShader: vi.fn()
    } as unknown as IShaderManager;

    mockBufferManager = {
      createBuffer: vi.fn(),
      getBuffer: vi.fn(),
      deleteBuffer: vi.fn(),
      bindBuffer: vi.fn()
    } as unknown as IBufferManager;

    manager = new WebGLAdvancedManager(mockGl, mockShaderManager, mockBufferManager);

    // 清除模拟调用记录
    vi.clearAllMocks();
  });

  describe('WebGLAdvancedManager', () => {
    describe('Given a WebGLAdvancedManager instance', () => {
      describe('When enabling advanced shaders', () => {
        it('Then should create and return AdvancedShaderManager', () => {
          // Arrange: 准备配置
          const config = {
            enableHotReload: true,
            precompileCommonVariants: false,
            enableAsyncCompilation: true,
            cacheMemoryLimit: 50 * 1024 * 1024
          };

          // Act: 启用高级着色器
          const result = manager.enableAdvancedShaders(config);

          // Assert: 验证返回结果
          expect(result).toBeInstanceOf(AdvancedShaderManager);
          expect(AdvancedShaderManager).toHaveBeenCalledWith(mockGl, config);
        });

        it('Then should return same instance on multiple calls', () => {
          // Act: 多次启用高级着色器
          const result1 = manager.enableAdvancedShaders();
          const result2 = manager.enableAdvancedShaders();

          // Assert: 验证返回相同实例
          expect(result1).toBe(result2);
          expect(AdvancedShaderManager).toHaveBeenCalledTimes(1);
        });

        it('Then should handle undefined config', () => {
          // Act: 不传配置启用高级着色器
          const result = manager.enableAdvancedShaders();

          // Assert: 验证正常创建
          expect(result).toBeInstanceOf(AdvancedShaderManager);
          expect(AdvancedShaderManager).toHaveBeenCalledWith(mockGl, undefined);
        });
      });

      describe('When enabling optimizer', () => {
        it('Then should create and return WebGLOptimizer', () => {
          // Arrange: 准备配置
          const config = {
            enableStateTracking: true,
            enableBatchOptimization: true,
            enableShaderWarmup: false,
            enableBufferPooling: true
          };

          // Act: 启用优化器
          const result = manager.enableOptimizer(mockShaderManager, mockBufferManager, config);

          // Assert: 验证返回结果
          expect(result).toBeInstanceOf(WebGLOptimizer);
          expect(WebGLOptimizer).toHaveBeenCalledWith(mockGl, mockBufferManager, config);
        });

        it('Then should return same instance on multiple calls', () => {
          // Act: 多次启用优化器
          const result1 = manager.enableOptimizer(mockShaderManager, mockBufferManager);
          const result2 = manager.enableOptimizer(mockShaderManager, mockBufferManager);

          // Assert: 验证返回相同实例
          expect(result1).toBe(result2);
          expect(WebGLOptimizer).toHaveBeenCalledTimes(1);
        });
      });

      describe('When enabling resource manager', () => {
        it('Then should create and return WebGLResourceManager', () => {
          // Arrange: 准备配置
          const config = {
            maxTextureMemory: 100 * 1024 * 1024,
            maxBufferMemory: 50 * 1024 * 1024,
            enableAutoCleanup: true
          };

          // Act: 启用资源管理器
          const result = manager.enableResourceManager(config);

          // Assert: 验证返回结果
          expect(result).toBeInstanceOf(WebGLResourceManager);
          expect(WebGLResourceManager).toHaveBeenCalledWith(mockGl, config);
        });

        it('Then should return same instance on multiple calls', () => {
          // Act: 多次启用资源管理器
          const result1 = manager.enableResourceManager();
          const result2 = manager.enableResourceManager();

          // Assert: 验证返回相同实例
          expect(result1).toBe(result2);
          expect(WebGLResourceManager).toHaveBeenCalledTimes(1);
        });
      });

      describe('When getting managers', () => {
        it('Then should return undefined for uninitialized advanced shader manager', () => {
          // Act: 获取未初始化的高级着色器管理器
          const result = manager.getAdvancedShaderManager();

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return initialized advanced shader manager', () => {
          // Arrange: 启用高级着色器
          const advancedShaderManager = manager.enableAdvancedShaders();

          // Act: 获取高级着色器管理器
          const result = manager.getAdvancedShaderManager();

          // Assert: 验证返回正确实例
          expect(result).toBe(advancedShaderManager);
        });

        it('Then should return undefined for uninitialized optimizer', () => {
          // Act: 获取未初始化的优化器
          const result = manager.getOptimizer();

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return initialized optimizer', () => {
          // Arrange: 启用优化器
          const optimizer = manager.enableOptimizer(mockShaderManager, mockBufferManager);

          // Act: 获取优化器
          const result = manager.getOptimizer();

          // Assert: 验证返回正确实例
          expect(result).toBe(optimizer);
        });

        it('Then should return undefined for uninitialized resource manager', () => {
          // Act: 获取未初始化的资源管理器
          const result = manager.getResourceManager();

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return initialized resource manager', () => {
          // Arrange: 启用资源管理器
          const resourceManager = manager.enableResourceManager();

          // Act: 获取资源管理器
          const result = manager.getResourceManager();

          // Assert: 验证返回正确实例
          expect(result).toBe(resourceManager);
        });
      });

      describe('When getting performance stats', () => {
        it('Then should return stats from all enabled managers', () => {
          // Arrange: 启用所有管理器并模拟统计数据
          const mockAdvancedShaderStats = { 
            totalPrograms: 5, 
            memoryUsage: 1024, 
            memoryLimit: 8192, 
            hitRate: 0.8 
          };
          const mockOptimizerStats = {
            optimization: {
              frameCount: 100,
              stateChanges: {
                shaderSwitches: 5,
                textureBinds: 10,
                bufferBinds: 8,
                vaoBinds: 3
              },
              drawCalls: {
                total: 50,
                batched: 40,
                instanced: 10
              },
              memory: {
                buffers: 1024,
                textures: 2048,
                shaders: 512
              }
            },
            shaderCache: { cached: 10, compiling: 0, warmedUp: 5 },
            bufferPool: { totalBuffers: 20, inUseBuffers: 5, availableBuffers: 15, totalMemory: 2048 },
            batchOptimizer: { totalBatches: 3, totalDrawCalls: 1000 }
          };
          const mockResourceStats = {
      textures: 10,
      framebuffers: 0,
      totalMemory: 1536,
      memoryUtilization: 0.75
    };

          const advancedShaderManager = manager.enableAdvancedShaders();
          const optimizer = manager.enableOptimizer(mockShaderManager, mockBufferManager);
          const resourceManager = manager.enableResourceManager();

          // 模拟统计方法
          vi.mocked(advancedShaderManager.getCacheStats).mockReturnValue(mockAdvancedShaderStats);
          vi.mocked(optimizer.getDetailedStats).mockReturnValue(mockOptimizerStats);
          vi.mocked(resourceManager.getResourceStats).mockReturnValue(mockResourceStats);

          // Act: 获取性能统计
          const result = manager.getPerformanceStats();

          // Assert: 验证统计数据
          expect(result).toEqual({
            advancedShaders: mockAdvancedShaderStats,
            optimizer: mockOptimizerStats,
            resourceManager: {}
          });
        });

        it('Then should handle undefined managers gracefully', () => {
          // Act: 获取未启用管理器的性能统计
          const result = manager.getPerformanceStats();

          // Assert: 验证返回undefined值
          expect(result).toEqual({
            advancedShaders: undefined,
            optimizer: undefined,
            resourceManager: undefined
          });
        });
      });

      describe('When disposing', () => {
        it('Then should dispose all enabled managers', () => {
          // Arrange: 启用所有管理器
          const advancedShaderManager = manager.enableAdvancedShaders();
          const optimizer = manager.enableOptimizer(mockShaderManager, mockBufferManager);
          const resourceManager = manager.enableResourceManager();

          // Act: 销毁管理器
          manager.dispose();

          // Assert: 验证所有管理器都被销毁
          expect(advancedShaderManager.dispose).toHaveBeenCalled();
          expect(optimizer.dispose).toHaveBeenCalled();
          expect(resourceManager.dispose).toHaveBeenCalled();
        });

        it('Then should handle undefined managers gracefully', () => {
          // Act & Assert: 销毁未启用的管理器不应抛出错误
          expect(() => manager.dispose()).not.toThrow();
        });
      });
    });
  });

  describe('createWebGLAdvancedManager', () => {
    describe('When creating WebGLAdvancedManager', () => {
      it('Then should return new instance with correct parameters', () => {
        // Act: 创建WebGL高级管理器
        const result = createWebGLAdvancedManager(mockGl, mockShaderManager, mockBufferManager);

        // Assert: 验证返回正确实例
        expect(result).toBeInstanceOf(WebGLAdvancedManager);
      });
    });
  });

  describe('WebGLAdvancedPresets', () => {
    describe('Given preset configurations', () => {
      it('Then should have highPerformance preset with correct values', () => {
        // Arrange & Act: 获取高性能预设
        const preset = WebGLAdvancedPresets.highPerformance;

        // Assert: 验证高性能预设配置
        expect(preset).toBeDefined();
        expect(preset.advancedShaders.enableHotReload).toBe(false);
        expect(preset.advancedShaders.precompileCommonVariants).toBe(true);
        expect(preset.advancedShaders.enableAsyncCompilation).toBe(true);
        expect(preset.advancedShaders.cacheMemoryLimit).toBe(100 * 1024 * 1024);
        expect(preset.optimizer.enableStateTracking).toBe(true);
        expect(preset.optimizer.enableBatchOptimization).toBe(true);
        expect(preset.optimizer.enableShaderWarmup).toBe(true);
        expect(preset.optimizer.enableBufferPooling).toBe(true);
      });

      it('Then should have development preset with correct values', () => {
        // Arrange & Act: 获取开发预设
        const preset = WebGLAdvancedPresets.development;

        // Assert: 验证开发预设配置
        expect(preset).toBeDefined();
        expect(preset.advancedShaders.enableHotReload).toBe(true);
        expect(preset.advancedShaders.precompileCommonVariants).toBe(false);
        expect(preset.advancedShaders.enableAsyncCompilation).toBe(false);
        expect(preset.optimizer.enableBatchOptimization).toBe(false);
        expect(preset.optimizer.enableShaderWarmup).toBe(false);
        expect(preset.optimizer.enableBufferPooling).toBe(false);
        expect(preset.resourceManager.enableAutoCleanup).toBe(false);
      });

      it('Then should have balanced preset with correct values', () => {
        // Arrange & Act: 获取平衡预设
        const preset = WebGLAdvancedPresets.balanced;

        // Assert: 验证平衡预设配置
        expect(preset).toBeDefined();
        expect(preset.advancedShaders.enableHotReload).toBe(false);
        expect(preset.advancedShaders.precompileCommonVariants).toBe(true);
        expect(preset.advancedShaders.enableAsyncCompilation).toBe(true);
        expect(preset.advancedShaders.cacheMemoryLimit).toBe(75 * 1024 * 1024);
        expect(preset.optimizer.enableStateTracking).toBe(true);
        expect(preset.optimizer.enableBatchOptimization).toBe(true);
        expect(preset.optimizer.enableShaderWarmup).toBe(true);
        expect(preset.optimizer.enableBufferPooling).toBe(true);
        expect(preset.resourceManager.enableAutoCleanup).toBe(true);
      });

      it('Then should have all required preset properties', () => {
        // Arrange: 获取所有预设
        const presets = [WebGLAdvancedPresets.highPerformance, WebGLAdvancedPresets.development, WebGLAdvancedPresets.balanced];

        // Act & Assert: 验证每个预设的结构
        presets.forEach(preset => {
          expect(preset.advancedShaders).toBeDefined();
          expect(preset.optimizer).toBeDefined();
          expect(preset.resourceManager).toBeDefined();

          // 验证advancedShaders配置
          expect(typeof preset.advancedShaders.enableHotReload).toBe('boolean');
          expect(typeof preset.advancedShaders.precompileCommonVariants).toBe('boolean');
          expect(typeof preset.advancedShaders.enableAsyncCompilation).toBe('boolean');
          expect(typeof preset.advancedShaders.cacheMemoryLimit).toBe('number');

          // 验证optimizer配置
          expect(typeof preset.optimizer.enableStateTracking).toBe('boolean');
          expect(typeof preset.optimizer.enableBatchOptimization).toBe('boolean');
          expect(typeof preset.optimizer.enableShaderWarmup).toBe('boolean');
          expect(typeof preset.optimizer.enableBufferPooling).toBe('boolean');

          // 验证resourceManager配置
          expect(typeof preset.resourceManager.maxTextureMemory).toBe('number');
          expect(typeof preset.resourceManager.maxBufferMemory).toBe('number');
          expect(typeof preset.resourceManager.enableAutoCleanup).toBe('boolean');
          expect(typeof preset.resourceManager.cleanupInterval).toBe('number');
        });
      });
    });
  });
});