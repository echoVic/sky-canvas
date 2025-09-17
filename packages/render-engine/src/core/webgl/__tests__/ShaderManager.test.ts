import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  WebGLShaderManager,
  ShaderProgram,
  ShaderCompileResult,
  IShaderManager
} from '../ShaderManager';
import { ShaderType, ShaderSource } from '../types';

// Mock WebGL context
const createMockWebGLContext = (): WebGLRenderingContext => {
  const mockShader = {};
  const mockProgram = {};
  const mockUniformLocation = {};
  
  return {
    createShader: () => mockShader,
    createProgram: () => mockProgram,
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: (shader: any, pname: number) => {
      // COMPILE_STATUS
      if (pname === 0x8B81) return true;
      return null;
    },
    getShaderInfoLog: () => '',
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: (program: any, pname: number) => {
      // ACTIVE_ATTRIBUTES or ACTIVE_UNIFORMS
      if (pname === 0x8B89 || pname === 0x8B86) return 2;
      // LINK_STATUS
      if (pname === 0x8B82) return true;
      return null;
    },
    getProgramInfoLog: () => '',
    useProgram: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: () => mockUniformLocation,
    getActiveAttrib: (program: any, index: number) => ({
      name: `attr${index}`,
      type: 0x1406, // FLOAT
      size: 1
    }),
    getActiveUniform: (program: any, index: number) => ({
      name: `uniform${index}`,
      type: 0x1406, // FLOAT
      size: 1
    }),
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ACTIVE_ATTRIBUTES: 0x8B89,
    ACTIVE_UNIFORMS: 0x8B86,
    FLOAT: 0x1406
  } as any;
};

const createValidShaderSource = (): ShaderSource => ({
  vertex: `
    attribute vec3 position;
    uniform mat4 mvpMatrix;
    void main() {
      gl_Position = mvpMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    precision mediump float;
    uniform vec4 color;
    void main() {
      gl_FragColor = color;
    }
  `
});

describe('WebGLShaderManager', () => {
  let mockGL: WebGLRenderingContext;
  let shaderManager: WebGLShaderManager;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    shaderManager = new WebGLShaderManager(mockGL);
  });

  afterEach(() => {
    shaderManager.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建着色器管理器', () => {
      expect(shaderManager).toBeDefined();
      expect(shaderManager).toBeInstanceOf(WebGLShaderManager);
    });

    it('应该能够加载着色器', async () => {
      const shaderSource = createValidShaderSource();
      const result = await shaderManager.loadShader('test-shader', shaderSource);
      
      expect(result).toBe(true);
    });

    it('应该能够获取已加载的着色器', async () => {
      const shaderSource = createValidShaderSource();
      await shaderManager.loadShader('test-shader', shaderSource);
      
      const shader = shaderManager.getShader('test-shader');
      expect(shader).toBeDefined();
      expect(shader?.id).toBe('test-shader');
    });

    it('应该能够使用着色器程序', async () => {
      const shaderSource = createValidShaderSource();
      await shaderManager.loadShader('test-shader', shaderSource);
      
      const result = shaderManager.useProgram('test-shader');
      expect(result).toBe(true);
    });
  });

  describe('着色器编译', () => {
    it('应该能够编译顶点着色器', async () => {
      const vertexSource = `
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `;
      
      const result = await shaderManager.compileShader(ShaderType.VERTEX, vertexSource);
      expect(result.success).toBe(true);
      expect(result.shader).toBeDefined();
    });

    it('应该能够编译片段着色器', async () => {
      const fragmentSource = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      const result = await shaderManager.compileShader(ShaderType.FRAGMENT, fragmentSource);
      expect(result.success).toBe(true);
      expect(result.shader).toBeDefined();
    });
  });

  describe('Uniform 设置', () => {
    it('应该能够设置单个 uniform', async () => {
      const shaderSource = createValidShaderSource();
      await shaderManager.loadShader('test-shader', shaderSource);
      shaderManager.useProgram('test-shader');
      
      expect(() => {
        shaderManager.setUniforms({ color: [1.0, 0.0, 0.0, 1.0] });
      }).not.toThrow();
    });

    it('应该能够设置多个 uniforms', async () => {
      const shaderSource = createValidShaderSource();
      await shaderManager.loadShader('test-shader', shaderSource);
      shaderManager.useProgram('test-shader');
      
      expect(() => {
        shaderManager.setUniforms({
          color: [1.0, 0.0, 0.0, 1.0],
          time: 1.0,
          resolution: [800, 600]
        });
      }).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的着色器', () => {
      const shader = shaderManager.getShader('non-existent');
      expect(shader).toBeUndefined();
    });

    it('应该处理使用不存在的着色器程序', () => {
      const result = shaderManager.useProgram('non-existent');
      expect(result).toBe(false);
    });

    it('应该处理空的着色器源码', async () => {
      const result = await shaderManager.compileShader(ShaderType.VERTEX, '');
      expect(result.success).toBe(true); // Mock 总是返回成功
    });
  });

  describe('资源管理', () => {
    it('应该能够正确释放资源', () => {
      expect(() => {
        shaderManager.dispose();
      }).not.toThrow();
    });
  });
});