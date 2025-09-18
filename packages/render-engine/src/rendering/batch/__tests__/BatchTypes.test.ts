import { describe, it, expect } from 'vitest';
import { Vector2 } from '../../../math';
import { BlendMode } from '../../../core/webgl/types';
import {
  BatchVertex,
  BatchConfig,
  BatchState,
  QuadParams,
  TriangleParams,
  LineParams,
  BatchData
} from '../types/BatchTypes';

describe('BatchTypes', () => {
  describe('BatchVertex', () => {
    it('should create valid BatchVertex', () => {
      const vertex: BatchVertex = {
        position: new Vector2(10, 20),
        color: [1, 0.5, 0, 1],
        texCoord: new Vector2(0.5, 0.5),
        textureId: 0
      };
      
      expect(vertex.position).toBeInstanceOf(Vector2);
      expect(vertex.position.x).toBe(10);
      expect(vertex.position.y).toBe(20);
      expect(vertex.color).toEqual([1, 0.5, 0, 1]);
      expect(vertex.texCoord).toBeInstanceOf(Vector2);
      expect(vertex.texCoord?.x).toBe(0.5);
      expect(vertex.texCoord?.y).toBe(0.5);
      expect(vertex.textureId).toBe(0);
    });

    it('should handle different color values', () => {
      const vertex: BatchVertex = {
        position: new Vector2(0, 0),
        color: [0, 0, 0, 0]
      };
      
      expect(vertex.color[0]).toBe(0);
      expect(vertex.color[1]).toBe(0);
      expect(vertex.color[2]).toBe(0);
      expect(vertex.color[3]).toBe(0);
    });

    it('should handle optional properties', () => {
      const vertex: BatchVertex = {
        position: new Vector2(0, 0),
        color: [1, 1, 1, 1],
        texCoord: new Vector2(1, 1),
        textureId: 1
      };
      
      expect(vertex.texCoord?.x).toBe(1);
      expect(vertex.texCoord?.y).toBe(1);
      expect(vertex.textureId).toBe(1);
    });
  });

  describe('BatchConfig', () => {
    it('should create valid BatchConfig', () => {
      const config: BatchConfig = {
        maxVertices: 10000,
        maxIndices: 15000,
        maxTextures: 16,
        vertexSize: 32
      };
      
      expect(config.maxVertices).toBe(10000);
      expect(config.maxIndices).toBe(15000);
      expect(config.maxTextures).toBe(16);
      expect(config.vertexSize).toBe(32);
    });

    it('should handle minimum configuration values', () => {
      const config: BatchConfig = {
        maxVertices: 1,
        maxIndices: 1,
        maxTextures: 1,
        vertexSize: 8
      };
      
      expect(config.maxVertices).toBe(1);
      expect(config.maxIndices).toBe(1);
      expect(config.maxTextures).toBe(1);
      expect(config.vertexSize).toBe(8);
    });

    it('should handle large configuration values', () => {
      const config: BatchConfig = {
        maxVertices: 100000,
        maxIndices: 150000,
        maxTextures: 32,
        vertexSize: 64
      };
      
      expect(config.maxVertices).toBe(100000);
      expect(config.maxIndices).toBe(150000);
      expect(config.maxTextures).toBe(32);
      expect(config.vertexSize).toBe(64);
    });
  });

  describe('BatchState', () => {
    it('should have correct enum values', () => {
      expect(BatchState.READY).toBe('ready');
      expect(BatchState.BUILDING).toBe('building');
      expect(BatchState.FULL).toBe('full');
      expect(BatchState.SUBMITTED).toBe('submitted');
    });

    it('should allow state transitions', () => {
      let currentState: BatchState = BatchState.READY;
      
      currentState = BatchState.BUILDING;
      expect(currentState).toBe('building');
      
      currentState = BatchState.FULL;
      expect(currentState).toBe('full');
      
      currentState = BatchState.SUBMITTED;
      expect(currentState).toBe('submitted');
      
      currentState = BatchState.READY;
      expect(currentState).toBe('ready');
    });

    it('should handle full state', () => {
      let currentState: BatchState = BatchState.BUILDING;
      
      currentState = BatchState.FULL;
      expect(currentState).toBe('full');
    });
  });

  describe('QuadParams', () => {
    it('should create valid QuadParams', () => {
      const params: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
          [1, 1, 0, 1]
        ],
        texCoords: [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(1, 1),
          new Vector2(0, 1)
        ],
        blendMode: BlendMode.NORMAL
      };
      
      expect(params.positions).toHaveLength(4);
      expect(params.positions[0]).toBeInstanceOf(Vector2);
      expect(params.colors).toHaveLength(4);
      expect(params.colors[0]).toEqual([1, 0, 0, 1]);
      expect(params.texCoords).toHaveLength(4);
      expect(params.texCoords?.[0]).toBeInstanceOf(Vector2);
      expect(params.blendMode).toBe(BlendMode.NORMAL);
    });

    it('should handle optional properties', () => {
      const params: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ]
      };
      
      expect(params.texCoords).toBeUndefined();
      expect(params.texture).toBeUndefined();
      expect(params.blendMode).toBeUndefined();
    });

    it('should handle texture with custom coordinates', () => {
      const mockTexture = {} as WebGLTexture;
      
      const params: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ],
        texture: mockTexture,
        texCoords: [
          new Vector2(0.25, 0.25),
          new Vector2(0.75, 0.25),
          new Vector2(0.75, 0.75),
          new Vector2(0.25, 0.75)
        ]
      };
      
      expect(params.texture).toBe(mockTexture);
      expect(params.texCoords?.[0].x).toBe(0.25);
      expect(params.texCoords?.[2].x).toBe(0.75);
    });
  });

  describe('TriangleParams', () => {
    it('should create valid TriangleParams', () => {
      const params: TriangleParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(5, 10)
        ],
        colors: [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1]
        ],
        texCoords: [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(0.5, 1)
        ],
        blendMode: BlendMode.NORMAL
      };
      
      expect(params.positions).toHaveLength(3);
      expect(params.positions[0]).toBeInstanceOf(Vector2);
      expect(params.colors).toHaveLength(3);
      expect(params.colors[0]).toEqual([1, 0, 0, 1]);
      expect(params.texCoords).toHaveLength(3);
      expect(params.texCoords?.[0]).toBeInstanceOf(Vector2);
      expect(params.blendMode).toBe(BlendMode.NORMAL);
    });

    it('should handle optional properties', () => {
      const params: TriangleParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(5, 10)
        ],
        colors: [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ]
      };
      
      expect(params.texture).toBeUndefined();
      expect(params.texCoords).toBeUndefined();
      expect(params.blendMode).toBeUndefined();
    });

    it('should handle texture with coordinates', () => {
      const mockTexture = {} as WebGLTexture;
      
      const params: TriangleParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(5, 10)
        ],
        colors: [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ],
        texture: mockTexture,
        texCoords: [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(0.5, 1)
        ]
      };
      
      expect(params.texture).toBe(mockTexture);
      expect(params.texCoords?.[2].y).toBe(1);
    });
  });

  describe('LineParams', () => {
    it('should create valid LineParams', () => {
      const params: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(100, 100),
        color: [1, 0, 0, 1],
        width: 2
      };
      
      expect(params.start).toBeInstanceOf(Vector2);
      expect(params.end).toBeInstanceOf(Vector2);
      expect(params.color).toEqual([1, 0, 0, 1]);
      expect(params.width).toBe(2);
    });

    it('should handle minimum width', () => {
      const params: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 1, 1, 1],
        width: 0.5
      };
      
      expect(params.width).toBe(0.5);
    });

    it('should handle optional width', () => {
      const params: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 1, 1, 1]
      };
      
      expect(params.width).toBeUndefined();
    });
  });

  describe('BatchData', () => {
    it('should create valid BatchData', () => {
      const vertices = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      const mockTexture = {} as WebGLTexture;
      
      const batchData: BatchData = {
        vertices,
        indices,
        vertexCount: 4,
        indexCount: 6,
        textures: [mockTexture],
        blendMode: BlendMode.NORMAL
      };
      
      expect(batchData.vertices).toBeInstanceOf(Float32Array);
      expect(batchData.indices).toBeInstanceOf(Uint16Array);
      expect(batchData.vertexCount).toBe(4);
      expect(batchData.indexCount).toBe(6);
      expect(batchData.textures).toHaveLength(1);
      expect(batchData.blendMode).toBe(BlendMode.NORMAL);
    });

    it('should handle empty batch data', () => {
      const batchData: BatchData = {
        vertices: new Float32Array(),
        indices: new Uint16Array(),
        vertexCount: 0,
        indexCount: 0,
        textures: [],
        blendMode: BlendMode.NORMAL
      };
      
      expect(batchData.vertexCount).toBe(0);
      expect(batchData.indexCount).toBe(0);
      expect(batchData.textures).toHaveLength(0);
    });

    it('should handle multiple textures', () => {
      const mockTexture1 = {} as WebGLTexture;
      const mockTexture2 = {} as WebGLTexture;
      
      const batchData: BatchData = {
        vertices: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
        vertexCount: 4,
        indexCount: 6,
        textures: [mockTexture1, mockTexture2],
        blendMode: BlendMode.NORMAL
      };
      
      expect(batchData.textures).toHaveLength(2);
      expect(batchData.blendMode).toBe(BlendMode.NORMAL);
    });
  });



  describe('Type Compatibility', () => {
    it('should allow BatchVertex in arrays', () => {
      const vertices: BatchVertex[] = [
        {
          position: new Vector2(0, 0),
          color: [1, 0, 0, 1],
          texCoord: new Vector2(0, 0),
          textureId: 0
        },
        {
          position: new Vector2(10, 10),
          color: [0, 1, 0, 1],
          texCoord: new Vector2(1, 1),
          textureId: 1
        }
      ];
      
      expect(vertices).toHaveLength(2);
      expect(vertices[0].position.x).toBe(0);
      expect(vertices[1].position.x).toBe(10);
    });

    it('should allow state machine pattern with BatchState', () => {
      class BatchStateMachine {
        private state: BatchState = BatchState.READY;
        
        transition(newState: BatchState): void {
          this.state = newState;
        }
        
        getState(): BatchState {
          return this.state;
        }
      }
      
      const machine = new BatchStateMachine();
      
      expect(machine.getState()).toBe(BatchState.READY);
      
      machine.transition(BatchState.BUILDING);
      expect(machine.getState()).toBe(BatchState.BUILDING);
      
      machine.transition(BatchState.FULL);
      expect(machine.getState()).toBe(BatchState.FULL);
    });

    it('should allow geometry parameter unions', () => {
      type GeometryParams = QuadParams | TriangleParams | LineParams;
      
      const quadParams: GeometryParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ]
      };
      
      const lineParams: GeometryParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 1, 1, 1]
      };
      
      expect(quadParams).toBeDefined();
      expect(lineParams).toBeDefined();
    });
  });
});