/**
 * 形状接口定义
 */
import { IPoint, IRect, IGraphicsContext, IRenderable } from '@sky-canvas/render-engine';

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
 * 形状接口 - 继承自 IRenderable，添加业务逻辑
 */
export interface IShape extends IRenderable {
  /** 形状类型 */
  readonly type: ShapeType;
  
  /** 位置 */
  position: IPoint;
  
  /** 尺寸 */
  size: ISize;
  
  /** 是否被选中 */
  selected: boolean;
  
  /** 是否被锁定 */
  locked: boolean;
  
  /**
   * 渲染形状 - 为兼容性使用 any 类型，实际传入 Canvas2D 或 IGraphicsContext
   * @param context 渲染上下文
   */
  render(context: any): void;
  
  /**
   * 克隆形状
   * @returns 克隆的形状
   */
  clone(): IShape;
  
  /**
   * 更新形状属性
   * @param update 更新数据
   */
  update(update: IShapeUpdate): void;
  
  /**
   * 序列化形状数据
   * @returns 序列化数据
   */
  serialize(): IShapeData;
  
  /**
   * 从序列化数据恢复
   * @param data 序列化数据
   */
  deserialize(data: IShapeData): void;
  
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
  selected?: boolean;
  locked?: boolean;
}

/**
 * 形状序列化数据接口
 */
export interface IShapeData {
  id: string;
  type: ShapeType;
  position: IPoint;
  size: ISize;
  visible: boolean;
  zIndex: number;
  selected: boolean;
  locked: boolean;
  [key: string]: any; // 允许形状特定的数据
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