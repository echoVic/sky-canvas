/**
 * Sky Canvas 渲染引擎主入口测试
 * 测试主入口文件的模块导出功能
 */

import { describe, expect, it } from 'vitest';

// 导入主入口模块
import * as RenderEngineModule from '../index';

// 导入各个子模块用于对比
import { PerformanceBenchmark } from '../performance/benchmark';
import { RenderEngine } from '../core/RenderEngine';
import { AdvancedShaderManager, BufferManager, SHADER_LIBRARY, WebGLShaderManager as ShaderManager, WebGLOptimizer } from '../core/webgl';
import { DebugRenderer } from '../performance/debug';
import * as MathUtils from '../math';
import { PerformanceMonitor } from '../performance/monitoring';

describe('Sky Canvas 渲染引擎主入口', () => {
  describe('核心引擎导出', () => {
    it('应该正确导出 RenderEngine', () => {
      // Arrange & Act & Assert
      expect(RenderEngineModule.RenderEngine).toBeDefined();
      expect(RenderEngineModule.RenderEngine).toBe(RenderEngine);
      expect(typeof RenderEngineModule.RenderEngine).toBe('function');
    });
  });

  describe('数学库导出', () => {
    it('应该正确导出 MathUtils 命名空间', () => {
      // Arrange & Act & Assert
      expect(RenderEngineModule.MathUtils).toBeDefined();
      expect(typeof RenderEngineModule.MathUtils).toBe('object');
      
      // 验证 MathUtils 包含预期的数学工具
      const mathUtilsKeys = Object.keys(RenderEngineModule.MathUtils);
      expect(mathUtilsKeys.length).toBeGreaterThan(0);
    });

    it('MathUtils 应该与原模块一致', () => {
      // Arrange
      const originalKeys = Object.keys(MathUtils);
      const exportedKeys = Object.keys(RenderEngineModule.MathUtils);

      // Act & Assert
      expect(exportedKeys).toEqual(originalKeys);
      originalKeys.forEach(key => {
        expect((RenderEngineModule.MathUtils as any)[key]).toBe((MathUtils as any)[key]);
      });
    });
  });

  describe('WebGL 系统导出', () => {
    it('应该正确导出 WebGL 核心组件', () => {
      // Arrange
      const expectedWebGLExports = [
        'ShaderManager',
        'BufferManager', 
        'SHADER_LIBRARY',
        'AdvancedShaderManager',
        'WebGLOptimizer'
      ];

      // Act & Assert
      expectedWebGLExports.forEach(exportName => {
        expect((RenderEngineModule as any)[exportName]).toBeDefined();
      });

      // 验证具体导出
      expect(RenderEngineModule.ShaderManager).toBe(ShaderManager);
      expect(RenderEngineModule.BufferManager).toBe(BufferManager);
      expect(RenderEngineModule.SHADER_LIBRARY).toBe(SHADER_LIBRARY);
      expect(RenderEngineModule.AdvancedShaderManager).toBe(AdvancedShaderManager);
      expect(RenderEngineModule.WebGLOptimizer).toBe(WebGLOptimizer);
    });
  });

  describe('批处理系统导出', () => {
    it('应该正确导出批处理组件', () => {
      // Arrange
      const expectedBatchExports = [
        'BatchManager',
        'BatchBuffer',
        'BatchOptimizer',
        'BasicStrategy',
        'EnhancedStrategy',
        'InstancedStrategy',
        'OptimizationType'
      ];

      // Act & Assert
      expectedBatchExports.forEach(exportName => {
        expect((RenderEngineModule as any)[exportName]).toBeDefined();
      });
    });
  });

  describe('功能模块导出', () => {
    it('应该正确导出调试和性能模块', () => {
      // Arrange & Act & Assert
      expect(RenderEngineModule.DebugRenderer).toBeDefined();
      expect(RenderEngineModule.DebugRenderer).toBe(DebugRenderer);
      
      expect(RenderEngineModule.PerformanceMonitor).toBeDefined();
      expect(RenderEngineModule.PerformanceMonitor).toBe(PerformanceMonitor);
      
      expect(RenderEngineModule.PerformanceBenchmark).toBeDefined();
      expect(RenderEngineModule.PerformanceBenchmark).toBe(PerformanceBenchmark);
    });
  });

  describe('模块完整性检查', () => {
    it('应该包含所有主要模块的导出', () => {
      // Arrange
      const moduleExports = Object.keys(RenderEngineModule);
      
      // 核心导出检查
      const expectedCoreExports = [
        'RenderEngine',
        'MathUtils',
        'ShaderManager',
        'BufferManager',
        'SHADER_LIBRARY',
        'AdvancedShaderManager',
        'WebGLOptimizer',
        'DebugRenderer',
        'PerformanceMonitor',
        'PerformanceBenchmark'
      ];

      // Act & Assert
      expectedCoreExports.forEach(exportName => {
        expect(moduleExports).toContain(exportName);
      });
    });

    it('导出的模块数量应该合理', () => {
      // Arrange
      const moduleExports = Object.keys(RenderEngineModule);
      
      // Act & Assert
      // 应该有足够多的导出（至少包含核心模块）
      expect(moduleExports.length).toBeGreaterThan(10);
      
      // 但不应该过多（避免意外导出）
      expect(moduleExports.length).toBeLessThan(200);
    });
  });

  describe('类型导出检查', () => {
    it('应该正确导出图形接口类型', () => {
      // 注意：TypeScript 类型在运行时不存在，这里主要测试模块结构
      // 实际的类型检查由 TypeScript 编译器完成
      
      // Arrange & Act
      const moduleKeys = Object.keys(RenderEngineModule);
      
      // Assert
      // 验证模块导出结构合理
      expect(moduleKeys).toContain('RenderEngine');
      expect(moduleKeys).toContain('MathUtils');
    });
  });

  describe('导出一致性检查', () => {
    it('重新导出的模块应该与原模块保持一致', () => {
      // 这个测试确保重新导出没有破坏原有的模块结构
      
      // Arrange & Act & Assert
      // 检查 RenderEngine
      expect(RenderEngineModule.RenderEngine).toBe(RenderEngine);
      
      // 检查 WebGL 组件
      expect(RenderEngineModule.ShaderManager).toBe(ShaderManager);
      expect(RenderEngineModule.BufferManager).toBe(BufferManager);
      expect(RenderEngineModule.SHADER_LIBRARY).toBe(SHADER_LIBRARY);
      
      // 检查调试组件
      expect(RenderEngineModule.DebugRenderer).toBe(DebugRenderer);
      expect(RenderEngineModule.PerformanceMonitor).toBe(PerformanceMonitor);
    });
  });
});