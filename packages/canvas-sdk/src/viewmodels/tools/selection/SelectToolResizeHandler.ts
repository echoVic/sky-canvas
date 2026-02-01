import type { ICanvasManager } from '../../../managers/CanvasManager'
import type { ShapeEntity } from '../../../models/entities/Shape'
import type { HandlePosition, IInitialShapeState, ISelectToolState } from './SelectToolTypes'

type RectUpdate = Partial<ShapeEntity> & {
  size?: { width: number; height: number }
  transform?: ShapeEntity['transform']
}

export class SelectToolResizeHandler {
  constructor(
    private state: ISelectToolState,
    private canvasManager: ICanvasManager,
    private initialShapeStates: Map<string, IInitialShapeState>
  ) {}

  startResize(handle: HandlePosition, x: number, y: number): void {
    this.state.isResizing = true
    this.state.activeHandle = handle
    this.state.startPoint = { x, y }
    this.state.lastPoint = { x, y }
    this.saveInitialShapeStates()
  }

  handleResize(x: number, y: number): void {
    if (!this.state.startPoint || !this.state.activeHandle) return

    const deltaX = x - this.state.startPoint.x
    const deltaY = y - this.state.startPoint.y
    const handle = this.state.activeHandle

    const selectedShapes = this.canvasManager.getSelectedShapes()

    for (const shape of selectedShapes) {
      const initial = this.initialShapeStates.get(shape.id)
      if (!initial) continue

      if (
        (shape.type === 'rectangle' || shape.type === 'image' || shape.type === 'group') &&
        initial.size
      ) {
        const updates = this.calculateRectResize(initial, handle, deltaX, deltaY)
        this.canvasManager.updateShape(shape.id, updates)
      } else if (shape.type === 'circle' && initial.radius !== undefined) {
        const updates = this.calculateCircleResize(initial, deltaX, deltaY)
        this.canvasManager.updateShape(shape.id, updates)
      } else if (
        shape.type === 'ellipse' &&
        initial.radiusX !== undefined &&
        initial.radiusY !== undefined
      ) {
        const updates = this.calculateEllipseResize(initial, handle, deltaX, deltaY)
        this.canvasManager.updateShape(shape.id, updates)
      } else if (shape.type === 'polygon' && initial.points) {
        const updates = this.calculatePolygonResize(initial, handle, deltaX, deltaY)
        this.canvasManager.updateShape(shape.id, updates)
      } else if (
        shape.type === 'star' &&
        initial.outerRadius !== undefined &&
        initial.innerRadius !== undefined
      ) {
        const updates = this.calculateStarResize(initial, handle, deltaX, deltaY)
        this.canvasManager.updateShape(shape.id, updates)
      }
    }
  }

  saveInitialShapeStates(): void {
    this.initialShapeStates.clear()
    const selectedShapes = this.canvasManager.getSelectedShapes()

    for (const shape of selectedShapes) {
      const state: IInitialShapeState = {
        transform: {
          ...shape.transform,
          position: { ...shape.transform.position },
          scale: { ...shape.transform.scale },
        },
      }

      if (shape.type === 'rectangle' || shape.type === 'image' || shape.type === 'group') {
        state.size = { width: shape.size.width, height: shape.size.height }
      } else if (shape.type === 'circle') {
        state.radius = shape.radius
      } else if (shape.type === 'ellipse') {
        state.radiusX = shape.radiusX
        state.radiusY = shape.radiusY
      } else if (shape.type === 'polygon') {
        state.points = shape.points.map((p) => ({ x: p.x, y: p.y }))
      } else if (shape.type === 'star') {
        state.outerRadius = shape.outerRadius
        state.innerRadius = shape.innerRadius
      }

      this.initialShapeStates.set(shape.id, state)
    }
  }

  private calculateRectResize(
    initial: IInitialShapeState,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const size = initial.size ?? { width: 0, height: 0 }
    const pos = initial.transform.position
    let newWidth = size.width
    let newHeight = size.height
    let newX = pos.x
    let newY = pos.y

    switch (handle) {
      case 'e':
        newWidth = Math.max(10, size.width + deltaX)
        break
      case 'w':
        newWidth = Math.max(10, size.width - deltaX)
        newX = pos.x + deltaX
        break
      case 's':
        newHeight = Math.max(10, size.height + deltaY)
        break
      case 'n':
        newHeight = Math.max(10, size.height - deltaY)
        newY = pos.y + deltaY
        break
      case 'se':
        newWidth = Math.max(10, size.width + deltaX)
        newHeight = Math.max(10, size.height + deltaY)
        break
      case 'sw':
        newWidth = Math.max(10, size.width - deltaX)
        newHeight = Math.max(10, size.height + deltaY)
        newX = pos.x + deltaX
        break
      case 'ne':
        newWidth = Math.max(10, size.width + deltaX)
        newHeight = Math.max(10, size.height - deltaY)
        newY = pos.y + deltaY
        break
      case 'nw':
        newWidth = Math.max(10, size.width - deltaX)
        newHeight = Math.max(10, size.height - deltaY)
        newX = pos.x + deltaX
        newY = pos.y + deltaY
        break
    }

    return {
      transform: { ...initial.transform, position: { x: newX, y: newY } },
      size: { width: newWidth, height: newHeight },
    } as Partial<ShapeEntity>
  }

  private calculateCircleResize(
    initial: IInitialShapeState,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const radius = initial.radius ?? 0
    const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    const sign = deltaX + deltaY > 0 ? 1 : -1
    const newRadius = Math.max(5, radius + delta * sign)

    return { radius: newRadius } as Partial<ShapeEntity>
  }

  private calculateEllipseResize(
    initial: IInitialShapeState,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const radiusX = initial.radiusX ?? 0
    const radiusY = initial.radiusY ?? 0
    let newRadiusX = radiusX
    let newRadiusY = radiusY
    let newX = initial.transform.position.x
    let newY = initial.transform.position.y

    switch (handle) {
      case 'e':
        newRadiusX = Math.max(5, radiusX + deltaX)
        break
      case 'w':
        newRadiusX = Math.max(5, radiusX - deltaX)
        newX = initial.transform.position.x + deltaX
        break
      case 's':
        newRadiusY = Math.max(5, radiusY + deltaY)
        break
      case 'n':
        newRadiusY = Math.max(5, radiusY - deltaY)
        newY = initial.transform.position.y + deltaY
        break
      case 'se':
        newRadiusX = Math.max(5, radiusX + deltaX)
        newRadiusY = Math.max(5, radiusY + deltaY)
        break
      case 'sw':
        newRadiusX = Math.max(5, radiusX - deltaX)
        newRadiusY = Math.max(5, radiusY + deltaY)
        newX = initial.transform.position.x + deltaX
        break
      case 'ne':
        newRadiusX = Math.max(5, radiusX + deltaX)
        newRadiusY = Math.max(5, radiusY - deltaY)
        newY = initial.transform.position.y + deltaY
        break
      case 'nw':
        newRadiusX = Math.max(5, radiusX - deltaX)
        newRadiusY = Math.max(5, radiusY - deltaY)
        newX = initial.transform.position.x + deltaX
        newY = initial.transform.position.y + deltaY
        break
    }

    return {
      transform: { ...initial.transform, position: { x: newX, y: newY } },
      radiusX: newRadiusX,
      radiusY: newRadiusY,
    } as Partial<ShapeEntity>
  }

  private calculatePolygonResize(
    initial: IInitialShapeState,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const bounds = this.getPointsBounds(initial.points || [])
    const rectUpdates = this.calculateRectResize(
      { ...initial, size: { width: bounds.width, height: bounds.height } },
      handle,
      deltaX,
      deltaY
    ) as RectUpdate
    const newSize = rectUpdates.size || { width: bounds.width, height: bounds.height }
    const scaleX = newSize.width / bounds.width
    const scaleY = newSize.height / bounds.height
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    const newPoints = (initial.points || []).map((p) => ({
      x: (p.x - center.x) * scaleX + center.x,
      y: (p.y - center.y) * scaleY + center.y,
    }))
    return {
      transform: rectUpdates.transform,
      points: newPoints,
    } as Partial<ShapeEntity>
  }

  private calculateStarResize(
    initial: IInitialShapeState,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): Partial<ShapeEntity> {
    const outer = initial.outerRadius || 0
    const rectUpdates = this.calculateRectResize(
      { ...initial, size: { width: outer * 2, height: outer * 2 } },
      handle,
      deltaX,
      deltaY
    ) as RectUpdate
    const newSize = rectUpdates.size || { width: outer * 2, height: outer * 2 }
    const newOuter = Math.max(5, Math.max(newSize.width, newSize.height) / 2)
    const inner = initial.innerRadius || newOuter * 0.5
    return {
      transform: rectUpdates.transform,
      outerRadius: newOuter,
      innerRadius: Math.max(2, (inner / outer) * newOuter),
    } as Partial<ShapeEntity>
  }

  private getPointsBounds(points: Array<{ x: number; y: number }>): {
    x: number
    y: number
    width: number
    height: number
  } {
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
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
}
