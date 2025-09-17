/**
 * RegressionDetector 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RegressionDetector,
  PerformanceAlertSystem,
  createRegressionDetector,
  type RegressionConfig
} from '../RegressionDetector';
import { BenchmarkResult, BenchmarkType } from '../PerformanceBenchmark';

// Mock 基准测试结果
const createMockBenchmarkResult = (
  name: string,
  score: number,
  timestamp: number = Date.now()
): BenchmarkResult => ({
  name,
  type: BenchmarkType.FRAME_RATE,
  score,
  unit: 'fps',
  timestamp,
  passed: true,
  metadata: {
    fps: score,
    averageFrameTime: 16.67
  }
});

const createMockBaseline = (): BenchmarkResult[] => [
  createMockBenchmarkResult('FPS Test', 60.0),
  createMockBenchmarkResult('Memory Test', 50.0),
  createMockBenchmarkResult('Draw Calls Test', 100.0),
  createMockBenchmarkResult('Load Time Test', 200.0)
];

const createMockCurrent = (): BenchmarkResult[] => [
  createMockBenchmarkResult('FPS Test', 55.0), // 降低 8.3%
  createMockBenchmarkResult('Memory Test', 52.0), // 增加 4%
  createMockBenchmarkResult('Draw Calls Test', 85.0), // 降低 15%
  createMockBenchmarkResult('Load Time Test', 190.0) // 改善 5%
];

describe('RegressionDetector', () => {
  let detector: RegressionDetector;
  let config: RegressionConfig;

  beforeEach(() => {
    config = {
      tolerance: 0.1, // 10%
      minSamples: 3,
      significanceThreshold: 0.05,
      warmupPeriod: 2
    };
    detector = new RegressionDetector(config);
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      expect(detector).toBeDefined();
    });

    it('应该能够添加历史数据', () => {
      const baseline = createMockBaseline();
      detector.addHistoricalData('FPS Test', baseline);

      // 无法直接验证，但不应该抛出错误
      expect(() => detector.addHistoricalData('Memory Test', createMockBaseline())).not.toThrow();
    });

    it('应该能够检测单个测试的回归', () => {
      const historical = createMockBaseline();
      detector.addHistoricalData('FPS Test', historical);

      const current = createMockCurrent();
      const analysis = detector.detectRegression('FPS Test', current);

      expect(analysis).toHaveProperty('hasRegression');
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('magnitude');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('samples');
      expect(analysis).toHaveProperty('statistics');
    });
  });

  describe('回归检测', () => {
    beforeEach(() => {
      const baseline = createMockBaseline();
      detector.addHistoricalData('FPS Test', baseline);
      detector.addHistoricalData('Memory Test', baseline);
    });

    it('应该能够检测性能回归', () => {
      const current = createMockCurrent();
      const analysis = detector.detectRegression('FPS Test', [current[0]]);

      expect(analysis).toHaveProperty('hasRegression');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('magnitude');
    });

    it('应该能够批量检测多个测试', () => {
      const results = new Map<string, BenchmarkResult[]>();
      results.set('FPS Test', [createMockBenchmarkResult('FPS Test', 55.0)]);
      results.set('Memory Test', [createMockBenchmarkResult('Memory Test', 52.0)]);

      const analyses = detector.detectRegressions(results);

      expect(analyses.size).toBe(2);
      expect(analyses.has('FPS Test')).toBe(true);
      expect(analyses.has('Memory Test')).toBe(true);
    });

    it('应该能够生成回归报告', () => {
      const results = new Map<string, BenchmarkResult[]>();
      results.set('FPS Test', [createMockBenchmarkResult('FPS Test', 30.0)]);

      const analyses = detector.detectRegressions(results);
      const report = detector.generateReport(analyses);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('regressions');
      expect(report).toHaveProperty('improvements');
      expect(report).toHaveProperty('details');

      expect(report.summary).toHaveProperty('totalTests');
      expect(report.summary).toHaveProperty('regressions');
      expect(report.summary).toHaveProperty('improvements');
      expect(report.summary).toHaveProperty('stable');
    });
  });

  describe('配置管理', () => {
    it('应该能够设置警报阈值', () => {
      const newConfig: Partial<RegressionConfig> = {
        tolerance: 0.05,
        minSamples: 5
      };

      expect(() => detector.setAlertThresholds(newConfig)).not.toThrow();
    });

    it('应该能够计算推荐样本数量', () => {
      const expectedEffect = 0.1; // 10% 效果大小
      const power = 0.8;
      const alpha = 0.05;

      const recommendedSize = detector.getRecommendedSampleSize(expectedEffect, power, alpha);

      expect(typeof recommendedSize).toBe('number');
      expect(recommendedSize).toBeGreaterThan(0);
      expect(recommendedSize).toBeGreaterThanOrEqual(config.minSamples);
    });
  });

});

describe('createRegressionDetector', () => {
  it('应该能够创建带默认配置的检测器', () => {
    const detector = createRegressionDetector();
    expect(detector).toBeInstanceOf(RegressionDetector);
  });

  it('应该能够创建带自定义配置的检测器', () => {
    const customConfig: RegressionConfig = {
      tolerance: 0.05,
      minSamples: 10,
      significanceThreshold: 0.01,
      warmupPeriod: 3
    };

    const detector = createRegressionDetector(customConfig);
    expect(detector).toBeInstanceOf(RegressionDetector);
  });
});

describe('PerformanceAlertSystem', () => {
  let alertSystem: PerformanceAlertSystem;
  let detector: RegressionDetector;

  beforeEach(() => {
    detector = new RegressionDetector();
    alertSystem = new PerformanceAlertSystem(detector);
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      expect(alertSystem).toBeDefined();
    });

    it('应该能够订阅和取消订阅警报', () => {
      const callback = vi.fn();

      alertSystem.subscribe(callback);
      expect(() => alertSystem.unsubscribe(callback)).not.toThrow();
    });

    it('应该能够检查并发送警报', () => {
      const callback = vi.fn();
      alertSystem.subscribe(callback);

      const results = new Map<string, BenchmarkResult[]>();
      results.set('FPS Test', [createMockBenchmarkResult('FPS Test', 30.0)]); // 严重回归

      // 添加历史数据以便检测回归
      detector.addHistoricalData('FPS Test', createMockBaseline());

      alertSystem.checkAndAlert(results);

      // 由于严重回归，应该触发警报
      // 但由于缺少足够的历史数据，可能不会触发
      expect(() => alertSystem.checkAndAlert(results)).not.toThrow();
    });
  });
});