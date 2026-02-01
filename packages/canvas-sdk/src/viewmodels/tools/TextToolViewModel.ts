import { proxy } from 'valtio'
import { createDecorator } from '../../di'
import { ICanvasManager } from '../../managers/CanvasManager'
import { type ITextEntity, ShapeEntityFactory } from '../../models/entities/Shape'
import type { IViewModel } from '../interfaces/IViewModel'

type IPoint = { x: number; y: number }

export interface ITextToolState {
  isEditing: boolean
  editPosition: IPoint | null
  currentText: string
  currentShape: ITextEntity | null
  cursor: string
  enabled: boolean
}

export interface ITextToolViewModel extends IViewModel {
  state: ITextToolState

  activate(): void
  deactivate(): void

  handleMouseDown(x: number, y: number, event?: MouseEvent): void
  handleMouseMove(x: number, y: number, event?: MouseEvent): void
  handleMouseUp(x: number, y: number, event?: MouseEvent): void

  startEditing(x: number, y: number): void
  updateText(text: string): void
  commitText(): void
  cancelEditing(): void

  isCurrentlyEditing(): boolean
  getCurrentShape(): ITextEntity | null
}

export const ITextToolViewModel = createDecorator<ITextToolViewModel>('TextToolViewModel')

export class TextToolViewModel implements ITextToolViewModel {
  private readonly _state: ITextToolState

  constructor(@ICanvasManager private canvasManager: ICanvasManager) {
    this._state = proxy<ITextToolState>({
      isEditing: false,
      editPosition: null,
      currentText: '',
      currentShape: null,
      cursor: 'text',
      enabled: false,
    })
  }

  get state(): ITextToolState {
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
    this._state.cursor = 'text'
  }

  deactivate(): void {
    if (this._state.isEditing) {
      this.commitText()
    }
    this._state.enabled = false
    this.reset()
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return

    const hitId = this.canvasManager.hitTest(x, y)
    if (hitId) {
      const shape = this.canvasManager.getShapesByZOrder().find((s) => s.id === hitId)
      if (shape && shape.type === 'text' && !shape.locked) {
        const textShape = shape as ITextEntity
        const nextText =
          typeof window !== 'undefined' ? window.prompt('编辑文本', textShape.content || '') : null
        if (nextText !== null) {
          this.canvasManager.updateShape(hitId, { content: nextText })
        }
        return
      }
    }

    const text = typeof window !== 'undefined' ? window.prompt('输入文本', '') : null
    if (!text || text.trim().length === 0) return

    const shape = ShapeEntityFactory.createText(
      text,
      { x, y },
      {
        fillColor: '#1f2937',
        opacity: 1,
      }
    )
    this.canvasManager.addShape(shape)
  }

  handleMouseMove(_x: number, _y: number, _event?: MouseEvent): void {}

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {}

  startEditing(x: number, y: number): void {
    this._state.isEditing = true
    this._state.editPosition = { x, y }
    this._state.currentText = ''

    this._state.currentShape = ShapeEntityFactory.createText(
      '',
      { x, y },
      {
        fillColor: '#1f2937',
        opacity: 1,
      }
    )
  }

  updateText(text: string): void {
    if (!this._state.isEditing || !this._state.currentShape) return

    this._state.currentText = text
    this._state.currentShape = {
      ...this._state.currentShape,
      content: text,
    }
  }

  commitText(): void {
    if (!this._state.isEditing || !this._state.currentShape) return

    if (this._state.currentText.trim().length > 0) {
      this.canvasManager.addShape(this._state.currentShape)
    }

    this.reset()
  }

  cancelEditing(): void {
    this.reset()
  }

  isCurrentlyEditing(): boolean {
    return this._state.isEditing
  }

  getCurrentShape(): ITextEntity | null {
    return this._state.currentShape
  }

  private reset(): void {
    this._state.isEditing = false
    this._state.editPosition = null
    this._state.currentText = ''
    this._state.currentShape = null
  }
}
