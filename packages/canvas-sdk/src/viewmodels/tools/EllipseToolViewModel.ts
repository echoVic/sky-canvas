import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type IEllipseEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IEllipseToolState {
  isDrawing: boolean
  startPoint: IPoint | null
  currentShape: IEllipseEntity | null
  cursor: string
  enabled: boolean
}

export interface IEllipseToolViewModel extends IViewModel {
  state: IEllipseToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): IEllipseEntity | null
}

export const IEllipseToolViewModel = createDecorator<IEllipseToolViewModel>('EllipseToolViewModel')

export class EllipseToolViewModel implements IEllipseToolViewModel {
  private readonly _state: IEllipseToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IEllipseToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
    })
  }

  get state(): IEllipseToolState {
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

    this._state.currentShape = ShapeEntityFactory.createEllipse({ x, y }, 0, 0, {
      fillColor: '#f97316',
      strokeColor: '#c2410c',
      strokeWidth: 2,
      opacity: 1,
    })
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.startPoint || !this._state.currentShape) return

    const radiusX = Math.abs(x - this._state.startPoint.x)
    const radiusY = Math.abs(y - this._state.startPoint.y)

    this._state.currentShape = {
      ...this._state.currentShape,
      radiusX,
      radiusY,
    }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    if (this._state.currentShape.radiusX < 5 || this._state.currentShape.radiusY < 5) {
      this.reset()
      return
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): IEllipseEntity | null {
    return this._state.currentShape
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.startPoint = null
    this._state.currentShape = null
  }
}
