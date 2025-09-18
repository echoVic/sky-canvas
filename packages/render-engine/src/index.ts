/**
 * Sky Canvas 渲染引擎统一入口
 */

// 核心引擎 (合并后的核心模块)
export * from './core';

// 数学库 (使用命名空间导出避免冲突)
export * as MathUtils from './math';

// 核心模块 (通过 core 导出，避免重复)
export * from './rendering/primitives';

// 渲染管道 (明确处理冲突)
export { CommandRenderer, RenderQueue } from './rendering/commands';
export type { IRenderable } from './core/types';
// 批处理系统 (在 commands 后导出避免 RenderBatch 冲突)
export {
  BasicStrategy, BatchBuffer, BatchManager, BatchOptimizer, EnhancedStrategy,
  InstancedStrategy,
  OptimizationType
} from './rendering/batch';

// WebGL 系统 (通过 core 导出，避免冲突)
export {
  AdvancedShaderManager, BufferManager,
  SHADER_LIBRARY, WebGLShaderManager as ShaderManager, WebGLOptimizer
} from './core/webgl';

// 空间分割和剔除
export * from './rendering/culling';

// 功能模块
export * from './interaction';
export * from './interface';
export * from './particles';
export * from './paths';
export * from './physics';
export * from './plugins';
export * from './text';

// 资源管理 (明确导出避免冲突)
export {
  AsyncResourceLoader, EnhancedResourceManager, LRUCache, WebGLResourceManager as ResourceManager, TexturePool
} from './resources';

// 工具函数
export * from './utils';

// 调试和性能 (使用别名导出避免冲突)
export { PerformanceBenchmark } from './performance/benchmark';
export { DebugRenderer } from './performance/debug';
export { PerformanceMonitor } from './performance/monitoring';

// 场景编辑器
export * from './editor';
