/**
 * 形状接口定义
 */
import { IPoint, IRect } from '@sky-canvas/render-engine';

/**
 * 尺寸接口
 */
export interface ISize {
  width: number;
  height: number;
}

/**
 * 形状类型
 */
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'text' | 'image' | 'path' | 'group';

/**
 * 形状接口
 */
export interface IShape {
  /** 唯一标识符 */
  readonly id: string;
  
  /** 形状类型 */
  readonly type: ShapeType;
  
  /** 位置 */
  position: IPoint;
  
  /** 尺寸 */
  size: ISize;
  
  /** 是否可见 */
  visible: boolean;
  
  /** Z轴层级 */
  zIndex: number;
  
  /**
   * 渲染形状
   * @param context 渲染上下文
   */
  render(context: any): void;
  
  /**
   * 获取边界框
   * @returns 边界框
   */
  getBounds(): IRect;
  
  /**
   * 点击测试
   * @param point 测试点
   * @returns 是否命中
   */
  hitTest(point: IPoint): boolean;
  
  /**
   * 克隆形状
   * @returns 克隆的形状
   */
  clone(): IShape;
  
  /**
   * 销毁形状
   */
  dispose(): void;
}

/**
 * 形状更新数据接口
 */
export interface IShapeUpdate {
  position?: Partial<IPoint>;
  size?: Partial<ISize>;
  visible?: boolean;
  zIndex?: number;
}

/**
 * 形状事件接口
 */
export interface IShapeEvent {
  shape: IShape;
}

/**
 * 形状选择事件接口
 */
export interface IShapeSelectionEvent {
  shape: IShape;
  selected: boolean;
}