/**
 * 统一批处理系统主入口
 * 整合所有批处理功能的统一导出
 */

// 工厂函数
export {
  createBasicBatchManager,
  createBatchManagerWithDefaultStrategies,
  createEnhancedBatchManager,
  createInstancedBatchManager,
} from './BatchFactory'
// 核心接口和类型
export type {
  BatchContext,
  BatchData,
  BatchKey,
  BatchManagerConfig,
  BatchStats,
  IBatchRenderer,
  IBatchStrategy,
  IRenderable,
  RenderBatch,
  Vertex,
} from './core'
// 核心类和工具
export {
  BatchBuffer,
  BatchDataUtils,
  BatchManager,
  createBatchManager,
} from './core'
// 批处理策略
export {
  BasicStrategy,
  EnhancedStrategy,
  InstancedStrategy,
} from './strategies'
// 批处理工具
export {
  BatchOptimizer,
  type OptimizationSuggestion,
  OptimizationType,
  type PerformanceAnalysis,
} from './utils'
