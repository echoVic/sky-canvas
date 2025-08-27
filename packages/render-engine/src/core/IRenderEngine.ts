/**
 * 渲染引擎核心接口定义
 */
import { IPoint, IRect } from './IGraphicsContext';

/**
 * 可渲染对象接口
 */
export interface IRenderable {
  /** 唯一标识符 */
  readonly id: string;
  
  /** 边界框 */
  readonly bounds: IRect;
  
  /** 是否可见 */
  readonly visible: boolean;
  
  /** Z轴层级 */
  readonly zIndex: number;
  
  /**
   * 渲染对象
   * @param context 图形上下文
   */
  render(context: any): void;
  
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
}

/**
 * 渲染层接口
 */
export interface IRenderLayer {
  /** 层ID */
  readonly id: string;
  
  /** 是否可见 */
  visible: boolean;
  
  /** 透明度 */
  opacity: number;
  
  /** Z轴层级 */
  zIndex: number;
  
  /**
   * 添加可渲染对象
   * @param renderable 可渲染对象
   */
  addRenderable(renderable: IRenderable): void;
  
  /**
   * 移除可渲染对象
   * @param id 对象ID
   */
  removeRenderable(id: string): void;
  
  /**
   * 获取所有可渲染对象
   * @returns 可渲染对象数组
   */
  getRenderables(): IRenderable[];
  
  /**
   * 清空层
   */
  clear(): void;
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
 * 渲染统计信息
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

/**
 * 渲染引擎配置
 */
export interface IRenderEngineConfig {
  /** 目标FPS */
  targetFPS?: number;
  
  /** 是否启用垂直同步 */
  enableVSync?: boolean;
  
  /** 是否启用视锥剔除 */
  enableCulling?: boolean;
  
  /** 剔除边距 */
  cullMargin?: number;
}

/**
 * 渲染引擎接口
 */
export interface IRenderEngine {
  /**
   * 初始化渲染引擎
   * @param factory 图形上下文工厂
   * @param canvas 画布元素
   */
  initialize<TCanvas>(factory: any, canvas: TCanvas): Promise<void>;
  
  /**
   * 启动渲染循环
   */
  start(): void;
  
  /**
   * 停止渲染循环
   */
  stop(): void;
  
  /**
   * 手动渲染一帧
   */
  render(): void;
  
  /**
   * 是否正在运行
   */
  isRunning(): boolean;
  
  /**
   * 获取图形上下文
   */
  getContext(): any | null;
  
  /**
   * 设置视口
   * @param viewport 视口配置
   */
  setViewport(viewport: Partial<IViewport>): void;
  
  /**
   * 获取视口
   */
  getViewport(): IViewport;
  
  /**
   * 创建渲染层
   * @param id 层ID
   * @param zIndex Z轴层级
   */
  createLayer(id: string, zIndex?: number): IRenderLayer;
  
  /**
   * 获取渲染层
   * @param id 层ID
   */
  getLayer(id: string): IRenderLayer | undefined;
  
  /**
   * 移除渲染层
   * @param id 层ID
   */
  removeLayer(id: string): void;
  
  /**
   * 屏幕坐标转世界坐标
   * @param point 屏幕坐标点
   */
  screenToWorld(point: IPoint): IPoint;
  
  /**
   * 世界坐标转屏幕坐标
   * @param point 世界坐标点
   */
  worldToScreen(point: IPoint): IPoint;
  
  /**
   * 获取渲染统计信息
   */
  getStats(): IRenderStats;
  
  /**
   * 销毁渲染引擎
   */
  dispose(): void;
}