/**
 * Sky Canvas 渲染引擎
 * 框架无关的高性能图形渲染引擎
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

// 核心实现
export { RenderEngine } from './core/RenderEngine';

// 数学库
export * from './math/index';

// 适配器
export * from './adapters/index';

// 工具函数
export * from './utils/index';