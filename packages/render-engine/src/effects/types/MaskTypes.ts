/**
 * 遮罩效果类型定义
 */

import { Point2D } from '../../animation/types/PathTypes';
import { IShape } from '../../canvas-sdk/src/types/Shape';

/**
 * 遮罩类型
 */
export enum MaskType {
  CLIP = 'clip',           // 剪切遮罩
  ALPHA = 'alpha',         // 透明度遮罩
  STENCIL = 'stencil',     // 模板遮罩
  INVERTED = 'inverted'    // 反转遮罩
}

/**
 * 遮罩形状类型
 */
export enum MaskShape {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  ELLIPSE = 'ellipse',
  POLYGON = 'polygon',
  PATH = 'path',
  CUSTOM = 'custom'
}

/**
 * 遮罩混合模式
 */
export enum MaskBlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  DARKEN = 'darken',
  LIGHTEN = 'lighten'
}

/**
 * 遮罩边缘类型
 */
export enum MaskEdgeType {
  HARD = 'hard',           // 硬边缘
  SOFT = 'soft',           // 软边缘
  FEATHERED = 'feathered'  // 羽化边缘
}

/**
 * 遮罩基础配置
 */
export interface MaskConfig {
  type: MaskType;
  shape: MaskShape;
  position: Point2D;
  enabled: boolean;
  opacity: number;
  blendMode: MaskBlendMode;
  edgeType: MaskEdgeType;
  featherRadius?: number;  // 羽化半径
  inverted?: boolean;      // 是否反转
}

/**
 * 矩形遮罩配置
 */
export interface RectangleMaskConfig extends MaskConfig {
  shape: MaskShape.RECTANGLE;
  width: number;
  height: number;
  rotation?: number;
  borderRadius?: number;
}

/**
 * 圆形遮罩配置
 */
export interface CircleMaskConfig extends MaskConfig {
  shape: MaskShape.CIRCLE;
  radius: number;
}

/**
 * 椭圆遮罩配置
 */
export interface EllipseMaskConfig extends MaskConfig {
  shape: MaskShape.ELLIPSE;
  radiusX: number;
  radiusY: number;
  rotation?: number;
}

/**
 * 多边形遮罩配置
 */
export interface PolygonMaskConfig extends MaskConfig {
  shape: MaskShape.POLYGON;
  points: Point2D[];
}

/**
 * 路径遮罩配置
 */
export interface PathMaskConfig extends MaskConfig {
  shape: MaskShape.PATH;
  path: string | Path2D;  // SVG路径字符串或Path2D对象
}

/**
 * 自定义遮罩配置
 */
export interface CustomMaskConfig extends MaskConfig {
  shape: MaskShape.CUSTOM;
  drawFunction: (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => void;
}

/**
 * 遮罩配置联合类型
 */
export type AnyMaskConfig = 
  | RectangleMaskConfig
  | CircleMaskConfig
  | EllipseMaskConfig
  | PolygonMaskConfig
  | PathMaskConfig
  | CustomMaskConfig;

/**
 * 遮罩接口
 */
export interface IMask {
  readonly id: string;
  readonly config: AnyMaskConfig;
  enabled: boolean;
  
  // 应用遮罩
  apply(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void;
  
  // 更新配置
  updateConfig(config: Partial<AnyMaskConfig>): void;
  
  // 检测点是否在遮罩内
  contains(point: Point2D): boolean;
  
  // 获取遮罩边界
  getBounds(): { min: Point2D; max: Point2D };
  
  // 克隆遮罩
  clone(): IMask;
  
  // 销毁遮罩
  dispose(): void;
}

/**
 * 遮罩管理器接口
 */
export interface IMaskManager {
  // 创建遮罩
  createMask(config: AnyMaskConfig): IMask;
  
  // 添加遮罩
  addMask(mask: IMask): void;
  
  // 移除遮罩
  removeMask(maskId: string): boolean;
  
  // 获取遮罩
  getMask(maskId: string): IMask | undefined;
  
  // 获取所有遮罩
  getAllMasks(): IMask[];
  
  // 应用所有遮罩到目标
  applyMasks(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void;
  
  // 清除所有遮罩
  clear(): void;
  
  // 启用/禁用遮罩
  setMaskEnabled(maskId: string, enabled: boolean): void;
  
  // 获取遮罩统计信息
  getStats(): {
    totalMasks: number;
    enabledMasks: number;
    activeMasks: number;
  };
}

/**
 * 遮罩渲染器接口
 */
export interface IMaskRenderer {
  // 渲染遮罩
  render(mask: IMask, ctx: CanvasRenderingContext2D | WebGLRenderingContext): void;
  
  // 设置混合模式
  setBlendMode(mode: MaskBlendMode): void;
  
  // 开始遮罩组合
  beginMask(): void;
  
  // 结束遮罩组合
  endMask(): void;
}

/**
 * 遮罩事件
 */
export interface MaskEvents {
  maskCreated: (mask: IMask) => void;
  maskRemoved: (maskId: string) => void;
  maskUpdated: (mask: IMask) => void;
  maskEnabled: (maskId: string, enabled: boolean) => void;
}

/**
 * 遮罩工厂接口
 */
export interface IMaskFactory {
  createRectangleMask(config: Omit<RectangleMaskConfig, 'shape'>): IMask;
  createCircleMask(config: Omit<CircleMaskConfig, 'shape'>): IMask;
  createEllipseMask(config: Omit<EllipseMaskConfig, 'shape'>): IMask;
  createPolygonMask(config: Omit<PolygonMaskConfig, 'shape'>): IMask;
  createPathMask(config: Omit<PathMaskConfig, 'shape'>): IMask;
  createCustomMask(config: Omit<CustomMaskConfig, 'shape'>): IMask;
}

/**
 * 遮罩预设效果
 */
export interface MaskPresets {
  // 创建圆形渐变遮罩
  createRadialGradientMask(center: Point2D, innerRadius: number, outerRadius: number): IMask;
  
  // 创建线性渐变遮罩
  createLinearGradientMask(start: Point2D, end: Point2D, width: number): IMask;
  
  // 创建羽化边框遮罩
  createFeatheredBorderMask(bounds: { min: Point2D; max: Point2D }, featherSize: number): IMask;
  
  // 创建文本遮罩
  createTextMask(text: string, font: string, position: Point2D): IMask;
  
  // 创建图像遮罩
  createImageMask(imageData: ImageData, position: Point2D): IMask;
}