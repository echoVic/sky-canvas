import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import type { IStyle } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IEyedropperToolState {
  isPicking: boolean
  lastPoint: IPoint | null
  cursor: string
  enabled: boolean
  pickedStyle: IStyle | null
}

export interface IEyedropperToolViewModel extends IViewModel {
  state: IEyedropperToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void
}

export const IEyedropperToolViewModel =
  createDecorator<IEyedropperToolViewModel>('EyedropperToolViewModel')

export class EyedropperToolViewModel implements IEyedropperToolViewModel {
  private readonly _state: IEyedropperToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IEyedropperToolState>({
      isPicking: false,
      lastPoint: null,
      cursor: 'copy',
      enabled: false,
      pickedStyle: null,
    })
  }

  get state(): IEyedropperToolState {
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
    this._state.cursor = 'copy'
  }

  deactivate(): void {
    this._state.enabled = false
    this.reset()
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return
    this._state.isPicking = true
    this._state.lastPoint = { x, y }
    const id = this.canvasManager.hitTest(x, y)
    if (!id) return
    const shape = this.canvasManager.getShapesByZOrder().find((s) => s.id === id)
    if (shape) {
      this._state.pickedStyle = { ...shape.style }
    }
  }

  handleMouseMove(_x: number, _y: number, _event?: MouseEvent): void {}

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return
    this._state.isPicking = false
    this._state.lastPoint = null
  }

  private reset(): void {
    this._state.isPicking = false
    this._state.lastPoint = null
  }
}
