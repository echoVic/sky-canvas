/**
 * WebGLRenderer 测试
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Transform } from '../../../math';
import { IPoint } from '../../interface/IGraphicsContext';
import type { IRenderable } from '../../types';
import type { RenderContext } from '../types';
import { WebGLRenderer } from '../WebGLRenderer';

// Mock WebGL Context
const createMockWebGLContext = () => ({
  canvas: null, // 避免循环依赖
  getExtension: vi.fn().mockImplementation((name) => {
    if (name === 'ANGLE_instanced_arrays') {
      return {
        drawArraysInstancedANGLE: vi.fn(),
        drawElementsInstancedANGLE: vi.fn(),
        vertexAttribDivisorANGLE: vi.fn()
      };
    }
    if (name === 'EXT_disjoint_timer_query') {
      return {
        createQueryEXT: vi.fn().mockReturnValue({}),
        deleteQueryEXT: vi.fn(),
        beginQueryEXT: vi.fn(),
        endQueryEXT: vi.fn(),
        getQueryObjectEXT: vi.fn().mockReturnValue(1000),
        QUERY_RESULT_EXT: 0x8866,
        QUERY_RESULT_AVAILABLE_EXT: 0x8867,
        TIME_ELAPSED_EXT: 0x88BF
      };
    }
    if (name === 'OES_vertex_array_object') {
      return {
        createVertexArrayOES: vi.fn().mockReturnValue({}),
        deleteVertexArrayOES: vi.fn(),
        bindVertexArrayOES: vi.fn()
      };
    }
    return null;
  }),
  createShader: vi.fn().mockReturnValue({}),
  createProgram: vi.fn().mockReturnValue({}),
  createBuffer: vi.fn().mockReturnValue({}),
  createTexture: vi.fn().mockReturnValue({}),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  getShaderInfoLog: vi.fn().mockReturnValue(''),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramInfoLog: vi.fn().mockReturnValue(''),
  useProgram: vi.fn(),
  getAttribLocation: vi.fn().mockReturnValue(0),
  getUniformLocation: vi.fn().mockReturnValue({}),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  bufferSubData: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  activeTexture: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  blendEquation: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  uniform1f: vi.fn(),
  uniform1fv: vi.fn(),
  uniform2f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3f: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4f: vi.fn(),
  uniform4fv: vi.fn(),
  uniform1i: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn(),
  getParameter: vi.fn().mockImplementation((param) => {
    switch (param) {
      case 0x0D33: return 16384; // MAX_TEXTURE_SIZE
      case 0x8869: return 16; // MAX_VERTEX_ATTRIBS
      case 0x8B4D: return 1024; // MAX_FRAGMENT_UNIFORM_VECTORS
      case 0x1F01: return 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)'; // RENDERER
      case 0x1F00: return 'Apple'; // VENDOR
      case 0x1F02: return '4.1'; // VERSION
      case 0x8B8C: return 'OpenGL ES GLSL ES 1.00'; // SHADING_LANGUAGE_VERSION
      case 0x0BA2: return [0, 0, 800, 600]; // VIEWPORT
      case 0x8B8D: return {}; // CURRENT_PROGRAM
      default: return 0;
    }
  }),
  getProgramParameter: vi.fn().mockImplementation((program, pname) => {
    switch (pname) {
      case 0x8B81: return true; // LINK_STATUS
      case 0x8B84: return 2; // ACTIVE_UNIFORMS
      case 0x8B89: return 3; // ACTIVE_ATTRIBUTES
      default: return 0;
    }
  }),
  getActiveUniform: vi.fn().mockImplementation((program, index) => {
    const uniforms = [
      { name: 'u_projection', type: 0x8B5B, size: 1 }, // FLOAT_MAT3
      { name: 'u_transform', type: 0x8B5B, size: 1 }   // FLOAT_MAT3
    ];
    return uniforms[index] || null;
  }),
  getActiveAttrib: vi.fn().mockImplementation((program, index) => {
    const attributes = [
      { name: 'a_position', type: 0x8B50, size: 1 }, // FLOAT_VEC2
      { name: 'a_color', type: 0x8B52, size: 1 },    // FLOAT_VEC4
      { name: 'a_texCoord', type: 0x8B50, size: 1 }  // FLOAT_VEC2
    ];
    return attributes[index] || null;
  }),
  getError: vi.fn().mockReturnValue(0), // NO_ERROR
  // WebGL 常量
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88E4,
  DYNAMIC_DRAW: 0x88E8,
  TRIANGLES: 0x0004,
  UNSIGNED_SHORT: 0x1403,
  FLOAT: 0x1406,
  TEXTURE_2D: 0x0DE1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  LINEAR: 0x2601,
  COLOR_BUFFER_BIT: 0x00004000,
  DEPTH_BUFFER_BIT: 0x00000100,
  BLEND: 0x0BE2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  FUNC_ADD: 0x8006,
  MAX_TEXTURE_SIZE: 0x0D33,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8B4D,
  NO_ERROR: 0,
  INVALID_ENUM: 0x0500,
  INVALID_VALUE: 0x0501,
  INVALID_OPERATION: 0x0502,
  INVALID_FRAMEBUFFER_OPERATION: 0x0506,
  OUT_OF_MEMORY: 0x0505,
  CONTEXT_LOST_WEBGL: 0x9242,
  DEPTH_TEST: 0x0B71,
  CLAMP_TO_EDGE: 0x812F,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TEXTURE0: 0x84C0,
  COMPILE_STATUS: 0x8B81,
  LINK_STATUS: 0x8B82,
  ACTIVE_UNIFORMS: 0x8B86,
  ACTIVE_ATTRIBUTES: 0x8B89
});

// Mock Canvas
const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getContext = vi.fn().mockReturnValue(createMockWebGLContext());
  return canvas;
};

// Mock Renderable
const createMockRenderable = (id: string, visible = true): IRenderable => ({
  id,
  type: 'mock',
  visible,
  zIndex: 0,
  transform: new Transform(),
  render: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
});

describe('WebGLRenderer', () => {
  let renderer: WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: ReturnType<typeof createMockWebGLContext>;
  let renderContext: RenderContext;

  beforeEach(() => {
    renderer = new WebGLRenderer();
    mockCanvas = createMockCanvas();
    mockGL = mockCanvas.getContext('webgl') as any;
    
    renderContext = {
      canvas: mockCanvas,
      context: mockGL,
      viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
      devicePixelRatio: 1
    };
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('初始化', () => {
    it('应该正确创建 WebGLRenderer 实例', () => {
      expect(renderer).toBeInstanceOf(WebGLRenderer);
    });

    it('应该能初始化 WebGL 上下文', () => {
      const result = renderer.initialize(mockCanvas);
      expect(result).toBe(true);
    });

    it('应该能初始化带选项的 WebGL 上下文', () => {
      const options = {
        enablePerformanceMonitoring: true,
        enableMemoryOptimization: false
      };
      
      const result = renderer.initialize(mockCanvas, options);
      expect(result).toBe(true);
    });

    it('应该处理初始化失败', () => {
      const failCanvas = document.createElement('canvas');
      failCanvas.getContext = vi.fn().mockReturnValue(null);
      
      const result = renderer.initialize(failCanvas);
      expect(result).toBe(false);
    });
  });

  describe('能力查询', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该返回正确的渲染能力', () => {
      const capabilities = renderer.getCapabilities();
      
      expect(capabilities.supportsTransforms).toBe(true);
      expect(capabilities.supportsFilters).toBe(true);
      expect(capabilities.supportsBlending).toBe(true);
      expect(capabilities.maxTextureSize).toBe(16384);
      expect(capabilities.supportedFormats).toContain('png');
    });

    it('应该返回 WebGL 特定能力', () => {
      const webglCapabilities = renderer.getWebGLCapabilities();
      
      expect(webglCapabilities.instancedArrays).toBe(true);
      expect(webglCapabilities.maxTextureSize).toBe(16384);
      expect(webglCapabilities.maxVertexAttribs).toBe(16);
      expect(webglCapabilities.maxFragmentUniforms).toBe(1024);
    });
  });

  describe('渲染功能', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该正确处理渲染流程', () => {
      const renderable = createMockRenderable('test1');
      renderer.addRenderable(renderable);

      // 渲染应该不抛出错误
      expect(() => renderer.render()).not.toThrow();
    });

    it('应该跳过不可见的 renderable', () => {
      const visibleRenderable = createMockRenderable('visible', true);
      const hiddenRenderable = createMockRenderable('hidden', false);

      renderer.addRenderable(visibleRenderable);
      renderer.addRenderable(hiddenRenderable);

      // 渲染应该不抛出错误
      expect(() => renderer.render()).not.toThrow();
    });

    it('应该处理无效上下文', () => {
      const invalidContext = {
        ...renderContext,
        context: null as any
      };
      
      expect(() => renderer.render()).not.toThrow();
    });
  });

  describe('清空功能', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该正确清空画布', () => {
      renderer.clear();
      
      expect(mockGL.clearColor).toHaveBeenCalled();
      expect(mockGL.clear).toHaveBeenCalled();
    });
  });

  describe('基础图形绘制', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该能绘制线段', () => {
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      
      expect(() => renderer.drawLine(start, end)).not.toThrow();
    });

    it('应该能绘制线段并应用样式', () => {
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      const style = { strokeStyle: '#ff0000', lineWidth: 3 };
      
      expect(() => renderer.drawLine(start, end, style)).not.toThrow();
    });

    it('应该能绘制矩形', () => {
      expect(() => renderer.drawRect(10, 20, 100, 50, false)).not.toThrow();
      expect(() => renderer.drawRect(10, 20, 100, 50, true)).not.toThrow();
    });

    it('应该能绘制圆形', () => {
      const center: IPoint = { x: 50, y: 50 };
      const radius = 25;
      
      expect(() => renderer.drawCircle(center, radius, false)).not.toThrow();
      expect(() => renderer.drawCircle(center, radius, true)).not.toThrow();
    });
  });

  describe('性能监控', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas, { enablePerformanceMonitoring: true });
    });

    it('应该能获取渲染统计', () => {
      const stats = renderer.getRenderStats();
      
      expect(stats).toHaveProperty('drawCalls');
      expect(stats).toHaveProperty('triangles');
      expect(stats).toHaveProperty('vertices');
      expect(stats).toHaveProperty('batches');
      expect(stats).toHaveProperty('textureBinds');
      expect(stats).toHaveProperty('shaderSwitches');
      expect(stats).toHaveProperty('frameTime');
    });

    it('应该能获取性能分析器', () => {
      const analyzer = renderer.getPerformanceAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('应该能获取性能监控器', () => {
      const monitor = renderer.getPerformanceMonitor();
      expect(monitor).toBeDefined();
    });

    it('应该能启用/禁用性能监控', () => {
      expect(() => renderer.setPerformanceMonitoringEnabled(true)).not.toThrow();
      expect(() => renderer.setPerformanceMonitoringEnabled(false)).not.toThrow();
    });

    it('应该能生成性能报告', () => {
      const report = renderer.generatePerformanceReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('应该能创建性能调试面板', () => {
      const panel = renderer.createPerformanceDebugPanel();
      expect(panel).toBeInstanceOf(HTMLElement);
    });
  });

  describe('内存管理', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas, { enableMemoryOptimization: true });
    });

    it('应该能获取内存管理器', () => {
      const memoryManager = renderer.getMemoryManager();
      expect(memoryManager).toBeDefined();
    });

    it('应该能强制内存清理', () => {
      expect(() => renderer.forceMemoryCleanup()).not.toThrow();
    });
  });

  describe('纹理管理', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该能获取纹理管理器', () => {
      const textureManager = renderer.getTextureManager();
      expect(textureManager).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理未初始化的渲染调用', () => {
      const uninitializedRenderer = new WebGLRenderer();
      
      expect(() => uninitializedRenderer.render()).not.toThrow();
      expect(() => uninitializedRenderer.clear()).not.toThrow();
      
      uninitializedRenderer.dispose();
    });

    it('应该处理绘制方法在未初始化时的调用', () => {
      const uninitializedRenderer = new WebGLRenderer();
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      
      expect(() => uninitializedRenderer.drawLine(start, end)).not.toThrow();
      expect(() => uninitializedRenderer.drawRect(10, 20, 100, 50)).not.toThrow();
      expect(() => uninitializedRenderer.drawCircle({ x: 50, y: 50 }, 25)).not.toThrow();
      
      uninitializedRenderer.dispose();
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      renderer.initialize(mockCanvas);
      
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('应该处理重复清理', () => {
      renderer.initialize(mockCanvas);
      renderer.dispose();
      
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  describe('批量渲染', () => {
    beforeEach(() => {
      renderer.initialize(mockCanvas);
    });

    it('应该能处理多个 renderable 的批量渲染', () => {
      const renderables = Array.from({ length: 4 }, (_, i) =>
        createMockRenderable(`renderable${i}`)
      );

      renderables.forEach(renderable => renderer.addRenderable(renderable));

      // 渲染应该不抛出错误
      expect(() => renderer.render()).not.toThrow();
    });
  });
});