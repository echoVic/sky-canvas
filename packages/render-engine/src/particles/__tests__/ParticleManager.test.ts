/**
 * ParticleManager 单元测试
 * 测试粒子系统管理器的功能
 */

import { ParticleManager } from '../ParticleManager';
import EventEmitter3 from 'eventemitter3';

// Mock WebGL2RenderingContext for instanceof checks
(global as any).WebGL2RenderingContext = class WebGL2RenderingContext {};

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

const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getContext', {
    value: (type: string) => {
      if (type === 'webgl2' || type === 'webgl') {
        return createMockWebGLContext();
      }
      return null;
    },
    configurable: true
  });
  return canvas;
};

describe('ParticleManager', () => {
  let manager: ParticleManager;
  let mockCanvas: HTMLCanvasElement;
  let mockEventBus: EventEmitter3;

  beforeEach(() => {
    manager = new ParticleManager();
    mockCanvas = createMockCanvas();
    mockEventBus = new EventEmitter3();
  });

  describe('基本功能', () => {
    it('应该正确创建管理器实例', () => {
      expect(manager).toBeInstanceOf(ParticleManager);
    });

    it('应该正确设置事件总线', () => {
      expect(() => {
        manager.setEventBus(mockEventBus);
      }).not.toThrow();
    });
  });

  describe('粒子系统管理', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    it('应该正确创建粒子系统', () => {
      const systemId = 'test-system';
      
      expect(() => {
        const system = manager.createParticleSystem(systemId, mockCanvas, validConfig);
        expect(manager.getParticleSystem(systemId)).toBe(system);
      }).not.toThrow();
    });

    it('应该正确删除粒子系统', () => {
      const systemId = 'test-system';
      manager.createParticleSystem(systemId, mockCanvas, validConfig);
      
      const result = manager.removeParticleSystem(systemId);
      
      expect(result).toBe(true);
      expect(manager.getParticleSystem(systemId)).toBeUndefined();
    });

    it('应该返回false当删除不存在的系统', () => {
      const result = manager.removeParticleSystem('non-existent');
      
      expect(result).toBe(false);
    });

    it('应该抛出错误当创建重复ID的系统', () => {
      const systemId = 'duplicate-system';
      manager.createParticleSystem(systemId, mockCanvas, validConfig);
      
      expect(() => {
        manager.createParticleSystem(systemId, mockCanvas, validConfig);
      }).toThrow();
    });
  });

  describe('发射器管理', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    beforeEach(() => {
      manager.createParticleSystem('test-system', mockCanvas, validConfig);
    });

    it('应该正确创建发射器', () => {
      const emitterId = 'test-emitter';
      const systemId = 'test-system';
      const config = { 
        emissionRate: 10,
        position: { x: 0, y: 0, z: 0 }
      };
      
      expect(() => {
        const emitter = manager.createEmitter(emitterId, systemId, config);
        expect(manager.getEmitter(emitterId)).toBe(emitter);
      }).not.toThrow();
    });

    it('应该正确创建发射器', () => {
      const systemId = 'test-system';
      const emitterId = 'test-emitter';
      const emitter = manager.createEmitter(emitterId, systemId);
      
      expect(manager.getEmitter(emitterId)).toBe(emitter);
    });

    it('应该正确删除发射器', () => {
      const systemId = 'test-system';
      const emitterId = 'test-emitter';
      
      manager.createEmitter(emitterId, systemId);
      
      const result = manager.removeEmitter(emitterId);
      
      expect(result).toBe(true);
      expect(manager.getEmitter(emitterId)).toBeUndefined();
    });

    it('应该返回false当删除不存在的发射器', () => {
      const result = manager.removeEmitter('non-existent');
      
      expect(result).toBe(false);
    });

    it('应该抛出错误当为不存在的系统创建发射器', () => {
      expect(() => {
        manager.createEmitter('test-emitter', 'non-existent-system');
      }).toThrow();
    });

    it('应该抛出错误当创建重复ID的发射器', () => {
      const emitterId = 'duplicate-emitter';
      manager.createEmitter(emitterId, 'test-system');
      
      expect(() => {
        manager.createEmitter(emitterId, 'test-system');
      }).toThrow();
    });
  });

  describe('生命周期管理', () => {
    it('应该正确启动管理器', () => {
      expect(() => {
        manager.start();
      }).not.toThrow();
    });

    it('应该正确停止管理器', () => {
      expect(() => {
        manager.stop();
      }).not.toThrow();
    });

    it('应该正确暂停管理器', () => {
      expect(() => {
        manager.pause();
      }).not.toThrow();
    });

    it('应该正确恢复管理器', () => {
      expect(() => {
        manager.resume();
      }).not.toThrow();
    });

    it('应该正确更新管理器', () => {
      expect(() => {
        manager.update(16.67); // 60fps
      }).not.toThrow();
    });

    it('应该正确渲染', () => {
      const mvpMatrix = new Float32Array(16);
      expect(() => {
        manager.render(mvpMatrix);
      }).not.toThrow();
    });

    it('应该正确清理', () => {
      expect(() => {
        manager.clear();
      }).not.toThrow();
    });
  });

  describe('统计信息', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    beforeEach(() => {
      manager.createParticleSystem('system1', mockCanvas, validConfig);
      manager.createParticleSystem('system2', mockCanvas, validConfig);
      manager.createEmitter('emitter1', 'system1');
      manager.createEmitter('emitter2', 'system2');
    });

    it('应该正确返回统计信息', () => {
      const stats = manager.getStats();
      
      expect(stats).toHaveProperty('systemCount');
      expect(stats).toHaveProperty('emitterCount');
      expect(stats).toHaveProperty('totalParticles');
      expect(stats).toHaveProperty('maxParticles');
      expect(stats).toHaveProperty('activeEmitters');
      expect(typeof stats.systemCount).toBe('number');
    });
  });

  describe('批量操作', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    beforeEach(() => {
      manager.createParticleSystem('test-system', mockCanvas, validConfig);
    });

    it('应该正确创建发射器组', () => {
      const systemId = 'test-system';
      const emitterConfigs = [
        { id: 'emitter1', config: { emissionRate: 10, position: { x: 0, y: 0, z: 0 } } },
        { id: 'emitter2', config: { emissionRate: 20, position: { x: 0, y: 0, z: 0 } } }
      ];
      
      expect(() => {
        const emitters = manager.createEmitterGroup('group1', systemId, emitterConfigs);
        expect(emitters).toHaveLength(2);
      }).not.toThrow();
    });

    it('应该正确删除发射器组', () => {
      const systemId = 'test-system';
      const emitterConfigs = [
        { id: 'emitter1', config: { emissionRate: 10 } },
        { id: 'emitter2', config: { emissionRate: 20 } }
      ];
      
      manager.createEmitterGroup('group1', systemId, emitterConfigs);
      
      const removedCount = manager.removeEmitterGroup('group1');
      
      expect(removedCount).toBe(2);
    });
  });

  describe('预设效果', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    beforeEach(() => {
      manager.createParticleSystem('test-system', mockCanvas, validConfig);
    });

    it('应该正确创建预设效果', () => {
      expect(() => {
        const emitters = manager.createPresetEffect(
          'effect1',
          'test-system',
          'explosion',
          { x: 0, y: 0, z: 0 }
        );
        expect(Array.isArray(emitters)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('事件处理', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    it('应该正确为新系统设置事件总线', () => {
      expect(() => {
        manager.setEventBus(mockEventBus);
        manager.createParticleSystem('test-system', mockCanvas, validConfig);
      }).not.toThrow();
    });

    it('应该正确为新发射器设置事件总线', () => {
      expect(() => {
        manager.setEventBus(mockEventBus);
        manager.createParticleSystem('test-system', mockCanvas, validConfig);
        manager.createEmitter('test-emitter', 'test-system');
      }).not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的系统ID', () => {
      expect(() => {
        manager.getParticleSystem('');
      }).not.toThrow();
    });

    it('应该处理空的发射器ID', () => {
      expect(() => {
        manager.getEmitter('');
      }).not.toThrow();
    });

    it('应该处理负数的deltaTime', () => {
      expect(() => {
        manager.update(-1);
      }).not.toThrow();
    });
  });

  describe('资源清理', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    it('应该正确清理所有资源', () => {
      manager.createParticleSystem('system1', mockCanvas, validConfig);
      manager.createEmitter('emitter1', 'system1');
      
      expect(() => {
        manager.dispose();
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    const validConfig = {
      maxParticles: 1000,
      blendMode: 'normal' as const,
      useTransformFeedback: false
    };

    it('应该能处理大量系统创建', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        manager.createParticleSystem(`system-${i}`, mockCanvas, validConfig);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能处理频繁的更新调用', () => {
      manager.createParticleSystem('test-system', mockCanvas, validConfig);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        manager.update(16.67);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});