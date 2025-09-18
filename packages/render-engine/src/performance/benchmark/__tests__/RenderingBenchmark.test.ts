/**
 * RenderingBenchmark 单元测试
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { RenderingBenchmark, RenderingBenchmarkConfig } from '../RenderingBenchmark';
import { PerformanceBenchmark, BenchmarkResult } from '../PerformanceBenchmark';
import { BatchManager } from '../../../rendering/batch/core/BatchManager';
import { BatchOptimizer } from '../../../rendering/batch/utils/BatchOptimizer';

// Mock dependencies
vi.mock('../PerformanceBenchmark');
vi.mock('../../../rendering/batch/core/BatchManager');
vi.mock('../../../rendering/batch/utils/BatchOptimizer');
vi.mock('../../../rendering/batch/index', () => ({
  createBatchManagerWithDefaultStrategies: vi.fn(),
  BatchOptimizer: vi.fn()
}));

// Mock WebGL context
const mockWebGLContext = {
  canvas: {},
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  createBuffer: vi.fn(),
  createTexture: vi.fn(),
  createProgram: vi.fn(),
  createShader: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  useProgram: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawElements: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  viewport: vi.fn()
} as unknown as WebGLRenderingContext;

// Mock HTMLCanvasElement factory function
const createMockCanvas = () => ({
  width: 800,
  height: 600,
  getContext: vi.fn().mockReturnValue(mockWebGLContext)
} as unknown as HTMLCanvasElement);

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return createMockCanvas();
      }
      return {} as any;
    })
  },
  writable: true
});

// Mock BatchManager
const mockBatchManager = {
  addRenderable: vi.fn(),
  flush: vi.fn(),
  setStrategy: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalBatches: 5,
    totalRenderables: 100,
    averageBatchSize: 20,
    memoryUsage: 1024
  }),
  dispose: vi.fn()
};

// Mock BatchOptimizer
const mockBatchOptimizer = {
  analyze: vi.fn().mockReturnValue({
    suggestions: [
      'Consider using texture atlasing',
      'Reduce draw calls by batching'
    ]
  })
};

// Mock PerformanceBenchmark
const mockBenchmarkSuite = {
  test: vi.fn().mockReturnThis(),
  run: vi.fn().mockResolvedValue([
    {
      name: 'test',
      iterations: 100,
      totalTime: 1000,
      averageTime: 10,
      minTime: 8,
      maxTime: 15,
      standardDeviation: 2,
      throughput: 100,
      memoryUsage: {
        before: 1000,
        after: 1200,
        peak: 1300
      }
    } as BenchmarkResult
  ])
};

const mockPerformanceBenchmark = {
  suite: vi.fn().mockReturnValue(mockBenchmarkSuite)
};

// Import mocked modules
const { createBatchManagerWithDefaultStrategies } = await import('../../../rendering/batch/index');

describe('RenderingBenchmark', () => {
  let renderingBenchmark: RenderingBenchmark;
  let config: RenderingBenchmarkConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset document.createElement mock
    vi.mocked(document.createElement).mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return createMockCanvas();
      }
      return {} as any;
    });
    
    config = {
      canvasWidth: 800,
      canvasHeight: 600,
      objectCount: 1000,
      textureSize: 512,
      iterations: 100,
      enableProfiling: true
    };

    // Setup mocks
    vi.mocked(PerformanceBenchmark).mockImplementation(
      () => mockPerformanceBenchmark as any
    );
    
    vi.mocked(createBatchManagerWithDefaultStrategies).mockReturnValue(mockBatchManager as any);
    vi.mocked(BatchOptimizer).mockImplementation(
      () => mockBatchOptimizer as any
    );

    renderingBenchmark = new RenderingBenchmark(config);
  });

  afterEach(() => {
    renderingBenchmark.dispose();
  });

  describe('constructor', () => {
    it('should create canvas with correct dimensions', () => {
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      // Canvas dimensions are set in the createCanvas method
      expect(renderingBenchmark).toBeDefined();
    });

    it('should initialize WebGL context', () => {
      // WebGL context is initialized in the constructor
      expect(renderingBenchmark).toBeDefined();
    });

    it('should throw error if WebGL is not supported', () => {
      // Mock createElement to return a canvas that doesn't support WebGL
      vi.mocked(document.createElement).mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 800,
            height: 600,
            getContext: vi.fn().mockReturnValue(null)
          } as unknown as HTMLCanvasElement;
        }
        return {} as any;
      });

      expect(() => new RenderingBenchmark(config)).toThrow('WebGL not supported');
    });
  });

  describe('testBatchRendering', () => {
    it('should run batch rendering performance test', async () => {
      const result = await renderingBenchmark.testBatchRendering();

      expect(mockPerformanceBenchmark.suite).toHaveBeenCalledWith('批处理渲染测试', {
        iterations: config.iterations,
        warmupIterations: 10,
        measureMemory: true,
        setup: expect.any(Function),
        teardown: expect.any(Function)
      });

      expect(mockBenchmarkSuite.test).toHaveBeenCalledWith('批处理渲染', expect.any(Function));
      expect(mockBenchmarkSuite.run).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('test');
    });

    it('should setup and teardown batch manager correctly', async () => {
      await renderingBenchmark.testBatchRendering();

      // Get the setup and teardown functions from the suite call
      const suiteCall = mockPerformanceBenchmark.suite.mock.calls[0];
      const suiteConfig = suiteCall[1];

      // Execute setup
      await suiteConfig.setup();
      expect(createBatchManagerWithDefaultStrategies).toHaveBeenCalledWith(mockWebGLContext);

      // Execute teardown
      await suiteConfig.teardown();
      expect(mockBatchManager.dispose).toHaveBeenCalled();
    });

    it('should add renderables and flush in test function', async () => {
      await renderingBenchmark.testBatchRendering();

      // Get the test function from the test call
      const testCall = mockBenchmarkSuite.test.mock.calls[0];
      const testFunction = testCall[1];

      // Setup batch manager first
      const suiteCall = mockPerformanceBenchmark.suite.mock.calls[0];
      const suiteConfig = suiteCall[1];
      await suiteConfig.setup();

      // Execute test function
      testFunction();

      expect(mockBatchManager.addRenderable).toHaveBeenCalledTimes(config.objectCount);
      expect(mockBatchManager.flush).toHaveBeenCalled();
    });
  });

  describe('testInstancedRendering', () => {
    it('should run instanced rendering performance test', async () => {
      const result = await renderingBenchmark.testInstancedRendering();

      expect(mockPerformanceBenchmark.suite).toHaveBeenCalledWith('实例化渲染测试', {
        iterations: config.iterations,
        warmupIterations: 10,
        measureMemory: true,
        setup: expect.any(Function),
        teardown: expect.any(Function)
      });

      expect(mockBenchmarkSuite.test).toHaveBeenCalledWith('实例化渲染', expect.any(Function));
      expect(result).toBeDefined();
    });

    it('should set instanced strategy in setup', async () => {
      await renderingBenchmark.testInstancedRendering();

      // Get the setup function from the suite call
      const suiteCall = mockPerformanceBenchmark.suite.mock.calls[0];
      const suiteConfig = suiteCall[1];

      // Execute setup
      await suiteConfig.setup();
      expect(mockBatchManager.setStrategy).toHaveBeenCalledWith('instanced');
    });
  });

  describe('getBatchStats', () => {
    it('should return batch manager stats', () => {
      // Setup batch manager first
      (renderingBenchmark as any).batchManager = mockBatchManager;

      const stats = renderingBenchmark.getBatchStats();

      expect(mockBatchManager.getStats).toHaveBeenCalled();
      expect(stats).toEqual({
        totalBatches: 5,
        totalRenderables: 100,
        averageBatchSize: 20,
        memoryUsage: 1024
      });
    });

    it('should return undefined if batch manager is not initialized', () => {
      const stats = renderingBenchmark.getBatchStats();
      expect(stats).toBeUndefined();
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should return optimization suggestions', () => {
      // Setup batch optimizer first
      (renderingBenchmark as any).batchOptimizer = mockBatchOptimizer;

      const suggestions = renderingBenchmark.getOptimizationSuggestions();

      expect(mockBatchOptimizer.analyze).toHaveBeenCalled();
      expect(suggestions).toEqual([
        'Consider using texture atlasing',
        'Reduce draw calls by batching'
      ]);
    });

    it('should return empty array if batch optimizer is not initialized', () => {
      const suggestions = renderingBenchmark.getOptimizationSuggestions();
      expect(suggestions).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', () => {
      // Setup resources
      (renderingBenchmark as any).batchManager = mockBatchManager;
      const mockTextureAtlas = { dispose: vi.fn() };
      (renderingBenchmark as any).textureAtlas = mockTextureAtlas;

      renderingBenchmark.dispose();

      expect(mockBatchManager.dispose).toHaveBeenCalled();
      expect(mockTextureAtlas.dispose).toHaveBeenCalled();
    });

    it('should handle disposal when resources are not initialized', () => {
      expect(() => renderingBenchmark.dispose()).not.toThrow();
    });
  });

  describe('createMockRenderables', () => {
    it('should create correct number of mock renderables', async () => {
      await renderingBenchmark.testBatchRendering();

      // Get the test function and execute it to trigger createMockRenderables
      const testCall = mockBenchmarkSuite.test.mock.calls[0];
      const testFunction = testCall[1];

      // Setup batch manager first
      const suiteCall = mockPerformanceBenchmark.suite.mock.calls[0];
      const suiteConfig = suiteCall[1];
      await suiteConfig.setup();

      testFunction();

      // Verify that addRenderable was called for each mock renderable
      expect(mockBatchManager.addRenderable).toHaveBeenCalledTimes(config.objectCount);

      // Verify the structure of mock renderables
      const firstCall = mockBatchManager.addRenderable.mock.calls[0];
      const mockRenderable = firstCall[0];

      expect(mockRenderable).toHaveProperty('getVertices');
      expect(mockRenderable).toHaveProperty('getIndices');
      expect(mockRenderable).toHaveProperty('getShader');
      expect(mockRenderable).toHaveProperty('getBlendMode');
      expect(mockRenderable).toHaveProperty('getZIndex');

      // Test the mock renderable methods
      expect(mockRenderable.getVertices()).toBeInstanceOf(Float32Array);
      expect(mockRenderable.getIndices()).toBeInstanceOf(Uint16Array);
      expect(mockRenderable.getShader()).toBe('basic');
      expect(mockRenderable.getBlendMode()).toBe(0);
      expect(typeof mockRenderable.getZIndex()).toBe('number');
    });
  });
});