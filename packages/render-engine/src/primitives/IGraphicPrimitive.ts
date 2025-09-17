/**
 * 基础图形原语接口
 */
import { IPoint } from '../core/interface/IGraphicsContext';
import { IRenderable } from '../core/types';

/**
 * 图形原语类型
 */
export type GraphicPrimitiveType = 'rectangle' | 'circle' | 'path' | 'line';

/**
 * 基础图形原语接口
 * 提供纯渲染功能，不包含业务逻辑
 */
export interface IGraphicPrimitive extends IRenderable {
  /** 原语类型 */
  readonly type: GraphicPrimitiveType;
  
  /** 位置 */
  position: IPoint;
  
  /** 变换矩阵参数 */
  transform: {
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  
  /** 样式属性 */
  style: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
  };
  
  /**
   * 设置位置
   * @param position 新位置
   */
  setPosition(position: IPoint): void;
  
  /**
   * 设置变换
   * @param transform 变换参数
   */
  setTransform(transform: Partial<IGraphicPrimitive['transform']>): void;
  
  /**
   * 设置样式
   * @param style 样式参数
   */
  setStyle(style: Partial<IGraphicPrimitive['style']>): void;
  
  /**
   * 克隆图形原语
   * @returns 克隆的原语
   */
  clone(): IGraphicPrimitive;
  
  /**
   * 销毁图形原语
   */
  dispose(): void;
}

/**
 * 矩形图形原语接口
 */
export interface IRectanglePrimitive extends IGraphicPrimitive {
  readonly type: 'rectangle';
  width: number;
  height: number;
}

/**
 * 圆形图形原语接口
 */
export interface ICirclePrimitive extends IGraphicPrimitive {
  readonly type: 'circle';
  radius: number;
}

/**
 * 路径图形原语接口
 */
export interface IPathPrimitive extends IGraphicPrimitive {
  readonly type: 'path';
  pathData: string; // SVG path data format
}