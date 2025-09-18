/**
 * BatchBuffer 单元测试
 * 测试批量渲染缓冲区管理功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchBuffer } from '../core/BatchBuffer';
import { WebGLResourceManager } from '../../../resources/ResourceManager';
import { BatchConfig, BatchVertex } from '../types/BatchTypes';
import { Vector2 } from '../../../math';
import { Buffer, BufferType } from '../../../core/webgl/types';

// Mock WebGLResourceManager
vi.mock('../../resources/ResourceManager');

// Mock WebGL context
const createMockGL = (): WebGLRenderingContext => ({
  canvas: { width: 800, height: 600 },
  getParameter: vi.fn().mockReturnValue(65536),
  getExtension: vi.fn().mockReturnValue(null),
  createBuffer: vi.fn().mockReturnValue({}),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  bufferSubData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  deleteBuffer: vi.fn(),
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  DYNAMIC_DRAW: 35048
} as any);

// Mock Buffer
const createMockBuffer = (): Buffer => ({
  id: 'test-buffer',
  type: BufferType.VERTEX,
  size: 1024,
  usage: 'static',
  bind: vi.fn(),
  unbind: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn()
} as any);

describe('BatchBuffer', () => {
  let gl: WebGLRenderingContext;
  let mockResourceManager: WebGLResourceManager;
  let batchBuffer: BatchBuffer;
  let config: BatchConfig;

  beforeEach(() => {
    gl = createMockGL();
    
    // Mock ResourceManager
    mockResourceManager = {
      createBuffer: vi.fn().mockReturnValue(createMockBuffer()),
      dispose: vi.fn()
    } as any;
    
    config = {
      maxVertices: 1000,
      maxIndices: 1500,
      maxTextures: 8,
      vertexSize: 8 // position(2) + color(4) + texCoord(2)
    };
    
    batchBuffer = new BatchBuffer(gl, mockResourceManager, config);
  });

  afterEach(() => {
    batchBuffer.dispose();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(batchBuffer.getVertexCount()).toBe(0);
      expect(batchBuffer.getIndexCount()).toBe(0);
    });

    it('should create vertex and index buffers', () => {
      expect(mockResourceManager.createBuffer).toHaveBeenCalledTimes(2);
      expect(mockResourceManager.createBuffer).toHaveBeenCalledWith(
        BufferType.VERTEX,
        expect.any(ArrayBuffer)
      );
      expect(mockResourceManager.createBuffer).toHaveBeenCalledWith(
        BufferType.INDEX,
        expect.any(ArrayBuffer)
      );
    });
  });

  describe('Vertex Management', () => {
    it('should add vertex correctly', () => {
      const vertex: BatchVertex = {
        position: new Vector2(10, 20),
        color: [1, 0, 0, 1],
        texCoord: new Vector2(0.5, 0.5),
        textureId: 0
      };
      
      batchBuffer.addVertex(vertex);
      
      expect(batchBuffer.getVertexCount()).toBe(1);
    });

    it('should add multiple vertices', () => {
      const vertices: BatchVertex[] = [
        {
          position: new Vector2(0, 0),
          color: [1, 0, 0, 1],
          texCoord: new Vector2(0, 0)
        },
        {
          position: new Vector2(10, 10),
          color: [0, 1, 0, 1],
          texCoord: new Vector2(1, 1)
        }
      ];
      
      vertices.forEach(vertex => batchBuffer.addVertex(vertex));
      
      expect(batchBuffer.getVertexCount()).toBe(2);
    });

    it('should handle vertex overflow gracefully', () => {
      // Fill buffer to capacity
      for (let i = 0; i < config.maxVertices; i++) {
        const vertex: BatchVertex = {
          position: new Vector2(i, i),
          color: [1, 1, 1, 1]
        };
        batchBuffer.addVertex(vertex);
      }
      
      expect(batchBuffer.getVertexCount()).toBe(config.maxVertices);
      
      // Try to add one more vertex
      const overflowVertex: BatchVertex = {
        position: new Vector2(999, 999),
        color: [1, 0, 0, 1]
      };
      
      expect(() => {
        batchBuffer.addVertex(overflowVertex);
      }).toThrow();
    });
  });

  describe('Index Management', () => {
    it('should add single index', () => {
      batchBuffer.addIndex(0);
      
      expect(batchBuffer.getIndexCount()).toBe(1);
    });

    it('should add multiple indices', () => {
      const indices = [0, 1, 2, 0, 2, 3];
      batchBuffer.addIndices(indices);
      
      expect(batchBuffer.getIndexCount()).toBe(6);
    });

    it('should handle index overflow gracefully', () => {
      // Fill index buffer to capacity
      for (let i = 0; i < config.maxIndices; i++) {
        batchBuffer.addIndex(i % config.maxVertices);
      }
      
      expect(batchBuffer.getIndexCount()).toBe(config.maxIndices);
      
      // Try to add one more index
      expect(() => {
        batchBuffer.addIndex(0);
      }).toThrow();
    });
  });

  describe('Space Management', () => {
    it('should correctly report available space', () => {
      expect(batchBuffer.hasSpace(100, 150)).toBe(true);
      expect(batchBuffer.hasSpace(config.maxVertices + 1, 0)).toBe(false);
      expect(batchBuffer.hasSpace(0, config.maxIndices + 1)).toBe(false);
    });

    it('should update space availability as data is added', () => {
      // Add some vertices and indices
      for (let i = 0; i < 100; i++) {
        batchBuffer.addVertex({
          position: new Vector2(i, i),
          color: [1, 1, 1, 1]
        });
      }
      
      for (let i = 0; i < 150; i++) {
        batchBuffer.addIndex(i % 100);
      }
      
      expect(batchBuffer.hasSpace(config.maxVertices - 100, config.maxIndices - 150)).toBe(true);
      expect(batchBuffer.hasSpace(config.maxVertices - 99, config.maxIndices - 150)).toBe(false);
    });
  });

  describe('Buffer Operations', () => {
    it('should update buffers with current data', () => {
      // Add some test data
      batchBuffer.addVertex({
        position: new Vector2(10, 20),
        color: [1, 0, 0, 1]
      });
      batchBuffer.addIndex(0);
      
      const mockVertexBuffer = createMockBuffer();
      const mockIndexBuffer = createMockBuffer();
      
      vi.mocked(mockResourceManager.createBuffer)
        .mockReturnValueOnce(mockVertexBuffer)
        .mockReturnValueOnce(mockIndexBuffer);
      
      batchBuffer.updateBuffers();
      
      expect(mockVertexBuffer.update).toHaveBeenCalled();
      expect(mockIndexBuffer.update).toHaveBeenCalled();
    });

    it('should bind vertex and index buffers', () => {
      const mockVertexBuffer = createMockBuffer();
      const mockIndexBuffer = createMockBuffer();
      
      vi.mocked(mockResourceManager.createBuffer)
        .mockReturnValueOnce(mockVertexBuffer)
        .mockReturnValueOnce(mockIndexBuffer);
      
      batchBuffer.bind();
      
      expect(mockVertexBuffer.bind).toHaveBeenCalled();
      expect(mockIndexBuffer.bind).toHaveBeenCalled();
    });

    it('should clear all data', () => {
      // Add some data
      batchBuffer.addVertex({
        position: new Vector2(10, 20),
        color: [1, 0, 0, 1]
      });
      batchBuffer.addIndex(0);
      
      expect(batchBuffer.getVertexCount()).toBe(1);
      expect(batchBuffer.getIndexCount()).toBe(1);
      
      batchBuffer.clear();
      
      expect(batchBuffer.getVertexCount()).toBe(0);
      expect(batchBuffer.getIndexCount()).toBe(0);
    });
  });

  describe('Buffer Access', () => {
    it('should provide access to WebGL buffers', () => {
      const vertexBuffer = batchBuffer.getVertexBuffer();
      const indexBuffer = batchBuffer.getIndexBuffer();
      
      expect(vertexBuffer).toBeDefined();
      expect(indexBuffer).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      const mockVertexBuffer = createMockBuffer();
      const mockIndexBuffer = createMockBuffer();
      
      vi.mocked(mockResourceManager.createBuffer)
        .mockReturnValueOnce(mockVertexBuffer)
        .mockReturnValueOnce(mockIndexBuffer);
      
      batchBuffer.dispose();
      
      expect(mockVertexBuffer.dispose).toHaveBeenCalled();
      expect(mockIndexBuffer.dispose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle buffer creation failures', () => {
      vi.mocked(mockResourceManager.createBuffer).mockReturnValue(null as any);
      
      expect(() => {
        new BatchBuffer(gl, mockResourceManager, config);
      }).toThrow();
    });

    it('should validate vertex data', () => {
      const invalidVertex = {
        position: null as any,
        color: [1, 0, 0, 1] as [number, number, number, number]
      };
      
      expect(() => {
        batchBuffer.addVertex(invalidVertex);
      }).toThrow();
    });

    it('should validate index data', () => {
      expect(() => {
        batchBuffer.addIndex(-1);
      }).toThrow();
      
      expect(() => {
        batchBuffer.addIndex(config.maxVertices);
      }).toThrow();
    });
  });
});