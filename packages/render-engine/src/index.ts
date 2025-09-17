/**
 * Sky Canvas 渲染引擎统一入口
 */

// 核心引擎
export { RenderEngine } from './engine/RenderEngine';
export type * from './engine/types';

// 主要图形接口 (优先级最高)
export type { IGraphicsContext, IGraphicsContextFactory, IImageData } from './graphics/IGraphicsContext';
export type { IPoint, IRect } from './graphics/IGraphicsContext';

// 数学库 (使用命名空间导出避免冲突)
export * as MathUtils from './math';

// 核心模块
export * from './primitives';
export * from './renderers';
export * from './adapters';

// 渲染管道 (明确处理冲突)
export type { IRenderable } from './engine/types';
export * from './commands';
// 批处理系统 (在 commands 后导出避免 RenderBatch 冲突)
export {
  BatchManager,
  BatchBuffer,
  BatchOptimizer,
  BasicStrategy,
  EnhancedStrategy,
  InstancedStrategy,
  OptimizationType
} from './batch';

// WebGL 系统 (明确排除冲突项)
export { ShaderManager, BufferManager, SHADER_LIBRARY } from './webgl';
export { AdvancedShaderManager, WebGLOptimizer } from './webgl';

// 空间分割和剔除
export * from './culling';

// 功能模块
export * from './interaction';
export * from './interface';
export * from './text';
export * from './physics';
export * from './particles';
export * from './paths';
export * from './plugins';

// 资源管理 (后导出避免与 WebGL 冲突)
export * from './resources';

// 工具函数
export * from './utils';

// 调试和性能 (使用别名导出避免冲突)
export { DebugRenderer } from './debug';
export { PerformanceMonitor } from './performance';
export { PerformanceBenchmark } from './benchmark';

// 场景编辑器
export * from './editor';