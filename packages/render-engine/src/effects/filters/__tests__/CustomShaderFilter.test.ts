/**
 * 自定义着色器滤镜测试
 */

import '../../__tests__/setup';
import { CustomShaderFilter } from '../CustomShaderFilter';
import { FilterType } from '../../types/FilterTypes';
import { WebGLShaderManager } from '../../webgl/WebGLShaderManager';

// 模拟WebGL支持
const mockWebGLContext = {
  getExtension: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  getShaderInfoLog: vi.fn().mockReturnValue(''),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  getProgramInfoLog: vi.fn().mockReturnValue(''),
  useProgram: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(),
  bindTexture: vi.fn(),
  texParameteri: vi.fn(),
  texImage2D: vi.fn(),
  activeTexture: vi.fn(),
  uniform1f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform1i: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  drawElements: vi.fn(),
  readPixels: vi.fn(),
  deleteTexture: vi.fn(),
  viewport: vi.fn(),
  getParameter: vi.fn(),
  getError: vi.fn().mockReturnValue(0), // GL_NO_ERROR
  NO_ERROR: 0,
  COLOR_BUFFER_BIT: 16384,
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  TEXTURE_2D: 3553,
  TEXTURE0: 33984,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  CLAMP_TO_EDGE: 33071,
  LINEAR: 9729,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  TRIANGLES: 4,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  ACTIVE_UNIFORMS: 35718,
  ACTIVE_ATTRIBUTES: 35721
};

// 模拟HTMLCanvasElement的getContext方法
global.HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type: string) => {
  if (type === 'webgl' || type === 'experimental-webgl') {
    return mockWebGLContext;
  }
  return null;
});

describe('CustomShaderFilter', () => {
  let filter: CustomShaderFilter;
  
  beforeEach(() => {
    filter = new CustomShaderFilter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    filter.dispose();
  });

  it('应该正确初始化', () => {
    expect(filter.type).toBe(FilterType.CUSTOM_SHADER);
    expect(filter.name).toBe('Custom Shader');
    expect(filter.requiresWebGL).toBe(true);
  });

  it('应该返回默认参数', () => {
    const defaultParams = filter.getDefaultParameters();
    expect(defaultParams.type).toBe(FilterType.CUSTOM_SHADER);
    expect(defaultParams.vertexShader).toBe(WebGLShaderManager.DEFAULT_VERTEX_SHADER);
    expect(defaultParams.fragmentShader).toBeDefined();
    expect(defaultParams.uniforms).toEqual({});
    expect(defaultParams.enabled).toBe(true);
  });

  it('应该验证有效的着色器参数', () => {
    const validParams = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {},
      enabled: true,
      opacity: 1
    };
    
    expect(filter.validateParameters(validParams)).toBe(true);
  });

  it('应该拒绝空的着色器代码', () => {
    const invalidParams = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: '', // 空字符串
      fragmentShader: `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {},
      enabled: true,
      opacity: 1
    };
    
    expect(filter.validateParameters(invalidParams)).toBe(false);
  });

  it('应该拒绝无效的着色器类型', () => {
    const invalidParams = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: 123, // 错误的类型
      fragmentShader: `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {},
      enabled: true,
      opacity: 1
    };
    
    expect(filter.validateParameters(invalidParams as any)).toBe(false);
  });

  it('应该估算处理时间', () => {
    const params = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        void main() {
          gl_FragColor = texture2D(u_image, v_texCoord);
        }
      `,
      uniforms: {},
      enabled: true,
      opacity: 1
    };

    const time = filter.estimateProcessingTime(100, 100, params);
    expect(time).toBeGreaterThan(0);
  });

  it('应该正确处理uniforms对象', () => {
    const params = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D u_image;
        uniform float u_brightness;
        uniform vec3 u_color;
        varying vec2 v_texCoord;
        void main() {
          vec4 color = texture2D(u_image, v_texCoord);
          gl_FragColor = color * u_brightness * vec4(u_color, 1.0);
        }
      `,
      uniforms: {
        u_brightness: 1.5,
        u_color: [1.0, 0.8, 0.6]
      },
      enabled: true,
      opacity: 1
    };
    
    expect(filter.validateParameters(params)).toBe(true);
  });

  it('应该处理着色器验证错误', () => {
    const invalidShaderParams = {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: `
        attribute vec2 a_position;
        void main() {
          // 缺少gl_Position设置 - 这会导致验证失败
        }
      `,
      fragmentShader: `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {},
      enabled: true,
      opacity: 1
    };
    
    expect(filter.validateParameters(invalidShaderParams)).toBe(false);
  });

  describe('WebGLShaderManager静态方法', () => {
    it('应该验证顶点着色器', () => {
      const validVertexShader = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('vertex', validVertexShader);
      expect(errors).toHaveLength(0);
    });

    it('应该检测顶点着色器错误', () => {
      const invalidVertexShader = `
        attribute vec2 a_position;
        void main() {
          // 缺少gl_Position设置
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('vertex', invalidVertexShader);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('gl_Position'))).toBe(true);
    });

    it('应该验证片段着色器', () => {
      const validFragmentShader = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('fragment', validFragmentShader);
      expect(errors).toHaveLength(0);
    });

    it('应该检测片段着色器错误', () => {
      const invalidFragmentShader = `
        precision mediump float;
        void main() {
          // 缺少gl_FragColor设置
        }
      `;
      
      const errors = WebGLShaderManager.validateShaderCode('fragment', invalidFragmentShader);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('gl_FragColor'))).toBe(true);
    });

    it('应该检测空着色器', () => {
      const errors = WebGLShaderManager.validateShaderCode('vertex', '');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('empty');
    });

    it('应该创建用户友好的片段着色器', () => {
      const userFunction = `
        vec4 applyEffect(vec4 color, vec2 texCoord) {
          return vec4(1.0 - color.rgb, color.a);
        }
      `;
      
      const shader = WebGLShaderManager.createUserFragmentShader(userFunction);
      expect(shader).toContain(userFunction);
      expect(shader).toContain('precision mediump float');
      expect(shader).toContain('void main()');
    });
  });

  describe('预设着色器', () => {
    it('应该创建预设着色器', () => {
      const presets = CustomShaderFilter.createPresetShaders();
      
      expect(presets).toHaveProperty('edgeDetection');
      expect(presets).toHaveProperty('invert');
      expect(presets).toHaveProperty('swirl');
      expect(presets).toHaveProperty('pixelate');
      
      // 验证边缘检测预设
      const edgeDetection = presets.edgeDetection;
      expect(edgeDetection.type).toBe(FilterType.CUSTOM_SHADER);
      expect(edgeDetection.fragmentShader).toContain('Sobel');
      expect(edgeDetection.enabled).toBe(true);
    });

    it('预设着色器应该包含核心GLSL要素', () => {
      const presets = CustomShaderFilter.createPresetShaders();
      
      for (const [name, preset] of Object.entries(presets)) {
        // 检查顶点着色器
        expect(preset.vertexShader).toContain('gl_Position');
        expect(preset.vertexShader).toContain('void main()');
        
        // 检查片段着色器
        expect(preset.fragmentShader).toContain('gl_FragColor');
        expect(preset.fragmentShader).toContain('void main()');
        expect(preset.fragmentShader).toContain('precision mediump float');
        
        // 验证不会有严重错误（空着色器等）
        const vertexErrors = WebGLShaderManager.validateShaderCode('vertex', preset.vertexShader);
        const fragmentErrors = WebGLShaderManager.validateShaderCode('fragment', preset.fragmentShader);
        
        // 检查没有严重错误（比如空着色器、缺少main函数等）
        const hasSeriousVertexErrors = vertexErrors.some(error => 
          error.includes('empty') || error.includes('main') || error.includes('gl_Position')
        );
        const hasSeriousFragmentErrors = fragmentErrors.some(error => 
          error.includes('empty') || error.includes('main') || error.includes('gl_FragColor')
        );
        
        expect(hasSeriousVertexErrors).toBe(false);
        expect(hasSeriousFragmentErrors).toBe(false);
      }
    });

    it('旋涡效果应该使用时间uniform', () => {
      const presets = CustomShaderFilter.createPresetShaders();
      const swirl = presets.swirl;
      
      expect(swirl.fragmentShader).toContain('u_time');
      expect(swirl.fragmentShader).toContain('sin(u_time)');
    });

    it('像素化效果应该使用尺寸uniform', () => {
      const presets = CustomShaderFilter.createPresetShaders();
      const pixelate = presets.pixelate;
      
      expect(pixelate.fragmentShader).toContain('u_pixelSize');
      expect(pixelate.uniforms).toHaveProperty('u_pixelSize');
    });
  });
});