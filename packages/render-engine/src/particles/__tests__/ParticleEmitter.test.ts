/**
 * ParticleEmitter 单元测试
 * 测试粒子发射器的功能
 */

import { ParticleEmitter, EmitterConfig } from '../ParticleEmitter';
import { GPUParticleSystem, ParticleConfig } from '../GPUParticleSystem';
import EventEmitter3 from 'eventemitter3';

// Mock WebGL2RenderingContext for instanceof checks
(global as any).WebGL2RenderingContext = class WebGL2RenderingContext {};

// Mock WebGL context
const createMockWebGLContext = (): WebGLRenderingContext => {
  const mockContext = {
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
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    deleteTexture: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    depthFunc: () => {},
    viewport: () => {},
    clear: () => {},
    clearColor: () => {},
    drawArrays: () => {},
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
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

describe('ParticleEmitter', () => {
  let emitter: ParticleEmitter;
  let mockEventBus: EventEmitter3;
  let mockParticleSystem: GPUParticleSystem;
  let canvas: HTMLCanvasElement;
  
  const defaultConfig: Partial<EmitterConfig> = {
    emissionRate: 10,
    maxParticles: 100,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 1, z: 0 },
    lifeSpan: 2.0,
    startSize: 1.0,
    endSize: 0.5,
    startColor: { r: 1, g: 1, b: 1, a: 1 },
    endColor: { r: 1, g: 1, b: 1, a: 0 },
    emissionMode: 'continuous' as const,
    emissionShape: 'point' as const
  };

  beforeEach(() => {
    canvas = createMockCanvas();
    const particleConfig: ParticleConfig = {
      maxParticles: 1000,
      blendMode: 'normal',
      useTransformFeedback: false
    };
    mockParticleSystem = new GPUParticleSystem(canvas, particleConfig);
    mockEventBus = new EventEmitter3();
    emitter = new ParticleEmitter('test-emitter', mockParticleSystem, defaultConfig);
    emitter.setEventBus(mockEventBus);
  });

  afterEach(() => {
    if (emitter) {
      emitter.dispose();
    }
    if (mockParticleSystem) {
      mockParticleSystem.dispose();
    }
  });

  describe('基本功能', () => {
    it('应该正确创建发射器', () => {
      expect(emitter).toBeDefined();
      expect(emitter.getId()).toBe('test-emitter');
      expect(emitter.getState().isActive).toBe(false);
    });

    it('应该正确设置和获取配置', () => {
      const newConfig: Partial<EmitterConfig> = {
        emissionRate: 20,
        maxParticles: 200
      };
      
      emitter.updateConfig(newConfig);
      
      const config = emitter.getConfig();
      expect(config.emissionRate).toBe(20);
      expect(config.maxParticles).toBe(200);
    });

    it('应该正确设置位置', () => {
      const newConfig: Partial<EmitterConfig> = {
        position: { x: 10, y: 20, z: 30 }
      };
      
      emitter.updateConfig(newConfig);
      
      const config = emitter.getConfig();
      expect(config.position.x).toBe(10);
      expect(config.position.y).toBe(20);
      expect(config.position.z).toBe(30);
    });

    it('应该正确设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      
      expect(() => {
        emitter.setEventBus(newEventBus);
      }).not.toThrow();
    });
  });

  describe('生命周期管理', () => {
    it('应该正确启动发射器', () => {
      expect(emitter.getState().isActive).toBe(false);
      
      emitter.start();
      expect(emitter.getState().isActive).toBe(true);
    });

    it('应该正确停止发射器', () => {
      emitter.start();
      expect(emitter.getState().isActive).toBe(true);
      
      emitter.stop();
      expect(emitter.getState().isActive).toBe(false);
    });

    it('应该正确暂停和恢复发射器', () => {
      emitter.start();
      
      emitter.pause();
      expect(emitter.getState().isPaused).toBe(true);
      
      emitter.resume();
      expect(emitter.getState().isPaused).toBe(false);
    });

    it('应该正确重置发射器', () => {
      emitter.start();
      emitter.update(1.0); // 生成一些粒子
      
      emitter.reset();
      expect(emitter.getState().totalEmittedParticles).toBe(0);
    });
  });

  describe('粒子发射', () => {
    beforeEach(() => {
      emitter.start();
    });

    it('应该根据发射率生成粒子', () => {
      const initialState = emitter.getState();
      
      // 更新一段时间
      emitter.update(0.1);
      
      const finalState = emitter.getState();
      // 由于是连续发射模式，应该有粒子被发射
      expect(finalState.totalEmittedParticles).toBeGreaterThanOrEqual(initialState.totalEmittedParticles);
    });

    it('应该在暂停时停止发射', () => {
      emitter.pause();
      
      const initialState = emitter.getState();
      emitter.update(1.0);
      
      const finalState = emitter.getState();
      expect(finalState.totalEmittedParticles).toBe(initialState.totalEmittedParticles);
    });

    it('应该处理零发射率', () => {
      emitter.updateConfig({ emissionRate: 0 });
      
      const initialState = emitter.getState();
      emitter.update(1.0);
      
      const finalState = emitter.getState();
      expect(finalState.totalEmittedParticles).toBe(initialState.totalEmittedParticles);
    });

    it('应该支持手动发射', () => {
      const initialState = emitter.getState();
      
      const result = emitter.emit(5);
      expect(result).toBe(true);
      
      const finalState = emitter.getState();
      expect(finalState.totalEmittedParticles).toBeGreaterThan(initialState.totalEmittedParticles);
    });
  });

  describe('发射模式', () => {
    it('应该支持连续发射模式', () => {
      emitter.updateConfig({ emissionMode: 'continuous' });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持爆发发射模式', () => {
      emitter.updateConfig({ 
        emissionMode: 'burst',
        burstCount: 10
      });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持单次发射模式', () => {
      emitter.updateConfig({ emissionMode: 'oneshot' });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });
  });

  describe('发射形状', () => {
    it('应该支持点发射', () => {
      emitter.updateConfig({ emissionShape: 'point' });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持线发射', () => {
      emitter.updateConfig({ 
        emissionShape: 'line',
        shapeParams: { length: 10 }
      });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持圆形发射', () => {
      emitter.updateConfig({ 
        emissionShape: 'circle',
        shapeParams: { radius: 5 }
      });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持矩形发射', () => {
      emitter.updateConfig({ 
        emissionShape: 'rectangle',
        shapeParams: { width: 10, height: 5 }
      });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });

    it('应该支持锥形发射', () => {
      emitter.updateConfig({ 
        emissionShape: 'cone',
        shapeParams: { radius: 3, angle: Math.PI / 4 }
      });
      emitter.start();
      
      expect(() => {
        emitter.update(0.1);
      }).not.toThrow();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理负数的deltaTime', () => {
      emitter.start();
      
      expect(() => {
        emitter.update(-1.0);
      }).not.toThrow();
    });

    it('应该处理零deltaTime', () => {
      emitter.start();
      
      expect(() => {
        emitter.update(0);
      }).not.toThrow();
    });

    it('应该处理极大的deltaTime', () => {
      emitter.start();
      
      expect(() => {
        emitter.update(1000);
      }).not.toThrow();
    });

    it('应该处理无效的配置值', () => {
      expect(() => {
        emitter.updateConfig({
          emissionRate: -1,
          maxParticles: -1
        });
      }).not.toThrow();
      
      // 检查配置是否被正确设置（可能包含无效值）
      const config = emitter.getConfig();
      expect(config.emissionRate).toBeDefined();
      expect(config.maxParticles).toBeDefined();
    });

    it('应该处理空的配置更新', () => {
      expect(() => {
        emitter.updateConfig({});
      }).not.toThrow();
    });

    it('应该处理重复的dispose调用', () => {
      expect(() => {
        emitter.dispose();
        emitter.dispose();
      }).not.toThrow();
    });
  });

  describe('状态查询', () => {
    it('应该正确报告发射状态', () => {
      expect(emitter.isEmitting()).toBe(false);
      
      emitter.start();
      expect(emitter.isEmitting()).toBe(true);
      
      emitter.stop();
      expect(emitter.isEmitting()).toBe(false);
    });

    it('应该正确报告完成状态', () => {
      // 对于连续发射模式，不应该完成
      emitter.updateConfig({ emissionMode: 'continuous' });
      emitter.start();
      expect(emitter.isCompleted()).toBe(false);
    });

    it('应该正确获取状态信息', () => {
      const state = emitter.getState();
      
      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('isPaused');
      expect(state).toHaveProperty('totalEmittedParticles');
      expect(state).toHaveProperty('accumulatedTime');
    });
  });

  describe('事件发射', () => {
    it('应该在开始时发射事件', async () => {
      const eventPromise = new Promise((resolve) => {
        mockEventBus.on('emission-started', (data) => {
          expect(data.emitterId).toBe('test-emitter');
          resolve(data);
        });
      });
      
      emitter.start();
      await eventPromise;
    });

    it('应该在停止时发射事件', async () => {
      const eventPromise = new Promise((resolve) => {
        mockEventBus.on('emission-stopped', (data) => {
          expect(data.emitterId).toBe('test-emitter');
          resolve(data);
        });
      });
      
      emitter.start();
      emitter.stop();
      await eventPromise;
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量更新', () => {
      emitter.updateConfig({
        emissionRate: 1000,
        maxParticles: 10000
      });
      
      emitter.start();
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        emitter.update(0.016); // 60fps
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该高效处理频繁的配置更新', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        emitter.updateConfig({
          emissionRate: Math.random() * 100,
          position: { 
            x: Math.random() * 100, 
            y: Math.random() * 100, 
            z: Math.random() * 100 
          }
        });
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('内存管理', () => {
    it('应该正确清理资源', () => {
      emitter.start();
      emitter.update(1.0); // 生成一些粒子
      
      expect(() => {
        emitter.dispose();
      }).not.toThrow();
    });

    it('应该在dispose后停止所有活动', () => {
      emitter.start();
      emitter.dispose();
      
      expect(emitter.getState().isActive).toBe(false);
      expect(() => {
        emitter.update(1.0);
      }).not.toThrow();
    });
  });
});