import type { IPoint } from '@sky-canvas/render-engine'
import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type IImageEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

export interface IImageToolState {
  isDrawing: boolean
  startPoint: IPoint | null
  currentShape: IImageEntity | null
  cursor: string
  enabled: boolean
  source: string | null
}

export interface IImageToolViewModel extends IViewModel {
  state: IImageToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  isCurrentlyDrawing(): boolean
  getCurrentShape(): IImageEntity | null
}

export const IImageToolViewModel = createDecorator<IImageToolViewModel>('ImageToolViewModel')

export class ImageToolViewModel implements IImageToolViewModel {
  private readonly _state: IImageToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<IImageToolState>({
      isDrawing: false,
      startPoint: null,
      currentShape: null,
      cursor: 'crosshair',
      enabled: false,
      source: null,
    })
  }

  get state(): IImageToolState {
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

    const src =
      this._state.source || (typeof window !== 'undefined' ? window.prompt('Image URL') : null)
    if (!src) return

    this._state.isDrawing = true
    this._state.startPoint = { x, y }
    this._state.source = src

    this._state.currentShape = ShapeEntityFactory.createImage(
      src,
      { x, y },
      { width: 0, height: 0 },
      {
        opacity: 1,
      }
    )
  }

  handleMouseMove(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.startPoint || !this._state.currentShape) return

    const width = Math.abs(x - this._state.startPoint.x)
    const height = Math.abs(y - this._state.startPoint.y)
    const position = {
      x: Math.min(this._state.startPoint.x, x),
      y: Math.min(this._state.startPoint.y, y),
    }

    this._state.currentShape = {
      ...this._state.currentShape,
      transform: {
        ...this._state.currentShape.transform,
        position,
      },
      size: { width, height },
    }
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    if (!this._state.enabled || !this._state.isDrawing) return
    if (!this._state.currentShape) return

    this._state.isDrawing = false

    if (this._state.currentShape.size.width < 5 || this._state.currentShape.size.height < 5) {
      this.reset()
      return
    }

    this.canvasManager.addShape(this._state.currentShape)

    this.reset()
  }

  isCurrentlyDrawing(): boolean {
    return this._state.isDrawing
  }

  getCurrentShape(): IImageEntity | null {
    return this._state.currentShape
  }

  private reset(): void {
    this._state.isDrawing = false
    this._state.startPoint = null
    this._state.currentShape = null
  }
}
