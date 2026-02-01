/**
 * 形状实体模型
 * MVVM架构中的Model层 - 纯数据模型，不包含渲染逻辑
 */

export interface IPoint {
  x: number
  y: number
}

export interface ISize {
  width: number
  height: number
}

export interface ITransform {
  position: IPoint
  rotation: number
  scale: IPoint
}

export interface IStyle {
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  lineWidth?: number // 兼容旧代码
  opacity?: number
  lineDash?: number[]
}

export interface IImageDataLike {
  width: number
  height: number
  data: Uint8ClampedArray
}

/**
 * 基础形状实体 - 纯数据模型
 */
export interface IShapeEntity {
  id: string
  type: string
  transform: ITransform
  style: IStyle
  visible: boolean
  zIndex: number
  locked: boolean
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

/**
 * 矩形实体
 */
export interface IRectangleEntity extends IShapeEntity {
  type: 'rectangle'
  size: ISize
  borderRadius?: number
}

/**
 * 圆形实体
 */
export interface ICircleEntity extends IShapeEntity {
  type: 'circle'
  radius: number
}

export interface IEllipseEntity extends IShapeEntity {
  type: 'ellipse'
  radiusX: number
  radiusY: number
}

export interface IPolygonEntity extends IShapeEntity {
  type: 'polygon'
  points: IPoint[]
  closed: boolean
}

export interface IStarEntity extends IShapeEntity {
  type: 'star'
  points: number
  outerRadius: number
  innerRadius: number
  startAngle: number
}

/**
 * 路径实体
 */
export interface IPathEntity extends IShapeEntity {
  type: 'path'
  pathData: string // SVG path data
  closed: boolean
}

/**
 * 文本实体
 */
export interface ITextEntity extends IShapeEntity {
  type: 'text'
  content: string
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
}

export interface IImageEntity extends IShapeEntity {
  type: 'image'
  size: ISize
  src: string
  imageData?: IImageDataLike
}

export interface IGroupEntity extends IShapeEntity {
  type: 'group'
  size: ISize
  childrenIds: string[]
}

/**
 * 联合类型
 */
export type ShapeEntity =
  | IRectangleEntity
  | ICircleEntity
  | IEllipseEntity
  | IPolygonEntity
  | IStarEntity
  | IPathEntity
  | ITextEntity
  | IImageEntity
  | IGroupEntity

/**
 * 形状工厂函数
 */
export class ShapeEntityFactory {
  private static generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  static createRectangle(
    position: IPoint = { x: 0, y: 0 },
    size: ISize = { width: 100, height: 100 },
    style: IStyle = {}
  ): IRectangleEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'rectangle',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      size,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createCircle(
    position: IPoint = { x: 0, y: 0 },
    radius: number = 50,
    style: IStyle = {}
  ): ICircleEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'circle',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      radius,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createEllipse(
    position: IPoint = { x: 0, y: 0 },
    radiusX: number = 50,
    radiusY: number = 30,
    style: IStyle = {}
  ): IEllipseEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'ellipse',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      radiusX,
      radiusY,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createPolygon(
    points: IPoint[] = [],
    position: IPoint = { x: 0, y: 0 },
    style: IStyle = {},
    closed: boolean = true
  ): IPolygonEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'polygon',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      points,
      closed,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createStar(
    position: IPoint = { x: 0, y: 0 },
    points: number = 5,
    outerRadius: number = 50,
    innerRadius: number = 25,
    style: IStyle = {},
    startAngle: number = -Math.PI / 2
  ): IStarEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'star',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      points,
      outerRadius,
      innerRadius,
      startAngle,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createPath(
    pathData: string,
    position: IPoint = { x: 0, y: 0 },
    style: IStyle = {}
  ): IPathEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'path',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      pathData,
      closed: false,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createText(
    content: string,
    position: IPoint = { x: 0, y: 0 },
    style: IStyle = {}
  ): ITextEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'text',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
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
      updatedAt: new Date(),
    }
  }

  static createImage(
    src: string,
    position: IPoint = { x: 0, y: 0 },
    size: ISize = { width: 100, height: 100 },
    style: IStyle = {},
    imageData?: IImageDataLike
  ): IImageEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'image',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      size,
      src,
      imageData,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  static createGroup(
    childrenIds: string[],
    position: IPoint = { x: 0, y: 0 },
    size: ISize = { width: 100, height: 100 },
    style: IStyle = {}
  ): IGroupEntity {
    return {
      id: ShapeEntityFactory.generateId(),
      type: 'group',
      transform: {
        position,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      style,
      size,
      childrenIds,
      visible: true,
      zIndex: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}
