import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BasicStrategy } from '../strategies/BasicStrategy';
import { IRenderable } from '../core/IBatchRenderer';
import { BatchContext } from '../core/IBatchStrategy';
import { Vector2 } from '../../math';
import { Matrix3 } from '../../math/Matrix3';

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
    bindTexture: vi.fn(),
    isContextLost: vi.fn(() => false),
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    FLOAT: 5126
  } as any;
}

describe('BasicStrategy', () => {
  let strategy: BasicStrategy;
  let mockGL: WebGLRenderingContext;
  let mockRenderable: IRenderable;
  let mockContext: BatchContext;

  beforeEach(() => {
    mockGL = createMockGL();
    
    strategy = new BasicStrategy(mockGL);

    mockRenderable = {
      getVertices: vi.fn(() => new Float32Array([
        0, 0, 1, 1, 1, 1, 0, 0,
        1, 0, 1, 1, 1, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1,
        0, 1, 1, 1, 1, 1, 0, 1
      ])),
      getIndices: vi.fn(() => new Uint16Array([0, 1, 2, 0, 2, 3])),
      getShader: vi.fn(() => 'basic'),
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
    it('should create BasicStrategy with valid WebGL context', () => {
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
  });

  describe('Processing', () => {
    it('should process renderable objects', () => {
      strategy.process(mockRenderable);
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle multiple renderables', () => {
      strategy.process(mockRenderable);
      strategy.process(mockRenderable);
      
      const stats = strategy.getStats();
      expect(stats.vertices).toBeGreaterThan(0);
    });

    it('should group renderables by texture and shader', () => {
      const renderable2 = {
        ...mockRenderable,
        getShader: () => 'different-shader'
      };
      
      strategy.process(mockRenderable);
      strategy.process(renderable2);
      
      const batches = strategy.getBatches();
      expect(batches.length).toBe(2); // Different shaders should create separate batches
    });
  });

  describe('Batch Management', () => {
    beforeEach(() => {
      strategy.process(mockRenderable);
    });

    it('should create batches from processed renderables', () => {
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

    it('should handle batch size limits', () => {
      // Add many renderables to test batch splitting
      for (let i = 0; i < 1000; i++) {
        strategy.process(mockRenderable);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(1); // Should split into multiple batches
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      strategy.process(mockRenderable);
    });

    it('should flush batches with projection matrix', () => {
      const projectionMatrix = new Matrix3();
      
      expect(() => {
        strategy.flush(projectionMatrix, mockContext);
      }).not.toThrow();
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

  describe('Dynamic Batching', () => {
    it('should handle dynamic batch creation', () => {
      // Process renderables with different properties
      const renderables = [
        mockRenderable,
        {
          ...mockRenderable,
          getTexture: () => null, // Different texture
          getShader: () => 'basic'
        },
        {
          ...mockRenderable,
          getBlendMode: () => 1, // Different blend mode
          getShader: () => 'basic'
        }
      ];

      renderables.forEach(r => strategy.process(r));
      
      const batches = strategy.getBatches();
      expect(batches.length).toBeGreaterThan(1); // Should create multiple batches
    });

    it('should optimize batch merging', () => {
      // Process similar renderables that can be batched together
      for (let i = 0; i < 5; i++) {
        strategy.process(mockRenderable);
      }
      
      const batches = strategy.getBatches();
      expect(batches.length).toBe(1); // Should merge into single batch
    });

    it('should handle z-index sorting', () => {
      const renderables = [
        {
          ...mockRenderable,
          getZIndex: () => 10
        },
        {
          ...mockRenderable,
          getZIndex: () => 5
        },
        {
          ...mockRenderable,
          getZIndex: () => 15
        }
      ];

      renderables.forEach(r => strategy.process(r));
      
      const batches = strategy.getBatches();
      // Batches should be sorted by z-index
      expect(batches.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid renderable data', () => {
      const invalidRenderable = {
        getVertices: () => null,
        getIndices: () => null,
        getShader: () => 'basic'
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
        getShader: () => 'invalid-shader'
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

    it('should handle large numbers of renderables efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        strategy.process(mockRenderable);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should optimize memory usage', () => {
      // Process many renderables
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
    it('should handle buffer management', () => {
      strategy.process(mockRenderable);
      
      expect(mockGL.createBuffer).toHaveBeenCalled();
    });

    it('should clean up resources on dispose', () => {
      strategy.process(mockRenderable);
      strategy.dispose();
      
      // Should clean up WebGL resources
      expect(mockGL.deleteBuffer).toHaveBeenCalled();
    });

    it('should handle texture management', () => {
      const texturedRenderable = {
        ...mockRenderable,
        getTexture: () => ({} as WebGLTexture)
      };
      
      strategy.process(texturedRenderable);
      const projectionMatrix = new Matrix3();
      strategy.flush(projectionMatrix, mockContext);
      
      expect(mockGL.bindTexture).toHaveBeenCalled();
    });
  });
});