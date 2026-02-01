import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type ICircleEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface ICircleToolState {
  isDrawing: boolean
  startPoint: IPoint | null
  currentShape: ICircleEntity | null
  cursor: string
  enabled: boolean
}

export interface ICircleToolViewModel extends IViewModel {
  state: ICircleToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): ICircleEntity | null
}

export const ICircleToolViewModel = createDecorator<ICircleToolViewModel>('CircleToolViewModel')

export class CircleToolViewModel implements ICircleToolViewModel {
  private readonly _state: ICircleToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<ICircleToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
    })
  }

  get state(): ICircleToolState {
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

    this._state.currentShape = ShapeEntityFactory.createCircle({ x, y }, 0, {
      fillColor: '#10b981',
      strokeColor: '#047857',
      strokeWidth: 2,
      opacity: 1,
    })
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.startPoint || !this._state.currentShape) return

    const dx = x - this._state.startPoint.x
    const dy = y - this._state.startPoint.y
    const radius = Math.sqrt(dx * dx + dy * dy)

    this._state.currentShape = {
      ...this._state.currentShape,
      radius,
    }
  }

  handleMouseUp(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    if (this._state.currentShape.radius < 5) {
      this.reset()
      return
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): ICircleEntity | null {
    return this._state.currentShape
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.startPoint = null
    this._state.currentShape = null
  }
}
