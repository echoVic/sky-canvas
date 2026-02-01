import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IHandToolState {
  isPanning: boolean
  lastPoint: IPoint | null
  cursor: string
  enabled: boolean
}

export interface IHandToolViewModel extends IViewModel {
  state: IHandToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void
}

export const IHandToolViewModel = createDecorator<IHandToolViewModel>('HandToolViewModel')

export class HandToolViewModel implements IHandToolViewModel {
  private readonly _state: IHandToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IHandToolState>({
      isPanning: false,
      lastPoint: null,
      cursor: 'grab',
      enabled: false,
    })
  }

  get state(): IHandToolState {
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
    this._state.cursor = 'grab'
  }

  deactivate(): void {
    this._state.enabled = false
    this.reset()
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return
    this._state.isPanning = true
    this._state.lastPoint = { x, y }
    this._state.cursor = 'grabbing'
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isPanning || !this._state.lastPoint) return
    const deltaX = x - this._state.lastPoint.x
    const deltaY = y - this._state.lastPoint.y
    this.canvasManager.pan(deltaX, deltaY)
    this._state.lastPoint = { x, y }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isPanning) return
    this._state.isPanning = false
    this._state.cursor = 'grab'
    this._state.lastPoint = null
  }

  private reset(): void {
    this._state.isPanning = false
    this._state.lastPoint = null
    this._state.cursor = 'grab'
  }
}
