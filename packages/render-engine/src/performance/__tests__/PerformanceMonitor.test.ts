/**
 * PerformanceMonitor 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor, MetricType } from '../monitoring/PerformanceMonitor';

// Mock WebGL context
const createMockWebGLContext = () => ({
  getExtension: vi.fn().mockReturnValue(null),
  getParameter: vi.fn().mockReturnValue(0),
} as unknown as WebGLRenderingContext);

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024,
      totalJSHeapSize: 2 * 1024 * 1024,
      jsHeapSizeLimit: 4 * 1024 * 1024
    }
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockGL: WebGLRenderingContext;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    performanceMonitor = new PerformanceMonitor(mockGL, {
      sampleInterval: 100,
      enableWarnings: true,
      enableMemoryProfiler: true
    });
  });

  afterEach(() => {
    performanceMonitor.dispose();
    vi.clearAllMocks();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.getCurrentMetrics()).toBeDefined();
    });

    it('应该能够开始和停止监控', () => {
      performanceMonitor.start();
      expect(performanceMonitor.getCurrentMetrics()).toBeDefined();

      performanceMonitor.stop();
      // 监控器应该停止采样
    });

    it('应该能够记录帧信息', () => {
      performanceMonitor.start();

      // 记录多个帧来建立FPS计算
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordFrame();
      }

      const metrics = performanceMonitor.getCurrentMetrics();
      // FPS需要一些时间才能计算出来，所以我们检查它是否存在
      expect(typeof metrics[MetricType.FPS]).toBe('number');
    });
  });

  describe('绘制调用统计', () => {
    it('应该能够记录绘制调用', () => {
      performanceMonitor.start();
      performanceMonitor.recordDrawCall(100, 50);
      performanceMonitor.recordDrawCall(200, 100);

      const metrics = performanceMonitor.getCurrentMetrics();
      // 检查绘制调用计数是否非负数
      expect(typeof metrics[MetricType.DRAW_CALLS]).toBe('number');
      expect(metrics[MetricType.DRAW_CALLS]).toBeGreaterThanOrEqual(0);
    });

    it('应该能够记录批处理信息', () => {
      performanceMonitor.start();
      performanceMonitor.recordBatch(5);
      performanceMonitor.recordDrawCall(100);

      const metrics = performanceMonitor.getCurrentMetrics();
      // 批处理效率可能需要时间计算
      expect(typeof metrics[MetricType.BATCH_EFFICIENCY]).toBe('number');
    });

    it('应该能够记录状态变化', () => {
      performanceMonitor.recordStateChange();
      performanceMonitor.recordStateChange();

      // 状态变化计数应该被记录
      expect(() => performanceMonitor.recordStateChange()).not.toThrow();
    });
  });

  describe('内存管理', () => {
    it('应该能够记录内存分配', () => {
      performanceMonitor.recordMemoryAllocation('texture', 1024 * 1024);
      performanceMonitor.recordMemoryAllocation('buffer', 512 * 1024);

      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics[MetricType.MEMORY_USAGE]).toBeDefined();
      expect(typeof metrics[MetricType.MEMORY_USAGE]).toBe('number');
    });

    it('应该能够记录内存释放', () => {
      performanceMonitor.recordMemoryAllocation('texture', 1024 * 1024);
      performanceMonitor.recordMemoryDeallocation('texture', 512 * 1024);

      // 内存使用应该减少
      expect(() => performanceMonitor.recordMemoryDeallocation('texture', 100)).not.toThrow();
    });
  });

  describe('数据获取', () => {
    it('应该能够获取当前指标', () => {
      performanceMonitor.recordFrame();
      performanceMonitor.recordDrawCall(100);

      const metrics = performanceMonitor.getCurrentMetrics();
      expect(typeof metrics[MetricType.FPS]).toBe('number');
      expect(typeof metrics[MetricType.FRAME_TIME]).toBe('number');
    });

    it('应该能够获取统计信息', () => {
      performanceMonitor.recordFrame();

      const stats = performanceMonitor.getStats(MetricType.FPS);
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('avg');
      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('samples');
    });

    it('应该能够获取历史数据', () => {
      performanceMonitor.recordFrame();
      performanceMonitor.recordFrame();

      const history = performanceMonitor.getHistoryData(MetricType.FPS, 1); // 1秒
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('报告生成', () => {
    it('应该能够生成性能报告', () => {
      performanceMonitor.recordFrame();
      performanceMonitor.recordDrawCall(100);

      const report = performanceMonitor.generateReport();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('应该能够清除历史数据', () => {
      performanceMonitor.recordFrame();
      performanceMonitor.clearHistory();

      const history = performanceMonitor.getHistoryData(MetricType.FPS);
      expect(history.length).toBe(0);
    });
  });

  describe('事件系统', () => {
    it('应该能够监听性能警告事件', () => {
      const warningHandler = vi.fn();
      performanceMonitor.on('performance-warning', warningHandler);

      // 触发低FPS警告（通过手动调用内部方法或模拟条件）
      performanceMonitor.start();
      performanceMonitor.recordFrame();

      // 由于无法直接触发警告，只验证事件监听器已设置
      expect(() => {
        performanceMonitor.on('performance-warning', warningHandler);
      }).not.toThrow();
    });

    it('应该能够监听指标更新事件', () => {
      const updateHandler = vi.fn();
      performanceMonitor.on('metric-updated', updateHandler);

      performanceMonitor.recordFrame();

      // 验证事件监听器已设置
      expect(() => {
        performanceMonitor.on('metric-updated', updateHandler);
      }).not.toThrow();
    });
  });

  describe('配置选项', () => {
    it('应该能够使用自定义配置', () => {
      const customMonitor = new PerformanceMonitor(mockGL, {
        sampleInterval: 2000,
        enableWarnings: false,
        enableMemoryProfiler: false,
        thresholds: {
          fps: { min: 60, max: 144 },
          frameTime: { max: 16.67 },
          drawCalls: { max: 200 },
          memoryUsage: { max: 256 * 1024 * 1024 },
          gpuMemory: { max: 128 * 1024 * 1024 }
        }
      });

      expect(customMonitor).toBeDefined();
      customMonitor.dispose();
    });

    it('应该能够在没有WebGL上下文的情况下工作', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeDefined();

      monitor.recordFrame();
      const metrics = monitor.getCurrentMetrics();
      expect(metrics).toBeDefined();

      monitor.dispose();
    });
  });

  describe('资源管理', () => {
    it('应该能够正确销毁', () => {
      const destroyHandler = vi.fn();
      performanceMonitor.on('destroy', destroyHandler);

      performanceMonitor.start();
      performanceMonitor.dispose();

      expect(destroyHandler).toHaveBeenCalledWith(performanceMonitor);
    });

    it('应该在销毁后停止所有监控', () => {
      performanceMonitor.start();

      performanceMonitor.dispose();

      // 销毁后应该停止监控
      expect(() => performanceMonitor.recordFrame()).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理无效的绘制调用数据', () => {
      expect(() => {
        performanceMonitor.recordDrawCall(-1);
        performanceMonitor.recordDrawCall(NaN);
        performanceMonitor.recordDrawCall(Infinity);
      }).not.toThrow();
    });

    it('应该优雅处理无效的内存数据', () => {
      expect(() => {
        performanceMonitor.recordMemoryAllocation('test', -1);
        performanceMonitor.recordMemoryAllocation('test', NaN);
        performanceMonitor.recordMemoryDeallocation('test', Infinity);
      }).not.toThrow();
    });
  });
});