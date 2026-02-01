/**
 * Canvas 管理器接口定义
 */

import type { IRenderable } from '@sky-canvas/render-engine'
import { createDecorator } from '../di'
import type { IShapeEntity, ShapeEntity } from '../models/entities/Shape'

export interface CanvasState {
  shapeCount: number
  selectedIds: string[]
  canUndo: boolean
  canRedo: boolean
  hasClipboardData: boolean
}

/**
 * Canvas 管理器接口
 */
export interface ICanvasManager {
  readonly _serviceBrand: undefined
  readonly state: CanvasState

  // 形状管理
  addShape(entity: ShapeEntity): void
  removeShape(id: string): void
  updateShape(id: string, updates: Partial<ShapeEntity>): void
  getRenderables(): IRenderable[]
  hitTest(x: number, y: number): string | null

  // 选择管理
  selectShape(id: string): void
  deselectShape(id: string): void
  clearSelection(): void
  getSelectedShapes(): ShapeEntity[]
  isShapeSelected(id: string): boolean

  // 剪贴板操作
  copySelectedShapes(): void
  cutSelectedShapes(): void
  paste(): Promise<ShapeEntity[]>

  // 历史操作
  undo(): void
  redo(): void

  // Z轴管理
  bringToFront(shapeIds: string[]): void
  sendToBack(shapeIds: string[]): void
  bringForward(shapeIds: string[]): void
  sendBackward(shapeIds: string[]): void
  setZIndex(shapeIds: string[], zIndex: number): void
  getShapesByZOrder(): IShapeEntity[]

  // 视口与缩放
  pan(deltaX: number, deltaY: number): void
  setZoom(zoom: number, center?: { x: number; y: number }): void
  zoomIn(center?: { x: number; y: number }): void
  zoomOut(center?: { x: number; y: number }): void
  zoomToFit(): void
  zoomToSelection(): void
  zoomToActualSize(): void
  screenToWorld(point: { x: number; y: number }): { x: number; y: number }
  worldToScreen(point: { x: number; y: number }): { x: number; y: number }

  // 网格吸附
  setSnapToGrid(enabled: boolean): void
  setGridSize(size: number): void
  snapPoint(point: { x: number; y: number }): { x: number; y: number }

  // 编组与对齐
  groupSelectedShapes(): ShapeEntity | null
  ungroupSelectedShapes(): void
  alignSelectedShapes(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void
  distributeSelectedShapes(mode: 'horizontal' | 'vertical'): void

  // 状态查询
  getStats(): CanvasStats
  clear(): void
  dispose(): void

  // 事件
  on(event: string, listener: (...args: unknown[]) => void): void
  off(event: string, listener: (...args: unknown[]) => void): void
}

/**
 * Canvas 统计信息
 */
export interface CanvasStats {
  shapes: {
    totalShapes: number
    selectedShapes: number
    visibleShapes: number
    shapesByType: Record<string, number>
  }
  history: {
    canUndo: boolean
    canRedo: boolean
  }
}

/**
 * Canvas 管理器服务标识符
 */
export const ICanvasManager = createDecorator<ICanvasManager>('CanvasManager')
