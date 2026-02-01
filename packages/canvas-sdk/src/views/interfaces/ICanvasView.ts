/**
 * 画布视图接口
 * MVVM架构中的View层 - 视图抽象，与具体UI框架解耦
 */

import type { ShapeEntity } from '../../models/entities/Shape'
import type { IViewportState } from '../../viewmodels/canvas/CanvasViewModel'

/**
 * 渲染上下文
 */
export interface IRenderContext {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D | WebGLRenderingContext
  viewport: IViewportState
}

/**
 * 交互事件
 */
export interface ICanvasInteractionEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'click' | 'dblclick' | 'wheel' | 'keydown' | 'keyup'
  clientX: number
  clientY: number
  canvasX: number
  canvasY: number
  button?: number
  buttons?: number
  deltaX?: number
  deltaY?: number
  deltaZ?: number
  key?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

type CanvasViewListener = (data: unknown) => void

type CanvasViewEventHandlers = {
  handleMouseEvent: (e: MouseEvent) => void
  handleWheelEvent: (e: WheelEvent) => void
  handleKeyEvent: (e: KeyboardEvent) => void
}

/**
 * 视图配置
 */
export interface ICanvasViewConfig {
  enableInteraction?: boolean
  enableAnimation?: boolean
  backgroundColor?: string
  gridColor?: string
  selectionColor?: string
  showFPS?: boolean
  antialias?: boolean
}

/**
 * 画布视图接口
 */
export interface ICanvasView {
  /**
   * 初始化视图
   */
  initialize(canvas: HTMLCanvasElement, config?: ICanvasViewConfig): Promise<void>

  /**
   * 渲染形状
   */
  render(shapes: ShapeEntity[], viewport: IViewportState): Promise<void>

  /**
   * 渲染单个形状
   */
  renderShape(shape: ShapeEntity, context: IRenderContext): Promise<void>

  /**
   * 清空画布
   */
  clear(): void

  /**
   * 设置视口
   */
  setViewport(viewport: IViewportState): void

  /**
   * 获取视口
   */
  getViewport(): IViewportState

  /**
   * 显示网格
   */
  showGrid(show: boolean, gridSize?: number): void

  /**
   * 高亮选中的形状
   */
  highlightShapes(shapeIds: string[]): void

  /**
   * 显示工具提示
   */
  showTooltip(text: string, x: number, y: number): void

  /**
   * 隐藏工具提示
   */
  hideTooltip(): void

  /**
   * 设置光标样式
   */
  setCursor(cursor: string): void

  /**
   * 获取画布尺寸
   */
  getCanvasSize(): { width: number; height: number }

  /**
   * 调整画布尺寸
   */
  resizeCanvas(width: number, height: number): void

  /**
   * 坐标转换：屏幕坐标到画布坐标
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number }

  /**
   * 坐标转换：画布坐标到屏幕坐标
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number }

  /**
   * 判断点是否在形状内
   */
  hitTest(shape: ShapeEntity, x: number, y: number): boolean

  /**
   * 获取指定区域内的形状
   */
  getShapesInRegion(x: number, y: number, width: number, height: number): string[]

  /**
   * 导出画布为图像
   */
  exportAsImage(format?: 'png' | 'jpeg' | 'webp', quality?: number): Promise<Blob>

  /**
   * 导出画布为SVG
   */
  exportAsSVG(): Promise<string>

  /**
   * 事件系统
   */
  on(event: 'interaction', listener: (event: ICanvasInteractionEvent) => void): () => void
  on(event: 'resize', listener: (size: { width: number; height: number }) => void): () => void
  on(event: 'render', listener: () => void): () => void

  /**
   * 销毁视图
   */
  dispose(): void
}

/**
 * 视图工厂接口
 */
export interface ICanvasViewFactory {
  /**
   * 创建Canvas2D视图
   */
  createCanvas2DView(): ICanvasView

  /**
   * 创建WebGL视图
   */
  createWebGLView(): ICanvasView

  /**
   * 创建WebGPU视图
   */
  createWebGPUView(): ICanvasView

  /**
   * 检测支持的渲染类型
   */
  getSupportedRenderTypes(): ('canvas2d' | 'webgl' | 'webgpu')[]
}

/**
 * 抽象画布视图基类
 */
export abstract class BaseCanvasView implements ICanvasView {
  protected canvas!: HTMLCanvasElement
  protected config: ICanvasViewConfig = {}
  protected viewport: IViewportState = { x: 0, y: 0, width: 800, height: 600, zoom: 1 }
  protected eventListeners = new Map<string, Set<CanvasViewListener>>()
  protected isInitialized = false
  private eventHandlers?: CanvasViewEventHandlers

  async initialize(canvas: HTMLCanvasElement, config: ICanvasViewConfig = {}): Promise<void> {
    this.canvas = canvas
    this.config = { ...config }
    this.viewport.width = canvas.width
    this.viewport.height = canvas.height

    this.setupEventListeners()
    await this.initializeRenderer()
    this.isInitialized = true
  }

  abstract render(shapes: ShapeEntity[], viewport: IViewportState): Promise<void>
  abstract renderShape(shape: ShapeEntity, context: IRenderContext): Promise<void>
  abstract clear(): void
  protected abstract initializeRenderer(): Promise<void>

  setViewport(viewport: IViewportState): void {
    this.viewport = { ...viewport }
  }

  getViewport(): IViewportState {
    return { ...this.viewport }
  }

  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    }
  }

  resizeCanvas(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.viewport.width = width
    this.viewport.height = height
    this.emit('resize', { width, height })
  }

  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (screenX - rect.left) / this.viewport.zoom - this.viewport.x,
      y: (screenY - rect.top) / this.viewport.zoom - this.viewport.y,
    }
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: rect.left + (canvasX + this.viewport.x) * this.viewport.zoom,
      y: rect.top + (canvasY + this.viewport.y) * this.viewport.zoom,
    }
  }

  setCursor(cursor: string): void {
    this.canvas.style.cursor = cursor
  }

  showTooltip(text: string, x: number, y: number): void {
    // 简单的工具提示实现
    const tooltip = document.createElement('div')
    tooltip.textContent = text
    tooltip.style.position = 'fixed'
    tooltip.style.left = `${x}px`
    tooltip.style.top = `${y}px`
    tooltip.style.background = 'rgba(0,0,0,0.8)'
    tooltip.style.color = 'white'
    tooltip.style.padding = '4px 8px'
    tooltip.style.borderRadius = '4px'
    tooltip.style.fontSize = '12px'
    tooltip.style.pointerEvents = 'none'
    tooltip.style.zIndex = '1000'
    tooltip.id = 'canvas-tooltip'

    this.hideTooltip()
    document.body.appendChild(tooltip)
  }

  hideTooltip(): void {
    const tooltip = document.getElementById('canvas-tooltip')
    if (tooltip) {
      tooltip.remove()
    }
  }

  abstract showGrid(show: boolean, gridSize?: number): void
  abstract highlightShapes(shapeIds: string[]): void
  abstract hitTest(shape: ShapeEntity, x: number, y: number): boolean
  abstract getShapesInRegion(x: number, y: number, width: number, height: number): string[]
  abstract exportAsImage(format?: 'png' | 'jpeg' | 'webp', quality?: number): Promise<Blob>
  abstract exportAsSVG(): Promise<string>

  on(event: string, listener: CanvasViewListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }

    this.eventListeners.get(event)?.add(listener)

    return () => {
      this.eventListeners.get(event)?.delete(listener)
    }
  }

  protected emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data)
        } catch {}
      })
    }
  }

  protected setupEventListeners(): void {
    if (!this.config.enableInteraction) return

    const handleMouseEvent = (e: MouseEvent) => {
      const canvasPos = this.screenToCanvas(e.clientX, e.clientY)
      const interactionEvent: ICanvasInteractionEvent = {
        type: e.type as ICanvasInteractionEvent['type'],
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: canvasPos.x,
        canvasY: canvasPos.y,
        button: e.button,
        buttons: e.buttons,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      }
      this.emit('interaction', interactionEvent)
    }

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault()
      const canvasPos = this.screenToCanvas(e.clientX, e.clientY)
      const interactionEvent: ICanvasInteractionEvent = {
        type: 'wheel',
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: canvasPos.x,
        canvasY: canvasPos.y,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      }
      this.emit('interaction', interactionEvent)
    }

    const handleKeyEvent = (e: KeyboardEvent) => {
      const interactionEvent: ICanvasInteractionEvent = {
        type: e.type as ICanvasInteractionEvent['type'],
        clientX: 0,
        clientY: 0,
        canvasX: 0,
        canvasY: 0,
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      }
      this.emit('interaction', interactionEvent)
    }

    this.canvas.addEventListener('mousedown', handleMouseEvent)
    this.canvas.addEventListener('mousemove', handleMouseEvent)
    this.canvas.addEventListener('mouseup', handleMouseEvent)
    this.canvas.addEventListener('click', handleMouseEvent)
    this.canvas.addEventListener('dblclick', handleMouseEvent)
    this.canvas.addEventListener('wheel', handleWheelEvent, { passive: false })

    // 键盘事件需要在document上监听
    document.addEventListener('keydown', handleKeyEvent)
    document.addEventListener('keyup', handleKeyEvent)

    // 存储事件处理器以便清理
    this.eventHandlers = {
      handleMouseEvent,
      handleWheelEvent,
      handleKeyEvent,
    }
  }

  dispose(): void {
    // 清理事件监听器
    if (this.eventHandlers) {
      const handlers = this.eventHandlers
      this.canvas.removeEventListener('mousedown', handlers.handleMouseEvent)
      this.canvas.removeEventListener('mousemove', handlers.handleMouseEvent)
      this.canvas.removeEventListener('mouseup', handlers.handleMouseEvent)
      this.canvas.removeEventListener('click', handlers.handleMouseEvent)
      this.canvas.removeEventListener('dblclick', handlers.handleMouseEvent)
      this.canvas.removeEventListener('wheel', handlers.handleWheelEvent)
      document.removeEventListener('keydown', handlers.handleKeyEvent)
      document.removeEventListener('keyup', handlers.handleKeyEvent)
    }

    this.hideTooltip()
    this.eventListeners.clear()
    this.isInitialized = false
  }
}
