/**
 * Sky Canvas 渲染引擎
 * 高性能图形渲染引擎，专注于WebGL渲染，包含Canvas2D和WebGPU占位符
 */

// 统一批处理系统类型
export type {
  BatchContext,
  BatchData,
  BatchKey,
  BatchManagerConfig,
  BatchStats,
  IBatchRenderer,
  IBatchStrategy,
  IRenderable as IBatchRenderable, // 重命名避免冲突
  RenderBatch,
  Vertex,
} from './batch'
export type {
  ICommandRenderer,
  IRenderEngineWithCommands,
} from './commands/CommandRenderer'
// 渲染命令系统
export type {
  IRenderCommand,
  MaterialKey,
  RenderCommandType,
} from './commands/IRenderCommand'
export type {
  IRenderBatch,
  IRenderQueue,
  IRenderQueueConfig,
} from './commands/RenderQueue'
export type {
  IRenderable,
  IRenderEngine,
  IRenderEngineConfig,
  IRenderLayer,
  IRenderStats,
  IViewport,
} from './core/IRenderEngine'
// 现代渲染管道
export type { IModernRenderPipeline } from './core/ModernRenderPipeline'
// 空间分割和剔除
export type { ISpatialNode } from './culling/SpatialPartitioning'
// 核心类型和接口
export type {
  IGraphicsContext,
  IGraphicsContextFactory,
  IImageData,
  IPoint,
  IRect,
} from './graphics/IGraphicsContext'
export type {
  BufferType,
  BufferUsage,
  IBuffer,
  IBufferManager,
  IVertexArray,
  IVertexAttribute,
  IVertexLayout as WebGLVertexLayout,
} from './webgl/BufferManager'
// WebGL 系统
export type {
  IShaderManager,
  IShaderProgram,
  IShaderSource,
} from './webgl/ShaderManager'

// 数学和变换系统（通过 export * from './math/index' 导出）

// 渲染适配器
export * from './adapters/index'
// 动画系统
export * from './animation/index'
// 统一批处理系统实现
export {
  BasicStrategy,
  BatchBuffer,
  BatchDataUtils,
  BatchManager,
  BatchOptimizer,
  createBasicBatchManager,
  createBatchManager,
  createBatchManagerWithDefaultStrategies,
  createEnhancedBatchManager,
  createInstancedBatchManager,
  EnhancedStrategy,
  InstancedStrategy,
  OptimizationType,
} from './batch'
// 基准测试
export { PerformanceBenchmark as BenchmarkRunner } from './benchmark/index'
// 渲染命令实现
export * from './commands/index'
// 现代渲染管道实现
export * from './core/ModernRenderPipeline'
// 核心实现
export { RenderEngine } from './core/RenderEngine'
// 形状基类
export { Circle, Line, Rectangle, Shape, Text } from './core/shapes'
// 空间分割和剔除实现
export * from './culling/index'
// 调试工具
export { DebugRenderer } from './debug/index'
// 场景编辑器
export * from './editor/index'
// 滤镜系统
export * from './effects/index'
// 事件系统
export * from './events/index'
// 数学库
export * from './math/index'
// 粒子系统
export * from './particles/index'
// 高级路径操作
export * from './paths/index'
// 性能监控
export { UnifiedPerformanceMonitor } from './performance/index'
// 物理引擎
export * from './physics/index'
// 插件系统
export * from './plugins/index'
// 图形原语
export type {
  GraphicPrimitiveType,
  ICirclePrimitive,
  IGraphicPrimitive,
  IPathPrimitive,
  IRectanglePrimitive,
} from './primitives/IGraphicPrimitive'
// 图形原语实现
export * from './primitives/index'
export type { PrimitiveCreateOptions } from './primitives/PrimitiveFactory'
// 资源管理
export * from './resources/index'
// 文本渲染
export * from './text/index'
// 工具函数
export * from './utils/index'
// WebGL 实现 - 具体导出避免冲突
export { BufferManager } from './webgl/BufferManager'
export { SHADER_LIBRARY } from './webgl/ShaderLibrary'
export { ShaderManager } from './webgl/ShaderManager'
