/**
 * 渲染引擎相关类型定义
 */
import { IGraphicsContext, IPoint, IRect } from './interface/IGraphicsContext';
import { Transform } from '../math/Transform';

/**
 * 支持的渲染引擎类型
 */
export type RenderEngineType = 'webgl' | 'canvas2d' | 'webgpu' | 'auto';

/**
 * 渲染引擎配置接口
 */
export interface RenderEngineConfig {
  /** 渲染器类型，auto表示自动选择 */
  renderer?: RenderEngineType;

  /** 是否启用调试模式 */
  debug?: boolean;

  /** 是否启用批处理 */
  enableBatching?: boolean;

  /** 目标帧率 */
  targetFPS?: number;

  /** 是否启用抗锯齿 */
  antialias?: boolean;

  /** 是否启用 Alpha 通道 */
  alpha?: boolean;

  /** 是否启用透明度 */
  premultipliedAlpha?: boolean;

  /** 是否保留绘图缓冲区 */
  preserveDrawingBuffer?: boolean;

  /** 色彩空间 */
  colorSpace?: 'srgb' | 'display-p3';
}

/**
 * 渲染引擎能力信息
 */
export interface RenderEngineCapabilities {
  /** 是否支持硬件加速 */
  supportsHardwareAcceleration: boolean;
  /** 是否支持变换 */
  supportsTransforms: boolean;
  /** 是否支持滤镜 */
  supportsFilters: boolean;
  /** 是否支持混合 */
  supportsBlending: boolean;
  /** 最大纹理尺寸 */
  maxTextureSize: number;
  /** 支持的格式 */
  supportedFormats: string[];
}

/**
 * 可渲染对象接口
 */
export interface IRenderable {
  /** 唯一标识符 */
  readonly id: string;

  /** 是否可见 */
  readonly visible: boolean;

  /** Z轴层级 */
  readonly zIndex: number;

  /** 变换信息（位置、旋转、缩放） */
  readonly transform?: Transform;

  /**
   * 渲染对象
   * @param context 图形上下文
   */
  render(context: IGraphicsContext): void;

  /**
   * 点击测试
   * @param point 测试点
   * @returns 是否命中
   */
  hitTest(point: IPoint): boolean;

  /**
   * 获取边界框
   * @returns 边界框
   */
  getBounds(): IRect;

  /**
   * 销毁对象
   */
  dispose?(): void;
}

/**
 * 视口接口
 */
export interface IViewport {
  /** X偏移 */
  x: number;

  /** Y偏移 */
  y: number;

  /** 视口宽度 */
  width: number;

  /** 视口高度 */
  height: number;

  /** 缩放倍数 */
  zoom: number;
}

/**
 * 渲染引擎统计信息
 */
export interface IRenderStats {
  /** 帧计数 */
  frameCount: number;

  /** 每秒帧数 */
  fps: number;

  /** 渲染时间 */
  renderTime: number;

  /** 已渲染对象数 */
  objectsRendered: number;
}

