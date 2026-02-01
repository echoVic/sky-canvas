/**
 * 工具系统类型定义
 */

import type { IPoint } from '@sky-canvas/render-engine'

/**
 * 交互模式枚举
 */
export enum InteractionMode {
  SELECT = 'select',
  DRAW = 'draw',
  EDIT = 'edit',
  VIEW = 'view',
}

/**
 * 鼠标事件接口
 */
export interface IMouseEvent {
  point: IPoint
  worldPosition: IPoint
  button: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  originalEvent: MouseEvent
}

/**
 * 交互工具接口
 */
export interface IInteractionTool {
  readonly name: string
  readonly mode: InteractionMode | string
  cursor?: string
  enabled?: boolean

  /**
   * 激活工具
   */
  activate?(): void

  /**
   * 停用工具
   */
  deactivate?(): void

  /**
   * 处理鼠标按下事件
   */
  onMouseDown?(event: IMouseEvent): void

  /**
   * 处理鼠标移动事件
   */
  onMouseMove?(event: IMouseEvent): void

  /**
   * 处理鼠标释放事件
   */
  onMouseUp?(event: IMouseEvent): void

  /**
   * 处理鼠标进入事件
   */
  onMouseEnter?(event: IMouseEvent): void

  /**
   * 处理鼠标离开事件
   */
  onMouseLeave?(event: IMouseEvent): void

  /**
   * 处理键盘按下事件
   */
  onKeyDown?(event: KeyboardEvent): void

  /**
   * 处理键盘释放事件
   */
  onKeyUp?(event: KeyboardEvent): void
}
