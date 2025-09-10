/**
 * 形状实体模型
 * MVVM架构中的Model层 - 纯数据实体
 */

export interface IPoint {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface ITransform {
  position: IPoint;
  rotation: number;
  scale: IPoint;
}

export interface IStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  lineDash?: number[];
}

/**
 * 基础形状实体
 */
export interface IShapeEntity {
  id: string;
  type: string;
  transform: ITransform;
  style: IStyle;
  visible: boolean;
  zIndex: number;
  locked: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 矩形实体
 */
export interface IRectangleEntity extends IShapeEntity {
  type: 'rectangle';
  size: ISize;
  borderRadius?: number;
}

/**
 * 圆形实体
 */
export interface ICircleEntity extends IShapeEntity {
  type: 'circle';
  radius: number;
}

/**
 * 路径实体
 */
export interface IPathEntity extends IShapeEntity {
  type: 'path';
  pathData: string; // SVG path data
  closed: boolean;
}

/**
 * 文本实体
 */
export interface ITextEntity extends IShapeEntity {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
}

/**
 * 联合类型
 */
export type ShapeEntity = IRectangleEntity | ICircleEntity | IPathEntity | ITextEntity;

/**
 * 形状工厂函数
 */
export class ShapeEntityFactory {
  private static generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createRectangle(
    position: IPoint = { x: 0, y: 0 },
    size: ISize = { width: 100, height: 100 },
    style: IStyle = {}
  ): IRectangleEntity {
    return {
      id: this.generateId(),
      type: 'rectangle',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 }
      },
      style,
      size,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static createCircle(
    position: IPoint = { x: 0, y: 0 },
    radius: number = 50,
    style: IStyle = {}
  ): ICircleEntity {
    return {
      id: this.generateId(),
      type: 'circle',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 }
      },
      style,
      radius,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static createPath(
    pathData: string,
    position: IPoint = { x: 0, y: 0 },
    style: IStyle = {}
  ): IPathEntity {
    return {
      id: this.generateId(),
      type: 'path',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 }
      },
      style,
      pathData,
      closed: false,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static createText(
    content: string,
    position: IPoint = { x: 0, y: 0 },
    style: IStyle = {}
  ): ITextEntity {
    return {
      id: this.generateId(),
      type: 'text',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 }
      },
      style,
      content,
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      textAlign: 'left',
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}