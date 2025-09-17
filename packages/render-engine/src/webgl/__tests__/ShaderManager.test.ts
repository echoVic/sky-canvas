import {
  ShaderManager,
  ShaderProgram,
  ShaderType,
  ShaderCompilationError,
  ShaderProgramLinkError,
  IShaderSource
} from '../ShaderManager';

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
    uniform1f: () => {},
    uniform1i: () => {},
    uniform2f: () => {},
    uniform2fv: () => {},
    uniform3f: () => {},
    uniform3fv: () => {},
    uniform4f: () => {},
    uniform4fv: () => {},
    uniformMatrix2fv: () => {},
    uniformMatrix3fv: () => {},
    uniformMatrix4fv: () => {},
    VERTEX_SHADER: ShaderType.VERTEX,
    FRAGMENT_SHADER: ShaderType.FRAGMENT,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ACTIVE_ATTRIBUTES: 0x8B89,
    ACTIVE_UNIFORMS: 0x8B86,
    FLOAT: 0x1406
  } as any;
};

const createValidShaderSource = (): IShaderSource => ({
  name: 'test-shader',
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
  `,
  version: '1.0'
});

describe('ShaderProgram', () => {
  let mockGL: WebGLRenderingContext;
  let shaderProgram: ShaderProgram;
  let shaderSource: IShaderSource;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    shaderSource = createValidShaderSource();
    shaderProgram = new ShaderProgram(mockGL, shaderSource);
  });

  afterEach(() => {
    shaderProgram.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建着色器程序', () => {
      expect(shaderProgram).toBeDefined();
      expect(shaderProgram.id).toBeDefined();
      expect(shaderProgram.program).toBeDefined();
      expect(shaderProgram.isValid).toBe(true);
    });

    it('应该有属性和uniform映射', () => {
      expect(shaderProgram.attributes).toBeInstanceOf(Map);
      expect(shaderProgram.uniforms).toBeInstanceOf(Map);
    });

    it('应该能够使用着色器程序', () => {
      expect(() => {
        shaderProgram.use(mockGL);
      }).not.toThrow();
    });
  });

  describe('属性和Uniform访问', () => {
    it('应该能够获取属性位置', () => {
      const location = shaderProgram.getAttributeLocation('position');
      expect(typeof location).toBe('number');
    });

    it('应该能够获取uniform位置', () => {
      const location = shaderProgram.getUniformLocation('color');
      expect(location).toBeDefined();
    });

    it('获取不存在的uniform应该返回null', () => {
      const location = shaderProgram.getUniformLocation('nonexistent');
      expect(location).toBeNull();
    });
  });

  describe('Uniform设置', () => {
    it('应该能够设置float uniform', () => {
      expect(() => {
        shaderProgram.setUniform('testFloat', 1.5);
      }).not.toThrow();
    });

    it('应该能够设置vector uniform', () => {
      expect(() => {
        shaderProgram.setUniform('testVec2', [1.0, 2.0]);
        shaderProgram.setUniform('testVec3', [1.0, 2.0, 3.0]);
        shaderProgram.setUniform('testVec4', [1.0, 2.0, 3.0, 4.0]);
      }).not.toThrow();
    });

    it('应该能够设置matrix uniform', () => {
      const matrix4 = new Float32Array(16);
      expect(() => {
        shaderProgram.setUniform('testMatrix', matrix4);
      }).not.toThrow();
    });

    it('设置不存在的uniform应该不抛出异常', () => {
      expect(() => {
        shaderProgram.setUniform('nonexistent', 1.0);
      }).not.toThrow();
    });
  });

  describe('生命周期管理', () => {
    it('应该能够正确释放资源', () => {
      expect(() => {
        shaderProgram.dispose();
      }).not.toThrow();
    });
  });
});

describe('ShaderManager', () => {
  let mockGL: WebGLRenderingContext;
  let shaderManager: ShaderManager;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    shaderManager = new ShaderManager(mockGL);
  });

  afterEach(() => {
    shaderManager.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建着色器管理器', () => {
      expect(shaderManager).toBeDefined();
    });

    it('应该能够创建着色器', () => {
      const shaderSource = createValidShaderSource();
      const shader = shaderManager.createShader(shaderSource);
      
      expect(shader).toBeDefined();
      expect(shader.isValid).toBe(true);
    });

    it('应该能够创建多个不同的着色器', () => {
      const shader1Source = createValidShaderSource();
      shader1Source.name = 'shader1';
      
      const shader2Source = createValidShaderSource();
      shader2Source.name = 'shader2';
      
      const shader1 = shaderManager.createShader(shader1Source);
      const shader2 = shaderManager.createShader(shader2Source);
      
      expect(shader1.id).not.toBe(shader2.id);
    });
  });

  describe('着色器查找', () => {
    it('应该能够通过ID查找着色器', () => {
      const shaderSource = createValidShaderSource();
      const shader = shaderManager.createShader(shaderSource);
      
      const foundShader = shaderManager.getShader(shader.id);
      expect(foundShader).toBe(shader);
    });

    it('应该能够通过名称查找着色器', () => {
      const shaderSource = createValidShaderSource();
      const shader = shaderManager.createShader(shaderSource);
      
      const foundShader = shaderManager.getShaderByName(shaderSource.name);
      expect(foundShader).toBe(shader);
    });

    it('查找不存在的着色器应该返回null', () => {
      expect(shaderManager.getShader('nonexistent')).toBeNull();
      expect(shaderManager.getShaderByName('nonexistent')).toBeNull();
    });
  });

  describe('着色器删除', () => {
    it('应该能够删除着色器', () => {
      const shaderSource = createValidShaderSource();
      const shader = shaderManager.createShader(shaderSource);
      const shaderId = shader.id;
      
      shaderManager.deleteShader(shaderId);
      expect(shaderManager.getShader(shaderId)).toBeNull();
    });

    it('删除不存在的着色器应该不抛出异常', () => {
      expect(() => {
        shaderManager.deleteShader('nonexistent');
      }).not.toThrow();
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', () => {
      const stats = shaderManager.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalShaders).toBe('number');
      expect(typeof stats.validShaders).toBe('number');
      expect(typeof stats.invalidShaders).toBe('number');
    });

    it('创建着色器后统计信息应该更新', () => {
      const statsBefore = shaderManager.getStats();
      
      const shaderSource = createValidShaderSource();
      shaderManager.createShader(shaderSource);
      
      const statsAfter = shaderManager.getStats();
      expect(statsAfter.totalShaders).toBe(statsBefore.totalShaders + 1);
      expect(statsAfter.validShaders).toBe(statsBefore.validShaders + 1);
    });
  });

  describe('生命周期管理', () => {
    it('应该能够正确释放所有资源', () => {
      // 创建一些着色器
      const shader1Source = createValidShaderSource();
      shader1Source.name = 'shader1';
      const shader2Source = createValidShaderSource();
      shader2Source.name = 'shader2';
      
      shaderManager.createShader(shader1Source);
      shaderManager.createShader(shader2Source);
      
      expect(() => {
        shaderManager.dispose();
      }).not.toThrow();
      
      const stats = shaderManager.getStats();
      expect(stats.totalShaders).toBe(0);
    });
  });
});

describe('错误处理', () => {
  describe('ShaderCompilationError', () => {
    it('应该正确创建编译错误', () => {
      const error = new ShaderCompilationError(
        'Compilation failed',
        ShaderType.VERTEX,
        'invalid shader source'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Compilation failed');
      expect(error.shaderType).toBe(ShaderType.VERTEX);
      expect(error.source).toBe('invalid shader source');
    });
  });

  describe('ShaderProgramLinkError', () => {
    it('应该正确创建链接错误', () => {
      const error = new ShaderProgramLinkError('Link failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Link failed');
    });
  });
});