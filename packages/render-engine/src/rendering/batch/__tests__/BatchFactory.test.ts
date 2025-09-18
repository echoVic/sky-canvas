/**
 * BatchFactory 单元测试
 * 测试批处理工厂函数的创建和配置功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createBasicBatchManager,
  createEnhancedBatchManager,
  createInstancedBatchManager,
  createBatchManagerWithDefaultStrategies
} from '../BatchFactory';
import { BatchManager } from '../core/BatchManager';
import { BasicStrategy } from '../strategies/BasicStrategy';
import { EnhancedStrategy } from '../strategies/EnhancedStrategy';
import { InstancedStrategy } from '../strategies/InstancedStrategy';

// Mock WebGL context
const createMockGL = (): WebGLRenderingContext => ({
  canvas: { width: 800, height: 600 },
  getParameter: vi.fn().mockReturnValue(65536),
  getExtension: vi.fn().mockReturnValue(null),
  createBuffer: vi.fn().mockReturnValue({}),
  createTexture: vi.fn().mockReturnValue({}),
  createShader: vi.fn().mockReturnValue({}),
  createProgram: vi.fn().mockReturnValue({}),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  useProgram: vi.fn(),
  drawElements: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn()
} as any);

// Mock strategies
vi.mock('../strategies/BasicStrategy');
vi.mock('../strategies/EnhancedStrategy');
vi.mock('../strategies/InstancedStrategy');

describe('BatchFactory', () => {
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = createMockGL();
    vi.clearAllMocks();
  });

  describe('createBasicBatchManager', () => {
    it('should create a batch manager with basic strategy', () => {
      const manager = createBasicBatchManager(gl);
      
      expect(manager).toBeInstanceOf(BatchManager);
      expect(manager.getAvailableStrategies()).toContain('basic');
      expect(manager.getCurrentStrategy()).toBe('basic');
      
      manager.dispose();
    });

    it('should create manager with custom config', () => {
      const config = {
        maxBatchSize: 2000,
        enableProfiling: false,
        defaultStrategy: 'basic'
      };
      
      const manager = createBasicBatchManager(gl, config);
      
      expect(manager).toBeInstanceOf(BatchManager);
      expect(manager.getCurrentStrategy()).toBe('basic');
      
      manager.dispose();
    });
  });

  describe('createEnhancedBatchManager', () => {
    it('should create a batch manager with enhanced strategy', () => {
      const manager = createEnhancedBatchManager(gl);
      
      expect(manager).toBeInstanceOf(BatchManager);
      expect(manager.getAvailableStrategies()).toContain('enhanced');
      expect(manager.getCurrentStrategy()).toBe('enhanced');
      
      manager.dispose();
    });

    it('should include basic strategy as fallback', () => {
      const manager = createEnhancedBatchManager(gl);
      
      expect(manager.getAvailableStrategies()).toContain('basic');
      expect(manager.getAvailableStrategies()).toContain('enhanced');
      
      manager.dispose();
    });
  });

  describe('createInstancedBatchManager', () => {
    it('should create a batch manager with instanced strategy', () => {
      const manager = createInstancedBatchManager(gl);
      
      expect(manager).toBeInstanceOf(BatchManager);
      expect(manager.getAvailableStrategies()).toContain('instanced');
      expect(manager.getCurrentStrategy()).toBe('instanced');
      
      manager.dispose();
    });

    it('should include basic strategy as fallback', () => {
      const manager = createInstancedBatchManager(gl);
      
      expect(manager.getAvailableStrategies()).toContain('basic');
      expect(manager.getAvailableStrategies()).toContain('instanced');
      
      manager.dispose();
    });
  });

  describe('createBatchManagerWithDefaultStrategies', () => {
    it('should create manager with all default strategies', () => {
      const manager = createBatchManagerWithDefaultStrategies(gl);
      
      expect(manager).toBeInstanceOf(BatchManager);
      expect(manager.getAvailableStrategies()).toContain('basic');
      expect(manager.getAvailableStrategies()).toContain('enhanced');
      expect(manager.getAvailableStrategies()).toContain('instanced');
      expect(manager.getCurrentStrategy()).toBe('basic');
      
      manager.dispose();
    });

    it('should allow strategy switching', () => {
      const manager = createBatchManagerWithDefaultStrategies(gl);
      
      expect(manager.setStrategy('enhanced')).toBe(true);
      expect(manager.getCurrentStrategy()).toBe('enhanced');
      
      expect(manager.setStrategy('instanced')).toBe(true);
      expect(manager.getCurrentStrategy()).toBe('instanced');
      
      expect(manager.setStrategy('basic')).toBe(true);
      expect(manager.getCurrentStrategy()).toBe('basic');
      
      manager.dispose();
    });

    it('should handle invalid strategy names', () => {
      const manager = createBatchManagerWithDefaultStrategies(gl);
      
      expect(manager.setStrategy('nonexistent')).toBe(false);
      expect(manager.getCurrentStrategy()).toBe('basic'); // Should remain unchanged
      
      manager.dispose();
    });
  });

  describe('Error handling', () => {
    it('should handle WebGL context creation failures gracefully', () => {
      const invalidGL = null as any;
      
      expect(() => {
        createBasicBatchManager(invalidGL);
      }).toThrow();
    });

    it('should handle strategy registration failures', () => {
      // Mock strategy constructor to throw
      const MockBasicStrategy = vi.mocked(BasicStrategy);
      MockBasicStrategy.mockImplementationOnce(() => {
        throw new Error('Strategy creation failed');
      });
      
      expect(() => {
        createBasicBatchManager(gl);
      }).toThrow('Strategy creation failed');
    });
  });

  describe('Resource management', () => {
    it('should properly dispose all created managers', () => {
      const managers = [
        createBasicBatchManager(gl),
        createEnhancedBatchManager(gl),
        createInstancedBatchManager(gl),
        createBatchManagerWithDefaultStrategies(gl)
      ];
      
      managers.forEach(manager => {
        const disposeSpy = vi.spyOn(manager, 'dispose');
        manager.dispose();
        expect(disposeSpy).toHaveBeenCalled();
      });
    });
  });
});