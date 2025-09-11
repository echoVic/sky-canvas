/**
 * 性能监控模块导出
 */

// 原有的性能监控组件
export * from './PerformanceMonitor';
export * from './WebGLAnalyzer';

// 统一性能监控系统
export { 
  UnifiedPerformanceMonitor,
  UnifiedMetricType,
  DataSourceType,
  type UnifiedPerformanceConfig,
  type UnifiedMetricDataPoint,
  type UnifiedMetricStats,
  type UnifiedPerformanceWarning,
  type UnifiedPerformanceThresholds,
  type IDataSourceAdapter,
  type BottleneckAnalysis
} from './UnifiedPerformanceMonitor';

export { 
  UnifiedPerformanceManager,
  globalPerformanceManager,
  type PerformanceManagerConfig
} from './UnifiedPerformanceManager';

// 数据源适配器
export { RenderEngineAdapter } from './adapters/RenderEngineAdapter';
export { CanvasSDKAdapter, CanvasSDKPerformanceHelper } from './adapters/CanvasSDKAdapter';
export { FrontendUIAdapter, FrontendUIPerformanceHelper } from './adapters/FrontendUIAdapter';

// 性能基准测试系统
export {
  PerformanceBenchmarkSuite,
  FPSBenchmark,
  MemoryBenchmark,
  DrawCallBenchmark,
  BatchEfficiencyBenchmark,
  BenchmarkType,
  createDefaultBenchmarkSuite,
  type BenchmarkResult,
  type BenchmarkConfig,
  type BenchmarkScenario
} from './PerformanceBenchmark';

// 性能回归检测
export {
  RegressionDetector,
  PerformanceAlertSystem,
  createRegressionDetector,
  type RegressionConfig,
  type RegressionAnalysis,
  type StatisticalSummary,
  type TTestResult,
  type PerformanceAlert
} from './RegressionDetector';