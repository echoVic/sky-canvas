/**
 * Sky Canvas 渲染引擎
 * 高性能图形渲染引擎，专注于WebGL渲染，包含Canvas2D和WebGPU占位符
 */

// 核心类型和接口
export type {
  IGraphicsContext,
  IGraphicsContextFactory, IImageData, IPoint,
  IRect
} from './graphics/IGraphicsContext';

export type {
  IRenderable, IRenderEngine, IRenderEngineConfig, IRenderLayer, IRenderStats, IViewport
} from './core/IRenderEngine';

// 现代渲染管道
export type {
  IModernRenderPipeline
} from './core/ModernRenderPipeline';

// 渲染命令系统
export type {
  IRenderCommand,
  MaterialKey,
  RenderCommandType
} from './commands/IRenderCommand';

export type {
  IRenderBatch,
  IRenderQueue,
  IRenderQueueConfig
} from './commands/RenderQueue';

export type {
  ICommandRenderer,
  IRenderEngineWithCommands
} from './commands/CommandRenderer';

// WebGL 系统
export type {
  IShaderManager, IShaderProgram, IShaderSource
} from './webgl/ShaderManager';

export type {
  BufferType,
  BufferUsage, IBuffer, IBufferManager, IVertexArray, IVertexAttribute, IVertexLayout as WebGLVertexLayout
} from './webgl/BufferManager';

// 统一批处理系统类型
export type {
  IBatchRenderer,
  IRenderable as IBatchRenderable, // 重命名避免冲突
  BatchStats,
  IBatchStrategy,
  BatchContext,
  BatchData,
  Vertex,
  BatchKey,
  RenderBatch,
  BatchManagerConfig
} from './batch';

// 空间分割和剔除
export type {
  ISpatialNode
} from './culling/SpatialPartitioning';

// 数学和变换系统（通过 export * from './math/index' 导出）


// 图形原语
export type {
  GraphicPrimitiveType, ICirclePrimitive, IGraphicPrimitive, IPathPrimitive, IRectanglePrimitive
} from './primitives/IGraphicPrimitive';

export type {
  PrimitiveCreateOptions
} from './primitives/PrimitiveFactory';

// 核心实现
export { RenderEngine } from './core/RenderEngine';

// 现代渲染管道实现
export * from './core/ModernRenderPipeline';

// 渲染命令实现
export * from './commands/index';

// WebGL 实现 - 具体导出避免冲突
export { BufferManager } from './webgl/BufferManager';
export { SHADER_LIBRARY } from './webgl/ShaderLibrary';
export { ShaderManager } from './webgl/ShaderManager';

// 统一批处理系统实现
export {
  BatchManager,
  createBatchManager,
  BatchBuffer,
  BatchDataUtils,
  BasicStrategy,
  EnhancedStrategy,
  InstancedStrategy,
  BatchOptimizer,
  OptimizationType,
  createBatchManagerWithDefaultStrategies,
  createBasicBatchManager,
  createEnhancedBatchManager,
  createInstancedBatchManager
} from './batch';

// 空间分割和剔除实现
export * from './culling/index';

// 图形原语实现
export * from './primitives/index';

// 数学库
export * from './math/index';

// 渲染适配器
export * from './adapters/index';

// 工具函数
export * from './utils/index';

// 事件系统
export * from './events/index';

// 资源管理
export * from './resources/index';

// 性能监控
export { UnifiedPerformanceMonitor } from './performance/index';

// 基准测试
export { PerformanceBenchmark as BenchmarkRunner } from './benchmark/index';

// 调试工具
export { DebugRenderer } from './debug/index';

// 文本渲染
export * from './text/index';

// 动画系统
// TODO: 解决类型兼容性问题后启用
// export * from './animation/index';

// 滤镜系统  
// TODO: 解决类型兼容性问题后启用
// export * from './effects/index';

// 物理引擎
export * from './physics/index';

// 粒子系统
export * from './particles/index';

// 高级路径操作
export * from './paths/index';

// 插件系统
export * from './plugins/index';

// 场景编辑器
export * from './editor/index';
