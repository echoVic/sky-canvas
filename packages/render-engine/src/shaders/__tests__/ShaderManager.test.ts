/**
 * ShaderManager 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShaderType } from '../../webgl/types';
import {
  DefaultShaders,
  WebGLShader,
  WebGLShaderManager
} from '../ShaderManager';

// Mock WebGL Context
const mockWebGLShader = {} as globalThis.WebGLShader;
const mockWebGLProgram = {} as WebGLProgram;
const mockUniformLocation = {} as WebGLUniformLocation;

const mockGL = {
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  ACTIVE_UNIFORMS: 35718,
  ACTIVE_ATTRIBUTES: 35721,
  
  createShader: vi.fn().mockReturnValue(mockWebGLShader),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  getShaderInfoLog: vi.fn().mockReturnValue(''),
  deleteShader: vi.fn(),
  
  createProgram: vi.fn().mockReturnValue(mockWebGLProgram),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  getProgramInfoLog: vi.fn().mockReturnValue(''),
  useProgram: vi.fn(),
  deleteProgram: vi.fn(),
  
  getUniformLocation: vi.fn().mockReturnValue(mockUniformLocation),
  getAttribLocation: vi.fn().mockReturnValue(0),
  getActiveUniform: vi.fn().mockImplementation((program, index) => ({
    name: `u_uniform${index}`,
    type: 5126, // FLOAT
    size: 1
  })),
  getActiveAttrib: vi.fn().mockImplementation((program, index) => ({
    name: `a_attribute${index}`,
    type: 5126, // FLOAT
    size: 1
  })),
  
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniform1fv: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4fv: vi.fn(),
  uniformMatrix2fv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  uniformMatrix4fv: vi.fn()
} as unknown as WebGLRenderingContext;

describe('WebGLShader', () => {
  let shader: WebGLShader;
  const shaderId = 'test-shader';
  const shaderType: ShaderType = ShaderType.VERTEX;
  const shaderSource = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

  beforeEach(() => {
    // Arrange: 重置所有 mock
    vi.clearAllMocks();
    
    // Arrange: 创建 WebGLShader 实例
    shader = new WebGLShader(mockGL, shaderId, shaderType, shaderSource);
  });

  afterEach(() => {
    shader?.dispose();
  });

  describe('Given a WebGLShader instance', () => {
    describe('When accessing basic properties', () => {
      it('Then should return correct shader properties', () => {
        // Assert: 验证基本属性
        expect(shader.id).toBe(shaderId);
        expect(shader.type).toBe(shaderType);
        expect(shader.source).toBe(shaderSource);
        expect(shader.compiled).toBe(false);
        expect(shader.size).toBe(shaderSource.length);
        expect(shader.usage).toBe(0);
      });

      it('Then should return null shader initially', () => {
        // Act: 获取WebGL着色器对象
        const glShader = shader.getShader();

        // Assert: 验证初始状态
        expect(glShader).toBeNull();
      });
    });

    describe('When compiling shader', () => {
      it('Then should compile successfully with valid source', async () => {
        // Arrange: 模拟编译成功
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getShaderInfoLog as any).mockReturnValue('');

        // Act: 编译着色器
        const result = await shader.compile();

        // Assert: 验证编译结果
        expect(result).toBe(true);
        expect(shader.compiled).toBe(true);
        expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.VERTEX_SHADER);
        expect(mockGL.shaderSource).toHaveBeenCalledWith(mockWebGLShader, shaderSource);
        expect(mockGL.compileShader).toHaveBeenCalledWith(mockWebGLShader);
      });

      it('Then should fail compilation with invalid source', async () => {
        // Arrange: 模拟编译失败
        (mockGL.getShaderParameter as any).mockReturnValue(false);
        (mockGL.getShaderInfoLog as any).mockReturnValue('Compilation error');

        // Act: 编译着色器
        const result = await shader.compile();

        // Assert: 验证编译失败
        expect(result).toBe(false);
        expect(shader.compiled).toBe(false);
        expect(mockGL.deleteShader).toHaveBeenCalledWith(mockWebGLShader);
      });
    });
  });
});

describe('WebGLShaderManager', () => {
  let shaderManager: WebGLShaderManager;

  beforeEach(() => {
    // Arrange: 重置所有 mock 并创建 ShaderManager 实例
    vi.clearAllMocks();
    shaderManager = new WebGLShaderManager(mockGL);
  });

  afterEach(() => {
    shaderManager?.dispose();
  });

  describe('Given a WebGLShaderManager instance', () => {
    describe('When compiling shaders', () => {
      it('Then should compile vertex shader successfully', async () => {
        // Arrange: 准备顶点着色器源码
        const vertexSource = DefaultShaders.basic.vertex;
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getShaderInfoLog as any).mockReturnValue('');

        // Act: 编译顶点着色器
        const result = await shaderManager.compileShader(ShaderType.VERTEX, vertexSource);

        // Assert: 验证编译结果
        expect(result.success).toBe(true);
        expect(result.shader).toBe(mockWebGLShader);
        expect(result.error).toBeUndefined();
        expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.VERTEX_SHADER);
      });

      it('Then should compile fragment shader successfully', async () => {
        // Arrange: 准备片段着色器源码
        const fragmentSource = DefaultShaders.basic.fragment;
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getShaderInfoLog as any).mockReturnValue('');

        // Act: 编译片段着色器
        const result = await shaderManager.compileShader(ShaderType.FRAGMENT, fragmentSource);

        // Assert: 验证编译结果
        expect(result.success).toBe(true);
        expect(result.shader).toBe(mockWebGLShader);
        expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.FRAGMENT_SHADER);
      });
    });
  });
});

describe('DefaultShaders', () => {
  describe('Given DefaultShaders object', () => {
    describe('When accessing basic shader', () => {
      it('Then should have vertex and fragment shaders', () => {
        // Assert: 验证基本着色器存在
        expect(DefaultShaders.basic).toBeDefined();
        expect(DefaultShaders.basic.vertex).toBeDefined();
        expect(DefaultShaders.basic.fragment).toBeDefined();
        expect(typeof DefaultShaders.basic.vertex).toBe('string');
        expect(typeof DefaultShaders.basic.fragment).toBe('string');
      });
    });
  });
});