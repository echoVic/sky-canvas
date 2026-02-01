import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type IStarEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IStarToolState {
  isDrawing: boolean
  startPoint: IPoint | null
  currentShape: IStarEntity | null
  cursor: string
  enabled: boolean
  points: number
}

export interface IStarToolViewModel extends IViewModel {
  state: IStarToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): IStarEntity | null
}

export const IStarToolViewModel = createDecorator<IStarToolViewModel>('StarToolViewModel')

export class StarToolViewModel implements IStarToolViewModel {
  private readonly _state: IStarToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IStarToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
      points: 5,
    })
  }

  get state(): IStarToolState {
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

    this._state.currentShape = ShapeEntityFactory.createStar({ x, y }, this._state.points, 0, 0, {
      fillColor: '#eab308',
      strokeColor: '#a16207',
      strokeWidth: 2,
      opacity: 1,
    })
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.startPoint || !this._state.currentShape) return

    const radius = Math.max(
      5,
      Math.sqrt((x - this._state.startPoint.x) ** 2 + (y - this._state.startPoint.y) ** 2)
    )
    const innerRadius = radius * 0.5

    this._state.currentShape = {
      ...this._state.currentShape,
      outerRadius: radius,
      innerRadius,
    }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    if (this._state.currentShape.outerRadius < 5) {
      this.reset()
      return
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): IStarEntity | null {
    return this._state.currentShape
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.startPoint = null
    this._state.currentShape = null
  }
}
