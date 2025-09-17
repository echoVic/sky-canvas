/**
 * WebGLRenderer 单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebGLRenderer, WebGLRenderOptions } from '../../webgl/WebGLRenderer';

// Mock WebGL context
const mockWebGLContext = {
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(() => ({} as WebGLTexture)),
  bindTexture: vi.fn(),
  texParameteri: vi.fn(),
  texImage2D: vi.fn(),
  createFramebuffer: vi.fn(() => ({})),
  bindFramebuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  useProgram: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawElements: vi.fn(),
  readPixels: vi.fn(),
  deleteTexture: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteFramebuffer: vi.fn(),
  getExtension: vi.fn(),
  getParameter: vi.fn((param) => {
    if (param === 0x1F00) return 'Mock Vendor'; // VENDOR
    if (param === 0x1F01) return 'Mock Renderer'; // RENDERER
    if (param === 0x1F02) return 'WebGL 1.0'; // VERSION
    if (param === 0x8B8C) return 'GLSL ES 1.0'; // SHADING_LANGUAGE_VERSION
    if (param === 0x0D33) return 1024; // MAX_TEXTURE_SIZE
    if (param === 0x8B4C) return 8; // MAX_VERTEX_TEXTURE_IMAGE_UNITS
    if (param === 0x8B4D) return 16; // MAX_TEXTURE_IMAGE_UNITS
    return 0;
  }),
  getError: vi.fn(() => 0), // GL_NO_ERROR
  NO_ERROR: 0,
  VENDOR: 0x1F00,
  RENDERER: 0x1F01,
  VERSION: 0x1F02,
  SHADING_LANGUAGE_VERSION: 0x8B8C,
  MAX_TEXTURE_SIZE: 0x0D33,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
  MAX_TEXTURE_IMAGE_UNITS: 0x8B4D,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88E4,
  TEXTURE_2D: 0x0DE1,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  CLAMP_TO_EDGE: 0x812F,
  LINEAR: 0x2601,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  FRAMEBUFFER: 0x8D40,
  COLOR_ATTACHMENT0: 0x8CE0,
  COLOR_BUFFER_BIT: 0x00004000,
  TRIANGLES: 0x0004
};

// Mock HTMLCanvasElement
const mockCanvas = {
  width: 512,
  height: 512,
  getContext: vi.fn(() => mockWebGLContext)
};

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  },
  writable: true
});

// Mock WebGLShaderManager
vi.mock('../../webgl/WebGLShaderManager', () => {
  return {
    WebGLShaderManager: vi.fn().mockImplementation(() => ({
      createProgram: vi.fn(() => ({
        program: {},
        vertexShader: {},
        fragmentShader: {},
        uniforms: {},
        attributes: { a_position: 0, a_texCoord: 1 }
      })),
      useProgram: vi.fn(() => true),
      setUniforms: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

describe('WebGLRenderer', () => {
  let renderer: WebGLRenderer;
  let options: WebGLRenderOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    options = {
      width: 256,
      height: 256,
      flipY: false,
      preserveDrawingBuffer: false
    };
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  describe('构造函数', () => {
    it('应该成功创建 WebGLRenderer 实例', () => {
      renderer = new WebGLRenderer(options);
      
      expect(renderer).toBeInstanceOf(WebGLRenderer);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl', {
        preserveDrawingBuffer: false,
        premultipliedAlpha: false,
        alpha: true
      });
    });

    it('应该使用默认选项创建实例', () => {
      renderer = new WebGLRenderer();
      
      expect(renderer).toBeInstanceOf(WebGLRenderer);
      expect(mockCanvas.width).toBe(512);
      expect(mockCanvas.height).toBe(512);
    });

    it('当 WebGL 不支持时应该抛出错误', () => {
      const originalGetContext = mockCanvas.getContext;
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      
      expect(() => new WebGLRenderer(options)).toThrow('WebGL not supported');
      
      mockCanvas.getContext = originalGetContext;
    });
  });

  describe('纹理管理', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('应该能够创建纹理', () => {
      const imageData = new ImageData(100, 100);
      
      const texture = renderer.createTexture(imageData);
      
      expect(texture).toBeDefined();
      expect(mockWebGLContext.createTexture).toHaveBeenCalled();
      expect(mockWebGLContext.bindTexture).toHaveBeenCalled();
      expect(mockWebGLContext.texParameteri).toHaveBeenCalledTimes(4);
      expect(mockWebGLContext.texImage2D).toHaveBeenCalled();
    });

    it('当创建纹理失败时应该返回 null', () => {
      (mockWebGLContext.createTexture as any).mockReturnValueOnce(null);
      const imageData = new ImageData(100, 100);
      
      const texture = renderer.createTexture(imageData);
      
      expect(texture).toBeNull();
    });

    it('应该能够删除纹理', () => {
      const mockTexture = {} as WebGLTexture;
      
      renderer.deleteTexture(mockTexture);
      
      expect(mockWebGLContext.deleteTexture).toHaveBeenCalledWith(mockTexture);
    });
  });

  describe('着色器程序管理', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('应该能够创建着色器程序', () => {
      const vertexShader = 'vertex shader code';
      const fragmentShader = 'fragment shader code';
      
      const result = renderer.createShaderProgram('test', vertexShader, fragmentShader);
      
      expect(result).toBe(true);
    });
  });

  describe('WebGL 信息获取', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('应该能够获取 WebGL 信息', () => {
      const info = renderer.getWebGLInfo();
      
      expect(info).toEqual({
        vendor: 'Mock Vendor',
        renderer: 'Mock Renderer',
        version: 'WebGL 1.0',
        shadingLanguageVersion: 'GLSL ES 1.0',
        maxTextureSize: 1024,
        maxVertexTextureImageUnits: 8,
        maxFragmentTextureImageUnits: 16
      });
    });

    it('应该能够检查扩展支持', () => {
      mockWebGLContext.getExtension.mockReturnValue({});
      
      const supported = renderer.checkExtensionSupport('OES_texture_float');
      
      expect(supported).toBe(true);
      expect(mockWebGLContext.getExtension).toHaveBeenCalledWith('OES_texture_float');
    });

    it('当扩展不支持时应该返回 false', () => {
      mockWebGLContext.getExtension.mockReturnValue(null);
      
      const supported = renderer.checkExtensionSupport('unsupported_extension');
      
      expect(supported).toBe(false);
    });
  });

  describe('错误检查', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('当没有错误时应该返回 true', () => {
      mockWebGLContext.getError.mockReturnValue(0); // GL_NO_ERROR
      
      const result = renderer.checkError('test operation');
      
      expect(result).toBe(true);
    });

    it('当有错误时应该返回 false', () => {
      mockWebGLContext.getError.mockReturnValue(0x0500); // GL_INVALID_ENUM
      
      const result = renderer.checkError('test operation');
      
      expect(result).toBe(false);
    });
  });

  describe('获取器方法', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('应该能够获取 WebGL 上下文', () => {
      const context = renderer.getContext();
      
      expect(context).toBe(mockWebGLContext);
    });

    it('应该能够获取画布', () => {
      const canvas = renderer.getCanvas();
      
      expect(canvas).toBe(mockCanvas);
    });

    it('应该能够获取着色器管理器', () => {
      const shaderManager = renderer.getShaderManager();
      
      expect(shaderManager).toBeDefined();
    });
  });

  describe('资源清理', () => {
    beforeEach(() => {
      renderer = new WebGLRenderer(options);
    });

    it('应该能够正确清理资源', () => {
      renderer.dispose();
      
      expect(mockWebGLContext.deleteBuffer).toHaveBeenCalledTimes(2); // vertex and index buffers
    });
  });
});