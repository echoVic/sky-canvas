/**
 * Sky Canvas 渲染引擎
 * 高性能图形渲染引擎，专注于WebGL渲染，包含Canvas2D和WebGPU占位符
 */

// 核心类型和接口
export type { 
  IGraphicsContext, 
  IGraphicsContextFactory, 
  IPoint, 
  IRect, 
  IImageData, 
  ColorStyle 
} from './core/IGraphicsContext';

export type { 
  IRenderEngine, 
  IRenderLayer, 
  IRenderable, 
  IViewport, 
  IRenderStats, 
  IRenderEngineConfig 
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
  IShaderProgram,
  IShaderManager,
  IShaderSource
} from './webgl/ShaderManager';

export type {
  IBuffer,
  IVertexArray,
  IBufferManager,
  IVertexLayout as WebGLVertexLayout,
  IVertexAttribute,
  BufferType,
  BufferUsage
} from './webgl/BufferManager';

// 批处理系统
export type {
  IBatcher,
  IBatchData,
  IVertexLayout as BatchingVertexLayout
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
  Matrix2D,
  TransformStack,
  CoordinateSystemManager,
  IViewportConfig,
  CoordinateSystem
} from './math/Transform';

// 图形原语
export type {
  IGraphicPrimitive,
  IRectanglePrimitive,
  ICirclePrimitive,
  IPathPrimitive,
  GraphicPrimitiveType
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

// WebGL 实现
export * from './webgl/index';

// 批处理实现
export * from './batching/index';

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