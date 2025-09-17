/**
 * 渲染引擎性能监控模块导出
 * 只包含渲染引擎自身的性能监控工具
 */

// 核心性能监控组件
export * from './monitoring/PerformanceMonitor';
export * from './monitoring/WebGLAnalyzer';

// 性能基准测试系统
export {
  BatchEfficiencyBenchmark,
  BenchmarkType,
  createDefaultBenchmarkSuite, DrawCallBenchmark, FPSBenchmark,
  MemoryBenchmark, PerformanceBenchmarkSuite, type BenchmarkConfig, type BenchmarkResult, type BenchmarkScenario
} from './monitoring/PerformanceBenchmark';

// 性能回归检测
export {
  createRegressionDetector, PerformanceAlertSystem, RegressionDetector, type PerformanceAlert, type RegressionAnalysis, type RegressionConfig, type StatisticalSummary,
  type TTestResult
} from './monitoring/RegressionDetector';
