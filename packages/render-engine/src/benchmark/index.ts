/**
 * 性能基准测试模块导出
 */

// 示例和工具
export { runAllExamples } from './examples/BenchmarkExample'
// 核心基准测试框架
export {
  type BenchmarkConfig as GenericBenchmarkConfig,
  type BenchmarkEvents,
  type BenchmarkFunction,
  type BenchmarkResult as GenericBenchmarkResult,
  BenchmarkSuite,
  createBenchmark,
  PerformanceBenchmark,
} from './PerformanceBenchmark'
// 渲染性能测试
export {
  RenderingBenchmark,
  type RenderingBenchmarkConfig,
} from './RenderingBenchmark'
