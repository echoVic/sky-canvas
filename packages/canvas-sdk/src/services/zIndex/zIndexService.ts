/**
 * Z轴管理服务 - 处理形状的层次顺序
 * 提供常用的图层操作：置顶、置底、上移、下移
 */

import { createDecorator } from '../../di'
import type { IShapeEntity } from '../../models/entities/Shape'
import { ILogService } from '../logging/logService'

/**
 * Z轴操作类型
 */
export type ZIndexOperation = 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward'

/**
 * Z轴变更事件数据
 */
export interface IZIndexChangeEvent {
  shapeIds: string[]
  operation: ZIndexOperation
  oldZIndices: Record<string, number>
  newZIndices: Record<string, number>
}

/**
 * Z轴管理服务接口
 */
export interface IZIndexService {
  readonly _serviceBrand: undefined
  /**
   * 置顶 - 将形状移到所有形状的最前面
   */
  bringToFront(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 置底 - 将形状移到所有形状的最后面
   */
  sendToBack(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 上移一层
   */
  bringForward(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 下移一层
   */
  sendBackward(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 设置指定的zIndex值
   */
  setZIndex(shapes: IShapeEntity[], zIndex: number): IShapeEntity[]

  /**
   * 重新计算所有形状的zIndex，确保连续性
   */
  normalizeZIndices(allShapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 获取按zIndex排序的形状列表
   */
  getSortedShapes(shapes: IShapeEntity[]): IShapeEntity[]

  /**
   * 获取形状的相对层次位置（从0开始）
   */
  getRelativePosition(shape: IShapeEntity, allShapes: IShapeEntity[]): number
}

/**
 * Z轴管理服务实现
 */
export class ZIndexService implements IZIndexService {
  readonly _serviceBrand: undefined

  constructor(@ILogService private logService: ILogService) {}

  bringToFront(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[] {
    if (shapes.length === 0) return allShapes

    const maxZIndex = this.getMaxZIndex(allShapes)

    const updatedShapes = allShapes.map((shape) => {
      if (shapes.some((s) => s.id === shape.id)) {
        const newZIndex = maxZIndex + shapes.findIndex((s) => s.id === shape.id) + 1

        return {
          ...shape,
          zIndex: newZIndex,
          updatedAt: new Date(),
        }
      }
      return shape
    })

    this.logService.debug(`Brought ${shapes.length} shapes to front`)

    return updatedShapes
  }

  sendToBack(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[] {
    if (shapes.length === 0) return allShapes

    const minZIndex = this.getMinZIndex(allShapes)

    const updatedShapes = allShapes.map((shape) => {
      if (shapes.some((s) => s.id === shape.id)) {
        const newZIndex = minZIndex - shapes.length + shapes.findIndex((s) => s.id === shape.id)

        return {
          ...shape,
          zIndex: newZIndex,
          updatedAt: new Date(),
        }
      }
      return shape
    })

    this.logService.debug(`Sent ${shapes.length} shapes to back`)

    return updatedShapes
  }

  bringForward(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[] {
    if (shapes.length === 0) return allShapes

    const sortedAllShapes = this.getSortedShapes(allShapes)

    const updatedShapes = [...sortedAllShapes]

    const shapesToMove = shapes
      .map((shape) => ({ shape, index: sortedAllShapes.findIndex((s) => s.id === shape.id) }))
      .sort((a, b) => b.index - a.index)

    shapesToMove.forEach(({ shape, index }) => {
      if (index < updatedShapes.length - 1) {
        let nextIndex = index + 1
        while (
          nextIndex < updatedShapes.length &&
          shapes.some((s) => s.id === updatedShapes[nextIndex].id)
        ) {
          nextIndex++
        }

        if (nextIndex < updatedShapes.length) {
          const nextShape = updatedShapes[nextIndex]
          const tempZIndex = shape.zIndex

          updatedShapes[index] = {
            ...shape,
            zIndex: nextShape.zIndex,
            updatedAt: new Date(),
          }

          updatedShapes[nextIndex] = {
            ...nextShape,
            zIndex: tempZIndex,
            updatedAt: new Date(),
          }
        }
      }
    })

    this.logService.debug(`Moved ${shapes.length} shapes forward`)

    return updatedShapes
  }

  sendBackward(shapes: IShapeEntity[], allShapes: IShapeEntity[]): IShapeEntity[] {
    if (shapes.length === 0) return allShapes

    const sortedAllShapes = this.getSortedShapes(allShapes)

    const updatedShapes = [...sortedAllShapes]

    const shapesToMove = shapes
      .map((shape) => ({ shape, index: sortedAllShapes.findIndex((s) => s.id === shape.id) }))
      .sort((a, b) => a.index - b.index)

    shapesToMove.forEach(({ shape, index }) => {
      if (index > 0) {
        let prevIndex = index - 1
        while (prevIndex >= 0 && shapes.some((s) => s.id === updatedShapes[prevIndex].id)) {
          prevIndex--
        }

        if (prevIndex >= 0) {
          const prevShape = updatedShapes[prevIndex]
          const tempZIndex = shape.zIndex

          updatedShapes[index] = {
            ...shape,
            zIndex: prevShape.zIndex,
            updatedAt: new Date(),
          }

          updatedShapes[prevIndex] = {
            ...prevShape,
            zIndex: tempZIndex,
            updatedAt: new Date(),
          }
        }
      }
    })

    this.logService.debug(`Moved ${shapes.length} shapes backward`)

    return updatedShapes
  }

  setZIndex(shapes: IShapeEntity[], zIndex: number): IShapeEntity[] {
    const updatedShapes = shapes.map((shape, index) => {
      const newZIndex = zIndex + index

      return {
        ...shape,
        zIndex: newZIndex,
        updatedAt: new Date(),
      }
    })

    this.logService.debug(`Set zIndex to ${zIndex} for ${shapes.length} shapes`)

    return updatedShapes
  }

  normalizeZIndices(allShapes: IShapeEntity[]): IShapeEntity[] {
    const sortedShapes = this.getSortedShapes(allShapes)

    const normalizedShapes = sortedShapes.map((shape, index) => ({
      ...shape,
      zIndex: index,
      updatedAt: new Date(),
    }))

    this.logService.debug(`Normalized zIndex for ${allShapes.length} shapes`)

    return normalizedShapes
  }

  getSortedShapes(shapes: IShapeEntity[]): IShapeEntity[] {
    return [...shapes].sort((a, b) => a.zIndex - b.zIndex)
  }

  getRelativePosition(shape: IShapeEntity, allShapes: IShapeEntity[]): number {
    const sortedShapes = this.getSortedShapes(allShapes)
    return sortedShapes.findIndex((s) => s.id === shape.id)
  }

  private getMaxZIndex(shapes: IShapeEntity[]): number {
    if (shapes.length === 0) return 0
    return Math.max(...shapes.map((s) => s.zIndex))
  }

  private getMinZIndex(shapes: IShapeEntity[]): number {
    if (shapes.length === 0) return 0
    return Math.min(...shapes.map((s) => s.zIndex))
  }
}

/**
 * Z轴管理服务标识符
 */
export const IZIndexService = createDecorator<IZIndexService>('ZIndexService')
