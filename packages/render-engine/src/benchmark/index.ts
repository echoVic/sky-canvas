/**
 * 性能基准测试模块导出
 */

// 核心基准测试框架
export {
  PerformanceBenchmark,
  BenchmarkSuite,
  createBenchmark,
  type BenchmarkResult as GenericBenchmarkResult,
  type BenchmarkConfig as GenericBenchmarkConfig,
  type BenchmarkFunction,
  type BenchmarkEvents
} from './PerformanceBenchmark';

// 渲染性能测试
export {
  RenderingBenchmark,
  createRenderingBenchmark,
  type RenderingBenchmarkConfig,
  type RenderingMetrics
} from './RenderingBenchmark';

// 示例和工具
export { runAllExamples } from './examples/BenchmarkExample';