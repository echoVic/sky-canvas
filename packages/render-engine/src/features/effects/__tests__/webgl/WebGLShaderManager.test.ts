/**
 * WebGLShaderManager 单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShaderUniforms, WebGLShaderManager } from '../../webgl/WebGLShaderManager';
// Mock WebGL context
const mockWebGLContext = {
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn((program: any, pname: number) => {
    // Mock ACTIVE_UNIFORMS and ACTIVE_ATTRIBUTES to return correct counts for testing
    if (pname === 0x8B86) return 3; // ACTIVE_UNIFORMS: u_float, u_vec2, u_texture
    if (pname === 0x8B89) return 1; // ACTIVE_ATTRIBUTES
    return true; // For LINK_STATUS and COMPILE_STATUS
  }) as any,
  getProgramInfoLog: vi.fn(() => ''),
  useProgram: vi.fn(),
  getUniformLocation: vi.fn((program: any, name: string) => {
    const validUniforms = ['u_float', 'u_vec2', 'u_texture', 'u_test'];
    return validUniforms.includes(name) ? {} : null;
  }),
  getAttribLocation: vi.fn(() => 0),
  getActiveUniform: vi.fn((program: any, index: number) => {
        // 模拟返回uniform信息
        const uniforms = [
          { name: 'u_float', type: 0x1406, size: 1 }, // FLOAT
          { name: 'u_vec2', type: 0x8B50, size: 1 }, // FLOAT_VEC2
          { name: 'u_texture', type: 0x8B5E, size: 1 } // SAMPLER_2D
        ];
        return uniforms[index] || null;
       }),
     getActiveAttrib: vi.fn((program: any, index: number) => {
    const attributes = ['a_position', 'a_texCoord', 'a_test'];
    return index < attributes.length ? { name: attributes[index], type: 0x1404, size: 1 } : null;
  }),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3f: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4f: vi.fn(),
  uniform4fv: vi.fn(),
  uniformMatrix2fv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  activeTexture: vi.fn(),
  bindTexture: vi.fn(),
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  COMPILE_STATUS: 0x8B81,
  LINK_STATUS: 0x8B82,
  ACTIVE_UNIFORMS: 0x8B86,
  ACTIVE_ATTRIBUTES: 0x8B89,
  TEXTURE_2D: 0x0DE1,
  TEXTURE0: 0x84C0,
  FLOAT: 0x1406,
  FLOAT_VEC2: 0x8B50,
  SAMPLER_2D: 0x8B5E
};

describe('WebGLShaderManager', () => {
  let shaderManager: WebGLShaderManager;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    vi.clearAllMocks();
    gl = mockWebGLContext as unknown as WebGLRenderingContext;
    shaderManager = new WebGLShaderManager(gl);
  });

  afterEach(() => {
    if (shaderManager) {
      shaderManager.dispose();
    }
  });

  describe('构造函数', () => {
    it('应该成功创建 WebGLShaderManager 实例', () => {
      expect(shaderManager).toBeInstanceOf(WebGLShaderManager);
    });
  });

  describe('着色器程序管理', () => {
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    it('应该能够创建着色器程序', () => {
      const program = shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      expect(program).toBeDefined();
      expect(program?.program).toBeDefined();
      expect(program?.vertexShader).toBeDefined();
      expect(program?.fragmentShader).toBeDefined();
      expect(mockWebGLContext.createShader).toHaveBeenCalledTimes(2);
      expect(mockWebGLContext.createProgram).toHaveBeenCalled();
      expect(mockWebGLContext.linkProgram).toHaveBeenCalled();
    });

    it('当顶点着色器编译失败时应该返回 null', () => {
      mockWebGLContext.getShaderParameter.mockReturnValueOnce(false);
      
      const program = shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      expect(program).toBeNull();
    });

    it('当片段着色器编译失败时应该返回 null', () => {
      mockWebGLContext.getShaderParameter
        .mockReturnValueOnce(true)  // 顶点着色器成功
        .mockReturnValueOnce(false); // 片段着色器失败
      
      const program = shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      expect(program).toBeNull();
      expect(mockWebGLContext.deleteShader).toHaveBeenCalled();
    });

    it('当程序链接失败时应该返回 null', () => {
      mockWebGLContext.getProgramParameter.mockReturnValueOnce(false);
      
      const program = shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      expect(program).toBeNull();
    });

    it('应该能够使用已创建的程序', () => {
      shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      const program = shaderManager.useProgram('test');
      
      expect(program).toBeDefined();
      expect(mockWebGLContext.useProgram).toHaveBeenCalled();
    });

    it('使用不存在的程序应该返回 null', () => {
      const program = shaderManager.useProgram('nonexistent');
      
      expect(program).toBeNull();
    });

    it('应该能够删除程序', () => {
      shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      
      shaderManager.deleteProgram('test');
      
      expect(mockWebGLContext.deleteProgram).toHaveBeenCalled();
      expect(mockWebGLContext.deleteShader).toHaveBeenCalledTimes(2);
      
      // 删除后应该无法使用
      const program = shaderManager.useProgram('test');
      expect(program).toBeNull();
    });
  });

  describe('Uniform 管理', () => {
    beforeEach(() => {
      const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      const fragmentShaderSource = `
        precision mediump float;
        uniform float u_float;
        uniform vec2 u_vec2;
        uniform sampler2D u_texture;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      shaderManager.useProgram('test');
    });

    it('应该能够设置 float uniform', () => {
      // 验证程序已创建并激活
      const currentProgram = shaderManager.getCurrentProgram();
      expect(currentProgram).not.toBeNull();
      
      const uniforms: ShaderUniforms = {
        u_float: 1.5
      };
      
      shaderManager.setUniforms(uniforms);
      
      expect(mockWebGLContext.uniform1f).toHaveBeenCalledWith({}, 1.5);
    });

    it('应该能够设置 vec2 uniform', () => {
      // 验证程序已创建并激活
      const currentProgram = shaderManager.getCurrentProgram();
      expect(currentProgram).not.toBeNull();
      
      // 验证uniform location是否正确获取
      expect(mockWebGLContext.getUniformLocation).toHaveBeenCalled();
      
      const uniforms: ShaderUniforms = {
        u_vec2: [1.0, 2.0]
      };
      
      shaderManager.setUniforms(uniforms);
      
      expect(mockWebGLContext.uniform2fv).toHaveBeenCalledWith({}, expect.any(Float32Array));
    });

    it('应该能够设置纹理 uniform', () => {
      // 创建一个有 bind 方法的纹理对象
      const mockTexture = {
        bind: vi.fn()
      };
      const uniforms: ShaderUniforms = {
        u_texture: mockTexture as any
      };
      
      shaderManager.setUniforms(uniforms);
      
      expect(mockWebGLContext.uniform1i).toHaveBeenCalledWith({}, 0);
    });

    it('当没有当前程序时设置 uniform 应该不执行', () => {
      const newShaderManager = new WebGLShaderManager(gl);
      const uniforms: ShaderUniforms = {
        u_float: 1.5
      };
      
      newShaderManager.setUniforms(uniforms);
      
      // 不应该调用任何 uniform 设置方法
      expect(mockWebGLContext.uniform1f).not.toHaveBeenCalled();
    });
  });

  describe('静态方法', () => {
    it('应该能够验证顶点着色器代码', () => {
      const validVertexShader = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('vertex', validVertexShader);
      
      expect(errors).toEqual([]);
    });

    it('应该能够验证片段着色器代码', () => {
      const validFragmentShader = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('fragment', validFragmentShader);
      
      expect(errors).toEqual([]);
    });

    it('应该能够检测着色器代码错误', () => {
      const invalidShader = 'invalid shader code';
      
      const errors = WebGLShaderManager.validateShaderCode('fragment', invalidShader);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该能够创建用户片段着色器', () => {
      const userFunction = `
        vec4 applyEffect(vec4 color, vec2 texCoord) {
          return color * 0.5;
        }
      `;
      
      const shader = WebGLShaderManager.createUserFragmentShader(userFunction);
      
      expect(shader).toContain(userFunction);
      expect(shader).toContain('precision mediump float');
      expect(shader).toContain('void main()');
    });
  });

  describe('获取器方法', () => {
    it('应该能够获取当前程序', () => {
      const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      const fragmentShaderSource = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      shaderManager.createProgram('test', vertexShaderSource, fragmentShaderSource);
      shaderManager.useProgram('test');
      
      const currentProgram = shaderManager.getCurrentProgram();
      
      expect(currentProgram).toBeDefined();
    });

    it('当没有当前程序时应该返回 null', () => {
      const currentProgram = shaderManager.getCurrentProgram();
      
      expect(currentProgram).toBeNull();
    });
  });

  describe('资源清理', () => {
    it('应该能够正确清理所有资源', () => {
      const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      const fragmentShaderSource = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      shaderManager.createProgram('test1', vertexShaderSource, fragmentShaderSource);
      shaderManager.createProgram('test2', vertexShaderSource, fragmentShaderSource);
      
      shaderManager.dispose();
      
      expect(mockWebGLContext.deleteProgram).toHaveBeenCalledTimes(2);
      expect(mockWebGLContext.deleteShader).toHaveBeenCalledTimes(4); // 2 programs * 2 shaders each
    });
  });

  describe('常量', () => {
    it('应该提供默认顶点着色器', () => {
      expect(WebGLShaderManager.DEFAULT_VERTEX_SHADER).toContain('attribute vec2 a_position');
      expect(WebGLShaderManager.DEFAULT_VERTEX_SHADER).toContain('attribute vec2 a_texCoord');
      expect(WebGLShaderManager.DEFAULT_VERTEX_SHADER).toContain('varying vec2 v_texCoord');
    });

    it('应该提供片段着色器模板', () => {
      expect(WebGLShaderManager.FRAGMENT_SHADER_TEMPLATE).toContain('precision mediump float');
      expect(WebGLShaderManager.FRAGMENT_SHADER_TEMPLATE).toContain('uniform sampler2D u_image');
      expect(WebGLShaderManager.FRAGMENT_SHADER_TEMPLATE).toContain('{{USER_FUNCTION}}');
    });
  });
});