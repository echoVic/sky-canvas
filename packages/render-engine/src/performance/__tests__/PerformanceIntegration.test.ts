/**
 * 性能监控系统集成测试
 * 验证性能基准测试和回归检测的集成功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceBenchmarkSuite,
  BenchmarkType,
  BenchmarkResult,
  createDefaultBenchmarkSuite
} from '../PerformanceBenchmark';
import { RegressionDetector, PerformanceAlertSystem } from '../RegressionDetector';
import { UnifiedPerformanceMonitor, UnifiedMetricType, DataSourceType } from '../UnifiedPerformanceMonitor';

// Mock性能API
Object.defineProperty(global.performance, 'now', {
  writable: true,
  value: vi.fn(() => Date.now())
});

Object.defineProperty(global.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
});

global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

describe('性能监控系统集成测试', () => {
  let performanceMonitor: UnifiedPerformanceMonitor;
  let benchmarkSuite: PerformanceBenchmarkSuite;
  let regressionDetector: RegressionDetector;
  let alertSystem: PerformanceAlertSystem;

  beforeEach(() => {
    performanceMonitor = new UnifiedPerformanceMonitor();
    benchmarkSuite = new PerformanceBenchmarkSuite(performanceMonitor);
    regressionDetector = new RegressionDetector();
    alertSystem = new PerformanceAlertSystem(regressionDetector);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor?.dispose();
    benchmarkSuite?.removeAllListeners();
  });

  describe('基准测试与性能监控集成', () => {
    it('应该能够集成性能监控数据到基准测试中', async () => {
      // 模拟性能监控数据
      performanceMonitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
      performanceMonitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 50, DataSourceType.RENDER_ENGINE);
      performanceMonitor.recordMetric(UnifiedMetricType.MEMORY_USAGE, 100, DataSourceType.RENDER_ENGINE);

      // 创建基准测试场景
      const mockScenario = {
        name: 'Integrated Performance Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Integrated Performance Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {
            fps: 60,
            drawCalls: 50,
            memoryUsage: 100
          },
          timestamp: Date.now(),
          passed: true,
          threshold: 30
        })
      };

      benchmarkSuite.addScenario(mockScenario);
      const results = await benchmarkSuite.runAll();

      expect(results).toHaveLength(1);
      expect(results[0].metadata.fps).toBe(60);
      expect(results[0].metadata.drawCalls).toBe(50);
      expect(results[0].metadata.memoryUsage).toBe(100);
    });

    it('应该能够检测性能阈值违反', async () => {
      const mockScenario = {
        name: 'Threshold Violation Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Threshold Violation Test',
          type: BenchmarkType.FRAME_RATE,
          score: 20, // 低于30的阈值
          unit: 'FPS',
          metadata: { fps: 20 },
          timestamp: Date.now(),
          passed: false,
          threshold: 30
        })
      };

      benchmarkSuite.addScenario(mockScenario);
      const results = await benchmarkSuite.runAll();

      expect(results[0].passed).toBe(false);
      expect(results[0].score).toBeLessThan(results[0].threshold!);
    });
  });

  describe('回归检测集成', () => {
    it('应该能够检测性能回归', async () => {
      // 设置历史基准数据
      const historicalResults: BenchmarkResult[] = [
        {
          name: 'Regression Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now() - 86400000, // 1天前
          passed: true
        },
        {
          name: 'Regression Test',
          type: BenchmarkType.FRAME_RATE,
          score: 58,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now() - 43200000, // 12小时前
          passed: true
        }
      ];

      regressionDetector.addHistoricalData('Regression Test', historicalResults);

      // 当前测试结果（性能下降）
      const currentResults: BenchmarkResult[] = [
        {
          name: 'Regression Test',
          type: BenchmarkType.FRAME_RATE,
          score: 45, // 明显下降
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true
        }
      ];

      const analysis = regressionDetector.detectRegression('Regression Test', currentResults);

      expect(analysis.trend).toBe('degrading');
      expect(analysis.magnitude).toBeGreaterThan(20); // 超过20%的下降
    });

    it('应该能够检测性能改进', async () => {
      // 设置历史基准数据
      const historicalResults: BenchmarkResult[] = [
        {
          name: 'Improvement Test',
          type: BenchmarkType.FRAME_RATE,
          score: 45,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now() - 86400000,
          passed: true
        }
      ];

      regressionDetector.addHistoricalData('Improvement Test', historicalResults);

      // 当前测试结果（性能提升）
      const currentResults: BenchmarkResult[] = [
        {
          name: 'Improvement Test',
          type: BenchmarkType.FRAME_RATE,
          score: 65, // 明显提升
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true
        }
      ];

      const analysis = regressionDetector.detectRegression('Improvement Test', currentResults);

      expect(analysis.trend).toBe('improving');
      expect(analysis.magnitude).toBeGreaterThan(40); // 超过40%的提升
    });
  });

  describe('警报系统集成', () => {
    it('应该在检测到回归时发送警报', () => {
      return new Promise<void>((resolve) => {
        // 订阅警报
        alertSystem.subscribe((alert) => {
          expect(alert.type).toBe('regression');
          expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
          expect(alert.details).toBeDefined();
          resolve();
        });

        // 设置历史数据
        const historicalResults: BenchmarkResult[] = [
          {
            name: 'Alert Test',
            type: BenchmarkType.FRAME_RATE,
            score: 60,
            unit: 'FPS',
            metadata: {},
            timestamp: Date.now() - 86400000,
            passed: true
          }
        ];

        regressionDetector.addHistoricalData('Alert Test', historicalResults);

        // 触发回归检测
        const testResults = new Map([
          ['Alert Test', [
            {
              name: 'Alert Test',
              type: BenchmarkType.FRAME_RATE,
              score: 30, // 50%下降
              unit: 'FPS',
              metadata: {},
              timestamp: Date.now(),
              passed: false
            }
          ]]
        ]);

        alertSystem.checkAndAlert(testResults);
      });
    });

    it('应该根据回归严重程度设置正确的警报级别', () => {
      return new Promise<void>((resolve) => {
        alertSystem.subscribe((alert) => {
          expect(alert.severity).toBe('high'); // 期望高严重级别
          resolve();
        });

        // 设置历史数据
        const historicalResults: BenchmarkResult[] = [
          {
            name: 'Severity Test',
            type: BenchmarkType.FRAME_RATE,
            score: 60,
            unit: 'FPS',
            metadata: {},
            timestamp: Date.now() - 86400000,
            passed: true
          }
        ];

        regressionDetector.addHistoricalData('Severity Test', historicalResults);

        // 严重回归（>50%下降）
        const testResults = new Map([
          ['Severity Test', [
            {
              name: 'Severity Test',
              type: BenchmarkType.FRAME_RATE,
              score: 25, // 58%下降
              unit: 'FPS',
              metadata: {},
              timestamp: Date.now(),
              passed: false
            }
          ]]
        ]);

        alertSystem.checkAndAlert(testResults);
      });
    });
  });

  describe('端到端性能测试流程', () => {
    it('应该能够执行完整的性能测试和回归检测流程', async () => {
      // 1. 创建模拟的渲染引擎
      const mockRenderEngine = {
        render: vi.fn(),
        getDrawCallCount: vi.fn().mockReturnValue(10),
        getBatchCount: vi.fn().mockReturnValue(3)
      };

      // 2. 创建默认基准测试套件
      const suite = createDefaultBenchmarkSuite(mockRenderEngine, performanceMonitor);

      // 3. 运行基准测试
      const results = await suite.runAll();
      expect(results.length).toBeGreaterThan(0);

      // 4. 将结果添加到回归检测器
      const resultsByTest = new Map<string, BenchmarkResult[]>();
      results.forEach(result => {
        if (!resultsByTest.has(result.name)) {
          resultsByTest.set(result.name, []);
        }
        resultsByTest.get(result.name)!.push(result);
      });

      // 5. 检测回归
      const regressions = regressionDetector.detectRegressions(resultsByTest);
      expect(regressions.size).toBe(results.length);

      // 6. 生成报告
      const report = regressionDetector.generateReport(regressions);
      expect(report.summary.totalTests).toBe(results.length);

      // 7. 导出结果
      const jsonReport = suite.exportResults();
      expect(jsonReport).toBeDefined();
      expect(JSON.parse(jsonReport)).toHaveProperty('results');
    });

    it('应该能够处理多轮测试的性能趋势分析', async () => {
      const testName = 'Trend Analysis Test';
      const mockScenario = {
        name: testName,
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn()
      };

      benchmarkSuite.addScenario(mockScenario);

      // 模拟多轮测试，性能逐渐下降
      const performanceScores = [60, 58, 55, 52, 48]; // 逐渐下降的趋势
      const allResults: BenchmarkResult[] = [];

      for (let i = 0; i < performanceScores.length; i++) {
        mockScenario.measure.mockReturnValueOnce({
          name: testName,
          type: BenchmarkType.FRAME_RATE,
          score: performanceScores[i],
          unit: 'FPS',
          metadata: { fps: performanceScores[i] },
          timestamp: Date.now() + i * 1000,
          passed: performanceScores[i] >= 30,
          threshold: 30
        });

        const results = await benchmarkSuite.runAll();
        allResults.push(...results);

        // 每轮测试后更新历史数据
        if (i > 0) {
          regressionDetector.addHistoricalData(testName, allResults.slice(0, i));
        }
      }

      // 分析最终的性能趋势
      const finalAnalysis = regressionDetector.detectRegression(testName, [allResults[allResults.length - 1]]);
      
      expect(finalAnalysis.trend).toBe('degrading');
      expect(finalAnalysis.magnitude).toBeGreaterThan(15); // 超过15%的下降
    });
  });

  describe('性能监控数据验证', () => {
    it('应该验证基准测试数据的一致性', async () => {
      const mockScenario = {
        name: 'Consistency Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Consistency Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {
            fps: 60,
            averageFrameTime: 16.67,
            memoryUsage: 50
          },
          timestamp: Date.now(),
          passed: true
        })
      };

      benchmarkSuite.addScenario(mockScenario);
      const results = await benchmarkSuite.runAll();

      const result = results[0];
      
      // 验证FPS和帧时间的一致性
      if (result.metadata.averageFrameTime) {
        expect(result.metadata.fps).toBeCloseTo(1000 / result.metadata.averageFrameTime, 1);
      }
      
      // 验证基本数据类型
      expect(typeof result.score).toBe('number');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.passed).toBe('boolean');
    });

    it('应该处理异常的性能数据', async () => {
      const mockScenario = {
        name: 'Anomaly Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Anomaly Test',
          type: BenchmarkType.FRAME_RATE,
          score: NaN, // 异常值
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: false
        })
      };

      benchmarkSuite.addScenario(mockScenario);
      const results = await benchmarkSuite.runAll();

      expect(results[0].passed).toBe(false);
      expect(isNaN(results[0].score)).toBe(true);
    });
  });

  describe('性能基准管理', () => {
    it('应该能够保存和加载性能基准', () => {
      const benchmarkData = {
        'FPS Test': [
          {
            name: 'FPS Test',
            type: BenchmarkType.FRAME_RATE,
            score: 60,
            unit: 'FPS',
            metadata: {},
            timestamp: Date.now(),
            passed: true
          }
        ]
      };

      // 保存基准数据
      const serialized = JSON.stringify(benchmarkData);
      expect(serialized).toBeDefined();

      // 加载基准数据
      const loaded = JSON.parse(serialized);
      expect(loaded['FPS Test']).toHaveLength(1);
      expect(loaded['FPS Test'][0].score).toBe(60);

      // 将数据添加到回归检测器
      Object.entries(loaded).forEach(([testName, results]) => {
        regressionDetector.addHistoricalData(testName, results as BenchmarkResult[]);
      });

      // 验证数据已正确加载
      const analysis = regressionDetector.detectRegression('FPS Test', []);
      expect(analysis.samples).toBe(1);
    });

    it('应该支持自定义基准阈值', async () => {
      const customThreshold = 45;
      const mockScenario = {
        name: 'Custom Threshold Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Custom Threshold Test',
          type: BenchmarkType.FRAME_RATE,
          score: 50,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
          threshold: customThreshold
        })
      };

      benchmarkSuite.addScenario(mockScenario);
      const results = await benchmarkSuite.runAll();

      expect(results[0].threshold).toBe(customThreshold);
      expect(results[0].score).toBeGreaterThan(customThreshold);
      expect(results[0].passed).toBe(true);
    });
  });
});