/**
 * Benchmark 模块主入口测试
 * 测试模块导出和集成功能
 */

import { describe, expect, it, vi } from 'vitest';
import {
  PerformanceBenchmark,
  BenchmarkSuite,
  createBenchmark,
  RenderingBenchmark,
  runAllExamples,
  type GenericBenchmarkResult,
  type GenericBenchmarkConfig,
  type BenchmarkFunction,
  type BenchmarkEvents,
  type RenderingBenchmarkConfig
} from '../index';

describe('Benchmark Module Exports', () => {
  describe('Core Class Exports', () => {
    it('should export PerformanceBenchmark class', () => {
      expect(PerformanceBenchmark).toBeDefined();
      expect(typeof PerformanceBenchmark).toBe('function');
      expect(PerformanceBenchmark.prototype.constructor).toBe(PerformanceBenchmark);
    });

    it('should export BenchmarkSuite class', () => {
      expect(BenchmarkSuite).toBeDefined();
      expect(typeof BenchmarkSuite).toBe('function');
      expect(BenchmarkSuite.prototype.constructor).toBe(BenchmarkSuite);
    });

    it('should export RenderingBenchmark class', () => {
      expect(RenderingBenchmark).toBeDefined();
      expect(typeof RenderingBenchmark).toBe('function');
      expect(RenderingBenchmark.prototype.constructor).toBe(RenderingBenchmark);
    });
  });

  describe('Factory Functions', () => {
    it('should export createBenchmark factory function', () => {
      expect(createBenchmark).toBeDefined();
      expect(typeof createBenchmark).toBe('function');
      
      const benchmark = createBenchmark();
      expect(benchmark).toBeInstanceOf(PerformanceBenchmark);
    });

    it('should export runAllExamples function', () => {
      expect(runAllExamples).toBeDefined();
      expect(typeof runAllExamples).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should have proper TypeScript types available', () => {
      // 测试类型是否正确导出（编译时检查）
      const benchmarkResult: GenericBenchmarkResult = {
        name: 'test',
        iterations: 100,
        totalTime: 1000,
        averageTime: 10,
        minTime: 8,
        maxTime: 12,
        standardDeviation: 1,
        throughput: 100
      };
      expect(benchmarkResult.name).toBe('test');

      const benchmarkConfig: GenericBenchmarkConfig = {
        name: 'test-config',
        iterations: 50
      };
      expect(benchmarkConfig.name).toBe('test-config');

      const benchmarkFunction: BenchmarkFunction = () => {};
      expect(typeof benchmarkFunction).toBe('function');

      const renderingConfig: RenderingBenchmarkConfig = {
        canvasWidth: 800,
        canvasHeight: 600,
        objectCount: 100,
        textureSize: 64,
        iterations: 10
      };
      expect(renderingConfig.canvasWidth).toBe(800);
    });
  });

  describe('Module Integration', () => {
    it('should create functional PerformanceBenchmark instance', () => {
      const benchmark = new PerformanceBenchmark();
      expect(benchmark).toBeDefined();
      expect(typeof benchmark.suite).toBe('function');
      expect(typeof benchmark.runAll).toBe('function');
      expect(typeof benchmark.abort).toBe('function');
    });

    it('should create functional BenchmarkSuite through PerformanceBenchmark', () => {
      const benchmark = new PerformanceBenchmark();
      const suite = benchmark.suite('Test Suite', {
        iterations: 10
      });
      
      expect(suite).toBeInstanceOf(BenchmarkSuite);
      expect(typeof suite.test).toBe('function');
      expect(typeof suite.run).toBe('function');
    });

    it('should create RenderingBenchmark with proper config', () => {
      // Mock canvas and WebGL context
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn().mockReturnValue({
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
        })
      } as unknown as HTMLCanvasElement;

      Object.defineProperty(global, 'document', {
        value: {
          createElement: vi.fn().mockReturnValue(mockCanvas)
        },
        writable: true
      });

      const config: RenderingBenchmarkConfig = {
        canvasWidth: 800,
        canvasHeight: 600,
        objectCount: 100,
        textureSize: 64,
        iterations: 10
      };

      expect(() => new RenderingBenchmark(config)).not.toThrow();
    });
  });

  describe('API Consistency', () => {
    it('should maintain consistent API surface', async () => {
      // 验证主要API的存在性和类型
      const expectedExports = [
        'PerformanceBenchmark',
        'BenchmarkSuite', 
        'createBenchmark',
        'RenderingBenchmark',
        'runAllExamples'
      ] as const;

      const moduleExports = await import('../index');
      
      expectedExports.forEach(exportName => {
        expect((moduleExports as any)[exportName]).toBeDefined();
      });
    });

    it('should provide proper inheritance chain', () => {
      const benchmark = createBenchmark();
      expect(benchmark).toBeInstanceOf(PerformanceBenchmark);
      
      const suite = benchmark.suite('Test', { iterations: 1 });
      expect(suite).toBeInstanceOf(BenchmarkSuite);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configurations gracefully', () => {
      expect(() => {
        new PerformanceBenchmark();
      }).not.toThrow();
    });

    it('should validate RenderingBenchmark config', () => {
      // Mock document.createElement to return null
      Object.defineProperty(global, 'document', {
        value: {
          createElement: vi.fn().mockReturnValue(null)
        },
        writable: true
      });

      const invalidConfig = {
        canvasWidth: 0,
        canvasHeight: 0,
        objectCount: -1,
        textureSize: 0,
        iterations: 0
      };

      expect(() => new RenderingBenchmark(invalidConfig)).toThrow();
    });
  });
});

describe('Benchmark Module Integration Tests', () => {
  describe('Cross-Component Integration', () => {
    it('should integrate PerformanceBenchmark with RenderingBenchmark', async () => {
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

      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn().mockReturnValue(mockWebGLContext)
      } as unknown as HTMLCanvasElement;

      Object.defineProperty(global, 'document', {
        value: {
          createElement: vi.fn().mockReturnValue(mockCanvas)
        },
        writable: true
      });

      const config: RenderingBenchmarkConfig = {
        canvasWidth: 800,
        canvasHeight: 600,
        objectCount: 10,
        textureSize: 32,
        iterations: 2
      };

      const renderingBenchmark = new RenderingBenchmark(config);
      expect(renderingBenchmark).toBeDefined();
      
      // 测试基本功能不抛出错误
      expect(() => renderingBenchmark.dispose()).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should create lightweight benchmark instances', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const benchmark = createBenchmark();
        expect(benchmark).toBeDefined();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 创建100个实例应该在合理时间内完成（< 100ms）
      expect(duration).toBeLessThan(100);
    });
  });
});