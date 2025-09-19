/**
 * BatchOptimizer 单元测试
 * 测试批处理性能优化和分析功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchOptimizer, OptimizationType } from '../utils/BatchOptimizer';
import type { RenderBatch } from '../core/BatchData';
import type { BatchStats } from '../core/IBatchRenderer';
import { Vector2 } from '../../../math';

describe('BatchOptimizer', () => {
  let optimizer: BatchOptimizer;
  let mockStats: BatchStats;
  let mockBatches: RenderBatch[];

  beforeEach(() => {
    optimizer = new BatchOptimizer();
    
    mockStats = {
      frameTime: 16.67,
      drawCalls: 10,
      vertices: 1000,
      triangles: 500,
      batches: 5,
      textureBinds: 8,
      shaderSwitches: 3
    };
    
    const mockTexture = {} as WebGLTexture;
    mockBatches = [
      {
        key: {
          texture: mockTexture,
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
      },
      {
        key: {
          texture: mockTexture,
          shader: 'basic',
          blendMode: 0,
          zIndex: 2
        },
        vertices: [
          {
            position: new Vector2(10, 10),
            color: [0, 1, 0, 1],
            uv: new Vector2(1, 1)
          }
        ],
        indices: [0]
      }
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(optimizer).toBeDefined();
    });
  });

  describe('Performance Recording', () => {
    it('should record performance stats', () => {
      optimizer.recordPerformance(mockStats);
      
      const analysis = optimizer.analyze();
      
      expect(analysis).toBeDefined();
      expect(analysis.frameTime).toBe(16.67);
    });

    it('should handle multiple performance records', () => {
      const stats1 = { ...mockStats, frameTime: 16.67 };
      const stats2 = { ...mockStats, frameTime: 20.0 };
      const stats3 = { ...mockStats, frameTime: 18.0 };
      
      optimizer.recordPerformance(stats1);
      optimizer.recordPerformance(stats2);
      optimizer.recordPerformance(stats3);
      
      const analysis = optimizer.analyze();
      
      expect(analysis.frameTime).toBe(18.0); // Latest frame time
    });

    it('should limit performance history length', () => {
      // Record more than max history length (60 frames)
      for (let i = 0; i < 70; i++) {
        optimizer.recordPerformance({ ...mockStats, frameTime: i });
      }
      
      const analysis = optimizer.analyze();
      
      expect(analysis.frameTime).toBe(69); // Latest frame time
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(() => {
      optimizer.recordPerformance(mockStats);
    });

    it('should analyze draw call efficiency', () => {
      const analysis = optimizer.analyze();
      
      expect(analysis.drawCallEfficiency).toBe(100); // 1000 vertices / 10 draw calls
    });

    it('should calculate batch utilization', () => {
      const analysis = optimizer.analyze();
      
      expect(analysis.batchUtilization).toBeGreaterThan(0);
      expect(analysis.batchUtilization).toBeLessThanOrEqual(1);
    });

    it('should calculate texture bind ratio', () => {
      const analysis = optimizer.analyze();
      
      expect(analysis.textureBindRatio).toBe(0.8); // 8 texture binds / 10 draw calls
    });

    it('should provide optimization suggestions', () => {
      const analysis = optimizer.analyze();
      
      expect(analysis.suggestions).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should handle empty performance history', () => {
      const emptyOptimizer = new BatchOptimizer();
      
      const analysis = emptyOptimizer.analyze();
      
      expect(analysis).toBeDefined();
      expect(analysis.frameTime).toBe(0);
      expect(analysis.suggestions).toHaveLength(0);
    });
  });

  describe('Batch Optimization', () => {
    it('should optimize batch order by z-index', () => {
      const optimized = optimizer.optimizeBatchOrder(mockBatches);
      
      expect(optimized[0].key.zIndex).toBeLessThanOrEqual(optimized[1].key.zIndex);
    });

    it('should optimize batch order by texture', () => {
      const texture1 = {} as WebGLTexture;
      const texture2 = {} as WebGLTexture;
      
      const batchesWithDifferentTextures: RenderBatch[] = [
        {
          key: { texture: texture2, shader: 'basic', blendMode: 0, zIndex: 1 },
          vertices: [{ position: new Vector2(0, 0), color: [1, 0, 0, 1], uv: new Vector2(0, 0) }],
          indices: [0]
        },
        {
          key: { texture: texture1, shader: 'basic', blendMode: 0, zIndex: 1 },
          vertices: [{ position: new Vector2(10, 10), color: [0, 1, 0, 1], uv: new Vector2(1, 1) }],
          indices: [0]
        },
        {
          key: { texture: texture1, shader: 'basic', blendMode: 0, zIndex: 1 },
          vertices: [{ position: new Vector2(20, 20), color: [0, 0, 1, 1], uv: new Vector2(0.5, 0.5) }],
          indices: [0]
        }
      ];
      
      const optimized = optimizer.optimizeBatchOrder(batchesWithDifferentTextures);
      
      // Batches with same texture should be grouped together
      expect(optimized[1].key.texture).toBe(optimized[2].key.texture);
    });

    it('should handle empty batch array', () => {
      const optimized = optimizer.optimizeBatchOrder([]);
      
      expect(optimized).toEqual([]);
    });

    it('should preserve original batches when optimizing', () => {
      const originalLength = mockBatches.length;
      
      const optimized = optimizer.optimizeBatchOrder(mockBatches);
      
      expect(optimized.length).toBe(originalLength);
    });
  });

  describe('Mergeable Batches Detection', () => {
    it('should find mergeable batches', () => {
      const mergeableBatches = optimizer.findMergeableBatches(mockBatches);
      
      expect(mergeableBatches).toBeDefined();
      expect(Array.isArray(mergeableBatches)).toBe(true);
    });

    it('should calculate merge savings', () => {
      const mergeableBatches = optimizer.findMergeableBatches(mockBatches);
      
      mergeableBatches.forEach(merge => {
        expect(merge.estimatedSaving).toBeGreaterThanOrEqual(0);
        expect(merge.indices).toBeDefined();
        expect(Array.isArray(merge.indices)).toBe(true);
      });
    });

    it('should handle batches with different properties', () => {
      const texture1 = {} as WebGLTexture;
      const texture2 = {} as WebGLTexture;
      
      const incompatibleBatches: RenderBatch[] = [
        {
          key: { texture: texture1, shader: 'basic', blendMode: 0, zIndex: 1 },
          vertices: [{ position: new Vector2(0, 0), color: [1, 0, 0, 1], uv: new Vector2(0, 0) }],
          indices: [0]
        },
        {
          key: { texture: texture2, shader: 'advanced', blendMode: 1, zIndex: 2 },
          vertices: [{ position: new Vector2(10, 10), color: [0, 1, 0, 1], uv: new Vector2(1, 1) }],
          indices: [0]
        }
      ];
      
      const mergeableBatches = optimizer.findMergeableBatches(incompatibleBatches);
      
      expect(mergeableBatches).toHaveLength(0);
    });
  });

  describe('Instancing Opportunities', () => {
    it('should detect instancing opportunities', () => {
      const opportunities = optimizer.detectInstancingOpportunities(mockBatches);
      
      expect(opportunities).toBeDefined();
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should calculate instancing improvements', () => {
      const opportunities = optimizer.detectInstancingOpportunities(mockBatches);
      
      opportunities.forEach(opportunity => {
        expect(opportunity.geometryHash).toBeDefined();
        expect(opportunity.count).toBeGreaterThan(0);
        expect(opportunity.estimatedImprovement).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle repeated geometry', () => {
      const repeatedBatches: RenderBatch[] = Array(15).fill(mockBatches[0]);
      
      const opportunities = optimizer.detectInstancingOpportunities(repeatedBatches);
      
      expect(opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('Optimal Batch Size Calculation', () => {
    it('should calculate optimal batch size', () => {
      const optimalSize = optimizer.calculateOptimalBatchSize(mockStats);
      
      expect(optimalSize).toBeGreaterThan(0);
      expect(typeof optimalSize).toBe('number');
    });

    it('should consider performance metrics', () => {
      const highPerformanceStats = {
        ...mockStats,
        frameTime: 8.33, // 120 FPS
        drawCalls: 5
      };
      
      const lowPerformanceStats = {
        ...mockStats,
        frameTime: 33.33, // 30 FPS
        drawCalls: 50
      };
      
      const highPerfSize = optimizer.calculateOptimalBatchSize(highPerformanceStats);
      const lowPerfSize = optimizer.calculateOptimalBatchSize(lowPerformanceStats);
      
      expect(highPerfSize).toBeGreaterThanOrEqual(lowPerfSize);
    });
  });

  describe('Performance Trends', () => {
    it('should detect performance trends', () => {
      // Record improving performance
      for (let i = 0; i < 10; i++) {
        optimizer.recordPerformance({
          ...mockStats,
          frameTime: 20 - i, // Improving frame time
          drawCalls: 15 - i  // Reducing draw calls
        });
      }
      
      const trends = optimizer.getPerformanceTrend();
      
      expect(trends.frameTime).toBe('improving');
      expect(trends.drawCalls).toBe('improving');
    });

    it('should detect degrading performance', () => {
      // Record degrading performance
      for (let i = 0; i < 10; i++) {
        optimizer.recordPerformance({
          ...mockStats,
          frameTime: 10 + i, // Degrading frame time
          drawCalls: 5 + i   // Increasing draw calls
        });
      }
      
      const trends = optimizer.getPerformanceTrend();
      
      expect(trends.frameTime).toBe('degrading');
      expect(trends.drawCalls).toBe('degrading');
    });

    it('should detect stable performance', () => {
      // Record stable performance
      for (let i = 0; i < 10; i++) {
        optimizer.recordPerformance(mockStats);
      }
      
      const trends = optimizer.getPerformanceTrend();
      
      expect(trends.frameTime).toBe('stable');
      expect(trends.drawCalls).toBe('stable');
      expect(trends.vertices).toBe('stable');
    });

    it('should handle insufficient data for trends', () => {
      optimizer.recordPerformance(mockStats);
      
      const trends = optimizer.getPerformanceTrend();
      
      expect(trends.frameTime).toBe('stable');
      expect(trends.drawCalls).toBe('stable');
      expect(trends.vertices).toBe('stable');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid batch data gracefully', () => {
      const invalidBatches = [
        null,
        undefined,
        { /* missing required properties */ }
      ] as any;
      
      expect(() => {
        optimizer.optimizeBatchOrder(invalidBatches);
      }).not.toThrow();
    });

    it('should handle invalid stats gracefully', () => {
      const invalidStats = {
        frameTime: NaN,
        drawCalls: -1,
        vertices: Infinity
      } as any;
      
      expect(() => {
        optimizer.recordPerformance(invalidStats);
      }).not.toThrow();
    });

    it('should provide meaningful analysis even with bad data', () => {
      const badStats = {
        frameTime: NaN,
        drawCalls: 0,
        vertices: -100,
        triangles: Infinity,
        batches: -5,
        textureBinds: NaN,
        shaderSwitches: undefined
      } as any;
      
      optimizer.recordPerformance(badStats);
      
      const analysis = optimizer.analyze();
      
      expect(analysis).toBeDefined();
      expect(typeof analysis.drawCallEfficiency).toBe('number');
      expect(typeof analysis.batchUtilization).toBe('number');
      expect(typeof analysis.textureBindRatio).toBe('number');
    });
  });

  describe('Optimization Suggestions', () => {
    it('should generate suggestions based on performance', () => {
      // Record poor performance stats
      const poorStats = {
        frameTime: 50, // Very slow
        drawCalls: 100, // Too many draw calls
        vertices: 500,  // Low vertices per draw call
        triangles: 250,
        batches: 100,
        textureBinds: 200, // Too many texture binds
        shaderSwitches: 50
      };
      
      optimizer.recordPerformance(poorStats);
      
      const analysis = optimizer.analyze();
      
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      
      const suggestionTypes = analysis.suggestions.map(s => s.type);
      expect(suggestionTypes).toContain(OptimizationType.REDUCE_DRAW_CALLS);
    });

    it('should prioritize suggestions correctly', () => {
      const poorStats = {
        frameTime: 50,
        drawCalls: 100,
        vertices: 500,
        triangles: 250,
        batches: 100,
        textureBinds: 200,
        shaderSwitches: 50
      };
      
      optimizer.recordPerformance(poorStats);
      
      const analysis = optimizer.analyze();
      
      // Suggestions should be sorted by priority (highest first)
      for (let i = 1; i < analysis.suggestions.length; i++) {
        expect(analysis.suggestions[i-1].priority).toBeGreaterThanOrEqual(
          analysis.suggestions[i].priority
        );
      }
    });

    it('should provide implementation guidance', () => {
      const poorStats = {
        frameTime: 50,
        drawCalls: 100,
        vertices: 500,
        triangles: 250,
        batches: 100,
        textureBinds: 200,
        shaderSwitches: 50
      };
      
      optimizer.recordPerformance(poorStats);
      
      const analysis = optimizer.analyze();
      
      analysis.suggestions.forEach(suggestion => {
        expect(suggestion.description).toBeDefined();
        expect(suggestion.expectedImprovement).toBeDefined();
        expect(suggestion.implementation).toBeDefined();
        expect(suggestion.priority).toBeGreaterThan(0);
        expect(suggestion.priority).toBeLessThanOrEqual(10);
      });
    });
  });
});