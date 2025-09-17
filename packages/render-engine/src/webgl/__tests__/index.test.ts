/**
 * WebGL 模块导出测试
 */

import {
  BufferManager,
  SHADER_LIBRARY,
  ShaderManager,
  AdvancedShaderManager,
  WebGLOptimizer,
  WebGLResourceManager,
  WebGLAdvancedManager
} from '../index';

describe('WebGL Module Exports', () => {
  describe('基础模块导出', () => {
    it('应该正确导出 BufferManager', () => {
      // Arrange & Act & Assert
      expect(BufferManager).toBeDefined();
      expect(typeof BufferManager).toBe('function');
    });

    it('应该正确导出 SHADER_LIBRARY', () => {
      // Arrange & Act & Assert
      expect(SHADER_LIBRARY).toBeDefined();
      expect(typeof SHADER_LIBRARY).toBe('object');
    });

    it('应该正确导出 ShaderManager', () => {
      // Arrange & Act & Assert
      expect(ShaderManager).toBeDefined();
      expect(typeof ShaderManager).toBe('function');
    });
  });

  describe('高级功能模块导出', () => {
    it('应该正确导出 AdvancedShaderManager', () => {
      // Arrange & Act & Assert
      expect(AdvancedShaderManager).toBeDefined();
      expect(typeof AdvancedShaderManager).toBe('function');
    });

    it('应该正确导出 WebGLOptimizer', () => {
      // Arrange & Act & Assert
      expect(WebGLOptimizer).toBeDefined();
      expect(typeof WebGLOptimizer).toBe('function');
    });

    it('应该正确导出 WebGLResourceManager', () => {
      // Arrange & Act & Assert
      expect(WebGLResourceManager).toBeDefined();
      expect(typeof WebGLResourceManager).toBe('function');
    });
  });

  describe('WebGL 高级功能统一接口导出', () => {
    it('应该正确导出 WebGLAdvancedManager', () => {
      // Arrange & Act & Assert
      expect(WebGLAdvancedManager).toBeDefined();
      expect(typeof WebGLAdvancedManager).toBe('function');
    });
  });

  describe('模块完整性检查', () => {
    it('应该导出所有预期的模块', async () => {
      // Arrange
      const expectedExports = [
        'BufferManager',
        'SHADER_LIBRARY',
        'ShaderManager',
        'AdvancedShaderManager',
        'WebGLOptimizer',
        'WebGLResourceManager',
        'WebGLAdvancedManager'
      ];

      // Act
      const moduleExports = await import('../index');
      const actualExports = Object.keys(moduleExports);

      // Assert
      expectedExports.forEach(exportName => {
        expect(actualExports).toContain(exportName);
      });
    });

    it('应该不包含意外的导出', async () => {
      // Arrange
      const expectedExports = [
        'BufferManager',
        'SHADER_LIBRARY',
        'ShaderManager',
        'AdvancedShaderManager',
        'WebGLOptimizer',
        'WebGLResourceManager',
        'WebGLAdvancedManager'
      ];

      // Act
      const moduleExports = await import('../index');
      const actualExports = Object.keys(moduleExports);

      // Assert
      expect(actualExports).toHaveLength(expectedExports.length);
      actualExports.forEach(exportName => {
        expect(expectedExports).toContain(exportName);
      });
    });
  });

  describe('导出类型检查', () => {
    it('基础模块应该是构造函数或对象', () => {
      // Arrange & Act & Assert
      expect(typeof BufferManager).toBe('function');
      expect(typeof SHADER_LIBRARY).toBe('object');
      expect(typeof ShaderManager).toBe('function');
    });

    it('高级功能模块应该是构造函数', () => {
      // Arrange & Act & Assert
      expect(typeof AdvancedShaderManager).toBe('function');
      expect(typeof WebGLOptimizer).toBe('function');
      expect(typeof WebGLResourceManager).toBe('function');
      expect(typeof WebGLAdvancedManager).toBe('function');
    });
  });
});