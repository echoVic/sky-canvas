/**
 * 性能回归检测器
 * 用于检测性能测试中的回归和改进
 */

import { BenchmarkResult } from './PerformanceBenchmark';

/**
 * 回归检测配置
 */
export interface RegressionConfig {
  tolerance: number; // 容忍度（0-1）
  minSamples: number; // 最少样本数
  significanceThreshold: number; // 显著性阈值
  warmupPeriod: number; // 预热期（忽略最初的N个样本）
}

/**
 * 回归分析结果
 */
export interface RegressionAnalysis {
  hasRegression: boolean;
  confidence: number; // 置信度 (0-1)
  magnitude: number; // 回归幅度百分比
  trend: 'improving' | 'degrading' | 'stable';
  samples: number;
  statistics: {
    baseline: StatisticalSummary;
    current: StatisticalSummary;
    tTest?: TTestResult;
  };
}

/**
 * 统计摘要
 */
export interface StatisticalSummary {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  samples: number;
}

/**
 * T检验结果
 */
export interface TTestResult {
  statistic: number;
  pValue: number;
  significant: boolean;
  degreesOfFreedom: number;
}

/**
 * 性能回归检测器
 */
export class RegressionDetector {
  private config: RegressionConfig;
  private historicalData = new Map<string, BenchmarkResult[]>();

  constructor(config: Partial<RegressionConfig> = {}) {
    this.config = {
      tolerance: 0.05, // 5% 默认容忍度
      minSamples: 5,
      significanceThreshold: 0.05, // p < 0.05
      warmupPeriod: 2,
      ...config
    };
  }

  /**
   * 添加历史数据
   */
  addHistoricalData(testName: string, results: BenchmarkResult[]): void {
    this.historicalData.set(testName, results);
  }

  /**
   * 检测单个测试的回归
   */
  detectRegression(testName: string, currentResults: BenchmarkResult[]): RegressionAnalysis {
    const historical = this.historicalData.get(testName) || [];
    
    if (historical.length < this.config.minSamples) {
      return {
        hasRegression: false,
        confidence: 0,
        magnitude: 0,
        trend: 'stable',
        samples: historical.length,
        statistics: {
          baseline: this.calculateStatistics([]),
          current: this.calculateStatistics(currentResults)
        }
      };
    }

    // 移除预热期样本
    const baselineResults = historical.slice(this.config.warmupPeriod);
    const currentResultsFiltered = currentResults.slice(this.config.warmupPeriod);

    if (baselineResults.length === 0 || currentResultsFiltered.length === 0) {
      return {
        hasRegression: false,
        confidence: 0,
        magnitude: 0,
        trend: 'stable',
        samples: 0,
        statistics: {
          baseline: this.calculateStatistics(baselineResults),
          current: this.calculateStatistics(currentResultsFiltered)
        }
      };
    }

    const baselineStats = this.calculateStatistics(baselineResults);
    const currentStats = this.calculateStatistics(currentResultsFiltered);

    // 计算相对变化
    const relativeDifference = (currentStats.mean - baselineStats.mean) / baselineStats.mean;
    const magnitude = Math.abs(relativeDifference) * 100;

    // 执行t检验
    const tTest = this.performTTest(
      baselineResults.map(r => r.score),
      currentResultsFiltered.map(r => r.score)
    );

    // 判断趋势
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(relativeDifference) > this.config.tolerance) {
      trend = relativeDifference > 0 ? 'improving' : 'degrading';
    }

    // 计算置信度
    const confidence = tTest ? (1 - tTest.pValue) : 0;

    // 判断是否有显著回归
    const hasRegression = (tTest?.significant ?? false) && 
                         trend === 'degrading' && 
                         magnitude > this.config.tolerance * 100;

    return {
      hasRegression,
      confidence,
      magnitude,
      trend,
      samples: baselineResults.length + currentResultsFiltered.length,
      statistics: {
        baseline: baselineStats,
        current: currentStats,
        tTest: tTest ?? undefined
      }
    };
  }

  /**
   * 批量检测多个测试的回归
   */
  detectRegressions(results: Map<string, BenchmarkResult[]>): Map<string, RegressionAnalysis> {
    const analyses = new Map<string, RegressionAnalysis>();

    for (const [testName, currentResults] of results) {
      const analysis = this.detectRegression(testName, currentResults);
      analyses.set(testName, analysis);
    }

    return analyses;
  }

  /**
   * 生成回归报告
   */
  generateReport(analyses: Map<string, RegressionAnalysis>): {
    summary: {
      totalTests: number;
      regressions: number;
      improvements: number;
      stable: number;
    };
    regressions: Array<{
      testName: string;
      magnitude: number;
      confidence: number;
    }>;
    improvements: Array<{
      testName: string;
      magnitude: number;
      confidence: number;
    }>;
    details: Map<string, RegressionAnalysis>;
  } {
    const regressions: Array<{ testName: string; magnitude: number; confidence: number }> = [];
    const improvements: Array<{ testName: string; magnitude: number; confidence: number }> = [];
    let stable = 0;

    for (const [testName, analysis] of analyses) {
      if (analysis.hasRegression) {
        regressions.push({
          testName,
          magnitude: analysis.magnitude,
          confidence: analysis.confidence
        });
      } else if (analysis.trend === 'improving' && analysis.confidence > 0.8) {
        improvements.push({
          testName,
          magnitude: analysis.magnitude,
          confidence: analysis.confidence
        });
      } else {
        stable++;
      }
    }

    return {
      summary: {
        totalTests: analyses.size,
        regressions: regressions.length,
        improvements: improvements.length,
        stable
      },
      regressions: regressions.sort((a, b) => b.magnitude - a.magnitude),
      improvements: improvements.sort((a, b) => b.magnitude - a.magnitude),
      details: analyses
    };
  }

  /**
   * 设置警报阈值
   */
  setAlertThresholds(config: Partial<RegressionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取推荐的样本数量
   */
  getRecommendedSampleSize(expectedEffect: number, power: number = 0.8, alpha: number = 0.05): number {
    // 简化的样本数量计算（基于t检验）
    const zAlpha = this.getZScore(alpha / 2);
    const zBeta = this.getZScore(1 - power);
    
    // 假设标准差为均值的10%
    const estimatedStdDev = 0.1;
    const effectSize = expectedEffect / estimatedStdDev;
    
    const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 2;
    return Math.ceil(Math.max(n, this.config.minSamples));
  }

  /**
   * 计算统计摘要
   */
  private calculateStatistics(results: BenchmarkResult[]): StatisticalSummary {
    if (results.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        min: 0,
        max: 0,
        samples: 0
      };
    }

    const scores = results.map(r => r.score);
    const sorted = [...scores].sort((a, b) => a - b);
    
    const mean = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (scores.length - 1);
    const standardDeviation = Math.sqrt(variance);

    return {
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      samples: scores.length
    };
  }

  /**
   * 执行独立样本t检验
   */
  private performTTest(sample1: number[], sample2: number[]): TTestResult | null {
    if (sample1.length < 2 || sample2.length < 2) {
      return null;
    }

    const n1 = sample1.length;
    const n2 = sample2.length;
    
    const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
    const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
    
    const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
    
    const pooledStdError = Math.sqrt((var1 / n1) + (var2 / n2));
    const tStatistic = (mean2 - mean1) / pooledStdError;
    
    const df = n1 + n2 - 2;
    const pValue = this.calculatePValue(Math.abs(tStatistic), df);
    
    return {
      statistic: tStatistic,
      pValue: pValue * 2, // 双尾检验
      significant: pValue * 2 < this.config.significanceThreshold,
      degreesOfFreedom: df
    };
  }

  /**
   * 计算t分布的p值（近似）
   */
  private calculatePValue(t: number, df: number): number {
    // 使用近似公式计算p值
    const x = df / (t * t + df);
    return 0.5 * this.betaIncomplete(df / 2, 0.5, x);
  }

  /**
   * 不完全贝塔函数（简化实现）
   */
  private betaIncomplete(a: number, b: number, x: number): number {
    // 简化的贝塔函数实现，用于p值计算
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    // 使用连分数近似
    let result = 0;
    const maxIterations = 100;
    let m = 1;
    
    for (let i = 0; i < maxIterations; i++) {
      const term = this.betaTerm(a, b, x, m);
      result += term;
      
      if (Math.abs(term) < 1e-10) break;
      m++;
    }
    
    return Math.min(1, Math.max(0, result));
  }

  /**
   * 贝塔函数项
   */
  private betaTerm(a: number, b: number, x: number, m: number): number {
    // 简化的贝塔函数项计算
    const numerator = Math.pow(x, a) * Math.pow(1 - x, b);
    const denominator = a * this.beta(a, b);
    return numerator / denominator / m;
  }

  /**
   * 贝塔函数
   */
  private beta(a: number, b: number): number {
    return this.gamma(a) * this.gamma(b) / this.gamma(a + b);
  }

  /**
   * 伽马函数（斯特林近似）
   */
  private gamma(z: number): number {
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    }
    
    z -= 1;
    const x = 0.99999999999980993;
    const coefficients = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    
    let result = x;
    for (let i = 0; i < coefficients.length; i++) {
      result += coefficients[i] / (z + i + 1);
    }
    
    const t = z + coefficients.length - 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * result;
  }

  /**
   * 获取Z分数
   */
  private getZScore(p: number): number {
    // 标准正态分布的反函数（近似）
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    
    const sign = p < 0.5 ? -1 : 1;
    const r = p < 0.5 ? p : 1 - p;
    
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;
    
    const t = Math.sqrt(-2 * Math.log(r));
    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    
    return sign * z;
  }
}

/**
 * 创建默认的回归检测器
 */
export function createRegressionDetector(config?: Partial<RegressionConfig>): RegressionDetector {
  return new RegressionDetector(config);
}

/**
 * 性能警报系统
 */
export class PerformanceAlertSystem {
  private detector: RegressionDetector;
  private subscribers: Array<(alert: PerformanceAlert) => void> = [];

  constructor(detector: RegressionDetector) {
    this.detector = detector;
  }

  /**
   * 订阅警报
   */
  subscribe(callback: (alert: PerformanceAlert) => void): void {
    this.subscribers.push(callback);
  }

  /**
   * 取消订阅
   */
  unsubscribe(callback: (alert: PerformanceAlert) => void): void {
    const index = this.subscribers.indexOf(callback);
    if (index !== -1) {
      this.subscribers.splice(index, 1);
    }
  }

  /**
   * 检查并发送警报
   */
  checkAndAlert(results: Map<string, BenchmarkResult[]>): void {
    const analyses = this.detector.detectRegressions(results);
    const report = this.detector.generateReport(analyses);

    if (report.regressions.length > 0) {
      const alert: PerformanceAlert = {
        type: 'regression',
        severity: this.calculateSeverity(report.regressions),
        timestamp: Date.now(),
        message: `检测到 ${report.regressions.length} 个性能回归`,
        details: report.regressions
      };

      this.notifySubscribers(alert);
    }
  }

  private calculateSeverity(regressions: Array<{ magnitude: number; confidence: number }>): 'low' | 'medium' | 'high' | 'critical' {
    const maxMagnitude = Math.max(...regressions.map(r => r.magnitude));
    const avgConfidence = regressions.reduce((sum, r) => sum + r.confidence, 0) / regressions.length;

    if (maxMagnitude > 50 && avgConfidence > 0.9) return 'critical';
    if (maxMagnitude > 25 && avgConfidence > 0.8) return 'high';
    if (maxMagnitude > 10 && avgConfidence > 0.7) return 'medium';
    return 'low';
  }

  private notifySubscribers(alert: PerformanceAlert): void {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert subscriber:', error);
      }
    });
  }
}

/**
 * 性能警报接口
 */
export interface PerformanceAlert {
  type: 'regression' | 'improvement' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  message: string;
  details: any;
}