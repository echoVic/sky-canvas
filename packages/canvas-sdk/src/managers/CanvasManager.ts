/**
 * Canvas 管理器 - 基于 VSCode DI 架构
 * 通过构造函数注入使用依赖服务
 */

import type { IRenderable } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import {
  type ICircleEntity,
  type IEllipseEntity,
  type IGroupEntity,
  type IImageEntity,
  type IPolygonEntity,
  type IRectangleEntity,
  type IShapeEntity,
  type IStarEntity,
  type ITextEntity,
  type ShapeEntity,
  ShapeEntityFactory,
} from '../models/entities/Shape'
import {
  ICanvasRenderingService,
  IClipboardService,
  IHistoryService,
  ILogService,
  ISelectionService,
  IShapeService,
  IZIndexService,
} from '../services'
import type { CanvasStats, ICanvasManager } from './ICanvasManager'
import * as ClipboardMixin from './mixins/CanvasClipboardMixin'
import * as ZIndexMixin from './mixins/CanvasZIndexMixin'

type GroupChildUpdates = Partial<ShapeEntity> & {
  size?: { width: number; height: number }
  radius?: number
  radiusX?: number
  radiusY?: number
  outerRadius?: number
  innerRadius?: number
  points?: Array<{ x: number; y: number }>
}

/**
 * Canvas 状态接口
 *
 * **重要**：此状态通过 valtio proxy 管理，更新是异步的（通过 queueMicrotask）。
 * 在执行操作后立即读取状态可能得到旧值。如需同步读取最新状态，
 * 请直接调用相应的 Service 方法。
 *
 * @see CanvasManager.scheduleSyncState 了解异步更新机制
 */
export interface CanvasState {
  /** 形状总数 */
  shapeCount: number
  /** 选中的形状 ID 列表 */
  selectedIds: string[]
  /** 是否可以撤销 */
  canUndo: boolean
  /** 是否可以重做 */
  canRedo: boolean
  /** 剪贴板是否有数据 */
  hasClipboardData: boolean
}

export type { CanvasStats } from './ICanvasManager'
// 重新导出接口
export { ICanvasManager } from './ICanvasManager'

/**
 * Canvas 管理器实现
 * 使用 VSCode DI 模式的构造函数注入
 */
export class CanvasManager implements ICanvasManager {
  readonly _serviceBrand: undefined

  readonly state: CanvasState = proxy({
    shapeCount: 0,
    selectedIds: [],
    canUndo: false,
    canRedo: false,
    hasClipboardData: false,
  })

  private unsubscribeHistory?: () => void
  private syncStateScheduled = false
  private snapToGrid = false
  private gridSize = 10
  private eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()

  constructor(
    @ILogService private logService: ILogService,
    @IShapeService private shapeService: IShapeService,
    @ISelectionService private selectionService: ISelectionService,
    @IClipboardService private clipboardService: IClipboardService,
    @IHistoryService private historyService: IHistoryService,
    @IZIndexService private zIndexService: IZIndexService,
    @ICanvasRenderingService private renderingService: ICanvasRenderingService
  ) {
    this.logService.info('CanvasManager initialized')
    this.setupHistorySubscription()
  }

  private setupHistorySubscription(): void {
    this.unsubscribeHistory = this.historyService.onDidChange(() => {
      this.scheduleSyncState()
    })
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)?.add(listener)
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args)
        } catch {}
      }
    }
  }

  /**
   * 调度状态同步（防抖）
   *
   * 使用 queueMicrotask 实现微任务级别的防抖，确保在同一事件循环中
   * 多次调用 syncState() 只会执行一次实际的状态同步。
   *
   * **重要行为说明**：
   * - 状态更新是异步的（延迟到下一个微任务）
   * - 在调用 syncState() 后立即读取 state 可能得到旧值
   * - 如果需要同步读取最新状态，应该直接调用相应的 Service 方法
   *
   * @example
   * ```typescript
   * // 异步行为示例
   * canvasManager.addShape(shape);  // 内部调用 syncState()
   * console.log(canvasManager.state.shapeCount);  // 可能是旧值
   *
   * // 等待微任务完成
   * await Promise.resolve();
   * console.log(canvasManager.state.shapeCount);  // 新值
   *
   * // 或者直接读取 Service
   * const count = shapeService.getAllShapeEntities().length;  // 总是最新值
   * ```
   */
  private scheduleSyncState(): void {
    if (this.syncStateScheduled) return

    this.syncStateScheduled = true
    queueMicrotask(() => {
      this.syncStateScheduled = false
      this.syncStateNow()
    })
  }

  /**
   * 请求状态同步（异步）
   *
   * 此方法会调度一个微任务来更新状态，不会立即同步。
   * 详见 scheduleSyncState() 的文档说明。
   */
  private syncState(): void {
    this.scheduleSyncState()
  }

  /**
   * 立即同步状态（内部使用）
   *
   * 直接从各个 Service 读取最新状态并更新 state proxy。
   * 此方法由 scheduleSyncState() 在微任务中调用。
   */
  private syncStateNow(): void {
    this.state.shapeCount = this.shapeService.getAllShapeEntities().length
    this.state.selectedIds = this.selectionService.getSelectedShapes().map((s) => s.id)
    this.state.canUndo = this.historyService.canUndo()
    this.state.canRedo = this.historyService.canRedo()
    this.state.hasClipboardData = this.clipboardService.hasData()
  }

  // === 形状管理 ===

  addShape(entity: ShapeEntity): void {
    this.shapeService.addShape(entity)
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.removeShape(entity.id),
    })
    this.logService.debug(`Shape added: ${entity.id}`)
    this.syncState()
    this.emit('shape:added', entity)
    this.emit('canvas:shapeAdded', entity)
    this.emit('history:executed')
  }

  removeShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id)
    if (!entity) return

    this.shapeService.removeShape(id)
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.addShape(entity),
    })
    this.logService.debug(`Shape removed: ${id}`)
    this.syncState()
    this.emit('shape:removed', entity)
    this.emit('canvas:shapeRemoved', entity)
    this.emit('history:executed')
  }

  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const oldEntity = this.shapeService.getShapeEntity(id)
    if (!oldEntity) return

    if (oldEntity.type === 'group') {
      this.applyGroupUpdates(oldEntity as IGroupEntity, updates as Partial<IGroupEntity>)
    }

    this.shapeService.updateShape(id, updates)
    const oldValues = {
      transform: { ...oldEntity.transform },
      style: { ...oldEntity.style },
    }
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.updateShape(id, oldValues),
    })
    this.logService.debug(`Shape updated: ${id}`)
    this.syncState()
    this.emit('shape:updated', { id, updates })
    this.emit('canvas:shapeUpdated', { id, updates })
    this.emit('history:executed')
  }

  getRenderables(): IRenderable[] {
    return this.shapeService.getRenderables()
  }

  hitTest(x: number, y: number): string | null {
    return this.shapeService.hitTest(x, y)
  }

  // === 选择管理 ===

  selectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id)
    if (!entity) return

    this.selectionService.select([entity])
    this.logService.debug(`Shape selected: ${id}`)
    this.syncState()
    this.emit('shape:selected', entity)
  }

  deselectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id)
    if (!entity) return

    this.selectionService.deselect([entity])
    this.logService.debug(`Shape deselected: ${id}`)
    this.syncState()
    this.emit('shape:deselected', entity)
  }

  clearSelection(): void {
    this.selectionService.clearSelection()
    this.logService.debug('Selection cleared')
    this.syncState()
    this.emit('selection:cleared')
  }

  getSelectedShapes(): ShapeEntity[] {
    return this.selectionService.getSelectedShapes() as ShapeEntity[]
  }

  isShapeSelected(id: string): boolean {
    const entity = this.shapeService.getShapeEntity(id)
    return entity ? this.selectionService.isSelected(entity) : false
  }

  // === 剪贴板操作 (委托给 mixin) ===

  private get clipboardDeps(): ClipboardMixin.IClipboardDeps {
    return {
      clipboardService: this.clipboardService,
      logService: this.logService,
      getSelectedShapes: () => this.getSelectedShapes(),
      removeShape: (id) => this.removeShape(id),
      addShape: (shape) => this.addShape(shape),
      clearSelection: () => this.clearSelection(),
      selectShape: (id) => this.selectShape(id),
    }
  }

  copySelectedShapes(): void {
    ClipboardMixin.copySelectedShapes(this.clipboardDeps)
    this.syncState()
  }

  cutSelectedShapes(): void {
    ClipboardMixin.cutSelectedShapes(this.clipboardDeps)
    this.syncState()
  }

  async paste(): Promise<ShapeEntity[]> {
    const shapes = await ClipboardMixin.paste(this.clipboardDeps)
    this.syncState()
    return shapes
  }

  // === 历史操作 ===

  undo(): void {
    this.historyService.undo()
    this.syncState()
    this.emit('history:undone')
  }

  redo(): void {
    this.historyService.redo()
    this.syncState()
    this.emit('history:redone')
  }

  // === Z轴管理 (委托给 mixin) ===

  private get zIndexDeps(): ZIndexMixin.IZIndexDeps {
    return {
      shapeService: this.shapeService,
      zIndexService: this.zIndexService,
      logService: this.logService,
    }
  }

  bringToFront(shapeIds: string[]): void {
    ZIndexMixin.bringToFront(this.zIndexDeps, shapeIds)
  }

  sendToBack(shapeIds: string[]): void {
    ZIndexMixin.sendToBack(this.zIndexDeps, shapeIds)
  }

  bringForward(shapeIds: string[]): void {
    ZIndexMixin.bringForward(this.zIndexDeps, shapeIds)
  }

  sendBackward(shapeIds: string[]): void {
    ZIndexMixin.sendBackward(this.zIndexDeps, shapeIds)
  }

  setZIndex(shapeIds: string[], zIndex: number): void {
    ZIndexMixin.setZIndex(this.zIndexDeps, shapeIds, zIndex)
  }

  getShapesByZOrder(): IShapeEntity[] {
    return ZIndexMixin.getShapesByZOrder(this.zIndexDeps)
  }

  pan(deltaX: number, deltaY: number): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    this.setViewportState({
      x: viewport.x - deltaX,
      y: viewport.y - deltaY,
    })
  }

  setZoom(zoom: number, center?: { x: number; y: number }): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    const clamped = Math.max(0.1, Math.min(zoom, 8))
    const cx = center?.x ?? viewport.width / 2
    const cy = center?.y ?? viewport.height / 2
    const worldX = (cx + viewport.x) / viewport.zoom
    const worldY = (cy + viewport.y) / viewport.zoom
    const newX = worldX * clamped - cx
    const newY = worldY * clamped - cy
    this.setViewportState({
      x: newX,
      y: newY,
      zoom: clamped,
    })
  }

  zoomIn(center?: { x: number; y: number }): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    this.setZoom(viewport.zoom * 1.1, center)
  }

  zoomOut(center?: { x: number; y: number }): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    this.setZoom(viewport.zoom / 1.1, center)
  }

  zoomToFit(): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    const shapes = this.getShapesByZOrder() as unknown as ShapeEntity[]
    if (shapes.length === 0) {
      this.setZoom(1)
      return
    }
    const bounds = this.getBoundsFromShapes(shapes)
    const scaleX = viewport.width / bounds.width
    const scaleY = viewport.height / bounds.height
    const zoom = Math.min(scaleX, scaleY) * 0.9
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const screenCenter = { x: viewport.width / 2, y: viewport.height / 2 }
    const newX = centerX * zoom - screenCenter.x
    const newY = centerY * zoom - screenCenter.y
    this.setViewportState({ x: newX, y: newY, zoom })
  }

  zoomToSelection(): void {
    const viewport = this.getViewportState()
    if (!viewport) return
    const shapes = this.getSelectedShapes() as unknown as ShapeEntity[]
    if (shapes.length === 0) return
    const bounds = this.getBoundsFromShapes(shapes)
    const scaleX = viewport.width / bounds.width
    const scaleY = viewport.height / bounds.height
    const zoom = Math.min(scaleX, scaleY) * 0.9
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const screenCenter = { x: viewport.width / 2, y: viewport.height / 2 }
    const newX = centerX * zoom - screenCenter.x
    const newY = centerY * zoom - screenCenter.y
    this.setViewportState({ x: newX, y: newY, zoom })
  }

  zoomToActualSize(): void {
    this.setZoom(1)
  }

  screenToWorld(point: { x: number; y: number }): { x: number; y: number } {
    const engine = this.renderingService?.getRenderEngine()
    if (!engine || !engine.screenToWorld) return point
    return engine.screenToWorld(point)
  }

  worldToScreen(point: { x: number; y: number }): { x: number; y: number } {
    const engine = this.renderingService?.getRenderEngine()
    if (!engine || !engine.worldToScreen) return point
    return engine.worldToScreen(point)
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled
  }

  setGridSize(size: number): void {
    this.gridSize = Math.max(2, size)
  }

  snapPoint(point: { x: number; y: number }): { x: number; y: number } {
    const world = this.screenToWorld(point)
    if (!this.snapToGrid) return world
    const x = Math.round(world.x / this.gridSize) * this.gridSize
    const y = Math.round(world.y / this.gridSize) * this.gridSize
    return { x, y }
  }

  groupSelectedShapes(): ShapeEntity | null {
    const shapes = this.getSelectedShapes().filter(
      (shape) => shape.type !== 'group'
    ) as unknown as ShapeEntity[]
    if (shapes.length < 2) return null
    const bounds = this.getBoundsFromShapes(shapes)
    const group = ShapeEntityFactory.createGroup(
      shapes.map((s) => s.id),
      { x: bounds.x, y: bounds.y },
      { width: bounds.width, height: bounds.height }
    )
    this.addShape(group)
    shapes.forEach((shape) => {
      this.updateShape(shape.id, {
        metadata: { ...(shape.metadata ?? {}), groupId: group.id },
      })
    })
    this.clearSelection()
    this.selectShape(group.id)
    return group
  }

  ungroupSelectedShapes(): void {
    const groups = this.getSelectedShapes().filter(
      (shape) => shape.type === 'group'
    ) as IGroupEntity[]
    groups.forEach((group) => {
      group.childrenIds.forEach((id) => {
        const child = this.shapeService.getShapeEntity(id)
        if (!child) return
        const metadata = { ...(child.metadata ?? {}) }
        const { groupId: _groupId, ...rest } = metadata as Record<string, unknown>
        this.updateShape(id, { metadata: rest })
      })
      this.removeShape(group.id)
    })
  }

  alignSelectedShapes(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const shapes = this.getSelectedShapes() as unknown as ShapeEntity[]
    if (shapes.length < 2) return
    const bounds = this.getBoundsFromShapes(shapes)
    shapes.forEach((shape) => {
      const shapeBounds = this.getShapeBounds(shape)
      let targetX = shapeBounds.x
      let targetY = shapeBounds.y
      if (mode === 'left') targetX = bounds.x
      if (mode === 'center') targetX = bounds.x + bounds.width / 2 - shapeBounds.width / 2
      if (mode === 'right') targetX = bounds.x + bounds.width - shapeBounds.width
      if (mode === 'top') targetY = bounds.y
      if (mode === 'middle') targetY = bounds.y + bounds.height / 2 - shapeBounds.height / 2
      if (mode === 'bottom') targetY = bounds.y + bounds.height - shapeBounds.height
      const deltaX = targetX - shapeBounds.x
      const deltaY = targetY - shapeBounds.y
      this.updateShape(shape.id, {
        transform: {
          ...shape.transform,
          position: {
            x: shape.transform.position.x + deltaX,
            y: shape.transform.position.y + deltaY,
          },
        },
      })
    })
  }

  distributeSelectedShapes(mode: 'horizontal' | 'vertical'): void {
    const shapes = this.getSelectedShapes() as unknown as ShapeEntity[]
    if (shapes.length < 3) return
    const bounds = this.getBoundsFromShapes(shapes)
    const sorted = [...shapes].sort((a, b) => {
      const ab = this.getShapeBounds(a)
      const bb = this.getShapeBounds(b)
      return mode === 'horizontal' ? ab.x - bb.x : ab.y - bb.y
    })
    if (mode === 'horizontal') {
      const totalWidth = sorted.reduce((sum, s) => sum + this.getShapeBounds(s).width, 0)
      const spacing = (bounds.width - totalWidth) / (sorted.length - 1)
      let currentX = bounds.x
      sorted.forEach((shape) => {
        const shapeBounds = this.getShapeBounds(shape)
        const deltaX = currentX - shapeBounds.x
        this.updateShape(shape.id, {
          transform: {
            ...shape.transform,
            position: {
              x: shape.transform.position.x + deltaX,
              y: shape.transform.position.y,
            },
          },
        })
        currentX += shapeBounds.width + spacing
      })
    } else {
      const totalHeight = sorted.reduce((sum, s) => sum + this.getShapeBounds(s).height, 0)
      const spacing = (bounds.height - totalHeight) / (sorted.length - 1)
      let currentY = bounds.y
      sorted.forEach((shape) => {
        const shapeBounds = this.getShapeBounds(shape)
        const deltaY = currentY - shapeBounds.y
        this.updateShape(shape.id, {
          transform: {
            ...shape.transform,
            position: {
              x: shape.transform.position.x,
              y: shape.transform.position.y + deltaY,
            },
          },
        })
        currentY += shapeBounds.height + spacing
      })
    }
  }

  private applyGroupUpdates(group: IGroupEntity, updates: Partial<IGroupEntity>): void {
    const originalPosition = group.transform.position
    const newPosition = updates.transform?.position || originalPosition
    const deltaX = newPosition.x - originalPosition.x
    const deltaY = newPosition.y - originalPosition.y
    const size = group.size
    const newSize = updates.size ?? size
    const scaleX = newSize.width / size.width
    const scaleY = newSize.height / size.height

    group.childrenIds.forEach((childId) => {
      const child = this.shapeService.getShapeEntity(childId)
      if (!child) return
      const relativeX = child.transform.position.x - originalPosition.x
      const relativeY = child.transform.position.y - originalPosition.y
      const scaledX = relativeX * scaleX
      const scaledY = relativeY * scaleY
      const newChildPos = {
        x: originalPosition.x + scaledX + deltaX,
        y: originalPosition.y + scaledY + deltaY,
      }
      const childUpdates: GroupChildUpdates = {
        transform: {
          ...child.transform,
          position: newChildPos,
        },
      }
      if ('size' in child && child.size) {
        childUpdates.size = {
          width: child.size.width * scaleX,
          height: child.size.height * scaleY,
        }
      }
      if ('radius' in child && typeof child.radius === 'number') {
        childUpdates.radius = Math.max(2, child.radius * Math.max(scaleX, scaleY))
      }
      if ('radiusX' in child && 'radiusY' in child) {
        if (typeof child.radiusX === 'number' && typeof child.radiusY === 'number') {
          childUpdates.radiusX = child.radiusX * scaleX
          childUpdates.radiusY = child.radiusY * scaleY
        }
      }
      if ('outerRadius' in child && 'innerRadius' in child) {
        if (typeof child.outerRadius === 'number' && typeof child.innerRadius === 'number') {
          childUpdates.outerRadius = child.outerRadius * Math.max(scaleX, scaleY)
          childUpdates.innerRadius = child.innerRadius * Math.max(scaleX, scaleY)
        }
      }
      if ('points' in child && Array.isArray(child.points)) {
        const points = (child.points as Array<{ x: number; y: number }>).map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        }))
        childUpdates.points = points
      }
      this.shapeService.updateShape(childId, childUpdates)
    })
  }

  private getViewportState(): {
    x: number
    y: number
    width: number
    height: number
    zoom: number
  } | null {
    const engine = this.renderingService?.getRenderEngine()
    if (!engine || !engine.getViewport) return null
    return engine.getViewport()
  }

  private setViewportState(
    viewport: Partial<{ x: number; y: number; width: number; height: number; zoom: number }>
  ): void {
    const engine = this.renderingService?.getRenderEngine()
    if (!engine || !engine.setViewport) return
    engine.setViewport(viewport)
  }

  private getBoundsFromShapes(shapes: ShapeEntity[]): {
    x: number
    y: number
    width: number
    height: number
  } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    shapes.forEach((shape) => {
      const bounds = this.getShapeBounds(shape)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  private getShapeBounds(shape: ShapeEntity): {
    x: number
    y: number
    width: number
    height: number
  } {
    const pos = shape.transform.position
    switch (shape.type) {
      case 'rectangle': {
        const rect = shape as IRectangleEntity
        return {
          x: pos.x,
          y: pos.y,
          width: rect.size.width,
          height: rect.size.height,
        }
      }
      case 'image': {
        const image = shape as IImageEntity
        return {
          x: pos.x,
          y: pos.y,
          width: image.size.width,
          height: image.size.height,
        }
      }
      case 'group': {
        const group = shape as IGroupEntity
        return {
          x: pos.x,
          y: pos.y,
          width: group.size.width,
          height: group.size.height,
        }
      }
      case 'circle': {
        const circle = shape as ICircleEntity
        return {
          x: pos.x - circle.radius,
          y: pos.y - circle.radius,
          width: circle.radius * 2,
          height: circle.radius * 2,
        }
      }
      case 'ellipse': {
        const ellipse = shape as IEllipseEntity
        return {
          x: pos.x - ellipse.radiusX,
          y: pos.y - ellipse.radiusY,
          width: ellipse.radiusX * 2,
          height: ellipse.radiusY * 2,
        }
      }
      case 'polygon': {
        const polygon = shape as IPolygonEntity
        const points = polygon.points || []
        if (points.length === 0) return { x: pos.x, y: pos.y, width: 0, height: 0 }
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const p of points) {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        }
        return { x: pos.x + minX, y: pos.y + minY, width: maxX - minX, height: maxY - minY }
      }
      case 'star': {
        const star = shape as IStarEntity
        const r = Math.max(star.outerRadius, star.innerRadius)
        return { x: pos.x - r, y: pos.y - r, width: r * 2, height: r * 2 }
      }
      case 'text': {
        const text = shape as ITextEntity
        const width = text.content.length * text.fontSize * 0.6
        return { x: pos.x, y: pos.y, width, height: text.fontSize }
      }
      default:
        return { x: pos.x, y: pos.y, width: 0, height: 0 }
    }
  }

  // === 状态查询 ===

  getStats(): CanvasStats {
    const shapeStats = this.shapeService.getStats()
    return {
      shapes: {
        ...shapeStats,
        selectedShapes: this.selectionService.getSelectionCount(),
      },
      history: {
        canUndo: this.historyService.canUndo(),
        canRedo: this.historyService.canRedo(),
      },
    }
  }

  clear(): void {
    this.shapeService.clear()
    this.selectionService.clearSelection()
    this.historyService.clear()
    this.logService.info('Canvas cleared')
    this.syncState()
    this.emit('history:cleared')
    this.emit('selection:cleared')
  }

  dispose(): void {
    if (this.unsubscribeHistory) {
      this.unsubscribeHistory()
      this.unsubscribeHistory = undefined
    }
    this.shapeService.clear()
    this.logService.info('CanvasManager disposed')
  }
}
