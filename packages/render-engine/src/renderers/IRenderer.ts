/**
 * 统一渲染器接口
 * 定义所有渲染器必须实现的标准绘图方法
 */

import { IColor, IGraphicsStyle, IPoint, IRect, ITextStyle } from '../graphics/IGraphicsContext';

export interface IDrawRectOptions {
  filled?: boolean;
  style?: Partial<IGraphicsStyle>;
}

export interface IDrawCircleOptions {
  filled?: boolean;
  style?: Partial<IGraphicsStyle>;
}

export interface IDrawLineOptions {
  style?: Partial<IGraphicsStyle>;
}

export interface IDrawTextOptions {
  style?: Partial<ITextStyle>;
}

export interface IDrawImageOptions {
  sourceRect?: IRect;
  opacity?: number;
}

export interface IImageSource {
  width: number;
  height: number;
  data?: Uint8ClampedArray | ImageData | HTMLImageElement | HTMLCanvasElement;
}

export interface IRenderer {
  /**
   * 绘制矩形
   * @param x 左上角 X 坐标
   * @param y 左上角 Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param options 绘制选项
   */
  drawRect(x: number, y: number, width: number, height: number, options?: IDrawRectOptions): void;

  /**
   * 绘制圆形
   * @param center 圆心坐标
   * @param radius 半径
   * @param options 绘制选项
   */
  drawCircle(center: IPoint, radius: number, options?: IDrawCircleOptions): void;

  /**
   * 绘制线条
   * @param start 起点坐标
   * @param end 终点坐标
   * @param options 绘制选项
   */
  drawLine(start: IPoint, end: IPoint, options?: IDrawLineOptions): void;

  /**
   * 绘制文本
   * @param text 文本内容
   * @param position 文本位置
   * @param options 绘制选项
   */
  drawText(text: string, position: IPoint, options?: IDrawTextOptions): void;

  /**
   * 绘制图像
   * @param image 图像源
   * @param position 目标位置
   * @param size 目标尺寸（可选）
   * @param options 绘制选项
   */
  drawImage(
    image: IImageSource,
    position: IPoint,
    size?: { width: number; height: number },
    options?: IDrawImageOptions
  ): void;

  /**
   * 绘制路径
   * @param points 路径点数组
   * @param closed 是否闭合路径
   * @param options 绘制选项
   */
  drawPath(points: IPoint[], closed?: boolean, options?: IDrawLineOptions): void;

  /**
   * 绘制多边形
   * @param points 顶点数组
   * @param options 绘制选项
   */
  drawPolygon(points: IPoint[], options?: IDrawRectOptions): void;

  /**
   * 绘制椭圆
   * @param center 中心点
   * @param radiusX X 轴半径
   * @param radiusY Y 轴半径
   * @param options 绘制选项
   */
  drawEllipse(center: IPoint, radiusX: number, radiusY: number, options?: IDrawCircleOptions): void;

  /**
   * 绘制圆弧
   * @param center 圆心
   * @param radius 半径
   * @param startAngle 起始角度（弧度）
   * @param endAngle 结束角度（弧度）
   * @param options 绘制选项
   */
  drawArc(
    center: IPoint,
    radius: number,
    startAngle: number,
    endAngle: number,
    options?: IDrawLineOptions
  ): void;

  /**
   * 清空画布
   * @param color 可选的背景颜色
   */
  clear(color?: IColor | string): void;

  /**
   * 设置填充样式
   * @param style 填充颜色或样式
   */
  setFillStyle(style: IColor | string): void;

  /**
   * 设置描边样式
   * @param style 描边颜色或样式
   */
  setStrokeStyle(style: IColor | string): void;

  /**
   * 设置线宽
   * @param width 线宽
   */
  setLineWidth(width: number): void;

  /**
   * 设置全局透明度
   * @param alpha 透明度 (0-1)
   */
  setGlobalAlpha(alpha: number): void;

  /**
   * 保存当前渲染状态
   */
  save(): void;

  /**
   * 恢复上一个渲染状态
   */
  restore(): void;

  /**
   * 释放渲染器资源
   */
  dispose(): void;
}

export type { IColor, IGraphicsStyle, IPoint, IRect, ITextStyle };

