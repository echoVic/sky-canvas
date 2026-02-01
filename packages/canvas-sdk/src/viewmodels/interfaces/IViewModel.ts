/**
 * ViewModel 基础接口
 * 使用 Valtio 实现响应式状态管理
 */

import type { IPoint } from '@sky-canvas/render-engine'
import type { ShapeEntity } from '../../models/entities/Shape'
import { ICanvasView } from '../../views/interfaces/ICanvasView'

/**
 * Canvas 鼠标事件
 */
export interface ICanvasMouseEvent {
  point: IPoint
  button: number
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  originalEvent?: MouseEvent
}

/**
 * 视口状态
 */
export interface IViewportState {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

/**
 * 选择状态
 */
export interface ISelectionState {
  selectedShapeIds: string[]
  isMultiSelect: boolean
  selectionBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * 场景状态
 */
export interface ISceneState {
  shapes: ShapeEntity[]
  viewport: IViewportState
  selection: ISelectionState
  isModified: boolean
  lastUpdated: Date
}

/**
 * 基础 ViewModel 接口
 */
export interface IViewModel {
  /**
   * 初始化 ViewModel
   */
  initialize(): Promise<void>

  /**
   * 销毁 ViewModel
   */
  dispose(): void

  /**
   * 获取状态快照
   */
  getSnapshot(): unknown
}

/**
 * 场景 ViewModel 接口
 */
export interface ISceneViewModel extends IViewModel {
  /**
   * 场景状态（响应式）
   */
  readonly state: ISceneState

  /**
   * 添加形状
   */
  addShape(shape: ShapeEntity): void

  /**
   * 移除形状
   */
  removeShape(id: string): void

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<ShapeEntity>): void

  /**
   * 清空所有形状
   */
  clearShapes(): void

  /**
   * 获取形状
   */
  getShape(id: string): ShapeEntity | undefined

  /**
   * 获取所有形状
   */
  getShapes(): ShapeEntity[]
}

/**
 * 视口 ViewModel 接口
 */
export interface IViewportViewModel extends IViewModel {
  /**
   * 视口状态（响应式）
   */
  readonly state: IViewportState

  /**
   * 设置视口
   */
  setViewport(viewport: Partial<IViewportState>): void

  /**
   * 平移视口
   */
  pan(deltaX: number, deltaY: number): void

  /**
   * 缩放视口
   */
  zoom(factor: number, centerX?: number, centerY?: number): void

  /**
   * 适应内容
   */
  fitToContent(shapes: ShapeEntity[]): void

  /**
   * 重置视口
   */
  reset(): void

  /**
   * 坐标转换：屏幕到世界
   */
  screenToWorld(x: number, y: number): { x: number; y: number }

  /**
   * 坐标转换：世界到屏幕
   */
  worldToScreen(x: number, y: number): { x: number; y: number }
}

/**
 * 选择 ViewModel 接口
 */
export interface ISelectionViewModel extends IViewModel {
  /**
   * 选择状态（响应式）
   */
  readonly state: ISelectionState

  /**
   * 选择形状
   */
  selectShape(id: string): void

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void

  /**
   * 清空选择
   */
  clearSelection(): void

  /**
   * 多选
   */
  selectMultiple(ids: string[]): void

  /**
   * 添加到选择
   */
  addToSelection(ids: string[]): void

  /**
   * 从选择中移除
   */
  removeFromSelection(ids: string[]): void

  /**
   * 是否已选择
   */
  isSelected(id: string): boolean

  /**
   * 获取选中的形状ID
   */
  getSelectedIds(): string[]

  /**
   * 更新选择边界
   */
  updateSelectionBounds(shapes: ShapeEntity[]): void
}

/**
 * 形状 ViewModel 接口
 */
export interface IShapeViewModel extends IViewModel {
  /**
   * 形状实体
   */
  readonly shape: ShapeEntity

  /**
   * 更新形状属性
   */
  update(updates: Partial<ShapeEntity>): void

  /**
   * 变换形状
   */
  transform(matrix: number[]): void

  /**
   * 移动形状
   */
  move(deltaX: number, deltaY: number): void

  /**
   * 缩放形状
   */
  scale(scaleX: number, scaleY: number): void

  /**
   * 旋转形状
   */
  rotate(angle: number): void

  /**
   * 克隆形状
   */
  clone(): ShapeEntity

  /**
   * 获取边界框
   */
  getBounds(): { x: number; y: number; width: number; height: number }

  /**
   * 碰撞检测
   */
  hitTest(x: number, y: number): boolean
}

/**
 * 工具状态基础接口
 */
export interface IToolState {
  enabled: boolean
  cursor: string
}

/**
 * 工具 ViewModel 接口
 * 所有绘图工具 ViewModel 必须实现此接口
 */
export interface IToolViewModel<T extends IToolState = IToolState> extends IViewModel {
  /**
   * 工具状态（响应式）
   */
  readonly state: T

  /**
   * 激活工具
   */
  activate(): void

  /**
   * 停用工具
   */
  deactivate(): void

  /**
   * 鼠标按下事件
   */
  handleMouseDown?(x: number, y: number, event?: MouseEvent): void

  /**
   * 鼠标移动事件
   */
  handleMouseMove?(x: number, y: number, event?: MouseEvent): void

  /**
   * 鼠标抬起事件
   */
  handleMouseUp?(x: number, y: number, event?: MouseEvent): void

  /**
   * 键盘按下事件
   */
  handleKeyDown?(event: KeyboardEvent): void

  /**
   * 键盘抬起事件
   */
  handleKeyUp?(event: KeyboardEvent): void
}
