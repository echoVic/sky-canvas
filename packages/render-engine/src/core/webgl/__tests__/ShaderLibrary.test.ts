/**
 * ShaderLibrary 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { describe, expect, it } from 'vitest';
import {
  BASIC_SHAPE_SHADER,
  TEXTURE_SHADER,
  SOLID_COLOR_SHADER,
  SDF_CIRCLE_SHADER,
  SDF_RECT_SHADER,
  BATCH_SHADER,
  POST_PROCESS_SHADER,
  SHADER_LIBRARY,
  getShaderSource,
  getAllShaderNames
} from '../ShaderLibrary';
import type { ExtendedShaderSource } from '../types';

describe('ShaderLibrary', () => {
  describe('Shader Constants', () => {
    describe('Given BASIC_SHAPE_SHADER', () => {
      it('Then should have correct structure and properties', () => {
        // Arrange & Act: 检查基础形状着色器
        const shader = BASIC_SHAPE_SHADER;

        // Assert: 验证着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('basic_shape');
        expect(shader.version).toBe('1.0.0');
        expect(shader.vertex).toContain('attribute vec2 a_position');
        expect(shader.vertex).toContain('attribute vec4 a_color');
        expect(shader.vertex).toContain('uniform mat3 u_transform');
        expect(shader.vertex).toContain('uniform mat3 u_projection');
        expect(shader.fragment).toContain('varying vec4 v_color');
        expect(shader.fragment).toContain('gl_FragColor = v_color');
      });
    });

    describe('Given TEXTURE_SHADER', () => {
      it('Then should have correct structure for texture rendering', () => {
        // Arrange & Act: 检查纹理着色器
        const shader = TEXTURE_SHADER;

        // Assert: 验证纹理着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('texture');
        expect(shader.version).toBe('1.0.0');
        expect(shader.vertex).toContain('attribute vec2 a_texCoord');
        expect(shader.fragment).toContain('uniform sampler2D u_texture');
        expect(shader.fragment).toContain('texture2D(u_texture, v_texCoord)');
      });
    });

    describe('Given SOLID_COLOR_SHADER', () => {
      it('Then should have correct structure for solid color rendering', () => {
        // Arrange & Act: 检查单色着色器
        const shader = SOLID_COLOR_SHADER;

        // Assert: 验证单色着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('solid_color');
        expect(shader.version).toBe('1.0.0');
        expect(shader.fragment).toContain('uniform vec4 u_color');
        expect(shader.fragment).toContain('gl_FragColor = u_color');
      });
    });

    describe('Given SDF_CIRCLE_SHADER', () => {
      it('Then should have correct structure for SDF circle rendering', () => {
        // Arrange & Act: 检查SDF圆形着色器
        const shader = SDF_CIRCLE_SHADER;

        // Assert: 验证SDF圆形着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('sdf_circle');
        expect(shader.version).toBe('1.0.0');
        expect(shader.vertex).toContain('attribute vec2 a_center');
        expect(shader.vertex).toContain('attribute float a_radius');
        expect(shader.vertex).toContain('attribute float a_strokeWidth');
        expect(shader.fragment).toContain('distance(v_position, v_center)');
        expect(shader.fragment).toContain('smoothstep');
      });
    });

    describe('Given SDF_RECT_SHADER', () => {
      it('Then should have correct structure for SDF rectangle rendering', () => {
        // Arrange & Act: 检查SDF矩形着色器
        const shader = SDF_RECT_SHADER;

        // Assert: 验证SDF矩形着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('sdf_rect');
        expect(shader.version).toBe('1.0.0');
        expect(shader.vertex).toContain('attribute vec2 a_size');
        expect(shader.vertex).toContain('attribute float a_cornerRadius');
        expect(shader.fragment).toContain('roundedBoxSDF');
      });
    });

    describe('Given BATCH_SHADER', () => {
      it('Then should have correct structure for batch rendering', () => {
        // Arrange & Act: 检查批处理着色器
        const shader = BATCH_SHADER;

        // Assert: 验证批处理着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('batch');
        expect(shader.version).toBe('1.0.0');
        expect(shader.vertex).toContain('attribute float a_textureId');
        expect(shader.fragment).toContain('uniform sampler2D u_textures[16]');
        expect(shader.fragment).toContain('getTextureColor()');
      });
    });

    describe('Given POST_PROCESS_SHADER', () => {
      it('Then should have correct structure for post-processing', () => {
        // Arrange & Act: 检查后处理着色器
        const shader = POST_PROCESS_SHADER;

        // Assert: 验证后处理着色器结构
        expect(shader).toBeDefined();
        expect(shader.name).toBe('post_process');
        expect(shader.version).toBe('1.0.0');
        expect(shader.fragment).toContain('uniform float u_brightness');
        expect(shader.fragment).toContain('uniform float u_contrast');
        expect(shader.fragment).toContain('uniform float u_saturation');
        expect(shader.fragment).toContain('rgb2hsv');
        expect(shader.fragment).toContain('hsv2rgb');
      });
    });
  });

  describe('SHADER_LIBRARY', () => {
    describe('Given the shader library object', () => {
      it('Then should contain all expected shaders', () => {
        // Arrange & Act: 检查着色器库
        const library = SHADER_LIBRARY;

        // Assert: 验证着色器库包含所有着色器
        expect(library).toBeDefined();
        expect(library.BASIC_SHAPE).toBe(BASIC_SHAPE_SHADER);
        expect(library.TEXTURE).toBe(TEXTURE_SHADER);
        expect(library.SOLID_COLOR).toBe(SOLID_COLOR_SHADER);
        expect(library.SDF_CIRCLE).toBe(SDF_CIRCLE_SHADER);
        expect(library.SDF_RECT).toBe(SDF_RECT_SHADER);
        expect(library.BATCH).toBe(BATCH_SHADER);
        expect(library.POST_PROCESS).toBe(POST_PROCESS_SHADER);
      });

      it('Then should have correct number of shaders', () => {
        // Arrange & Act: 计算着色器数量
        const shaderCount = Object.keys(SHADER_LIBRARY).length;

        // Assert: 验证着色器数量
        expect(shaderCount).toBe(7);
      });
    });
  });

  describe('getShaderSource', () => {
    describe('Given valid shader names', () => {
      it('Then should return correct shader for BASIC_SHAPE', () => {
        // Arrange: 准备着色器名称
        const shaderName = 'BASIC_SHAPE' as keyof typeof SHADER_LIBRARY;

        // Act: 获取着色器源码
        const result = getShaderSource(shaderName);

        // Assert: 验证返回结果
        expect(result).toBe(BASIC_SHAPE_SHADER);
        expect(result?.name).toBe('basic_shape');
      });

      it('Then should return correct shader for TEXTURE', () => {
        // Arrange: 准备着色器名称
        const shaderName = 'TEXTURE' as keyof typeof SHADER_LIBRARY;

        // Act: 获取着色器源码
        const result = getShaderSource(shaderName);

        // Assert: 验证返回结果
        expect(result).toBe(TEXTURE_SHADER);
        expect(result?.name).toBe('texture');
      });

      it('Then should return correct shader for all library entries', () => {
        // Arrange: 准备所有着色器名称
        const shaderNames = Object.keys(SHADER_LIBRARY) as Array<keyof typeof SHADER_LIBRARY>;

        // Act & Assert: 测试所有着色器
        shaderNames.forEach(name => {
          const result = getShaderSource(name);
          expect(result).toBeDefined();
          expect(result).toBe(SHADER_LIBRARY[name]);
        });
      });
    });
  });

  describe('getAllShaderNames', () => {
    describe('When getting all shader names', () => {
      it('Then should return array of all shader names', () => {
        // Act: 获取所有着色器名称
        const names = getAllShaderNames();

        // Assert: 验证返回的名称数组
        expect(names).toBeInstanceOf(Array);
        expect(names).toHaveLength(7);
        expect(names).toContain('basic_shape');
        expect(names).toContain('texture');
        expect(names).toContain('solid_color');
        expect(names).toContain('sdf_circle');
        expect(names).toContain('sdf_rect');
        expect(names).toContain('batch');
        expect(names).toContain('post_process');
      });

      it('Then should return names in consistent order', () => {
        // Act: 多次获取着色器名称
        const names1 = getAllShaderNames();
        const names2 = getAllShaderNames();

        // Assert: 验证顺序一致性
        expect(names1).toEqual(names2);
      });
    });
  });

  describe('Shader Validation', () => {
    describe('Given all shaders in the library', () => {
      it('Then should have valid IShaderSource structure', () => {
        // Arrange: 获取所有着色器
        const shaders = Object.values(SHADER_LIBRARY);

        // Act & Assert: 验证每个着色器的结构
        shaders.forEach((shader: ExtendedShaderSource) => {
          expect(shader).toBeDefined();
          expect(typeof shader.name).toBe('string');
          expect(shader.name.length).toBeGreaterThan(0);
          expect(typeof shader.version).toBe('string');
          expect(shader.version?.length).toBeGreaterThan(0);
          expect(typeof shader.vertex).toBe('string');
          expect(shader.vertex.length).toBeGreaterThan(0);
          expect(typeof shader.fragment).toBe('string');
          expect(shader.fragment.length).toBeGreaterThan(0);
        });
      });

      it('Then should have unique names', () => {
        // Arrange: 获取所有着色器名称
        const shaders = Object.values(SHADER_LIBRARY);
        const names = shaders.map(shader => shader.name);

        // Act: 创建去重后的名称集合
        const uniqueNames = new Set(names);

        // Assert: 验证名称唯一性
        expect(uniqueNames.size).toBe(names.length);
      });

      it('Then should have valid GLSL syntax patterns', () => {
        // Arrange: 获取所有着色器
        const shaders = Object.values(SHADER_LIBRARY);

        // Act & Assert: 验证GLSL语法模式
        shaders.forEach((shader: ExtendedShaderSource) => {
          // 顶点着色器应该有main函数和gl_Position赋值
          expect(shader.vertex).toContain('void main()');
          expect(shader.vertex).toContain('gl_Position');

          // 片段着色器应该有main函数和gl_FragColor赋值
          expect(shader.fragment).toContain('void main()');
          expect(shader.fragment).toContain('gl_FragColor');
        });
      });
    });
  });
});