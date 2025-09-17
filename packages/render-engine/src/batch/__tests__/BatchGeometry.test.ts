/**
 * BatchGeometry 单元测试
 * 测试批量渲染几何图形处理功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchGeometry } from '../core/BatchGeometry';
import { BatchBuffer } from '../core/BatchBuffer';
import { Vector2 } from '../../math';
import { QuadParams, TriangleParams, LineParams } from '../types/BatchTypes';
import { BlendMode } from '../../webgl/types';

// Mock BatchBuffer
vi.mock('../core/BatchBuffer');

describe('BatchGeometry', () => {
  let mockBuffer: BatchBuffer;
  let batchGeometry: BatchGeometry;

  beforeEach(() => {
    // Create mock buffer
    mockBuffer = {
      hasSpace: vi.fn().mockReturnValue(true),
      getVertexCount: vi.fn().mockReturnValue(0),
      addVertex: vi.fn(),
      addIndex: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn()
    } as any;
    
    batchGeometry = new BatchGeometry(mockBuffer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Quad Operations', () => {
    it('should add a simple quad successfully', () => {
      const quadParams: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number],
          [0, 1, 0, 1] as [number, number, number, number],
          [0, 0, 1, 1] as [number, number, number, number],
          [1, 1, 0, 1] as [number, number, number, number]
        ]
      };
      
      const result = batchGeometry.addQuad(quadParams);
      
      expect(result).toBe(true);
      expect(mockBuffer.hasSpace).toHaveBeenCalledWith(4, 6);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      expect(mockBuffer.addIndex).toHaveBeenCalledTimes(6);
    });

    it('should add quad with texture coordinates', () => {
      const quadParams: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number]
        ],
        texCoords: [
          new Vector2(0, 0),
          new Vector2(1, 0),
          new Vector2(1, 1),
          new Vector2(0, 1)
        ]
      };
      
      const result = batchGeometry.addQuad(quadParams);
      
      expect(result).toBe(true);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      
      // Verify texture coordinates are passed correctly
      const firstVertexCall = vi.mocked(mockBuffer.addVertex).mock.calls[0][0];
      expect(firstVertexCall.texCoord).toEqual(new Vector2(0, 0));
    });

    it('should fail when buffer has no space for quad', () => {
      vi.mocked(mockBuffer.hasSpace).mockReturnValue(false);
      
      const quadParams: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number],
          [0, 1, 0, 1] as [number, number, number, number],
          [0, 0, 1, 1] as [number, number, number, number],
          [1, 1, 0, 1] as [number, number, number, number]
        ]
      };
      
      const result = batchGeometry.addQuad(quadParams);
      
      expect(result).toBe(false);
      expect(mockBuffer.addVertex).not.toHaveBeenCalled();
      expect(mockBuffer.addIndex).not.toHaveBeenCalled();
    });

    it('should generate correct quad indices', () => {
      vi.mocked(mockBuffer.getVertexCount).mockReturnValue(10); // Simulate existing vertices
      
      const quadParams: QuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(10, 10),
          new Vector2(0, 10)
        ],
        colors: [
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number],
          [1, 1, 1, 1] as [number, number, number, number]
        ]
      };
      
      batchGeometry.addQuad(quadParams);
      
      // Verify indices are correct (base vertex = 10)
      const expectedIndices = [10, 11, 12, 10, 12, 13];
      expectedIndices.forEach((index, i) => {
        expect(mockBuffer.addIndex).toHaveBeenNthCalledWith(i + 1, index);
      });
    });
  });

  describe('Triangle Operations', () => {
    it('should add a triangle successfully', () => {
      const triangleParams: TriangleParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(5, 10)
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number],
          [0, 1, 0, 1] as [number, number, number, number],
          [0, 0, 1, 1] as [number, number, number, number]
        ]
      };
      
      const result = batchGeometry.addTriangle(triangleParams);
      
      expect(result).toBe(true);
      expect(mockBuffer.hasSpace).toHaveBeenCalledWith(3, 3);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(3);
      expect(mockBuffer.addIndex).toHaveBeenCalledTimes(3);
    });

    it('should fail when buffer has no space for triangle', () => {
      vi.mocked(mockBuffer.hasSpace).mockReturnValue(false);
      
      const triangleParams: TriangleParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0),
          new Vector2(5, 10)
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number],
          [0, 1, 0, 1] as [number, number, number, number],
          [0, 0, 1, 1] as [number, number, number, number]
        ]
      };
      
      const result = batchGeometry.addTriangle(triangleParams);
      
      expect(result).toBe(false);
      expect(mockBuffer.addVertex).not.toHaveBeenCalled();
      expect(mockBuffer.addIndex).not.toHaveBeenCalled();
    });
  });

  describe('Line Operations', () => {
    it('should add a line successfully', () => {
      const lineParams: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 0, 0, 1] as [number, number, number, number],
        width: 2
      };
      
      const result = batchGeometry.addLine(lineParams);
      
      expect(result).toBe(true);
      expect(mockBuffer.hasSpace).toHaveBeenCalledWith(4, 6);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      expect(mockBuffer.addIndex).toHaveBeenCalledTimes(6);
    });

    it('should add line with default width', () => {
      const lineParams: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 0, 0, 1] as [number, number, number, number]
      };
      
      const result = batchGeometry.addLine(lineParams);
      
      expect(result).toBe(true);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
    });

    it('should fail when buffer has no space for line', () => {
      vi.mocked(mockBuffer.hasSpace).mockReturnValue(false);
      
      const lineParams: LineParams = {
        start: new Vector2(0, 0),
        end: new Vector2(10, 10),
        color: [1, 0, 0, 1] as [number, number, number, number]
      };
      
      const result = batchGeometry.addLine(lineParams);
      
      expect(result).toBe(false);
      expect(mockBuffer.addVertex).not.toHaveBeenCalled();
      expect(mockBuffer.addIndex).not.toHaveBeenCalled();
    });
  });

  describe('Rectangle Operations', () => {
    it('should add a rectangle successfully', () => {
      const result = batchGeometry.addRect(10, 20, 100, 50, [0, 1, 0, 1] as [number, number, number, number]);
      
      expect(result).toBe(true);
      expect(mockBuffer.hasSpace).toHaveBeenCalledWith(4, 6);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(4);
      expect(mockBuffer.addIndex).toHaveBeenCalledTimes(6);
    });

    it('should create correct rectangle vertices', () => {
      batchGeometry.addRect(10, 20, 100, 50, [1, 0, 0, 1] as [number, number, number, number]);
      
      // Verify the four corners are created correctly
      const calls = vi.mocked(mockBuffer.addVertex).mock.calls;
      expect(calls[0][0].position).toEqual(new Vector2(10, 20));     // Top-left
      expect(calls[1][0].position).toEqual(new Vector2(110, 20));    // Top-right
      expect(calls[2][0].position).toEqual(new Vector2(110, 70));    // Bottom-right
      expect(calls[3][0].position).toEqual(new Vector2(10, 70));     // Bottom-left
    });
  });

  describe('Circle Operations', () => {
    it('should add a circle successfully', () => {
      const center = new Vector2(50, 50);
      const radius = 25;
      const color: [number, number, number, number] = [0, 0, 1, 1];
      const segments = 8;
      
      const result = batchGeometry.addCircle(center, radius, color, segments);
      
      expect(result).toBe(true);
      expect(mockBuffer.hasSpace).toHaveBeenCalledWith(segments + 1, segments * 3);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(segments + 1); // Center + perimeter vertices
      expect(mockBuffer.addIndex).toHaveBeenCalledTimes(segments * 3);  // 3 indices per triangle
    });

    it('should add circle with default segments', () => {
      const center = new Vector2(50, 50);
      const radius = 25;
      const color: [number, number, number, number] = [0, 0, 1, 1];
      
      const result = batchGeometry.addCircle(center, radius, color);
      
      expect(result).toBe(true);
      expect(mockBuffer.addVertex).toHaveBeenCalledTimes(33); // 32 segments + center
    });

    it('should fail when buffer has no space for circle', () => {
      vi.mocked(mockBuffer.hasSpace).mockReturnValue(false);
      
      const center = new Vector2(50, 50);
      const radius = 25;
      const color: [number, number, number, number] = [0, 0, 1, 1];
      
      const result = batchGeometry.addCircle(center, radius, color);
      
      expect(result).toBe(false);
      expect(mockBuffer.addVertex).not.toHaveBeenCalled();
      expect(mockBuffer.addIndex).not.toHaveBeenCalled();
    });

    it('should create correct circle geometry', () => {
      const center = new Vector2(0, 0);
      const radius = 10;
      const color: [number, number, number, number] = [1, 1, 1, 1];
      const segments = 4; // Square-like circle for easy testing
      
      batchGeometry.addCircle(center, radius, color, segments);
      
      // Verify center vertex
      const centerCall = vi.mocked(mockBuffer.addVertex).mock.calls[0][0];
      expect(centerCall.position).toEqual(center);
      expect(centerCall.color).toEqual(color);
      
      // Verify perimeter vertices are at correct distance
      for (let i = 1; i <= segments; i++) {
        const vertexCall = vi.mocked(mockBuffer.addVertex).mock.calls[i][0];
        const distance = Math.sqrt(
          vertexCall.position.x * vertexCall.position.x +
          vertexCall.position.y * vertexCall.position.y
        );
        expect(distance).toBeCloseTo(radius, 5);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid quad parameters', () => {
      const invalidQuadParams = {
        positions: [
          new Vector2(0, 0),
          new Vector2(10, 0)
          // Missing two positions
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number]
          // Missing three colors
        ]
      } as any;
      
      expect(() => {
        batchGeometry.addQuad(invalidQuadParams);
      }).toThrow();
    });

    it('should handle invalid triangle parameters', () => {
      const invalidTriangleParams = {
        positions: [
          new Vector2(0, 0)
          // Missing two positions
        ],
        colors: [
          [1, 0, 0, 1] as [number, number, number, number]
          // Missing two colors
        ]
      } as any;
      
      expect(() => {
        batchGeometry.addTriangle(invalidTriangleParams);
      }).toThrow();
    });

    it('should handle invalid circle parameters', () => {
      const center = new Vector2(0, 0);
      const invalidRadius = -5;
      const color: [number, number, number, number] = [1, 1, 1, 1];
      
      expect(() => {
        batchGeometry.addCircle(center, invalidRadius, color);
      }).toThrow();
    });

    it('should handle invalid segments count', () => {
      const center = new Vector2(0, 0);
      const radius = 10;
      const color: [number, number, number, number] = [1, 1, 1, 1];
      const invalidSegments = 2; // Too few segments
      
      expect(() => {
        batchGeometry.addCircle(center, radius, color, invalidSegments);
      }).toThrow();
    });
  });
});