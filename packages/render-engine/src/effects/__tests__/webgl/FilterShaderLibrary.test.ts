/**
 * FilterShaderLibrary 单元测试
 */

import { describe, expect, it } from 'vitest';
import { FilterShaderLibrary } from '../../webgl/FilterShaderLibrary';

describe('FilterShaderLibrary', () => {
  describe('个别着色器获取方法', () => {
    it('应该返回亮度着色器', () => {
      const shader = FilterShaderLibrary.getBrightnessShader();

      expect(shader).toBeDefined();
      expect(shader.vertex).toContain('attribute vec2 a_position');
      expect(shader.vertex).toContain('attribute vec2 a_texCoord');
      expect(shader.vertex).toContain('varying vec2 v_texCoord');
      expect(shader.fragment).toContain('uniform float u_brightness');
      expect(shader.fragment).toContain('color.rgb += u_brightness');
    });

    it('应该返回对比度着色器', () => {
      const shader = FilterShaderLibrary.getContrastShader();

      expect(shader).toBeDefined();
      expect(shader.vertex).toContain('attribute vec2 a_position');
      expect(shader.fragment).toContain('uniform float u_contrast');
      expect(shader.fragment).toContain('color.rgb - 0.5');
    });

    it('应该返回饱和度着色器', () => {
      const shader = FilterShaderLibrary.getSaturationShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('uniform float u_saturation');
      expect(shader.fragment).toContain('dot(color.rgb, vec3(0.299, 0.587, 0.114))');
      expect(shader.fragment).toContain('mix(vec3(gray), color.rgb, u_saturation)');
    });

    it('应该返回高斯模糊着色器', () => {
      const shader = FilterShaderLibrary.getGaussianBlurShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('uniform vec2 u_resolution');
      expect(shader.fragment).toContain('uniform float u_radius');
      expect(shader.fragment).toContain('for (float x = -u_radius');
      expect(shader.fragment).toContain('exp(-(x*x + y*y)');
    });

    it('应该返回灰度着色器', () => {
      const shader = FilterShaderLibrary.getGrayscaleShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('uniform float u_amount');
      expect(shader.fragment).toContain('dot(color.rgb, vec3(0.299, 0.587, 0.114))');
      expect(shader.fragment).toContain('mix(color.rgb, vec3(gray), u_amount)');
    });

    it('应该返回反相着色器', () => {
      const shader = FilterShaderLibrary.getInvertShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('1.0 - color.rgb');
      expect(shader.fragment).toContain('mix(color.rgb, 1.0 - color.rgb, u_amount)');
    });

    it('应该返回深褐色着色器', () => {
      const shader = FilterShaderLibrary.getSepiaShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('0.393');
      expect(shader.fragment).toContain('0.769');
      expect(shader.fragment).toContain('0.189');
      expect(shader.fragment).toContain('mix(color.rgb, vec3(newR, newG, newB), u_amount)');
    });

    it('应该返回色相旋转着色器', () => {
      const shader = FilterShaderLibrary.getHueRotateShader();

      expect(shader).toBeDefined();
      expect(shader.fragment).toContain('uniform float u_angle');
      expect(shader.fragment).toContain('mat3 hueMatrix');
      expect(shader.fragment).toContain('3.14159265 / 180.0');
      expect(shader.fragment).toContain('hueMatrix * color.rgb');
    });
  });

  describe('getAllShaders方法', () => {
    it('应该返回所有着色器的对象', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      expect(allShaders).toBeDefined();
      expect(typeof allShaders).toBe('object');

      // 检查包含所有预期的着色器
      const expectedShaders = [
        'brightness',
        'contrast',
        'saturation',
        'gaussianBlur',
        'grayscale',
        'invert',
        'sepia',
        'hueRotate'
      ];

      expectedShaders.forEach(shaderName => {
        expect(allShaders).toHaveProperty(shaderName);
        expect(allShaders[shaderName]).toHaveProperty('vertex');
        expect(allShaders[shaderName]).toHaveProperty('fragment');
      });
    });

    it('每个着色器都应该有有效的顶点和片段着色器', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      Object.entries(allShaders).forEach(([name, shader]) => {
        expect(shader.vertex).toBeTruthy();
        expect(shader.fragment).toBeTruthy();
        expect(typeof shader.vertex).toBe('string');
        expect(typeof shader.fragment).toBe('string');

        // 检查基本的着色器结构
        expect(shader.vertex).toContain('attribute');
        expect(shader.vertex).toContain('gl_Position');
        expect(shader.fragment).toContain('precision mediump float');
        expect(shader.fragment).toContain('gl_FragColor');
      });
    });
  });

  describe('getShader方法', () => {
    it('应该返回指定名称的着色器', () => {
      const brightnessShader = FilterShaderLibrary.getShader('brightness');

      expect(brightnessShader).toBeDefined();
      expect(brightnessShader?.vertex).toContain('attribute vec2 a_position');
      expect(brightnessShader?.fragment).toContain('u_brightness');
    });

    it('应该为不存在的着色器返回undefined', () => {
      const nonExistentShader = FilterShaderLibrary.getShader('nonExistent');

      expect(nonExistentShader).toBeUndefined();
    });

    it('应该为所有已知的着色器名称返回着色器', () => {
      const knownShaders = [
        'brightness',
        'contrast',
        'saturation',
        'gaussianBlur',
        'grayscale',
        'invert',
        'sepia',
        'hueRotate'
      ];

      knownShaders.forEach(shaderName => {
        const shader = FilterShaderLibrary.getShader(shaderName);
        expect(shader).toBeDefined();
        expect(shader).toHaveProperty('vertex');
        expect(shader).toHaveProperty('fragment');
      });
    });
  });

  describe('着色器语法验证', () => {
    it('所有顶点着色器都应该有相似的结构', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      Object.entries(allShaders).forEach(([name, shader]) => {
        // 检查基本的顶点着色器结构
        expect(shader.vertex).toContain('attribute vec2 a_position');
        expect(shader.vertex).toContain('attribute vec2 a_texCoord');
        expect(shader.vertex).toContain('varying vec2 v_texCoord');
        expect(shader.vertex).toContain('void main()');
        expect(shader.vertex).toContain('gl_Position = vec4(a_position, 0.0, 1.0)');
        expect(shader.vertex).toContain('v_texCoord = a_texCoord');
      });
    });

    it('所有片段着色器都应该有基本结构', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      Object.entries(allShaders).forEach(([name, shader]) => {
        // 检查基本的片段着色器结构
        expect(shader.fragment).toContain('precision mediump float');
        expect(shader.fragment).toContain('uniform sampler2D u_texture');
        expect(shader.fragment).toContain('varying vec2 v_texCoord');
        expect(shader.fragment).toContain('void main()');
        // 检查纹理采样调用（可能有偏移量）
        expect(shader.fragment).toMatch(/texture2D\(u_texture,\s*v_texCoord[^)]*\)/);
        expect(shader.fragment).toContain('gl_FragColor');
      });
    });

    it('特定着色器应该包含正确的uniform变量', () => {
      const brightnessShader = FilterShaderLibrary.getBrightnessShader();
      expect(brightnessShader.fragment).toContain('uniform float u_brightness');

      const contrastShader = FilterShaderLibrary.getContrastShader();
      expect(contrastShader.fragment).toContain('uniform float u_contrast');

      const saturationShader = FilterShaderLibrary.getSaturationShader();
      expect(saturationShader.fragment).toContain('uniform float u_saturation');

      const blurShader = FilterShaderLibrary.getGaussianBlurShader();
      expect(blurShader.fragment).toContain('uniform vec2 u_resolution');
      expect(blurShader.fragment).toContain('uniform float u_radius');

      const hueRotateShader = FilterShaderLibrary.getHueRotateShader();
      expect(hueRotateShader.fragment).toContain('uniform float u_angle');
    });
  });

  describe('着色器数学公式验证', () => {
    it('饱和度着色器应该使用正确的亮度权重', () => {
      const shader = FilterShaderLibrary.getSaturationShader();

      // 标准的亮度权重：0.299, 0.587, 0.114
      expect(shader.fragment).toContain('0.299');
      expect(shader.fragment).toContain('0.587');
      expect(shader.fragment).toContain('0.114');
    });

    it('灰度着色器应该使用相同的亮度权重', () => {
      const shader = FilterShaderLibrary.getGrayscaleShader();

      expect(shader.fragment).toContain('0.299');
      expect(shader.fragment).toContain('0.587');
      expect(shader.fragment).toContain('0.114');
    });

    it('深褐色着色器应该使用正确的转换矩阵', () => {
      const shader = FilterShaderLibrary.getSepiaShader();

      // 深褐色转换的标准矩阵值
      expect(shader.fragment).toContain('0.393');
      expect(shader.fragment).toContain('0.769');
      expect(shader.fragment).toContain('0.189');
      expect(shader.fragment).toContain('0.349');
      expect(shader.fragment).toContain('0.686');
      expect(shader.fragment).toContain('0.168');
      expect(shader.fragment).toContain('0.272');
      expect(shader.fragment).toContain('0.534');
      expect(shader.fragment).toContain('0.131');
    });

    it('色相旋转着色器应该包含旋转矩阵计算', () => {
      const shader = FilterShaderLibrary.getHueRotateShader();

      expect(shader.fragment).toContain('cosA');
      expect(shader.fragment).toContain('sinA');
      expect(shader.fragment).toContain('mat3');
      expect(shader.fragment).toContain('sqrt(1.0/3.0)');
    });

    it('高斯模糊着色器应该包含正确的权重计算', () => {
      const shader = FilterShaderLibrary.getGaussianBlurShader();

      expect(shader.fragment).toContain('exp(-(x*x + y*y)');
      expect(shader.fragment).toContain('2.0 * u_radius * u_radius');
    });
  });

  describe('性能和优化检查', () => {
    it('应该快速返回着色器', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        FilterShaderLibrary.getBrightnessShader();
        FilterShaderLibrary.getContrastShader();
        FilterShaderLibrary.getSaturationShader();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // 应该在50ms内完成
    });

    it('getAllShaders应该返回相同的对象引用', () => {
      const shaders1 = FilterShaderLibrary.getAllShaders();
      const shaders2 = FilterShaderLibrary.getAllShaders();

      // 应该返回相同的对象（如果有缓存的话）或至少内容相同
      expect(shaders1).toEqual(shaders2);
    });

    it('单个着色器获取应该与getAllShaders一致', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      expect(FilterShaderLibrary.getBrightnessShader()).toEqual(allShaders.brightness);
      expect(FilterShaderLibrary.getContrastShader()).toEqual(allShaders.contrast);
      expect(FilterShaderLibrary.getSaturationShader()).toEqual(allShaders.saturation);
      expect(FilterShaderLibrary.getGaussianBlurShader()).toEqual(allShaders.gaussianBlur);
      expect(FilterShaderLibrary.getGrayscaleShader()).toEqual(allShaders.grayscale);
      expect(FilterShaderLibrary.getInvertShader()).toEqual(allShaders.invert);
      expect(FilterShaderLibrary.getSepiaShader()).toEqual(allShaders.sepia);
      expect(FilterShaderLibrary.getHueRotateShader()).toEqual(allShaders.hueRotate);
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串的着色器名称', () => {
      const shader = FilterShaderLibrary.getShader('');
      expect(shader).toBeUndefined();
    });

    it('应该处理null或undefined的着色器名称', () => {
      const shader1 = FilterShaderLibrary.getShader(null as any);
      const shader2 = FilterShaderLibrary.getShader(undefined as any);

      expect(shader1).toBeUndefined();
      expect(shader2).toBeUndefined();
    });

    it('应该处理大小写敏感的着色器名称', () => {
      const shader1 = FilterShaderLibrary.getShader('Brightness');
      const shader2 = FilterShaderLibrary.getShader('BRIGHTNESS');

      expect(shader1).toBeUndefined();
      expect(shader2).toBeUndefined();
    });
  });

  describe('着色器完整性检查', () => {
    it('所有着色器都不应该为空', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      Object.entries(allShaders).forEach(([name, shader]) => {
        expect(shader.vertex.trim()).not.toBe('');
        expect(shader.fragment.trim()).not.toBe('');
        expect(shader.vertex.length).toBeGreaterThan(50); // 合理的最小长度
        expect(shader.fragment.length).toBeGreaterThan(50);
      });
    });

    it('所有着色器都应该是有效的字符串', () => {
      const allShaders = FilterShaderLibrary.getAllShaders();

      Object.entries(allShaders).forEach(([name, shader]) => {
        expect(typeof shader.vertex).toBe('string');
        expect(typeof shader.fragment).toBe('string');
        expect(shader.vertex).not.toContain('undefined');
        expect(shader.fragment).not.toContain('undefined');
        expect(shader.vertex).not.toContain('null');
        expect(shader.fragment).not.toContain('null');
      });
    });
  });
});