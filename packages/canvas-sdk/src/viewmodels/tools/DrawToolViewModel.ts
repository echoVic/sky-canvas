import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type IPathEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IDrawToolState {
  isDrawing: boolean
  points: IPoint[]
  currentShape: IPathEntity | null
  cursor: string
  enabled: boolean
  strokeColor: string
  strokeWidth: number
}

export interface IDrawToolViewModel extends IViewModel {
  state: IDrawToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): IPathEntity | null

  setStrokeColor(color: string): void
  setStrokeWidth(width: number): void
}

export const IDrawToolViewModel = createDecorator<IDrawToolViewModel>('DrawToolViewModel')

export class DrawToolViewModel implements IDrawToolViewModel {
  private readonly _state: IDrawToolState
  private readonly minDistance = 3

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IDrawToolState>({
      isDrawing: false,
      points: [],
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
      strokeColor: '#f59e0b',
      strokeWidth: 3,
    })
  }

  get state(): IDrawToolState {
    return this._state
  }

  async initialize(): Promise<void> {}

  dispose(): void {
    this.deactivate()
  }

  getSnapshot() {
    return this._state
  }

  activate(): void {
    this._state.enabled = true
    this._state.cursor = 'crosshair'
  }

  deactivate(): void {
    this._state.enabled = false
    this.reset()
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return

    this._state.isDrawing = true
    this._state.points = [{ x, y }]

    const pathData = `M ${x} ${y}`
    this._state.currentShape = ShapeEntityFactory.createPath(
      pathData,
      { x: 0, y: 0 },
      {
        strokeColor: this._state.strokeColor,
        strokeWidth: this._state.strokeWidth,
        opacity: 1,
      }
    )
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape || this._state.points.length === 0) return

    const lastPoint = this._state.points[this._state.points.length - 1]
    const dx = x - lastPoint.x
    const dy = y - lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < this.minDistance) return

    this._state.points.push({ x, y })

    const pathData = this.generateSmoothPath(this._state.points)
    this._state.currentShape = {
      ...this._state.currentShape,
      pathData,
    }
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    const lastPoint = this._state.points[this._state.points.length - 1]
    if (lastPoint.x !== x || lastPoint.y !== y) {
      this._state.points.push({ x, y })
    }

    if (this._state.points.length < 2) {
      this.reset()
      return
    }

    const pathData = this.generateSmoothPath(this._state.points)
    this._state.currentShape = {
      ...this._state.currentShape,
      pathData,
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  private generateSmoothPath(points: IPoint[]): string {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    }

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length - 1; i++) {
      const _p0 = points[i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]

      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2

      path += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`
    }

    const lastPoint = points[points.length - 1]
    path += ` L ${lastPoint.x} ${lastPoint.y}`

    return path
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): IPathEntity | null {
    return this._state.currentShape
  }

  setStrokeColor(color: string): void {
    this._state.strokeColor = color
  }

  setStrokeWidth(width: number): void {
    this._state.strokeWidth = Math.max(1, Math.min(50, width))
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.points = []
    this._state.currentShape = null
  }
}
