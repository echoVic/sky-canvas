import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedStrategy } from '../strategies/EnhancedStrategy';
import type { IRenderable } from '../core/IBatchRenderer';
import { Matrix3, Vector2 } from '../../math';
import type { BatchContext } from '../core/IBatchStrategy';

// Mock WebGL context
function createMockGL(): any {
  return {
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    useProgram: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    drawElements: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    activeTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteTexture: vi.fn(),
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
    TEXTURE0: 33984,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE: 1,
    DST_COLOR: 774,
    ZERO: 0
  };
}

describe('EnhancedStrategy', () => {
  let strategy: EnhancedStrategy;
  let mockGL: any;
  let mockRenderable: IRenderable;
  let mockContext: BatchContext;

  beforeEach(() => {
    mockGL = createMockGL();
    
    const config = {
      maxBatchSize: 10000,
      enableTextureAtlas: true,
      enableSpatialSorting: true,
      textureAtlasSize: 2048
    };
    
    strategy = new EnhancedStrategy(mockGL, config);
    
    const mockTexture = {} as WebGLTexture;
    
    // Create proper Float32Array and Uint16Array for IRenderable
    const vertexData = new Float32Array([
      0, 0, 1, 0, 0, 1, 0, 0,    // vertex 1: pos(2) + color(4) + uv(2)
      10, 0, 1, 0, 0, 1, 1, 0,   // vertex 2
      10, 10, 1, 0, 0, 1, 1, 1,  // vertex 3
      0, 10, 1, 0, 0, 1, 0, 1    // vertex 4
    ]);
    
    const indexData = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    mockRenderable = {
      getVertices: vi.fn(() => vertexData),
      getIndices: vi.fn(() => indexData),
      getTexture: vi.fn(() => mockTexture),
      getShader: vi.fn(() => 'basic'),
      getBlendMode: vi.fn(() => 0),
      getZIndex: vi.fn(() => 1)
    };
    
    mockContext = {
      gl: mockGL,
      maxBatchSize: 10000,
      currentFrame: 0
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with WebGL context and config', () => {
      expect(strategy).toBeDefined();
      expect(strategy.name).toBe('enhanced');
    });

    it('should create necessary buffers', () => {
      expect(mockGL.createBuffer).toHaveBeenCalled();
    });

    it('should handle initialization with custom config', () => {
      const customConfig = {
        maxBatchSize: 5000,
        enableTextureAtlas: false,
        enableSpatialSorting: false,
        textureAtlasSize: 1024
      };
      
      const customStrategy = new EnhancedStrategy(mockGL, customConfig);
      
      expect(customStrategy).toBeDefined();
      expect(customStrategy.name).toBe('enhanced');
    });
  });

  describe('Processing', () => {
    it('should process renderable objects', () => {
      strategy.process(mockRenderable);
      
      expect(mockRenderable.getVertices).toHaveBeenCalled();
      expect(mockRenderable.getIndices).toHaveBeenCalled();
      expect(mockRenderable.getTexture).toHaveBeenCalled();
      expect(mockRenderable.getShader).toHaveBeenCalled();
    });

    it('should handle multiple renderables', () => {
      strategy.process(mockRenderable);
      strategy.process(mockRenderable);
      
      expect(mockRenderable.getVertices).toHaveBeenCalledTimes(2);
    });

    it('should handle renderables without texture', () => {
      const noTextureRenderable = {
        ...mockRenderable,
        getTexture: vi.fn(() => null)
      };
      
      expect(() => strategy.process(noTextureRenderable)).not.toThrow();
    });
  });

  describe('Batch Management', () => {
    it('should get batches', () => {
      strategy.process(mockRenderable);
      
      const batches = strategy.getBatches();
      expect(Array.isArray(batches)).toBe(true);
    });

    it('should clear batches', () => {
      strategy.process(mockRenderable);
      strategy.clear();
      
      const batches = strategy.getBatches();
      expect(batches.length).toBe(0);
    });

    it('should get stats', () => {
      const stats = strategy.getStats();
      
      expect(stats).toHaveProperty('drawCalls');
      expect(stats).toHaveProperty('triangles');
      expect(stats).toHaveProperty('vertices');
      expect(stats).toHaveProperty('batches');
    });
  });

  describe('Rendering', () => {
    it('should flush batches', () => {
      strategy.process(mockRenderable);
      
      const projectionMatrix = Matrix3.identity();
      
      expect(() => strategy.flush(projectionMatrix, mockContext)).not.toThrow();
    });

    it('should handle empty flush', () => {
      const projectionMatrix = Matrix3.identity();
      
      expect(() => strategy.flush(projectionMatrix, mockContext)).not.toThrow();
    });
  });

  describe('Texture Atlas', () => {
    it('should handle texture atlas when enabled', () => {
      const atlasConfig = {
        maxBatchSize: 10000,
        enableTextureAtlas: true,
        enableSpatialSorting: true,
        textureAtlasSize: 2048
      };
      
      const atlasStrategy = new EnhancedStrategy(mockGL, atlasConfig);
      
      expect(() => atlasStrategy.process(mockRenderable)).not.toThrow();
    });

    it('should handle texture atlas when disabled', () => {
      const noAtlasConfig = {
        maxBatchSize: 10000,
        enableTextureAtlas: false,
        enableSpatialSorting: true,
        textureAtlasSize: 2048
      };
      
      const noAtlasStrategy = new EnhancedStrategy(mockGL, noAtlasConfig);
      
      expect(() => noAtlasStrategy.process(mockRenderable)).not.toThrow();
    });
  });

  describe('Spatial Sorting', () => {
    it('should handle spatial sorting when enabled', () => {
      const sortingConfig = {
        maxBatchSize: 10000,
        enableTextureAtlas: true,
        enableSpatialSorting: true,
        textureAtlasSize: 2048
      };
      
      const sortingStrategy = new EnhancedStrategy(mockGL, sortingConfig);
      
      expect(() => sortingStrategy.process(mockRenderable)).not.toThrow();
    });

    it('should handle spatial sorting when disabled', () => {
      const noSortingConfig = {
        maxBatchSize: 10000,
        enableTextureAtlas: true,
        enableSpatialSorting: false,
        textureAtlasSize: 2048
      };
      
      const noSortingStrategy = new EnhancedStrategy(mockGL, noSortingConfig);
      
      expect(() => noSortingStrategy.process(mockRenderable)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid renderable gracefully', () => {
      const invalidRenderable = {
        getVertices: vi.fn(() => { throw new Error('Invalid vertices'); }),
        getIndices: vi.fn(() => new Uint16Array()),
        getShader: vi.fn(() => 'basic')
      } as any;
      
      expect(() => strategy.process(invalidRenderable)).toThrow();
    });

    it('should handle WebGL errors gracefully', () => {
      mockGL.createBuffer.mockReturnValue(null);
      
      expect(() => {
        new EnhancedStrategy(mockGL);
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources', () => {
      strategy.dispose();
      
      expect(mockGL.deleteBuffer).toHaveBeenCalled();
    });

    it('should handle disposal of null resources', () => {
      expect(() => strategy.dispose()).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    it('should work with different batch sizes', () => {
      const smallBatchConfig = {
        maxBatchSize: 100,
        enableTextureAtlas: true,
        enableSpatialSorting: true,
        textureAtlasSize: 512
      };
      
      const smallBatchStrategy = new EnhancedStrategy(mockGL, smallBatchConfig);
      
      expect(() => smallBatchStrategy.process(mockRenderable)).not.toThrow();
    });

    it('should work with different atlas sizes', () => {
      const largeAtlasConfig = {
        maxBatchSize: 10000,
        enableTextureAtlas: true,
        enableSpatialSorting: true,
        textureAtlasSize: 4096
      };
      
      const largeAtlasStrategy = new EnhancedStrategy(mockGL, largeAtlasConfig);
      
      expect(() => largeAtlasStrategy.process(mockRenderable)).not.toThrow();
    });
  });
});