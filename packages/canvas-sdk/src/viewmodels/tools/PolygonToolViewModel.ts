import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type IPolygonEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IPolygonToolState {
  isDrawing: boolean
  startPoint: IPoint | null
  currentShape: IPolygonEntity | null
  cursor: string
  enabled: boolean
  sides: number
}

export interface IPolygonToolViewModel extends IViewModel {
  state: IPolygonToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): IPolygonEntity | null
}

export const IPolygonToolViewModel = createDecorator<IPolygonToolViewModel>('PolygonToolViewModel')

export class PolygonToolViewModel implements IPolygonToolViewModel {
  private readonly _state: IPolygonToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IPolygonToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
      sides: 5,
    })
  }

  get state(): IPolygonToolState {
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
    this._state.startPoint = { x, y }

    this._state.currentShape = ShapeEntityFactory.createPolygon(
      [],
      { x, y },
      {
        fillColor: '#22c55e',
        strokeColor: '#15803d',
        strokeWidth: 2,
        opacity: 1,
      },
      true
    )
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.startPoint || !this._state.currentShape) return

    const radius = Math.max(
      5,
      Math.sqrt((x - this._state.startPoint.x) ** 2 + (y - this._state.startPoint.y) ** 2)
    )
    const points = this.buildRegularPolygonPoints(radius, this._state.sides)

    this._state.currentShape = {
      ...this._state.currentShape,
      points,
    }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    if (!this._state.currentShape.points || this._state.currentShape.points.length < 3) {
      this.reset()
      return
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): IPolygonEntity | null {
    return this._state.currentShape
  }

  private buildRegularPolygonPoints(
    radius: number,
    sides: number
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = []
    const count = Math.max(3, Math.floor(sides))
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      })
    }
    return points
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.startPoint = null
    this._state.currentShape = null
  }
}
