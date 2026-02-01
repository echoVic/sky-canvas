/**
 * 选择 ViewModel 实现
 * 使用 Valtio 管理选择状态
 */

import { proxy, snapshot } from 'valtio'
import type { ShapeEntity } from '../models/entities/Shape'
import type { ISelectionState, ISelectionViewModel } from './interfaces/IViewModel'

export class SelectionViewModel implements ISelectionViewModel {
  private readonly _state: ISelectionState

  constructor() {
    this._state = proxy<ISelectionState>({
      selectedShapeIds: [],
      isMultiSelect: false,
      selectionBounds: undefined,
    })
  }

  get state(): ISelectionState {
    return this._state
  }

  async initialize(): Promise<void> {}

  dispose(): void {
    this._state.selectedShapeIds = []
    this._state.selectionBounds = undefined
  }

  getSnapshot() {
    return snapshot(this._state)
  }

  selectShape(id: string): void {
    if (this._state.selectedShapeIds.includes(id)) {
      return
    }

    if (!this._state.isMultiSelect) {
      this._state.selectedShapeIds = []
    }

    this._state.selectedShapeIds.push(id)
  }

  deselectShape(id: string): void {
    const index = this._state.selectedShapeIds.indexOf(id)
    if (index < 0) {
      return
    }

    this._state.selectedShapeIds.splice(index, 1)
  }

  clearSelection(): void {
    if (this._state.selectedShapeIds.length === 0) {
      return
    }

    this._state.selectedShapeIds = []
    this._state.selectionBounds = undefined
  }

  selectMultiple(ids: string[]): void {
    this._state.isMultiSelect = true

    this._state.selectedShapeIds = [...new Set(ids)]
  }

  addToSelection(ids: string[]): void {
    this._state.isMultiSelect = true

    for (const id of ids) {
      if (!this._state.selectedShapeIds.includes(id)) {
        this._state.selectedShapeIds.push(id)
      }
    }
  }

  removeFromSelection(ids: string[]): void {
    let removed = false

    for (const id of ids) {
      const index = this._state.selectedShapeIds.indexOf(id)
      if (index >= 0) {
        this._state.selectedShapeIds.splice(index, 1)
        removed = true
      }
    }

    if (removed) {
      if (this._state.selectedShapeIds.length <= 1) {
        this._state.isMultiSelect = false
      }
    }
  }

  isSelected(id: string): boolean {
    return this._state.selectedShapeIds.includes(id)
  }

  getSelectedIds(): string[] {
    return [...this._state.selectedShapeIds]
  }

  updateSelectionBounds(shapes: ShapeEntity[]): void {
    if (this._state.selectedShapeIds.length === 0 || shapes.length === 0) {
      this._state.selectionBounds = undefined
      return
    }

    const selectedShapes = shapes.filter((shape) => this._state.selectedShapeIds.includes(shape.id))

    if (selectedShapes.length === 0) {
      this._state.selectionBounds = undefined
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const shape of selectedShapes) {
      const bounds = {
        x: shape.transform.position.x,
        y: shape.transform.position.y,
        width: 0,
        height: 0,
      }

      if (shape.type === 'rectangle') {
        const rect = shape as any
        bounds.width = rect.size?.width || 0
        bounds.height = rect.size?.height || 0
      } else if (shape.type === 'circle') {
        const circle = shape as any
        const radius = circle.radius || 0
        bounds.width = radius * 2
        bounds.height = radius * 2
        bounds.x -= radius
        bounds.y -= radius
      }

      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    this._state.selectionBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }
}
