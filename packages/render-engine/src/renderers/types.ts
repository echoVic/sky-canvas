/**
 * 渲染器相关类型定义
 */
import type { IViewport } from '../engine/types';
import { IGraphicsContext, IPoint, IRect } from '../graphics/IGraphicsContext';
import { Transform } from '../math';

// 渲染后端类型
export enum RendererType {
  CANVAS_2D = 'canvas2d',
  WEBGL = 'webgl',
  WEBGL2 = 'webgl2',
  WEBGPU = 'webgpu'
}

// 渲染统计信息
export interface RenderStats {
  drawCalls: number;
  triangles: number;
  vertices: number;
  batches: number;
  textureBinds: number;
  shaderSwitches: number;
  frameTime: number;
}

// 渲染上下文接口 - 使用泛型支持不同上下文类型
export interface RenderContext<TContext = any> {
  canvas: HTMLCanvasElement;
  context: TContext; // 泛型上下文，由具体渲染器决定类型
  viewport: IViewport;
  devicePixelRatio: number;
}

// 特定渲染器的上下文类型
export interface CanvasRenderContext extends RenderContext<CanvasRenderingContext2D> {}
export interface WebGLRenderContext extends RenderContext<WebGLRenderingContext | WebGL2RenderingContext | IGraphicsContext> {}
export interface WebGPURenderContext extends RenderContext<GPUCanvasContext> {}

// 简化的渲染状态接口
export interface RenderState {
  transform: Transform;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

// 可绘制对象接口
export interface Drawable {
  id: string;
  bounds: IRect;
  visible: boolean;
  zIndex: number;
  transform: Transform;
  draw(context: RenderContext): void;
  hitTest(point: IPoint): boolean;
  getBounds(): IRect;
  setTransform(transform: Transform): void;
}

// 渲染器能力接口
export interface RendererCapabilities {
  supportsTransforms: boolean;
  supportsFilters: boolean;
  supportsBlending: boolean;
  maxTextureSize: number;
  supportedFormats: string[];
}

// 基础渲染器接口
export interface Renderer<TContext = any> {
  render(context: RenderContext<TContext>): void;
  update(deltaTime: number): void;
  dispose(): void;
  clear(): void;
  setViewport(viewport: Partial<IViewport>): void;
  getViewport(): IViewport;
  getCapabilities(): RendererCapabilities;
}

