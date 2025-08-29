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

// 图形原语实现
export * from './primitives/index';

// 数学库
export * from './math/index';

// 渲染适配器
export * from './adapters/index';

// 工具函数
export * from './utils/index';