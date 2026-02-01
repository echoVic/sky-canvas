/**
 * 性能监控模块导出
 */

export { CanvasSDKAdapter, CanvasSDKPerformanceHelper } from './adapters/CanvasSDKAdapter'
export { FrontendUIAdapter, FrontendUIPerformanceHelper } from './adapters/FrontendUIAdapter'
// 数据源适配器
export { RenderEngineAdapter } from './adapters/RenderEngineAdapter'
// 性能基准测试系统
export {
  BatchEfficiencyBenchmark,
  type BenchmarkConfig,
  type BenchmarkResult,
  type BenchmarkScenario,
  BenchmarkType,
  createDefaultBenchmarkSuite,
  DrawCallBenchmark,
  FPSBenchmark,
  MemoryBenchmark,
  PerformanceBenchmarkSuite,
} from './PerformanceBenchmark'
// 原有的性能监控组件
export * from './PerformanceMonitor'
// 性能回归检测
export {
  createRegressionDetector,
  type PerformanceAlert,
  PerformanceAlertSystem,
  type RegressionAnalysis,
  type RegressionConfig,
  RegressionDetector,
  type StatisticalSummary,
  type TTestResult,
} from './RegressionDetector'
export {
  globalPerformanceManager,
  type PerformanceManagerConfig,
  UnifiedPerformanceManager,
} from './UnifiedPerformanceManager'
// 统一性能监控系统
export {
  type BottleneckAnalysis,
  DataSourceType,
  type IDataSourceAdapter,
  type UnifiedMetricDataPoint,
  type UnifiedMetricStats,
  UnifiedMetricType,
  type UnifiedPerformanceConfig,
  UnifiedPerformanceMonitor,
  type UnifiedPerformanceThresholds,
  type UnifiedPerformanceWarning,
} from './UnifiedPerformanceMonitor'
export * from './WebGLAnalyzer'
