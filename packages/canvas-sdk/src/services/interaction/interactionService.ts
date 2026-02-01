/**
 * 交互服务
 */

import { createDecorator } from '../../di'
import type { IToolManager } from '../../managers/ToolManager'
import type { ICanvasMouseEvent } from '../../viewmodels/interfaces/IViewModel'
import { ILogService, type ILogService as ILogServiceInterface } from '../logging/logService'

/**
 * 事件监听器记录
 */
interface EventListenerRecord {
  element: EventTarget
  event: string
  handler: (event: Event) => void
}

/**
 * 工具接口
 */
export interface ITool {
  name: string
  activate(): void
  deactivate(): void
  handleMouseDown?(event: MouseEvent): void
  handleMouseMove?(event: MouseEvent): void
  handleMouseUp?(event: MouseEvent): void
  handleKeyDown?(event: KeyboardEvent): void
  handleKeyUp?(event: KeyboardEvent): void
}

/**
 * 交互服务接口
 */
export interface IInteractionService {
  initialize(canvas: HTMLCanvasElement): void
  setToolManager(toolManager: IToolManager): void
  setActiveTool(toolName: string | null): boolean
  getActiveTool(): ITool | null
  registerTool(tool: ITool): void
  unregisterTool(name: string): void
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
  dispose(): void
  readonly _serviceBrand: undefined
}

/**
 * 交互服务标识符
 */
export const IInteractionService = createDecorator<IInteractionService>('InteractionService')

/**
 * 交互服务实现
 */
export class InteractionService implements IInteractionService {
  readonly _serviceBrand: undefined

  private canvas?: HTMLCanvasElement
  private activeTool: ITool | null = null
  private tools = new Map<string, ITool>()
  private enabled = true
  private eventListeners: EventListenerRecord[] = []
  private toolManager?: IToolManager

  constructor(@ILogService private logger: ILogServiceInterface) {}

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.setupEventListeners()
    this.logger.info('Interaction service initialized')
  }

  setToolManager(toolManager: IToolManager): void {
    this.toolManager = toolManager
    this.logger.debug('ToolManager set in InteractionService')
  }

  /**
   * 将原生 MouseEvent 转换为 ICanvasMouseEvent
   */
  private createCanvasMouseEvent(event: MouseEvent): ICanvasMouseEvent {
    return {
      point: this.getCanvasPoint(event),
      button: event.button,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      originalEvent: event,
    }
  }

  private setupEventListeners(): void {
    if (!this.canvas) return

    const mouseDownHandler = (event: Event) => {
      if (!this.enabled || !(event instanceof MouseEvent)) return

      const eventData = this.createCanvasMouseEvent(event)

      if (this.toolManager) {
        this.toolManager.handleMouseDown(eventData)
      } else if (this.activeTool?.handleMouseDown) {
        this.activeTool.handleMouseDown(event)
      }
    }

    const mouseMoveHandler = (event: Event) => {
      if (!this.enabled || !(event instanceof MouseEvent)) return

      const eventData = this.createCanvasMouseEvent(event)

      if (this.toolManager) {
        this.toolManager.handleMouseMove(eventData)
      } else if (this.activeTool?.handleMouseMove) {
        this.activeTool.handleMouseMove(event)
      }
    }

    const mouseUpHandler = (event: Event) => {
      if (!this.enabled || !(event instanceof MouseEvent)) return

      const eventData = this.createCanvasMouseEvent(event)

      if (this.toolManager) {
        this.toolManager.handleMouseUp(eventData)
      } else if (this.activeTool?.handleMouseUp) {
        this.activeTool.handleMouseUp(event)
      }
    }

    const keyDownHandler = (event: Event) => {
      if (!this.enabled || !(event instanceof KeyboardEvent)) return

      if (this.toolManager) {
        this.toolManager.handleKeyDown(event)
      } else if (this.activeTool?.handleKeyDown) {
        this.activeTool.handleKeyDown(event)
      }
    }

    const keyUpHandler = (event: Event) => {
      if (!this.enabled || !(event instanceof KeyboardEvent)) return

      if (this.toolManager) {
        this.toolManager.handleKeyUp(event)
      } else if (this.activeTool?.handleKeyUp) {
        this.activeTool.handleKeyUp(event)
      }
    }

    this.canvas.addEventListener('mousedown', mouseDownHandler)
    this.canvas.addEventListener('mousemove', mouseMoveHandler)
    this.canvas.addEventListener('mouseup', mouseUpHandler)
    document.addEventListener('keydown', keyDownHandler)
    document.addEventListener('keyup', keyUpHandler)

    this.eventListeners.push(
      { element: this.canvas, event: 'mousedown', handler: mouseDownHandler },
      { element: this.canvas, event: 'mousemove', handler: mouseMoveHandler },
      { element: this.canvas, event: 'mouseup', handler: mouseUpHandler },
      { element: document, event: 'keydown', handler: keyDownHandler },
      { element: document, event: 'keyup', handler: keyUpHandler }
    )
  }

  setActiveTool(toolName: string | null): boolean {
    if (this.activeTool) {
      this.activeTool.deactivate()
      this.activeTool = null
    }

    if (!toolName) {
      this.logger.debug('Active tool cleared')
      return true
    }

    const tool = this.tools.get(toolName)
    if (tool) {
      this.activeTool = tool
      this.activeTool.activate()

      this.logger.debug('Active tool changed', toolName)
      return true
    }

    this.logger.warn('Tool not found', toolName)
    return false
  }

  getActiveTool(): ITool | null {
    return this.activeTool
  }

  registerTool(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn('Tool already registered, replacing', tool.name)
    }

    this.tools.set(tool.name, tool)
    this.logger.debug('Tool registered', tool.name)
  }

  unregisterTool(name: string): void {
    const tool = this.tools.get(name)
    if (tool) {
      if (this.activeTool === tool) {
        this.setActiveTool(null)
      }

      this.tools.delete(name)
      this.logger.debug('Tool unregistered', name)
    }
  }

  setEnabled(enabled: boolean): void {
    const wasEnabled = this.enabled
    this.enabled = enabled

    if (wasEnabled !== enabled) {
      this.logger.debug('Interaction enabled state changed', enabled)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取画布坐标点
   */
  private getCanvasPoint(event: MouseEvent): { x: number; y: number } {
    if (!this.canvas) {
      return { x: 0, y: 0 }
    }

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    return {
      x: x * scaleX,
      y: y * scaleY,
    }
  }

  dispose(): void {
    if (this.activeTool) {
      this.activeTool.deactivate()
      this.activeTool = null
    }

    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    this.eventListeners = []

    this.tools.clear()
    this.toolManager = undefined

    this.logger.info('Interaction service disposed')
  }

  /**
   * 获取所有注册的工具
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取工具名称列表
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * 检查工具是否已注册
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }
}
