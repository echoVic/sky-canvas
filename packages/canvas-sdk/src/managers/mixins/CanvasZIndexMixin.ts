/**
 * Canvas Z轴管理混入
 * 处理形状的层级排序操作
 */

import type { IShapeEntity } from '../../models/entities/Shape'
import type { IZIndexService } from '../../services'

export interface IZIndexDeps {
  shapeService: {
    getShapeEntity(id: string): IShapeEntity | null | undefined
    getAllShapeEntities(): IShapeEntity[]
    updateShape(id: string, updates: Partial<IShapeEntity>): void
  }
  zIndexService: IZIndexService
  logService: {
    debug(message: string): void
  }
}

/**
 * 获取有效的形状列表
 */
function getValidShapes(
  shapeIds: string[],
  shapeService: IZIndexDeps['shapeService']
): IShapeEntity[] {
  return shapeIds
    .map((id) => shapeService.getShapeEntity(id))
    .filter((shape): shape is IShapeEntity => shape != null)
}

/**
 * 批量更新形状的 zIndex
 */
function batchUpdateZIndex(
  shapes: IShapeEntity[],
  shapeService: IZIndexDeps['shapeService']
): void {
  shapes.forEach((shape) => {
    shapeService.updateShape(shape.id, { zIndex: shape.zIndex })
  })
}

export function bringToFront(deps: IZIndexDeps, shapeIds: string[]): void {
  if (shapeIds.length === 0) return

  const shapesToMove = getValidShapes(shapeIds, deps.shapeService)
  if (shapesToMove.length === 0) return

  const allShapes = deps.shapeService.getAllShapeEntities()
  const updatedShapes = deps.zIndexService.bringToFront(shapesToMove, allShapes)

  batchUpdateZIndex(updatedShapes, deps.shapeService)

  deps.logService.debug(`Brought ${shapeIds.length} shapes to front`)
}

export function sendToBack(deps: IZIndexDeps, shapeIds: string[]): void {
  if (shapeIds.length === 0) return

  const shapesToMove = getValidShapes(shapeIds, deps.shapeService)
  if (shapesToMove.length === 0) return

  const allShapes = deps.shapeService.getAllShapeEntities()
  const updatedShapes = deps.zIndexService.sendToBack(shapesToMove, allShapes)

  batchUpdateZIndex(updatedShapes, deps.shapeService)

  deps.logService.debug(`Sent ${shapeIds.length} shapes to back`)
}

export function bringForward(deps: IZIndexDeps, shapeIds: string[]): void {
  if (shapeIds.length === 0) return

  const shapesToMove = getValidShapes(shapeIds, deps.shapeService)
  if (shapesToMove.length === 0) return

  const allShapes = deps.shapeService.getAllShapeEntities()
  const updatedShapes = deps.zIndexService.bringForward(shapesToMove, allShapes)

  batchUpdateZIndex(updatedShapes, deps.shapeService)

  deps.logService.debug(`Brought ${shapeIds.length} shapes forward`)
}

export function sendBackward(deps: IZIndexDeps, shapeIds: string[]): void {
  if (shapeIds.length === 0) return

  const shapesToMove = getValidShapes(shapeIds, deps.shapeService)
  if (shapesToMove.length === 0) return

  const allShapes = deps.shapeService.getAllShapeEntities()
  const updatedShapes = deps.zIndexService.sendBackward(shapesToMove, allShapes)

  batchUpdateZIndex(updatedShapes, deps.shapeService)

  deps.logService.debug(`Sent ${shapeIds.length} shapes backward`)
}

export function setZIndex(deps: IZIndexDeps, shapeIds: string[], zIndex: number): void {
  if (shapeIds.length === 0) return

  const shapesToUpdate = getValidShapes(shapeIds, deps.shapeService)
  if (shapesToUpdate.length === 0) return

  const updatedShapes = deps.zIndexService.setZIndex(shapesToUpdate, zIndex)

  updatedShapes.forEach((shape) => {
    deps.shapeService.updateShape(shape.id, { zIndex: shape.zIndex })
  })

  deps.logService.debug(`Set zIndex to ${zIndex} for ${shapeIds.length} shapes`)
}

export function getShapesByZOrder(deps: IZIndexDeps): IShapeEntity[] {
  const allShapes = deps.shapeService.getAllShapeEntities()
  return deps.zIndexService.getSortedShapes(allShapes)
}
