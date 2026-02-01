/**
 * 渲染桥接器 - 优化Canvas SDK与Render Engine之间的接口调用
 * 提供高效的批处理、缓存和优化传输机制
 */

import { type IGraphicsContext, IPoint, type IRect } from '../graphics/IGraphicsContext'
import type { Transform } from '../math/Transform'
import {
  type BatchCallManager,
  type DataTransferOptimizer,
  globalInterfaceOptimizer,
  type InterfaceInterceptor,
  type ObjectPoolManager,
} from './OptimizedInterface'

/**
 * 渲染命令类型
 */
export enum RenderCommandType {
  DRAW_RECTANGLE = 'drawRectangle',
  DRAW_CIRCLE = 'drawCircle',
  DRAW_LINE = 'drawLine',
  DRAW_PATH = 'drawPath',
  DRAW_TEXT = 'drawText',
  DRAW_IMAGE = 'drawImage',
  SET_TRANSFORM = 'setTransform',
  SET_STYLE = 'setStyle',
  SAVE_STATE = 'saveState',
  RESTORE_STATE = 'restoreState',
  CLIP_RECT = 'clipRect',
  CLEAR_RECT = 'clearRect',
}

/**
 * 渲染命令接口
 */
export interface RenderCommand {
  type: RenderCommandType
  id?: string
  priority?: number
  data: any
  timestamp?: number
}

/**
 * 批处理渲染命令
 */
export interface BatchRenderCommand {
  commands: RenderCommand[]
  bounds?: IRect
  layer?: number
  blendMode?: string
}

/**
 * 渲染状态
 */
export interface RenderState {
  transform: Transform
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  globalAlpha: number
  globalCompositeOperation: GlobalCompositeOperation
  font?: string
  textAlign?: CanvasTextAlign
  textBaseline?: CanvasTextBaseline
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 为渲染命令生成缓存键
   */
  static generateCommandKey(command: RenderCommand): string {
    const data = command.data

    switch (command.type) {
      case RenderCommandType.DRAW_RECTANGLE:
        return `rect_${data.x}_${data.y}_${data.width}_${data.height}_${data.fillStyle}_${data.strokeStyle}`

      case RenderCommandType.DRAW_CIRCLE:
        return `circle_${data.x}_${data.y}_${data.radius}_${data.fillStyle}_${data.strokeStyle}`

      case RenderCommandType.DRAW_TEXT:
        return `text_${data.text}_${data.x}_${data.y}_${data.font}_${data.fillStyle}`

      case RenderCommandType.DRAW_PATH: {
        const pathString = data.path ? data.path.join(',') : ''
        return `path_${pathString}_${data.fillStyle}_${data.strokeStyle}`
      }

      default:
        return `${command.type}_${JSON.stringify(data).slice(0, 50)}`
    }
  }

  /**
   * 为变换矩阵生成缓存键
   */
  static generateTransformKey(transform: Transform): string {
    const matrix = transform.matrix
    const elements = matrix.elements
    // Matrix3x3 uses column-major format: [m00 m01 m02 m10 m11 m12 m20 m21 m22]
    return `transform_${elements[0]}_${elements[3]}_${elements[1]}_${elements[4]}_${elements[6]}_${elements[7]}`
  }

  /**
   * 为边界框生成缓存键
   */
  static generateBoundsKey(bounds: IRect): string {
    return `bounds_${bounds.x}_${bounds.y}_${bounds.width}_${bounds.height}`
  }
}

/**
 * 渲染命令优化器
 */
export class RenderCommandOptimizer {
  /**
   * 合并相邻的相似命令
   */
  static optimizeCommands(commands: RenderCommand[]): RenderCommand[] {
    if (commands.length <= 1) return commands

    const optimized: RenderCommand[] = []
    let current = commands[0]

    for (let i = 1; i < commands.length; i++) {
      const next = commands[i]

      // 尝试合并命令
      const merged = RenderCommandOptimizer.tryMergeCommands(current, next)
      if (merged) {
        current = merged
      } else {
        optimized.push(current)
        current = next
      }
    }

    optimized.push(current)
    return optimized
  }

  /**
   * 尝试合并两个渲染命令
   */
  private static tryMergeCommands(cmd1: RenderCommand, cmd2: RenderCommand): RenderCommand | null {
    // 只合并相同类型的命令
    if (cmd1.type !== cmd2.type) return null

    switch (cmd1.type) {
      case RenderCommandType.DRAW_RECTANGLE:
        return RenderCommandOptimizer.tryMergeRectangles(cmd1, cmd2)

      case RenderCommandType.DRAW_CIRCLE:
        return RenderCommandOptimizer.tryMergeCircles(cmd1, cmd2)

      case RenderCommandType.SET_STYLE:
        return RenderCommandOptimizer.tryMergeStyles(cmd1, cmd2)

      default:
        return null
    }
  }

  private static tryMergeRectangles(
    cmd1: RenderCommand,
    cmd2: RenderCommand
  ): RenderCommand | null {
    const data1 = cmd1.data
    const data2 = cmd2.data

    // 检查样式是否相同
    if (data1.fillStyle !== data2.fillStyle || data1.strokeStyle !== data2.strokeStyle) {
      return null
    }

    // 检查是否相邻
    if (RenderCommandOptimizer.areRectanglesAdjacent(data1, data2)) {
      return {
        type: RenderCommandType.DRAW_RECTANGLE,
        data: {
          rectangles: [data1, data2],
          fillStyle: data1.fillStyle,
          strokeStyle: data1.strokeStyle,
          merged: true,
        },
      }
    }

    return null
  }

  private static tryMergeCircles(cmd1: RenderCommand, cmd2: RenderCommand): RenderCommand | null {
    const data1 = cmd1.data
    const data2 = cmd2.data

    // 检查样式是否相同
    if (data1.fillStyle !== data2.fillStyle || data1.strokeStyle !== data2.strokeStyle) {
      return null
    }

    // 合并为圆形批次
    return {
      type: RenderCommandType.DRAW_CIRCLE,
      data: {
        circles: [data1, data2],
        fillStyle: data1.fillStyle,
        strokeStyle: data1.strokeStyle,
        merged: true,
      },
    }
  }

  private static tryMergeStyles(cmd1: RenderCommand, cmd2: RenderCommand): RenderCommand | null {
    // 合并样式设置
    return {
      type: RenderCommandType.SET_STYLE,
      data: {
        ...cmd1.data,
        ...cmd2.data,
      },
    }
  }

  private static areRectanglesAdjacent(rect1: any, rect2: any): boolean {
    // 简化的相邻检测逻辑
    const gap = 1 // 允许的间隙

    // 水平相邻
    if (
      Math.abs(rect1.y - rect2.y) <= gap &&
      Math.abs(rect1.height - rect2.height) <= gap &&
      (Math.abs(rect1.x + rect1.width - rect2.x) <= gap ||
        Math.abs(rect2.x + rect2.width - rect1.x) <= gap)
    ) {
      return true
    }

    // 垂直相邻
    if (
      Math.abs(rect1.x - rect2.x) <= gap &&
      Math.abs(rect1.width - rect2.width) <= gap &&
      (Math.abs(rect1.y + rect1.height - rect2.y) <= gap ||
        Math.abs(rect2.y + rect2.height - rect1.y) <= gap)
    ) {
      return true
    }

    return false
  }
}

/**
 * 渲染桥接器主类
 */
export class RenderBridge {
  private context: IGraphicsContext
  private commandQueue: RenderCommand[] = []
  private batchManager: BatchCallManager
  private objectPoolManager: ObjectPoolManager
  private dataOptimizer: DataTransferOptimizer
  private interceptor: InterfaceInterceptor

  // 缓存
  private stateCache = new Map<string, RenderState>()
  private commandCache = new Map<string, any>()
  private transformCache = new Map<string, Transform>()

  // 统计
  private stats = {
    commandsExecuted: 0,
    commandsBatched: 0,
    cacheHits: 0,
    cacheMisses: 0,
    optimizedCalls: 0,
  }

  // 配置
  private config = {
    enableBatching: true,
    enableCaching: true,
    enableOptimization: true,
    batchFlushThreshold: 50,
    maxCacheSize: 1000,
  }

  constructor(context: IGraphicsContext) {
    this.context = context
    this.batchManager = globalInterfaceOptimizer.batchManager
    this.objectPoolManager = globalInterfaceOptimizer.objectPoolManager
    this.dataOptimizer = globalInterfaceOptimizer.dataOptimizer
    this.interceptor = globalInterfaceOptimizer.interceptor

    this.initializeObjectPools()
    this.setupInterceptors()
  }

  /**
   * 添加渲染命令到队列
   */
  addCommand(command: RenderCommand): void {
    command.timestamp = performance.now()

    if (this.config.enableBatching) {
      this.commandQueue.push(command)

      if (this.commandQueue.length >= this.config.batchFlushThreshold) {
        this.flushCommands()
      }
    } else {
      this.executeCommand(command)
    }
  }

  /**
   * 批量添加渲染命令
   */
  addBatchCommands(batch: BatchRenderCommand): void {
    if (this.config.enableOptimization) {
      batch.commands = RenderCommandOptimizer.optimizeCommands(batch.commands)
    }

    for (const command of batch.commands) {
      this.addCommand(command)
    }
  }

  /**
   * 立即执行所有排队的命令
   */
  flushCommands(): void {
    if (this.commandQueue.length === 0) return

    const commands = [...this.commandQueue]
    this.commandQueue = []

    if (this.config.enableOptimization) {
      const optimizedCommands = RenderCommandOptimizer.optimizeCommands(commands)
      this.stats.commandsBatched += commands.length - optimizedCommands.length

      for (const command of optimizedCommands) {
        this.executeCommand(command)
      }
    } else {
      for (const command of commands) {
        this.executeCommand(command)
      }
    }
  }

  /**
   * 执行单个渲染命令
   */
  private executeCommand(command: RenderCommand): void {
    const cacheKey = this.config.enableCaching
      ? CacheKeyGenerator.generateCommandKey(command)
      : null

    // 检查缓存
    if (cacheKey && this.commandCache.has(cacheKey)) {
      this.stats.cacheHits++
      const cached = this.commandCache.get(cacheKey)
      if (cached && cached.result) {
        return cached.result
      }
    }

    this.stats.cacheMisses++

    let result: any

    try {
      switch (command.type) {
        case RenderCommandType.DRAW_RECTANGLE:
          result = this.executeDrawRectangle(command.data)
          break

        case RenderCommandType.DRAW_CIRCLE:
          result = this.executeDrawCircle(command.data)
          break

        case RenderCommandType.DRAW_LINE:
          result = this.executeDrawLine(command.data)
          break

        case RenderCommandType.DRAW_PATH:
          result = this.executeDrawPath(command.data)
          break

        case RenderCommandType.DRAW_TEXT:
          result = this.executeDrawText(command.data)
          break

        case RenderCommandType.SET_TRANSFORM:
          result = this.executeSetTransform(command.data)
          break

        case RenderCommandType.SET_STYLE:
          result = this.executeSetStyle(command.data)
          break

        case RenderCommandType.SAVE_STATE:
          result = this.context.save()
          break

        case RenderCommandType.RESTORE_STATE:
          result = this.context.restore()
          break

        case RenderCommandType.CLEAR_RECT:
          result = this.executeClearRect(command.data)
          break

        default:
          console.warn(`Unknown render command type: ${command.type}`)
      }

      // 缓存结果
      if (cacheKey && this.config.enableCaching) {
        if (this.commandCache.size >= this.config.maxCacheSize) {
          const firstKey = this.commandCache.keys().next().value
          if (firstKey !== undefined) {
            this.commandCache.delete(firstKey)
          }
        }
        this.commandCache.set(cacheKey, { result, timestamp: Date.now() })
      }

      this.stats.commandsExecuted++
    } catch (error) {
      console.error(`Error executing render command ${command.type}:`, error)
    }
  }

  private executeDrawRectangle(data: any): void {
    if (data.merged && data.rectangles) {
      // 批量绘制矩形
      for (const rect of data.rectangles) {
        this.drawSingleRectangle(rect)
      }
    } else {
      this.drawSingleRectangle(data)
    }
  }

  private drawSingleRectangle(data: any): void {
    if (data.fillStyle) {
      this.context.setFillStyle(data.fillStyle)
      this.context.fillRect(data.x, data.y, data.width, data.height)
    }
    if (data.strokeStyle) {
      this.context.setStrokeStyle(data.strokeStyle)
      this.context.strokeRect(data.x, data.y, data.width, data.height)
    }
  }

  private executeDrawCircle(data: any): void {
    if (data.merged && data.circles) {
      // 批量绘制圆形
      for (const circle of data.circles) {
        this.drawSingleCircle(circle)
      }
    } else {
      this.drawSingleCircle(data)
    }
  }

  private drawSingleCircle(data: any): void {
    this.context.beginPath()
    this.context.arc(data.x, data.y, data.radius, 0, Math.PI * 2)

    if (data.fillStyle) {
      this.context.setFillStyle(data.fillStyle)
      this.context.fill()
    }
    if (data.strokeStyle) {
      this.context.setStrokeStyle(data.strokeStyle)
      this.context.stroke()
    }
  }

  private executeDrawLine(data: any): void {
    this.context.beginPath()
    this.context.moveTo(data.startX, data.startY)
    this.context.lineTo(data.endX, data.endY)

    if (data.strokeStyle) {
      this.context.setStrokeStyle(data.strokeStyle)
      this.context.stroke()
    }
  }

  private executeDrawPath(data: any): void {
    if (!data.path || !Array.isArray(data.path)) return

    this.context.beginPath()

    for (let i = 0; i < data.path.length; i++) {
      const point = data.path[i]
      if (i === 0) {
        this.context.moveTo(point.x, point.y)
      } else {
        this.context.lineTo(point.x, point.y)
      }
    }

    if (data.closed) {
      this.context.closePath()
    }

    if (data.fillStyle) {
      this.context.setFillStyle(data.fillStyle)
      this.context.fill()
    }
    if (data.strokeStyle) {
      this.context.setStrokeStyle(data.strokeStyle)
      this.context.stroke()
    }
  }

  private executeDrawText(data: any): void {
    if (data.font) {
      this.context.setFont(data.font)
    }
    if (data.textAlign) {
      this.context.setTextAlign(data.textAlign)
    }
    if (data.textBaseline) {
      this.context.setTextBaseline(data.textBaseline)
    }

    if (data.fillStyle) {
      this.context.setFillStyle(data.fillStyle)
      this.context.fillText(data.text, data.x, data.y)
    }
    if (data.strokeStyle) {
      this.context.setStrokeStyle(data.strokeStyle)
      this.context.strokeText(data.text, data.x, data.y)
    }
  }

  private executeSetTransform(data: any): void {
    const transform = data as Transform
    const cacheKey = CacheKeyGenerator.generateTransformKey(transform)

    if (this.transformCache.has(cacheKey)) {
      this.stats.cacheHits++
      return
    }

    const matrix = transform.matrix
    const elements = matrix.elements
    // Matrix3x3 uses column-major: [m00 m01 m02 m10 m11 m12 m20 m21 m22]
    this.context.setTransform({
      a: elements[0], // m00 (scaleX)
      b: elements[1], // m01 (skewY)
      c: elements[3], // m10 (skewX)
      d: elements[4], // m11 (scaleY)
      e: elements[6], // m20 (translateX)
      f: elements[7], // m21 (translateY)
    })

    this.transformCache.set(cacheKey, transform)
  }

  private executeSetStyle(data: any): void {
    Object.keys(data).forEach((key) => {
      switch (key) {
        case 'fillStyle':
          this.context.setFillStyle(data[key])
          break
        case 'strokeStyle':
          this.context.setStrokeStyle(data[key])
          break
        case 'lineWidth':
          this.context.setLineWidth(data[key])
          break
        case 'globalAlpha':
          this.context.setGlobalAlpha(data[key])
          break
      }
    })
  }

  private executeClearRect(data: any): void {
    this.context.clearRect(data.x, data.y, data.width, data.height)
  }

  /**
   * 初始化对象池
   */
  private initializeObjectPools(): void {
    // 渲染命令对象池
    this.objectPoolManager.createPool(
      'renderCommand',
      () => ({ type: RenderCommandType.DRAW_RECTANGLE, data: {}, timestamp: Date.now() }),
      (obj) => {
        obj.data = {}
        obj.timestamp = Date.now()
      },
      100
    )

    // 点对象池
    this.objectPoolManager.createPool(
      'point',
      () => ({ x: 0, y: 0 }),
      (obj) => {
        obj.x = 0
        obj.y = 0
      },
      200
    )

    // 矩形对象池
    this.objectPoolManager.createPool(
      'rect',
      () => ({ x: 0, y: 0, width: 0, height: 0 }),
      (obj) => {
        obj.x = 0
        obj.y = 0
        obj.width = 0
        obj.height = 0
      },
      100
    )
  }

  /**
   * 设置方法拦截器
   */
  private setupInterceptors(): void {
    // 性能监控拦截器
    this.interceptor.addInterceptor('executeCommand', {
      before: async (context) => {
        context.startTime = performance.now()
        return context
      },
      after: async (context) => {
        const duration = performance.now() - (context.startTime || 0)
        if (duration > 16) {
          // 超过1帧时间
          console.warn(
            `Slow render command: ${context.args[0]?.type} took ${duration.toFixed(2)}ms`
          )
        }
        return context
      },
    })
  }

  /**
   * 获取池化对象
   */
  getPooledObject<T>(type: string): T | null {
    return this.objectPoolManager.get<T>(type)
  }

  /**
   * 释放池化对象
   */
  releasePooledObject(type: string, obj: any): void {
    this.objectPoolManager.release(type, obj)
  }

  /**
   * 配置桥接器
   */
  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options)
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      pools: this.objectPoolManager.getStats(),
      cache: {
        commands: this.commandCache.size,
        transforms: this.transformCache.size,
        states: this.stateCache.size,
      },
      queue: {
        pending: this.commandQueue.length,
      },
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.commandCache.clear()
    this.transformCache.clear()
    this.stateCache.clear()
  }

  /**
   * 销毁桥接器
   */
  dispose(): void {
    this.flushCommands()
    this.clearCache()
    this.commandQueue = []
  }
}
