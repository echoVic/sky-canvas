import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IEraserToolState {
  isErasing: boolean
  lastPoint: IPoint | null
  cursor: string
  enabled: boolean
}

export interface IEraserToolViewModel extends IViewModel {
  state: IEraserToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void
}

export const IEraserToolViewModel = createDecorator<IEraserToolViewModel>('EraserToolViewModel')

export class EraserToolViewModel implements IEraserToolViewModel {
  private readonly _state: IEraserToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IEraserToolState>({
      isErasing: false,
      lastPoint: null,
      cursor: 'crosshair',
      enabled: false,
    })
  }

  get state(): IEraserToolState {
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
    this._state.isErasing = true
    this._state.lastPoint = { x, y }
    this.eraseAtPoint(x, y)
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isErasing) return
    this.eraseAtPoint(x, y)
    this._state.lastPoint = { x, y }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return
    this._state.isErasing = false
    this._state.lastPoint = null
  }

  private eraseAtPoint(x: number, y: number): void {
    const id = this.canvasManager.hitTest(x, y)
    if (!id) return
    const shape = this.canvasManager.getSelectedShapes().find((s) => s.id === id) || null
    const target = shape || this.canvasManager.getShapesByZOrder().find((s) => s.id === id) || null
    if (target?.locked) return
    this.canvasManager.removeShape(id)
  }

  private reset(): void {
    this._state.isErasing = false
    this._state.lastPoint = null
  }
}
