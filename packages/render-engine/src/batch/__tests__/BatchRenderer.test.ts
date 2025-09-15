/**
 * BatchRenderer 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Matrix3 } from '../../math/Matrix3';
import { Vector2 } from '../../math/Vector2';
import { WebGLResourceManager } from '../../resources/ResourceManager';
import { WebGLShaderManager } from '../../shaders/ShaderManager';
import { BatchRenderer } from '../BatchRenderer';

// Mock dependencies
vi.mock('../../resources/ResourceManager');
vi.mock('../../shaders/ShaderManager');
vi.mock('../core/BatchBuffer');
vi.mock('../core/BatchGeometry');
vi.mock('../core/BatchRenderer');

describe('BatchRenderer', () => {
  // Test fixtures and setup
  let gl: WebGLRenderingContext;
  let mockShaderManager: WebGLShaderManager;
  let mockResourceManager: WebGLResourceManager;
  let batchRenderer: BatchRenderer;
  let mockBuffer: any;
  let mockGeometry: any;
  let mockRenderManager: any;

  beforeEach(() => {
    // Arrange: Setup WebGL context mock
    gl = {
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createVertexArray: vi.fn().mockReturnValue({}),
      bindVertexArray: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawElements: vi.fn(),
      useProgram: vi.fn(),
      uniformMatrix3fv: vi.fn(),
      uniform1i: vi.fn(),
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      DYNAMIC_DRAW: 35048,
      TRIANGLES: 4,
      UNSIGNED_SHORT: 5123,
      FLOAT: 5126,
      BLEND: 3042,
      SRC_ALPHA: 770,
      ONE_MINUS_SRC_ALPHA: 771,
      TEXTURE0: 33984,
      TEXTURE_2D: 3553,
    } as any;

    // Setup manager mocks
    mockShaderManager = {
      getProgram: vi.fn().mockReturnValue({}),
      useProgram: vi.fn(),
      setUniform: vi.fn(),
    } as any;

    mockResourceManager = {
      getTexture: vi.fn().mockReturnValue({}),
      createBuffer: vi.fn().mockReturnValue({}),
    } as any;

    // Setup core component mocks
    mockBuffer = {
      addVertex: vi.fn().mockReturnValue(true),
      addIndex: vi.fn().mockReturnValue(true),
      canAddVertices: vi.fn().mockReturnValue(true),
      canAddIndices: vi.fn().mockReturnValue(true),
      getVertexData: vi.fn().mockReturnValue(new Float32Array()),
      getIndexData: vi.fn().mockReturnValue(new Uint16Array()),
      getVertexCount: vi.fn().mockReturnValue(0),
      getIndexCount: vi.fn().mockReturnValue(0),
      clear: vi.fn(),
      dispose: vi.fn(),
    };

    mockGeometry = {
      setup: vi.fn(),
      bind: vi.fn(),
      unbind: vi.fn(),
      dispose: vi.fn(),
    };

    mockRenderManager = {
      render: vi.fn(),
      setProjectionMatrix: vi.fn(),
      setTransformMatrix: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        drawCalls: 0,
        verticesRendered: 0,
        trianglesRendered: 0,
      }),
      dispose: vi.fn(),
    };

    // Mock the core classes
    const { BatchBuffer } = require('../core/BatchBuffer');
    const { BatchGeometry } = require('../core/BatchGeometry');
    const { BatchRenderManager } = require('../core/BatchRenderer');
    
    BatchBuffer.mockImplementation(() => mockBuffer);
    BatchGeometry.mockImplementation(() => mockGeometry);
    BatchRenderManager.mockImplementation(() => mockRenderManager);
  });

  afterEach(() => {
    if (batchRenderer) {
      batchRenderer.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Given a BatchRenderer instance', () => {
    describe('When creating with default configuration', () => {
      it('Then it should initialize with default settings', () => {
        // Arrange & Act
        batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);

        // Assert
        expect(batchRenderer).toBeDefined();
        expect(mockBuffer).toBeDefined();
        expect(mockGeometry).toBeDefined();
        expect(mockRenderManager).toBeDefined();
      });
    });

    describe('When creating with custom configuration', () => {
      it('Then it should use the provided configuration', () => {
        // Arrange
        const customConfig = {
          maxVertices: 5000,
          maxIndices: 7500,
          enableBlending: false,
        };

        // Act
        batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager, customConfig);

        // Assert
        expect(batchRenderer).toBeDefined();
        // Configuration is passed to internal components
      });
    });
  });

  describe('Given a BatchRenderer batch lifecycle', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
    });

    describe('When beginning a batch', () => {
      it('Then it should transition to BATCHING state', () => {
        // Arrange
        // BatchRenderer starts in READY state

        // Act
        batchRenderer.begin();

        // Assert
        // State should be BATCHING (internal state, tested through behavior)
        expect(mockBuffer.clear).toHaveBeenCalled();
      });

      it('Then it should throw error if already batching', () => {
        // Arrange
        batchRenderer.begin();

        // Act & Assert
        expect(() => {
          batchRenderer.begin();
        }).toThrow('Batch already in progress');
      });
    });

    describe('When ending a batch', () => {
      it('Then it should flush and return to READY state', () => {
        // Arrange
        batchRenderer.begin();

        // Act
        batchRenderer.end();

        // Assert
        expect(mockRenderManager.render).toHaveBeenCalled();
      });

      it('Then it should throw error if not batching', () => {
        // Arrange
        // BatchRenderer starts in READY state

        // Act & Assert
        expect(() => {
          batchRenderer.end();
        }).toThrow('No batch in progress');
      });
    });
  });

  describe('Given a BatchRenderer with geometry operations', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
      batchRenderer.begin();
    });

    describe('When adding a quad', () => {
      it('Then it should add quad vertices and indices to buffer', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(100, 100),
          new Vector2(0, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
          [1, 1, 0, 1],
        ];

        // Act
        const result = batchRenderer.addQuad(positions, colors);

        // Assert
        expect(result).toBe(true);
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4); // 4 vertices for quad
        expect(mockBuffer.addIndex).toHaveBeenCalledTimes(6); // 6 indices for 2 triangles
      });

      it('Then it should handle quad with texture coordinates', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(100, 100),
          new Vector2(0, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
        ];
        const texCoords: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(1, 1),
          new Vector2(0, 1),
        ];
        const mockTexture = {} as WebGLTexture;

        // Act
        const result = batchRenderer.addQuad(positions, colors, texCoords, mockTexture);

        // Assert
        expect(result).toBe(true);
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      });

      it('Then it should return false when buffer is full', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(100, 100),
          new Vector2(0, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
          [1, 1, 0, 1],
        ];
        mockBuffer.canAddVertices.mockReturnValue(false);

        // Act
        const result = batchRenderer.addQuad(positions, colors);

        // Assert
        expect(result).toBe(false);
        expect(mockBuffer.addVertex).not.toHaveBeenCalled();
      });
    });

    describe('When adding a triangle', () => {
      it('Then it should add triangle vertices and indices to buffer', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(50, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
        ];

        // Act
        const result = batchRenderer.addTriangle(positions, colors);

        // Assert
        expect(result).toBe(true);
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(3); // 3 vertices for triangle
        expect(mockBuffer.addIndex).toHaveBeenCalledTimes(3); // 3 indices for triangle
      });

      it('Then it should handle triangle with texture coordinates', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(50, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
        ];
        const texCoords: [Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(0.5, 1),
        ];
        const mockTexture = {} as WebGLTexture;

        // Act
        const result = batchRenderer.addTriangle(positions, colors, texCoords, mockTexture);

        // Assert
        expect(result).toBe(true);
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(3);
      });
    });

    describe('When adding a line', () => {
      it('Then it should add line as quad vertices', () => {
        // Arrange
        const start = new Vector2(0, 0);
        const end = new Vector2(100, 0);
        const color: [number, number, number, number] = [1, 0, 0, 1];
        const width = 2.0;

        // Act
        const result = batchRenderer.addLine(start, end, color, width);

        // Assert
        expect(result).toBe(true);
        // Line is rendered as a quad, so 4 vertices and 6 indices
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
        expect(mockBuffer.addIndex).toHaveBeenCalledTimes(6);
      });

      it('Then it should use default width when not specified', () => {
        // Arrange
        const start = new Vector2(0, 0);
        const end = new Vector2(100, 0);
        const color: [number, number, number, number] = [1, 0, 0, 1];

        // Act
        const result = batchRenderer.addLine(start, end, color);

        // Assert
        expect(result).toBe(true);
        expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Given a BatchRenderer with matrix operations', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
    });

    describe('When setting projection matrix', () => {
      it('Then it should pass matrix to render manager', () => {
        // Arrange
        const projectionMatrix = new Matrix3();

        // Act
        batchRenderer.setProjectionMatrix(projectionMatrix);

        // Assert
        expect(mockRenderManager.setProjectionMatrix).toHaveBeenCalledWith(projectionMatrix);
      });
    });

    describe('When setting transform matrix', () => {
      it('Then it should pass matrix to render manager', () => {
        // Arrange
        const transformMatrix = new Matrix3();

        // Act
        batchRenderer.setTransformMatrix(transformMatrix);

        // Assert
        expect(mockRenderManager.setTransformMatrix).toHaveBeenCalledWith(transformMatrix);
      });
    });
  });

  describe('Given a BatchRenderer with statistics', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
    });

    describe('When getting render statistics', () => {
      it('Then it should return stats from render manager', () => {
        // Arrange
        const expectedStats = {
          drawCalls: 5,
          verticesRendered: 1000,
          trianglesRendered: 500,
        };
        mockRenderManager.getStats.mockReturnValue(expectedStats);

        // Act
        const stats = batchRenderer.getStats();

        // Assert
        expect(stats).toEqual(expectedStats);
        expect(mockRenderManager.getStats).toHaveBeenCalled();
      });
    });
  });

  describe('Given a BatchRenderer lifecycle management', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
    });

    describe('When disposing the renderer', () => {
      it('Then it should cleanup all resources', () => {
        // Arrange
        // BatchRenderer is initialized

        // Act
        batchRenderer.dispose();

        // Assert
        expect(mockBuffer.dispose).toHaveBeenCalled();
        expect(mockGeometry.dispose).toHaveBeenCalled();
        expect(mockRenderManager.dispose).toHaveBeenCalled();
      });
    });
  });

  describe('Given BatchRenderer error handling', () => {
    beforeEach(() => {
      batchRenderer = new BatchRenderer(gl, mockShaderManager, mockResourceManager);
    });

    describe('When adding geometry without beginning batch', () => {
      it('Then it should throw appropriate error', () => {
        // Arrange
        const positions: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(100, 100),
          new Vector2(0, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
          [1, 1, 0, 1],
        ];

        // Act & Assert
        expect(() => {
          batchRenderer.addQuad(positions, colors);
        }).toThrow('Batch not started');
      });
    });

    describe('When buffer operations fail', () => {
      it('Then it should handle buffer overflow gracefully', () => {
        // Arrange
        batchRenderer.begin();
        const positions: [Vector2, Vector2, Vector2, Vector2] = [
          new Vector2(0, 0),
          new Vector2(100, 0),
          new Vector2(100, 100),
          new Vector2(0, 100),
        ];
        const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 1],
          [1, 1, 0, 1],
        ];
        mockBuffer.canAddIndices.mockReturnValue(false);

        // Act
        const result = batchRenderer.addQuad(positions, colors);

        // Assert
        expect(result).toBe(false);
        expect(mockBuffer.addVertex).not.toHaveBeenCalled();
        expect(mockBuffer.addIndex).not.toHaveBeenCalled();
      });
    });
  });
});