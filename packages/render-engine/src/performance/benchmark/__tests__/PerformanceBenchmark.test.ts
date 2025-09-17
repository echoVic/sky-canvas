/**
 * 性能基准测试框架测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BenchmarkResult, PerformanceBenchmark } from '../PerformanceBenchmark';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

describe('PerformanceBenchmark', () => {
  let benchmark: PerformanceBenchmark;
  let mockTime = 0;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
    mockTime = 0;
    mockPerformanceNow.mockImplementation(() => {
      mockTime += 10; // 每次调用增加10ms
      return mockTime;
    });
  });

  describe('基本功能', () => {
    it('应该能够创建基准测试套件', () => {
      const suite = benchmark.suite('Test Suite', {
        iterations: 10
      });

      expect(suite).toBeDefined();
      expect(typeof suite.test).toBe('function');
      expect(typeof suite.run).toBe('function');
    });

    it('应该能够添加测试到套件', () => {
      const suite = benchmark.suite('Test Suite', {
        iterations: 10
      });

      const testFn = vi.fn();
      suite.test('Test Case', testFn);

      expect(suite).toBeDefined();
    });

    it('应该能够运行简单的测试', async () => {
      const testFn = vi.fn();
      const suite = benchmark.suite('Simple Test', {
        iterations: 5
      });

      suite.test('Test Case', testFn);
      
      const results = await suite.run();
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Case');
      expect(results[0].iterations).toBe(5);
      expect(testFn).toHaveBeenCalledTimes(5);
    });

    it('应该计算正确的统计信息', async () => {
      // 重置mock以提供可预测的时间
      let callCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        callCount++;
        return callCount * 10; // 每次调用10ms
      });

      const testFn = vi.fn();
      const suite = benchmark.suite('Stats Test', {
        iterations: 3
      });

      suite.test('Stats Case', testFn);
      
      const results = await suite.run();
      const result = results[0];
      
      expect(result.iterations).toBe(3);
      expect(result.totalTime).toBe(30); // 3次调用，每次10ms
      expect(result.averageTime).toBe(10);
      expect(result.minTime).toBe(10);
      expect(result.maxTime).toBe(10);
      expect(result.throughput).toBe(100); // 1000 / 10ms
    });
  });

  describe('异步测试', () => {
    it('应该能够运行异步测试', async () => {
      const asyncTestFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      });

      const suite = benchmark.suite('Async Test', {
        iterations: 3
      });

      suite.test('Async Case', asyncTestFn);
      
      const results = await suite.run();
      
      expect(results).toHaveLength(1);
      expect(results[0].iterations).toBe(3);
      expect(asyncTestFn).toHaveBeenCalledTimes(3);
    });

    it('应该处理测试中的错误', async () => {
      const errorTestFn = vi.fn(() => {
        throw new Error('Test error');
      });

      const suite = benchmark.suite('Error Test', {
        iterations: 2
      });

      suite.test('Error Case', errorTestFn);
      
      await expect(suite.run()).rejects.toThrow('Test error');
    });
  });

  describe('生命周期钩子', () => {
    it('应该执行setup和teardown钩子', async () => {
      const setupFn = vi.fn();
      const teardownFn = vi.fn();
      const testFn = vi.fn();

      const suite = benchmark.suite('Lifecycle Test', {
        iterations: 2,
        setup: setupFn,
        teardown: teardownFn
      });

      suite.test('Lifecycle Case', testFn);
      
      await suite.run();
      
      expect(setupFn).toHaveBeenCalledTimes(1);
      expect(teardownFn).toHaveBeenCalledTimes(1);
      expect(testFn).toHaveBeenCalledTimes(2);
    });

    it('应该执行beforeEach和afterEach钩子', async () => {
      const beforeEachFn = vi.fn();
      const afterEachFn = vi.fn();
      const testFn = vi.fn();

      const suite = benchmark.suite('Each Hooks Test', {
        iterations: 3,
        beforeEach: beforeEachFn,
        afterEach: afterEachFn
      });

      suite.test('Each Hooks Case', testFn);
      
      await suite.run();
      
      expect(beforeEachFn).toHaveBeenCalledTimes(3);
      expect(afterEachFn).toHaveBeenCalledTimes(3);
      expect(testFn).toHaveBeenCalledTimes(3);
    });

    it('应该支持异步生命周期钩子', async () => {
      const setupFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      });

      const testFn = vi.fn();

      const suite = benchmark.suite('Async Lifecycle Test', {
        iterations: 2,
        setup: setupFn
      });

      suite.test('Async Lifecycle Case', testFn);
      
      await suite.run();
      
      expect(setupFn).toHaveBeenCalledTimes(1);
      expect(testFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('预热功能', () => {
    it('应该执行预热迭代', async () => {
      const testFn = vi.fn();

      const suite = benchmark.suite('Warmup Test', {
        iterations: 3,
        warmupIterations: 2
      });

      suite.test('Warmup Case', testFn);
      
      const results = await suite.run();
      
      // 总共应该调用5次：2次预热 + 3次正式测试
      expect(testFn).toHaveBeenCalledTimes(5);
      // 但结果中只记录正式测试的3次
      expect(results[0].iterations).toBe(3);
    });
  });

  describe('事件系统', () => {
    it('应该发出测试开始和完成事件', async () => {
      const testStartHandler = vi.fn();
      const testCompleteHandler = vi.fn();

      benchmark.on('test-start', testStartHandler);
      benchmark.on('test-complete', testCompleteHandler);

      const suite = benchmark.suite('Event Test', {
        iterations: 2
      });

      suite.test('Event Case', vi.fn());
      
      await suite.run();
      
      expect(testStartHandler).toHaveBeenCalledWith({ name: 'Event Case' });
      expect(testCompleteHandler).toHaveBeenCalledTimes(1);
      
      const eventData = testCompleteHandler.mock.calls[0][0];
      expect(eventData.name).toBe('Event Case');
      expect(eventData.result).toMatchObject({
        name: 'Event Case',
        iterations: 2
      });
    });

    it('应该发出进度事件', async () => {
      const progressHandler = vi.fn();

      benchmark.on('progress', progressHandler);

      const suite = benchmark.suite('Progress Test', {
        iterations: 1
      });

      suite.test('Progress Case 1', vi.fn());
      suite.test('Progress Case 2', vi.fn());
      
      await suite.run();
      
      expect(progressHandler).toHaveBeenCalledTimes(2);
      
      const calls = progressHandler.mock.calls;
      expect(calls[0][0]).toEqual({ completed: 1, total: 2 });
      expect(calls[1][0]).toEqual({ completed: 2, total: 2 });
    });
  });

  describe('内存测量', () => {
    it('应该测量内存使用（模拟）', async () => {
      // Mock memory usage
      Object.defineProperty(global, 'performance', {
        value: {
          now: mockPerformanceNow,
          memory: {
            usedJSHeapSize: 1000000
          }
        }
      });

      const suite = benchmark.suite('Memory Test', {
        iterations: 2,
        measureMemory: true
      });

      suite.test('Memory Case', vi.fn());
      
      const results = await suite.run();
      const result = results[0];
      
      expect(result.memoryUsage).toBeDefined();
      expect(typeof result.memoryUsage!.before).toBe('number');
      expect(typeof result.memoryUsage!.after).toBe('number');
      expect(typeof result.memoryUsage!.peak).toBe('number');
    });
  });

  describe('结果比较', () => {
    it('应该能够比较基准测试结果', () => {
      const baseline: BenchmarkResult = {
        name: 'Test',
        iterations: 100,
        totalTime: 1000,
        averageTime: 10,
        minTime: 8,
        maxTime: 12,
        standardDeviation: 1,
        throughput: 100
      };

      const current: BenchmarkResult = {
        name: 'Test',
        iterations: 100,
        totalTime: 1200,
        averageTime: 12,
        minTime: 10,
        maxTime: 14,
        standardDeviation: 1.2,
        throughput: 83.33
      };

      const comparison = PerformanceBenchmark.compare(baseline, current);

      expect(comparison.name).toBe('Test');
      expect(comparison.timeChange).toBeCloseTo(20, 0); // 20%变慢
      expect(comparison.throughputChange).toBeLessThan(0); // 吞吐量下降
      expect(comparison.verdict).toBe('degraded');
    });

    it('应该识别性能改进', () => {
      const baseline: BenchmarkResult = {
        name: 'Test',
        iterations: 100,
        totalTime: 1000,
        averageTime: 10,
        minTime: 8,
        maxTime: 12,
        standardDeviation: 1,
        throughput: 100
      };

      const improved: BenchmarkResult = {
        name: 'Test',
        iterations: 100,
        totalTime: 800,
        averageTime: 8,
        minTime: 6,
        maxTime: 10,
        standardDeviation: 0.8,
        throughput: 125
      };

      const comparison = PerformanceBenchmark.compare(baseline, improved);

      expect(comparison.timeChange).toBeLessThan(0); // 时间减少
      expect(comparison.throughputChange).toBeGreaterThan(0); // 吞吐量增加
      expect(comparison.verdict).toBe('improved');
    });
  });

  describe('中止功能', () => {
    it('应该能够中止正在运行的测试', async () => {
      const longRunningTest = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const suite = benchmark.suite('Abort Test', {
        iterations: 10
      });

      suite.test('Long Running Case', longRunningTest);

      // 启动测试但不等待完成
      const testPromise = suite.run();

      // 立即中止
      benchmark.abort();

      // 测试应该被中止
      await expect(testPromise).rejects.toThrow('Benchmark aborted');
    });
  });

  describe('多个套件', () => {
    it('应该能够运行多个测试套件', async () => {
      benchmark.suite('Suite 1', { iterations: 2 })
        .test('Test 1', vi.fn());

      benchmark.suite('Suite 2', { iterations: 3 })
        .test('Test 2', vi.fn());

      const results = await benchmark.runAll();

      expect(results.size).toBe(2);
      expect(results.has('Suite 1')).toBe(true);
      expect(results.has('Suite 2')).toBe(true);
      expect(results.get('Suite 1')).toHaveLength(1);
      expect(results.get('Suite 2')).toHaveLength(1);
    });
  });

  describe('导出功能', () => {
    it('应该能够导出结果为JSON', () => {
      const results = new Map([
        ['Suite 1', [{
          name: 'Test 1',
          iterations: 10,
          totalTime: 100,
          averageTime: 10,
          minTime: 8,
          maxTime: 12,
          standardDeviation: 1,
          throughput: 100
        }]]
      ]);

      const exportedJson = PerformanceBenchmark.exportResults(results);
      const parsed = JSON.parse(exportedJson);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.platform).toBeDefined();
      expect(parsed.results['Suite 1']).toHaveLength(1);
      expect(parsed.results['Suite 1'][0].name).toBe('Test 1');
    });
  });
});