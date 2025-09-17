/**
 * BatchData 单元测试
 * 测试批处理数据结构和工具函数
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BatchBuffer,
  BatchDataUtils,
  type Vertex,
  type BatchKey,
  type RenderBatch
} from '../core/BatchData';
import { Vector2 } from '../../math';

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

describe('BatchData', () => {
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = createMockGL();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BatchBuffer', () => {
    let batchBuffer: BatchBuffer;

    beforeEach(() => {
      batchBuffer = new BatchBuffer(gl);
    });

    afterEach(() => {
      batchBuffer.dispose();
    });

    describe('Buffer Creation', () => {
      it('should create vertex and index buffers', () => {
        expect(gl.createBuffer).toHaveBeenCalledTimes(3); // vertex, index, instance
      });

      it('should handle buffer creation failure', () => {
        const mockGL = createMockGL();
        mockGL.createBuffer = vi.fn().mockReturnValue(null);
        
        expect(() => {
          new BatchBuffer(mockGL);
        }).toThrow();
      });
    });

    describe('Data Upload', () => {
      it('should upload vertex data', () => {
        const vertices = new Float32Array([1, 2, 3, 4, 5, 6]);
        
        batchBuffer.uploadVertexData(vertices);
        
        expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Object));
        expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      });

      it('should upload index data', () => {
        const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);
        
        batchBuffer.uploadIndexData(indices);
        
        expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, expect.any(Object));
        expect(gl.bufferData).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      });

      it('should upload instance data', () => {
        const instanceData = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]);
        
        batchBuffer.uploadInstanceData(instanceData);
        
        expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Object));
        expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
      });
    });

    describe('Buffer Binding', () => {
      it('should bind buffers correctly', () => {
        batchBuffer.bind();
        
        expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Object));
        expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, expect.any(Object));
      });

      it('should setup vertex attributes', () => {
        batchBuffer.setupVertexAttributes();
        
        expect(gl.enableVertexAttribArray).toHaveBeenCalled();
        expect(gl.vertexAttribPointer).toHaveBeenCalled();
      });
    });

    describe('Resource Management', () => {
      it('should dispose buffers properly', () => {
        batchBuffer.dispose();
        
        expect(gl.deleteBuffer).toHaveBeenCalledTimes(3);
      });

      it('should handle disposal gracefully', () => {
        // Test normal disposal
        batchBuffer.dispose();
        
        // Test double disposal (should not throw)
        expect(() => {
          batchBuffer.dispose();
        }).not.toThrow();
      });
    });
  });

  describe('BatchDataUtils', () => {
    describe('Batch Merging', () => {
      it('should identify mergeable batches', () => {
        const texture = {} as WebGLTexture;
        
        const key1: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const key2: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        expect(BatchDataUtils.canMergeBatches(key1, key2)).toBe(true);
      });

      it('should identify non-mergeable batches with different textures', () => {
        const texture1 = {} as WebGLTexture;
        const texture2 = {} as WebGLTexture;
        
        const key1: BatchKey = {
          texture: texture1,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const key2: BatchKey = {
          texture: texture2,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        expect(BatchDataUtils.canMergeBatches(key1, key2)).toBe(false);
      });

      it('should identify non-mergeable batches with different shaders', () => {
        const texture = {} as WebGLTexture;
        
        const key1: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const key2: BatchKey = {
          texture,
          shader: 'advanced',
          blendMode: 0,
          zIndex: 1
        };
        
        expect(BatchDataUtils.canMergeBatches(key1, key2)).toBe(false);
      });

      it('should identify non-mergeable batches with different blend modes', () => {
        const texture = {} as WebGLTexture;
        
        const key1: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const key2: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 1,
          zIndex: 1
        };
        
        expect(BatchDataUtils.canMergeBatches(key1, key2)).toBe(false);
      });

      it('should identify non-mergeable batches with different z-indices', () => {
        const texture = {} as WebGLTexture;
        
        const key1: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const key2: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 2
        };
        
        expect(BatchDataUtils.canMergeBatches(key1, key2)).toBe(false);
      });
    });

    describe('Vertex Array Conversion', () => {
      it('should convert vertices to Float32Array', () => {
        const vertices: Vertex[] = [
          {
            position: new Vector2(0, 0),
            color: [1, 0, 0, 1],
            uv: new Vector2(0, 0)
          },
          {
            position: new Vector2(10, 10),
            color: [0, 1, 0, 1],
            uv: new Vector2(1, 1)
          }
        ];
        
        const result = BatchDataUtils.verticesToArray(vertices);
        
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(16); // 2 vertices * 8 components each
        
        // Check first vertex data
        expect(result[0]).toBe(0);   // position.x
        expect(result[1]).toBe(0);   // position.y
        expect(result[2]).toBe(1);   // color.r
        expect(result[3]).toBe(0);   // color.g
        expect(result[4]).toBe(0);   // color.b
        expect(result[5]).toBe(1);   // color.a
        expect(result[6]).toBe(0);   // uv.x
        expect(result[7]).toBe(0);   // uv.y
      });

      it('should handle empty vertex array', () => {
        const vertices: Vertex[] = [];
        
        const result = BatchDataUtils.verticesToArray(vertices);
        
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(0);
      });

      it('should handle vertices without UV coordinates', () => {
        const vertices: Vertex[] = [
          {
            position: new Vector2(5, 5),
            color: [0.5, 0.5, 0.5, 1],
            uv: new Vector2(0, 0) // Default UV
          }
        ];
        
        const result = BatchDataUtils.verticesToArray(vertices);
        
        expect(result.length).toBe(8);
        expect(result[6]).toBe(0); // uv.x
        expect(result[7]).toBe(0); // uv.y
      });
    });

    describe('Batch Merging Operations', () => {
      it('should merge compatible batches', () => {
        const texture = {} as WebGLTexture;
        const key: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const batch1: RenderBatch = {
          key,
          vertices: [
            {
              position: new Vector2(0, 0),
              color: [1, 0, 0, 1],
              uv: new Vector2(0, 0)
            }
          ],
          indices: [0]
        };
        
        const batch2: RenderBatch = {
          key,
          vertices: [
            {
              position: new Vector2(10, 10),
              color: [0, 1, 0, 1],
              uv: new Vector2(1, 1)
            }
          ],
          indices: [0]
        };
        
        const result = BatchDataUtils.mergeBatches([batch1, batch2]);
        
        expect(result).not.toBeNull();
        expect(result!.vertices.length).toBe(2);
        expect(result!.indices.length).toBe(2);
        expect(result!.indices[1]).toBe(1); // Index should be adjusted
      });

      it('should return null for incompatible batches', () => {
        const texture1 = {} as WebGLTexture;
        const texture2 = {} as WebGLTexture;
        
        const batch1: RenderBatch = {
          key: {
            texture: texture1,
            shader: 'basic',
            blendMode: 0,
            zIndex: 1
          },
          vertices: [
            {
              position: new Vector2(0, 0),
              color: [1, 0, 0, 1],
              uv: new Vector2(0, 0)
            }
          ],
          indices: [0]
        };
        
        const batch2: RenderBatch = {
          key: {
            texture: texture2,
            shader: 'basic',
            blendMode: 0,
            zIndex: 1
          },
          vertices: [
            {
              position: new Vector2(10, 10),
              color: [0, 1, 0, 1],
              uv: new Vector2(1, 1)
            }
          ],
          indices: [0]
        };
        
        const result = BatchDataUtils.mergeBatches([batch1, batch2]);
        
        expect(result).toBeNull();
      });

      it('should return null for empty batch array', () => {
        const result = BatchDataUtils.mergeBatches([]);
        
        expect(result).toBeNull();
      });

      it('should return single batch unchanged', () => {
        const texture = {} as WebGLTexture;
        const batch: RenderBatch = {
          key: {
            texture,
            shader: 'basic',
            blendMode: 0,
            zIndex: 1
          },
          vertices: [
            {
              position: new Vector2(0, 0),
              color: [1, 0, 0, 1],
              uv: new Vector2(0, 0)
            }
          ],
          indices: [0]
        };
        
        const result = BatchDataUtils.mergeBatches([batch]);
        
        expect(result).toEqual(batch);
      });

      it('should handle complex index adjustment in merged batches', () => {
        const texture = {} as WebGLTexture;
        const key: BatchKey = {
          texture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 1
        };
        
        const batch1: RenderBatch = {
          key,
          vertices: [
            { position: new Vector2(0, 0), color: [1, 0, 0, 1], uv: new Vector2(0, 0) },
            { position: new Vector2(1, 1), color: [1, 0, 0, 1], uv: new Vector2(0, 1) }
          ],
          indices: [0, 1, 0]
        };
        
        const batch2: RenderBatch = {
          key,
          vertices: [
            { position: new Vector2(2, 2), color: [0, 1, 0, 1], uv: new Vector2(1, 0) },
            { position: new Vector2(3, 3), color: [0, 1, 0, 1], uv: new Vector2(1, 1) }
          ],
          indices: [0, 1, 0]
        };
        
        const result = BatchDataUtils.mergeBatches([batch1, batch2]);
        
        expect(result).not.toBeNull();
        expect(result!.vertices.length).toBe(4);
        expect(result!.indices).toEqual([0, 1, 0, 2, 3, 2]); // Indices adjusted by vertex offset
      });
    });
  });

  describe('Type Definitions', () => {
    it('should create valid Vertex objects', () => {
      const vertex: Vertex = {
        position: new Vector2(10, 20),
        color: [0.5, 0.7, 0.9, 1.0],
        uv: new Vector2(0.25, 0.75)
      };
      
      expect(vertex.position).toBeInstanceOf(Vector2);
      expect(vertex.color).toHaveLength(4);
      expect(vertex.uv).toBeInstanceOf(Vector2);
    });

    it('should create valid BatchKey objects', () => {
      const texture = {} as WebGLTexture;
      const batchKey: BatchKey = {
        texture,
        shader: 'test-shader',
        blendMode: 1,
        zIndex: 5
      };
      
      expect(batchKey.texture).toBe(texture);
      expect(batchKey.shader).toBe('test-shader');
      expect(batchKey.blendMode).toBe(1);
      expect(batchKey.zIndex).toBe(5);
    });

    it('should create valid RenderBatch objects', () => {
      const texture = {} as WebGLTexture;
      const renderBatch: RenderBatch = {
        key: {
          texture,
          shader: 'test',
          blendMode: 0,
          zIndex: 0
        },
        vertices: [],
        indices: [],
        instanceData: new Float32Array([1, 2, 3, 4])
      };
      
      expect(renderBatch.key).toBeDefined();
      expect(renderBatch.vertices).toBeInstanceOf(Array);
      expect(renderBatch.indices).toBeInstanceOf(Array);
      expect(renderBatch.instanceData).toBeInstanceOf(Float32Array);
    });
  });
});