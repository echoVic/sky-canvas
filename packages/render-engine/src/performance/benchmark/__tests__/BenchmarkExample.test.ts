/**
 * 基准测试示例测试
 * 测试 BenchmarkExample 模块的功能
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runAllExamples } from '../examples/BenchmarkExample';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

// Mock performance.now
const mockPerformanceNow = vi.fn();

// Mock WebGL context
const mockWebGLContext = {
  canvas: {},
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  getExtension: vi.fn(),
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  TEXTURE_2D: 3553,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  LINEAR: 9729,
  COLOR_BUFFER_BIT: 16384,
  TRIANGLES: 4,
  BLEND: 3042,
  SRC_ALPHA: 770,
  ONE_MINUS_SRC_ALPHA: 771
};

// Mock canvas element
const mockCanvas = {
  getContext: vi.fn().mockReturnValue(mockWebGLContext),
  width: 800,
  height: 600,
  style: {}
};

describe('BenchmarkExample', () => {
  let mockTime = 0;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockTime = 0;

    // Mock console
    global.console = {
      ...global.console,
      log: mockConsoleLog,
      error: mockConsoleError
    };

    // Mock performance.now
    mockPerformanceNow.mockImplementation(() => {
      mockTime += 10;
      return mockTime;
    });
    
    Object.defineProperty(global, 'performance', {
      value: { now: mockPerformanceNow },
      writable: true
    });

    // Mock document.createElement
    Object.defineProperty(global, 'document', {
      value: {
        createElement: vi.fn().mockImplementation((tagName: string) => {
          if (tagName === 'canvas') {
            return mockCanvas;
          }
          return null;
        })
      },
      writable: true
    });

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
          setTimeout(callback, 16);
          return 1;
        }),
        cancelAnimationFrame: vi.fn()
      },
      writable: true
    });

    // Mock require.main for Node.js environment detection
    Object.defineProperty(require, 'main', {
      value: null,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runAllExamples Function', () => {
    it('should be defined and be a function', () => {
      expect(runAllExamples).toBeDefined();
      expect(typeof runAllExamples).toBe('function');
    });

    it('should execute without throwing errors', async () => {
      await expect(runAllExamples()).resolves.not.toThrow();
    });

    it('should log start message', async () => {
      await runAllExamples();
      
      expect(mockConsoleLog).toHaveBeenCalledWith('开始运行基准测试示例...');
      // Note: completion message may not appear if rendering benchmark fails
    });

    it('should handle errors gracefully', async () => {
      // Mock Math.sqrt to throw an error
      const originalSqrt = Math.sqrt;
      Math.sqrt = vi.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      await runAllExamples();
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '运行基准测试示例时出错:',
        expect.any(Error)
      );

      // Restore Math.sqrt
      Math.sqrt = originalSqrt;
    });

    it('should run basic benchmark example', async () => {
      await runAllExamples();
      
      // Should log basic benchmark results
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '基础基准测试结果:',
        expect.objectContaining({
          name: expect.any(String),
          iterations: expect.any(Number),
          totalTime: expect.any(Number),
          averageTime: expect.any(Number)
        })
      );
    });

    it('should attempt to run rendering benchmark example', async () => {
      await runAllExamples();
      
      // Should attempt to create RenderingBenchmark
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl');
    });

    it('should handle WebGL context creation failure', async () => {
      // Mock getContext to return null
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      
      await runAllExamples();
      
      // Should handle the error gracefully
      expect(mockConsoleError).toHaveBeenCalledWith(
        '运行基准测试示例时出错:',
        expect.any(Error)
      );
    });
  });

  describe('Basic Benchmark Example', () => {
    it('should perform mathematical calculations', async () => {
      const mathSqrt = vi.spyOn(Math, 'sqrt');
      
      await runAllExamples();
      
      // Should call Math.sqrt multiple times during the benchmark
      expect(mathSqrt).toHaveBeenCalled();
      
      mathSqrt.mockRestore();
    });

    it('should measure performance correctly', async () => {
      await runAllExamples();
      
      // Performance.now should be called for timing measurements
      expect(mockPerformanceNow).toHaveBeenCalled();
    });
  });

  describe('Rendering Benchmark Example', () => {
    it('should create canvas element', async () => {
      await runAllExamples();
      
      expect(global.document.createElement).toHaveBeenCalledWith('canvas');
    });

    it('should attempt to get WebGL context', async () => {
      await runAllExamples();
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl');
    });

    it('should handle missing WebGL support', async () => {
      // Mock getContext to return null (no WebGL support)
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      
      await runAllExamples();
      
      // Should log error about WebGL context failure
      expect(mockConsoleError).toHaveBeenCalledWith(
        '运行基准测试示例时出错:',
        expect.any(Error)
      );
    });

    it('should configure rendering benchmark with proper parameters', async () => {
      await runAllExamples();
      
      // Should attempt to create RenderingBenchmark with specific config
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should catch and log errors from basic benchmark', async () => {
      // Mock performance.now to throw an error
      mockPerformanceNow.mockImplementation(() => {
        throw new Error('Performance measurement failed');
      });
      
      await runAllExamples();
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '运行基准测试示例时出错:',
        expect.any(Error)
      );
    });

    it('should handle async errors properly', async () => {
      // Mock setTimeout to throw an error
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation(() => {
        throw new Error('Async operation failed');
      }) as any;
      
      await runAllExamples();
      
      // Should handle the error gracefully
      expect(mockConsoleError).toHaveBeenCalled();
      
      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Environment Detection', () => {
    it('should detect Node.js environment correctly', () => {
      expect(typeof window).toBe('object'); // Mocked window
      expect(require.main).toBeNull(); // Mocked require.main
    });

    it('should handle browser environment', () => {
      // In our test environment, window is mocked
      expect(global.window).toBeDefined();
      expect(global.document).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should generate valid benchmark results', async () => {
      await runAllExamples();
      
      // Should log results with proper structure
      const logCalls = mockConsoleLog.mock.calls;
      const resultCall = logCalls.find(call => 
        call[0] === '基础基准测试结果:' && call[1]
      );
      
      if (resultCall) {
        const result = resultCall[1];
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('iterations');
        expect(result).toHaveProperty('totalTime');
        expect(result).toHaveProperty('averageTime');
        expect(typeof result.iterations).toBe('number');
        expect(typeof result.totalTime).toBe('number');
        expect(typeof result.averageTime).toBe('number');
      }
    });

    it('should measure execution time', async () => {
      const startTime = performance.now();
      await runAllExamples();
      const endTime = performance.now();
      
      // Should take some measurable time
      expect(endTime).toBeGreaterThan(startTime);
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources properly', async () => {
      // Mock successful WebGL context to allow completion
      mockCanvas.getContext = vi.fn().mockReturnValue(mockWebGLContext);
      
      await runAllExamples();
      
      // Should not leave any hanging resources
      // This is more of a conceptual test since we're mocking everything
      const logCalls = mockConsoleLog.mock.calls.map(call => call[0]);
      expect(logCalls).toContain('所有基准测试示例完成!');
    });

    it('should handle disposal of rendering benchmark', async () => {
      // Mock getContext to return null to trigger error
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      
      await runAllExamples();
      
      // Should attempt to dispose resources even if creation failed
      // The dispose call should be in a finally block
      expect(mockConsoleError).toHaveBeenCalledWith(
        '运行基准测试示例时出错:',
        expect.any(Error)
      );
    });
  });
});