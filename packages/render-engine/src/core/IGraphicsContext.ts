/**
 * 图形上下文核心接口
 * 定义了框架无关的图形渲染接口
 */

/**
 * 点坐标接口
 */
export interface IPoint {
  x: number;
  y: number;
}

/**
 * 矩形区域接口
 */
export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 颜色样式类型
 */
export type ColorStyle = string | CanvasGradient | CanvasPattern;

/**
 * 图像数据接口
 */
export interface IImageData {
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
  sx?: number;
  sy?: number;
  sWidth?: number;
  sHeight?: number;
  dx?: number;
  dy?: number;
  dWidth?: number;
  dHeight?: number;
}

/**
 * 图形上下文接口
 * 提供框架无关的绘制操作
 */
export interface IGraphicsContext {
  /** 画布宽度 */
  readonly width: number;
  
  /** 画布高度 */
  readonly height: number;

  // === 画布操作 ===
  
  /**
   * 清空画布
   * @param color 可选的清空颜色，默认为透明
   */
  clear(color?: ColorStyle): void;

  // === 状态管理 ===
  
  /**
   * 保存当前绘制状态
   */
  save(): void;

  /**
   * 恢复之前保存的绘制状态
   */
  restore(): void;

  // === 变换操作 ===
  
  /**
   * 平移坐标系
   * @param x X轴偏移量
   * @param y Y轴偏移量
   */
  translate(x: number, y: number): void;

  /**
   * 旋转坐标系
   * @param angle 旋转角度（弧度）
   */
  rotate(angle: number): void;

  /**
   * 缩放坐标系
   * @param scaleX X轴缩放比例
   * @param scaleY Y轴缩放比例
   */
  scale(scaleX: number, scaleY: number): void;

  // === 样式设置 ===
  
  /**
   * 设置透明度
   * @param opacity 透明度值 (0-1)
   */
  setOpacity(opacity: number): void;

  /**
   * 设置描边样式
   * @param style 描边样式
   */
  setStrokeStyle(style: ColorStyle): void;

  /**
   * 设置填充样式
   * @param style 填充样式
   */
  setFillStyle(style: ColorStyle): void;

  /**
   * 设置线条宽度
   * @param width 线条宽度
   */
  setLineWidth(width: number): void;

  /**
   * 设置虚线样式
   * @param segments 虚线段长度数组
   */
  setLineDash(segments: number[]): void;

  // === 绘制操作 ===
  
  /**
   * 绘制矩形
   * @param rect 矩形区域
   * @param fill 是否填充
   * @param stroke 是否描边
   */
  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void;

  /**
   * 绘制圆形
   * @param center 圆心坐标
   * @param radius 半径
   * @param fill 是否填充
   * @param stroke 是否描边
   */
  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void;

  /**
   * 绘制线条
   * @param from 起点坐标
   * @param to 终点坐标
   */
  drawLine(from: IPoint, to: IPoint): void;

  /**
   * 绘制图像
   * @param imageData 图像数据
   */
  drawImage(imageData: IImageData): void;

  // === 坐标转换 ===
  
  /**
   * 屏幕坐标转世界坐标
   * @param point 屏幕坐标点
   * @returns 世界坐标点
   */
  screenToWorld(point: IPoint): IPoint;

  /**
   * 世界坐标转屏幕坐标
   * @param point 世界坐标点
   * @returns 屏幕坐标点
   */
  worldToScreen(point: IPoint): IPoint;

  // === 资源管理 ===
  
  /**
   * 释放资源
   */
  dispose(): void;
}

/**
 * 图形上下文工厂接口
 */
export interface IGraphicsContextFactory<TCanvas = HTMLCanvasElement> {
  /**
   * 检查是否支持当前环境
   * @returns 是否支持
   */
  isSupported(): boolean;

  /**
   * 创建图形上下文
   * @param canvas 画布元素
   * @returns 图形上下文实例
   */
  createContext(canvas: TCanvas): Promise<IGraphicsContext>;
}