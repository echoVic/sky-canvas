import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstancedStrategy } from '../strategies/InstancedStrategy';
import { IRenderable } from '../core/IBatchRenderer';
import { BatchContext } from '../core/IBatchStrategy';
import { Vector2 } from '../../../math';
import { Matrix3 } from '../../../math/Matrix3';

// Mock WebGL context
function createMockGL(): WebGLRenderingContext {
  return {
    createBuffer: vi.fn(() => ({} as WebGLBuffer)),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),
    createVertexArray: vi.fn(() => ({} as any)),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawElements: vi.fn(),
    drawElementsInstanced: vi.fn(),
    bindTexture: vi.fn(),
    isContextLost: vi.fn(() => false),
    getExtension: vi.fn(() => ({
      drawElementsInstancedANGLE: vi.fn(),
      vertexAttribDivisorANGLE: vi.fn()
    })),
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    FLOAT: 5126
  } as any;
}

describe('InstancedStrategy', () => {
  let strategy: InstancedStrategy;
  let mockGL: WebGLRenderingContext;
  let mockRenderable: IRenderable;
  let mockContext: BatchContext;

  beforeEach(() => {
    mockGL = createMockGL();
    strategy = new InstancedStrategy(mockGL);

    mockRenderable = {
      getVertices: vi.fn(() => new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 0, 0, 1, 1, 0,
        1, 1, 1, 0, 0, 1, 1, 1,
        0, 1, 1, 0, 0, 1, 0, 1
      ])),
      getIndices: vi.fn(() => new Uint16Array([0, 1, 2, 0, 2, 3])),
      getShader: vi.fn(() => 'instanced'),
      getTexture: vi.fn(() => null),
      getBlendMode: vi.fn(() => 0),
      getZIndex: vi.fn(() => 0)
    };

    mockContext = {
      gl: mockGL,
      maxBatchSize: 1000,
      currentFrame: 1
    };
  });

  describe('Initialization', () => {
    it('should create InstancedStrategy with valid WebGL context', () => {
      expect(strategy).toBeDefined();
    });

    it('should initialize with empty batches', () => {
      const batches = strategy.getBatches();
      expect(batches).toEqual([]);
    });

    it('should initialize with zero stats', () => {
      const stats = strategy.getStats();
      expect(stats.drawCalls).toBe(0);
      expect(stats.triangles).toBe(0);
      expect(stats.vertices).toBe(0);
      expect(stats.batches).toBe(0);
    });

    it('should check for instancing extension', () => {
      expect(mockGL.getExtension).toHaveBeenCalledWith('ANGLE_instanced_arrays');
    });
  });

  describe('Processing', () => {
    it('should process renderable objects for instancing', () => {
      strategy.process(mockRenderable);
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle multiple instances of same renderable', () => {
      strategy.process(mockRenderable);
      strategy.process(mockRenderable);
      strategy.process(mockRenderable);
      
      const stats = strategy.getStats();
      expect(stats.vertices).toBeGreaterThan(0);
    });

    it('should group instances by geometry and material', () => {
      const renderable2 = {
        ...mockRenderable,
        getShader: () => 'different-shader'
      };
      
      strategy.process(mockRenderable);
      strategy.process(mockRenderable); // Same geometry, should instance
      strategy.process(renderable2); // Different shader, separate batch
      
      const batches = strategy.getBatches();
      expect(batches.length).toBe(2); // Should create separate batches
    });

    it('should handle instance data generation', () => {
      strategy.process(mockRenderable);
      
      const batches = strategy.getBatches();
      expect(batches[0]).toBeDefined();
      expect(batches[0].vertices.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Management', () => {
    beforeEach(() => {
      strategy.process(mockRenderable);
    });

    it('should create instanced batches from processed renderables', () => {
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
      expect(batches[0].vertices.length).toBeGreaterThan(0);
      expect(batches[0].indices.length).toBeGreaterThan(0);
    });

    it('should clear batches when requested', () => {
      strategy.clear();
      
      const batches = strategy.getBatches();
      expect(batches).toEqual([]);
      
      const stats = strategy.getStats();
      expect(stats.vertices).toBe(0);
    });

    it('should handle instance count limits', () => {
      // Add many instances to test batch splitting
      for (let i = 0; i < 1000; i++) {
        strategy.process(mockRenderable);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should optimize instance data packing', () => {
      // Process multiple instances
      for (let i = 0; i < 10; i++) {
        strategy.process(mockRenderable);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBe(1); // Should pack into single batch
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      strategy.process(mockRenderable);
    });

    it('should flush instanced batches with projection matrix', () => {
      const projectionMatrix = new Matrix3();
      
      expect(() => {
        strategy.flush(projectionMatrix, mockContext);
      }).not.toThrow();
    });

    it('should use instanced drawing calls', () => {
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      // Should use instanced drawing
      const ext = mockGL.getExtension('ANGLE_instanced_arrays');
      if (ext) {
        expect(ext.drawElementsInstancedANGLE).toHaveBeenCalled();
      }
    });

    it('should update stats after flush', () => {
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      const stats = strategy.getStats();
      expect(stats.drawCalls).toBeGreaterThan(0);
    });

    it('should handle empty batches during flush', () => {
      strategy.clear();
      const projectionMatrix = new Matrix3();
      
      expect(() => {
        strategy.flush(projectionMatrix, mockContext);
      }).not.toThrow();
    });

    it('should bind correct textures during rendering', () => {
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      expect(mockGL.bindTexture).toHaveBeenCalled();
    });
  });

  describe('Instancing Features', () => {
    it('should handle instance transformations', () => {
      // Create renderables with different transforms
      const instances = [];
      for (let i = 0; i < 5; i++) {
        const instance = {
          ...mockRenderable,
          getVertices: vi.fn(() => new Float32Array([
            i, i, 1, 0, 0, 1, 0, 0,
            i+1, i, 1, 0, 0, 1, 1, 0,
            i+1, i+1, 1, 0, 0, 1, 1, 1,
            i, i+1, 1, 0, 0, 1, 0, 1
          ]))
        };
        instances.push(instance);
        strategy.process(instance);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle instance colors', () => {
      const coloredInstances = [];
      for (let i = 0; i < 3; i++) {
        const instance = {
          ...mockRenderable,
          getVertices: vi.fn(() => new Float32Array([
            0, 0, i/3, 0, 0, 1, 0, 0,
            1, 0, i/3, 0, 0, 1, 1, 0,
            1, 1, i/3, 0, 0, 1, 1, 1,
            0, 1, i/3, 0, 0, 1, 0, 1
          ]))
        };
        coloredInstances.push(instance);
        strategy.process(instance);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle instance texture coordinates', () => {
      const texturedInstance = {
        ...mockRenderable,
        getTexture: () => ({} as WebGLTexture)
      };
      
      strategy.process(texturedInstance);
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing instancing extension', () => {
      const noExtGL = {
        ...mockGL,
        getExtension: vi.fn(() => null)
      };
      
      expect(() => {
        new InstancedStrategy(noExtGL);
      }).not.toThrow(); // Should fallback gracefully
    });

    it('should handle invalid instance data', () => {
      const invalidRenderable = {
        getVertices: () => null,
        getIndices: () => null,
        getShader: () => 'instanced'
      } as any;

      expect(() => {
        strategy.process(invalidRenderable);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle WebGL context loss', () => {
      // Simulate context loss
      mockGL.isContextLost = vi.fn(() => true);
      
      const projectionMatrix = new Matrix3();
      expect(() => {
        strategy.flush(projectionMatrix, mockContext);
      }).not.toThrow();
    });

    it('should handle shader compilation errors', () => {
      const errorRenderable = {
        ...mockRenderable,
        getShader: () => 'invalid-instanced-shader'
      };

      expect(() => {
        strategy.process(errorRenderable);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should maintain performance stats', () => {
      strategy.process(mockRenderable);
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      const stats = strategy.getStats();
      expect(stats.drawCalls).toBeGreaterThan(0);
      expect(stats.vertices).toBeGreaterThan(0);
      expect(stats.triangles).toBeGreaterThan(0);
    });

    it('should reduce draw calls through instancing', () => {
      // Process many similar instances
      for (let i = 0; i < 100; i++) {
        strategy.process(mockRenderable);
      }
      
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      const stats = strategy.getStats();
      // Should have fewer draw calls than instances
      expect(stats.drawCalls).toBeLessThan(100);
    });

    it('should handle large numbers of instances efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        strategy.process(mockRenderable);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
    });

    it('should optimize memory usage for instances', () => {
      // Process many instances
      for (let i = 0; i < 100; i++) {
        strategy.process(mockRenderable);
      }
      
      // Clear and verify memory is released
      strategy.clear();
      const stats = strategy.getStats();
      expect(stats.vertices).toBe(0);
    });
  });

  describe('Resource Management', () => {
    it('should handle instance buffer management', () => {
      strategy.process(mockRenderable);
      
      expect(mockGL.createBuffer).toHaveBeenCalled();
    });

    it('should clean up resources on dispose', () => {
      strategy.process(mockRenderable);
      strategy.dispose();
      
      // Should clean up WebGL resources
      expect(mockGL.deleteBuffer).toHaveBeenCalled();
    });

    it('should handle instance texture management', () => {
      const texturedRenderable = {
        ...mockRenderable,
        getTexture: () => ({} as WebGLTexture)
      };
      
      strategy.process(texturedRenderable);
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      expect(mockGL.bindTexture).toHaveBeenCalled();
    });

    it('should handle vertex array objects for instancing', () => {
      strategy.process(mockRenderable);
      
      // VAO creation might be handled by extensions
      expect(mockGL.createBuffer).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should handle different instance limits', () => {
      // Test with different batch sizes
      const smallBatchContext = {
        ...mockContext,
        maxBatchSize: 10
      };
      
      for (let i = 0; i < 20; i++) {
        strategy.process(mockRenderable);
      }
      
      const projectionMatrix = new Matrix3();
      expect(() => {
        strategy.flush(projectionMatrix, smallBatchContext);
      }).not.toThrow();
    });

    it('should handle instance data stride configuration', () => {
      strategy.process(mockRenderable);
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });
  });
});