/**
 * GPUParticleSystem 单元测试
 * 测试GPU加速粒子系统的功能
 */

import { GPUParticleSystem, ParticleConfig, ParticleData } from '../GPUParticleSystem';
import EventEmitter3 from 'eventemitter3';

// Mock WebGL2RenderingContext for instanceof checks
(global as any).WebGL2RenderingContext = class WebGL2RenderingContext {};

// Mock WebGL context
const createMockWebGLContext = (): WebGLRenderingContext => {
  const mockContext = {
    // 基本WebGL方法
    getContext: () => mockContext,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    useProgram: () => {},
    deleteProgram: () => {},
    deleteShader: () => {},
    
    // 缓冲区管理
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
    
    // 纹理管理
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    deleteTexture: () => {},
    
    // 顶点数组对象
    createVertexArray: () => ({}),
    bindVertexArray: () => {},
    deleteVertexArray: () => {},
    
    // 属性和uniform
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
    
    // 渲染状态
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    blendEquation: () => {},
    depthFunc: () => {},
    viewport: () => {},
    clear: () => {},
    clearColor: () => {},
    
    // 绘制
    drawArrays: () => {},
    drawElements: () => {},
    
    // 常量
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE: 1,
    DEPTH_TEST: 2929,
    LEQUAL: 515,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    TRIANGLES: 4,
    FLOAT: 5126
  } as any;
  
  return mockContext;
};

// Mock canvas
const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = {
    getContext: (type: string) => {
      if (type === 'webgl' || type === 'webgl2') {
        return createMockWebGLContext();
      }
      return null;
    },
    width: 800,
    height: 600
  } as any;
  
  return canvas;
};

describe('GPUParticleSystem', () => {
  let canvas: HTMLCanvasElement;
  let particleSystem: GPUParticleSystem;
  let mockEventBus: EventEmitter3;
  
  const defaultConfig: ParticleConfig = {
    maxParticles: 1000,
    blendMode: 'normal',
    useTransformFeedback: false
  };

  beforeEach(() => {
    canvas = createMockCanvas();
    mockEventBus = new EventEmitter3();
  });

  afterEach(() => {
    if (particleSystem) {
      particleSystem.dispose();
    }
  });

  describe('基本功能', () => {
    it('应该正确创建粒子系统', () => {
      expect(() => {
        particleSystem = new GPUParticleSystem(canvas, defaultConfig);
      }).not.toThrow();
      
      expect(particleSystem).toBeDefined();
      expect(particleSystem.getMaxParticleCount()).toBe(1000);
    });

    it('应该正确设置事件总线', () => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
      
      expect(() => {
        particleSystem.setEventBus(mockEventBus);
      }).not.toThrow();
    });

    it('应该抛出错误当WebGL不支持时', () => {
      const invalidCanvas = {
        getContext: () => null
      } as any;
      
      expect(() => {
        new GPUParticleSystem(invalidCanvas, defaultConfig);
      }).toThrow('WebGL not supported');
    });
  });

  describe('粒子生成', () => {
    beforeEach(() => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
    });

    it('应该能够生成粒子', () => {
      const particleData: Partial<ParticleData>[] = [
        {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 1, y: 1, z: 0 },
          life: 1.0,
          maxLife: 1.0,
          size: 1.0,
          color: { r: 1, g: 1, b: 1, a: 1 }
        }
      ];
      
      const result = particleSystem.spawnParticles(1, particleData);
      expect(result).toBe(true);
      expect(particleSystem.getAliveParticleCount()).toBe(1);
    });

    it('应该处理超出最大粒子数的生成请求', () => {
      const particleData: Partial<ParticleData>[] = [];
      for (let i = 0; i < 1500; i++) {
        particleData.push({
          position: { x: 0, y: 0, z: 0 },
          life: 1.0,
          maxLife: 1.0
        });
      }
      
      const result = particleSystem.spawnParticles(1500, particleData);
      expect(result).toBe(false);
    });

    it('应该处理空的粒子数据数组', () => {
      const result = particleSystem.spawnParticles(0, []);
      expect(result).toBe(true);
    });

    it('应该处理不完整的粒子数据', () => {
      const particleData: Partial<ParticleData>[] = [
        {
          position: { x: 0, y: 0, z: 0 }
          // 缺少其他属性
        }
      ];
      
      const result = particleSystem.spawnParticles(1, particleData);
      expect(result).toBe(true);
    });
  });

  describe('生命周期管理', () => {
    beforeEach(() => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
    });

    it('应该正确启动粒子系统', () => {
      expect(() => {
        particleSystem.start();
      }).not.toThrow();
    });

    it('应该正确停止粒子系统', () => {
      particleSystem.start();
      
      expect(() => {
        particleSystem.stop();
      }).not.toThrow();
    });

    it('应该正确更新粒子系统', () => {
      expect(() => {
        particleSystem.update(16.67); // 60fps
      }).not.toThrow();
    });

    it('应该正确渲染粒子', () => {
      const mvpMatrix = new Float32Array(16);
      
      expect(() => {
        particleSystem.render(mvpMatrix);
      }).not.toThrow();
    });

    it('应该正确清理粒子', () => {
      expect(() => {
        particleSystem.clear();
      }).not.toThrow();
      
      expect(particleSystem.getAliveParticleCount()).toBe(0);
    });
  });

  describe('混合模式', () => {
    it('应该支持不同的混合模式', () => {
      const configs: ParticleConfig[] = [
        { ...defaultConfig, blendMode: 'normal' },
        { ...defaultConfig, blendMode: 'additive' },
        { ...defaultConfig, blendMode: 'multiply' },
        { ...defaultConfig, blendMode: 'screen' }
      ];
      
      configs.forEach(config => {
        expect(() => {
          const system = new GPUParticleSystem(canvas, config);
          system.dispose();
        }).not.toThrow();
      });
    });
  });

  describe('Transform Feedback', () => {
    it('应该支持Transform Feedback模式', () => {
      const config: ParticleConfig = {
        ...defaultConfig,
        useTransformFeedback: true
      };
      
      expect(() => {
        particleSystem = new GPUParticleSystem(canvas, config);
      }).not.toThrow();
    });
  });

  describe('边界情况和错误处理', () => {
    beforeEach(() => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
    });

    it('应该处理负数的deltaTime', () => {
      expect(() => {
        particleSystem.update(-1);
      }).not.toThrow();
    });

    it('应该处理零deltaTime', () => {
      expect(() => {
        particleSystem.update(0);
      }).not.toThrow();
    });

    it('应该处理极大的deltaTime', () => {
      expect(() => {
        particleSystem.update(1000);
      }).not.toThrow();
    });

    it('应该处理无效的MVP矩阵', () => {
      expect(() => {
        particleSystem.render(null as any);
      }).not.toThrow();
    });

    it('应该处理重复的dispose调用', () => {
      expect(() => {
        particleSystem.dispose();
        particleSystem.dispose();
      }).not.toThrow();
    });
  });

  describe('事件发射', () => {
    beforeEach(() => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
      particleSystem.setEventBus(mockEventBus);
    });

    it('应该在生成粒子时发射事件', async () => {
      const eventPromise = new Promise((resolve) => {
        mockEventBus.on('particles-spawned', (data) => {
          expect(data.count).toBe(1);
          resolve(data);
        });
      });
      
      const particleData: Partial<ParticleData>[] = [{
        position: { x: 0, y: 0, z: 0 },
        life: 1.0,
        maxLife: 1.0
      }];
      
      particleSystem.spawnParticles(1, particleData);
      await eventPromise;
    });

    it('应该在缓冲区溢出时发射事件', async () => {
      const eventPromise = new Promise((resolve) => {
        mockEventBus.on('buffer-overflow', (data) => {
          expect(data.requestedCount).toBeGreaterThan(data.maxCount);
          resolve(data);
        });
      });
      
      const particleData: Partial<ParticleData>[] = [];
      for (let i = 0; i < 1500; i++) {
        particleData.push({ position: { x: 0, y: 0, z: 0 } });
      }
      
      particleSystem.spawnParticles(1500, particleData);
      await eventPromise;
    });
  });

  describe('性能测试', () => {
    beforeEach(() => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
    });

    it('应该高效处理大量粒子更新', () => {
      // 生成大量粒子
      const particleData: Partial<ParticleData>[] = [];
      for (let i = 0; i < 1000; i++) {
        particleData.push({
          position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
          velocity: { x: Math.random() * 10, y: Math.random() * 10, z: 0 },
          life: 1.0,
          maxLife: 1.0
        });
      }
      
      particleSystem.spawnParticles(1000, particleData);
      
      const startTime = performance.now();
      
      // 执行多次更新
      for (let i = 0; i < 100; i++) {
        particleSystem.update(16.67);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该高效处理频繁的渲染调用', () => {
      const mvpMatrix = new Float32Array(16);
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        particleSystem.render(mvpMatrix);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('资源管理', () => {
    it('应该正确清理WebGL资源', () => {
      particleSystem = new GPUParticleSystem(canvas, defaultConfig);
      
      expect(() => {
        particleSystem.dispose();
      }).not.toThrow();
    });

    it('应该处理纹理加载', () => {
      const configWithTexture: ParticleConfig = {
        ...defaultConfig,
        textureUrl: 'test-texture.png'
      };
      
      expect(() => {
        particleSystem = new GPUParticleSystem(canvas, configWithTexture);
      }).not.toThrow();
    });
  });
});