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

      it('Then should handle shader compilation failure', async () => {
        // Arrange: 模拟编译失败
        const invalidSource = 'invalid shader source';
        (mockGL.getShaderParameter as any).mockReturnValue(false);
        (mockGL.getShaderInfoLog as any).mockReturnValue('Compilation error: syntax error');

        // Act: 编译无效着色器
        const result = await shaderManager.compileShader(ShaderType.VERTEX, invalidSource);

        // Assert: 验证编译失败处理
        expect(result.success).toBe(false);
        expect(result.error).toBe('Compilation error: syntax error');
        expect(result.shader).toBeUndefined();
        expect(mockGL.deleteShader).toHaveBeenCalledWith(mockWebGLShader);
      });

      it('Then should handle createShader failure', async () => {
        // Arrange: 模拟createShader失败
        (mockGL.createShader as any).mockReturnValue(null);

        // Act: 尝试编译着色器
        const result = await shaderManager.compileShader(ShaderType.VERTEX, 'valid source');

        // Assert: 验证失败处理
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to create shader');
      });
    });

    describe('When loading shader programs', () => {
      it('Then should load shader program successfully', async () => {
        // Arrange: 模拟成功编译和链接
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockReturnValue(true);
        (mockGL.getShaderInfoLog as any).mockReturnValue('');
        (mockGL.getProgramInfoLog as any).mockReturnValue('');
        (mockGL.getProgramParameter as any).mockImplementation((program: any, pname: any) => {
           if (pname === mockGL.ACTIVE_UNIFORMS) return 2;
           if (pname === mockGL.ACTIVE_ATTRIBUTES) return 2;
           return true;
         });

        const shaderSource = {
          vertex: DefaultShaders.basic.vertex,
          fragment: DefaultShaders.basic.fragment
        };

        // Act: 加载着色器程序
        const result = await shaderManager.loadShader('basic', shaderSource);

        // Assert: 验证加载结果
        expect(result).toBe(true);
        expect(mockGL.createProgram).toHaveBeenCalled();
        expect(mockGL.attachShader).toHaveBeenCalledTimes(2);
        expect(mockGL.linkProgram).toHaveBeenCalled();
      });

      it('Then should handle vertex shader compilation failure', async () => {
        // Arrange: 模拟顶点着色器编译失败
        (mockGL.getShaderParameter as any).mockImplementation((shader: any, pname: any) => {
           return false; // 编译失败
         });
        (mockGL.getShaderInfoLog as any).mockReturnValue('Vertex shader error');

        const shaderSource = {
          vertex: 'invalid vertex shader',
          fragment: DefaultShaders.basic.fragment
        };

        // Act: 尝试加载着色器程序
        const result = await shaderManager.loadShader('invalid', shaderSource);

        // Assert: 验证失败处理
        expect(result).toBe(false);
      });

      it('Then should handle fragment shader compilation failure', async () => {
        // Arrange: 模拟片段着色器编译失败
        let callCount = 0;
        (mockGL.getShaderParameter as any).mockImplementation(() => {
          callCount++;
          return callCount === 1; // 第一次调用(顶点着色器)成功，第二次(片段着色器)失败
        });
        (mockGL.getShaderInfoLog as any).mockReturnValue('Fragment shader error');

        const shaderSource = {
          vertex: DefaultShaders.basic.vertex,
          fragment: 'invalid fragment shader'
        };

        // Act: 尝试加载着色器程序
        const result = await shaderManager.loadShader('invalid', shaderSource);

        // Assert: 验证失败处理
        expect(result).toBe(false);
      });

      it('Then should handle program linking failure', async () => {
        // Arrange: 模拟着色器编译成功但程序链接失败
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockReturnValue(false);
        (mockGL.getProgramInfoLog as any).mockReturnValue('Linking error');

        const shaderSource = {
          vertex: DefaultShaders.basic.vertex,
          fragment: DefaultShaders.basic.fragment
        };

        // Act: 尝试加载着色器程序
        const result = await shaderManager.loadShader('link-fail', shaderSource);

        // Assert: 验证失败处理
        expect(result).toBe(false);
        expect(mockGL.deleteProgram).toHaveBeenCalled();
      });
    });

    describe('When managing shader programs', () => {
      beforeEach(async () => {
        // Arrange: 预加载一个着色器程序
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockImplementation((program: any, pname: any) => {
           if (pname === mockGL.ACTIVE_UNIFORMS) return 1;
           if (pname === mockGL.ACTIVE_ATTRIBUTES) return 1;
           return true;
         });
        
        await shaderManager.loadShader('test', {
          vertex: DefaultShaders.basic.vertex,
          fragment: DefaultShaders.basic.fragment
        });
      });

      it('Then should get loaded shader program', () => {
        // Act: 获取着色器程序
        const program = shaderManager.getShader('test');

        // Assert: 验证程序存在
        expect(program).toBeDefined();
        expect(program?.id).toBe('test');
      });

      it('Then should return undefined for non-existent shader', () => {
        // Act: 获取不存在的着色器程序
        const program = shaderManager.getShader('non-existent');

        // Assert: 验证返回undefined
        expect(program).toBeUndefined();
      });

      it('Then should use shader program successfully', () => {
        // Act: 使用着色器程序
        const result = shaderManager.useProgram('test');

        // Assert: 验证使用成功
        expect(result).toBe(true);
        expect(mockGL.useProgram).toHaveBeenCalledWith(mockWebGLProgram);
      });

      it('Then should fail to use non-existent shader program', () => {
        // Act: 尝试使用不存在的着色器程序
        const result = shaderManager.useProgram('non-existent');

        // Assert: 验证使用失败
        expect(result).toBe(false);
      });

      it('Then should set uniforms successfully', () => {
        // Arrange: 使用着色器程序
        shaderManager.useProgram('test');
        
        const uniforms = {
          u_float: 1.0,
          u_vec2: [1.0, 2.0],
          u_vec3: [1.0, 2.0, 3.0],
          u_vec4: [1.0, 2.0, 3.0, 4.0],
          u_matrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
        };

        // Act: 设置uniform值
        shaderManager.setUniforms(uniforms);

        // Assert: 验证uniform设置调用
        expect(mockGL.uniform1f).toHaveBeenCalled();
        expect(mockGL.uniform2fv).toHaveBeenCalled();
        expect(mockGL.uniform3fv).toHaveBeenCalled();
        expect(mockGL.uniform4fv).toHaveBeenCalled();
        expect(mockGL.uniformMatrix3fv).toHaveBeenCalled();
      });
    });

    describe('When disposing resources', () => {
      it('Then should dispose all resources', async () => {
        // Arrange: 加载一些着色器程序
        (mockGL.getShaderParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockReturnValue(true);
        (mockGL.getProgramParameter as any).mockImplementation((program: any, pname: any) => {
           if (pname === mockGL.ACTIVE_UNIFORMS) return 0;
           if (pname === mockGL.ACTIVE_ATTRIBUTES) return 0;
           return true;
         });
        
        await shaderManager.loadShader('test1', {
          vertex: DefaultShaders.basic.vertex,
          fragment: DefaultShaders.basic.fragment
        });
        
        await shaderManager.loadShader('test2', {
          vertex: DefaultShaders.textured.vertex,
          fragment: DefaultShaders.textured.fragment
        });

        // Act: 释放资源
        shaderManager.dispose();

        // Assert: 验证资源释放
        expect(mockGL.deleteProgram).toHaveBeenCalledTimes(2);
        expect(mockGL.deleteShader).toHaveBeenCalledTimes(4); // 2个程序 × 2个着色器
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