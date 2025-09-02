/**
 * Sky Canvas 渲染引擎
 * 高性能图形渲染引擎，专注于WebGL渲染，包含Canvas2D和WebGPU占位符
 */

// 核心类型和接口
export type {
  ColorStyle, IGraphicsContext,
  IGraphicsContextFactory, IImageData, IPoint,
  IRect
} from './core/IGraphicsContext';

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

// 批处理类型
export type {
  IVertexLayout as BatchingVertexLayout, IBatchData, IBatcher
} from './batching/Batcher';

export type {
  IBatchRenderer
} from './batching/BatchRenderer';

// 空间分割和剔除
export type {
  ISpatialNode
} from './culling/SpatialPartitioning';

// 数学和变换系统
export type {
  CoordinateSystem, CoordinateSystemManager,
  IViewportConfig, Matrix2D,
  TransformStack
} from './math/Transform';

export type {
  Matrix3x3,
  Matrix3
} from './math/Matrix3';

export type {
  Rectangle
} from './math/Rectangle';

export type {
  Vector2
} from './math/Vector2';

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

// 批处理实现 - 具体导出避免冲突
export { BatcherFactory, MultiTextureBatcher, UniversalBatcher } from './batching/Batcher';
export { WebGLBatchRenderer } from './batching/BatchRenderer';

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
