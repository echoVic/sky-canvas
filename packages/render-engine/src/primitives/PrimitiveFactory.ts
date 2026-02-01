/**
 * 图形原语工厂
 */
import { CirclePrimitive } from './CirclePrimitive'
import type { GraphicPrimitiveType, IGraphicPrimitive } from './IGraphicPrimitive'
import { PathPrimitive } from './PathPrimitive'
import { RectanglePrimitive } from './RectanglePrimitive'

/**
 * 图形原语创建选项
 */
export interface PrimitiveCreateOptions {
  id?: string
  // Rectangle 选项
  width?: number
  height?: number
  // Circle 选项
  radius?: number
  // Path 选项
  pathData?: string
}

/**
 * 图形原语工厂类
 */
export class PrimitiveFactory {
  /**
   * 创建图形原语
   * @param type 原语类型
   * @param options 创建选项
   * @returns 图形原语实例
   */
  static create(
    type: GraphicPrimitiveType,
    options: PrimitiveCreateOptions = {}
  ): IGraphicPrimitive {
    switch (type) {
      case 'rectangle':
        return new RectanglePrimitive(options.width, options.height, options.id)

      case 'circle':
        return new CirclePrimitive(options.radius, options.id)

      case 'path':
        return new PathPrimitive(options.pathData, options.id)

      default:
        throw new Error(`Unsupported primitive type: ${type}`)
    }
  }

  /**
   * 创建矩形原语
   * @param width 宽度
   * @param height 高度
   * @param id 可选ID
   * @returns 矩形原语
   */
  static createRectangle(width?: number, height?: number, id?: string): RectanglePrimitive {
    return new RectanglePrimitive(width, height, id)
  }

  /**
   * 创建圆形原语
   * @param radius 半径
   * @param id 可选ID
   * @returns 圆形原语
   */
  static createCircle(radius?: number, id?: string): CirclePrimitive {
    return new CirclePrimitive(radius, id)
  }

  /**
   * 创建路径原语
   * @param pathData 路径数据
   * @param id 可选ID
   * @returns 路径原语
   */
  static createPath(pathData?: string, id?: string): PathPrimitive {
    return new PathPrimitive(pathData, id)
  }

  /**
   * 检查类型是否支持
   * @param type 原语类型
   * @returns 是否支持
   */
  static isSupported(type: string): type is GraphicPrimitiveType {
    return ['rectangle', 'circle', 'path', 'line'].includes(type)
  }
}
