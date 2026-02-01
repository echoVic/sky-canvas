/**
 * 渲染命令队列和批处理管理器
 * 负责收集、排序、分组和执行渲染命令
 */
import type { IGraphicsContext, IRect } from '../graphics/IGraphicsContext'
import type { IRenderCommand, MaterialKey, RenderCommandType } from './IRenderCommand'

/**
 * 渲染批次
 */
export interface IRenderBatch {
  /** 批次唯一标识 */
  readonly id: string

  /** 材质键 */
  readonly materialKey: MaterialKey

  /** 命令类型 */
  readonly commandType: RenderCommandType

  /** 批次中的命令 */
  readonly commands: IRenderCommand[]

  /** 是否可以继续添加命令 */
  readonly canAddMore: boolean

  /** 批次边界框 */
  readonly bounds: IRect

  /**
   * 添加命令到批次
   * @param command 渲染命令
   * @returns 是否成功添加
   */
  addCommand(command: IRenderCommand): boolean

  /**
   * 执行批次中的所有命令
   * @param context 图形上下文
   */
  execute(context: IGraphicsContext): void

  /**
   * 获取批次统计信息
   */
  getStats(): {
    commandCount: number
    estimatedDrawCalls: number
    memoryUsage: number
  }
}

/**
 * 渲染批次实现
 */
export class RenderBatch implements IRenderBatch {
  private static batchCounter = 0

  readonly id: string
  readonly materialKey: MaterialKey
  readonly commandType: RenderCommandType
  readonly commands: IRenderCommand[] = []
  private _bounds?: IRect

  constructor(materialKey: MaterialKey, commandType: RenderCommandType) {
    this.id = `batch_${++RenderBatch.batchCounter}`
    this.materialKey = { ...materialKey }
    this.commandType = commandType
  }

  get canAddMore(): boolean {
    // 限制批次大小以避免过大的缓冲区
    return this.commands.length < 1000
  }

  get bounds(): IRect {
    if (!this._bounds) {
      this._bounds = this.calculateBounds()
    }
    return this._bounds
  }

  addCommand(command: IRenderCommand): boolean {
    if (!this.canAddMore) return false
    if (command.type !== this.commandType) return false
    if (!this.materialsMatch(command.materialKey)) return false

    this.commands.push(command)
    this._bounds = undefined // 重置边界框缓存
    return true
  }

  execute(context: IGraphicsContext): void {
    if (this.commands.length === 0) return

    // 应用批次材质状态
    this.applyMaterialState(context)

    // 执行所有命令
    for (const command of this.commands) {
      command.execute(context)
    }
  }

  getStats() {
    return {
      commandCount: this.commands.length,
      estimatedDrawCalls: Math.max(1, Math.ceil(this.commands.length / 100)),
      memoryUsage: this.commands.length * 64, // 估算字节
    }
  }

  private materialsMatch(other: MaterialKey): boolean {
    const my = this.materialKey
    return (
      my.textureId === other.textureId &&
      my.shaderId === other.shaderId &&
      my.blendMode === other.blendMode &&
      my.fillColor === other.fillColor &&
      my.strokeColor === other.strokeColor
    )
  }

  private calculateBounds(): IRect {
    if (this.commands.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const command of this.commands) {
      const bounds = command.getBounds()
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  private applyMaterialState(context: IGraphicsContext): void {
    // 设置材质状态
    if (this.materialKey.fillColor) {
      context.setFillStyle(this.materialKey.fillColor)
    }
    if (this.materialKey.strokeColor) {
      context.setStrokeStyle(this.materialKey.strokeColor)
    }
    if (this.materialKey.lineWidth !== undefined) {
      context.setLineWidth(this.materialKey.lineWidth)
    }
    // 其他状态设置...
  }
}

/**
 * 渲染命令队列配置
 */
export interface IRenderQueueConfig {
  /** 是否启用批处理 */
  enableBatching: boolean

  /** 是否启用视锥剔除 */
  enableCulling: boolean

  /** 是否启用Z轴排序 */
  enableDepthSorting: boolean

  /** 最大批次数量 */
  maxBatches: number

  /** 剔除边距 */
  cullMargin: number
}

export interface RenderQueueStats {
  totalCommands: number
  visibleCommands: number
  totalBatches: number
  culledCommands: number
  batches: Array<{
    commandCount: number
    estimatedDrawCalls: number
    memoryUsage: number
  }>
  totalDrawCalls: number
  totalMemoryUsage: number
}

/**
 * 渲染命令队列
 */
export interface IRenderQueue {
  /** 配置 */
  readonly config: IRenderQueueConfig

  /** 统计信息 */
  readonly stats: {
    totalCommands: number
    visibleCommands: number
    totalBatches: number
    culledCommands: number
  }

  /**
   * 添加渲染命令
   * @param command 渲染命令
   */
  addCommand(command: IRenderCommand): void

  /**
   * 设置视口用于剔除
   * @param viewport 视口
   */
  setViewport(viewport: IRect): void

  /**
   * 处理并执行所有命令
   * @param context 图形上下文
   */
  flush(context: IGraphicsContext): void

  /**
   * 清空队列
   */
  clear(): void

  /**
   * 获取渲染统计
   */
  getStats(): RenderQueueStats
}

/**
 * 渲染命令队列实现
 */
export class RenderQueue implements IRenderQueue {
  readonly config: IRenderQueueConfig
  private commands: IRenderCommand[] = []
  private batches: Map<string, IRenderBatch> = new Map()
  private viewport?: IRect
  private _stats = {
    totalCommands: 0,
    visibleCommands: 0,
    totalBatches: 0,
    culledCommands: 0,
  }

  constructor(config: Partial<IRenderQueueConfig> = {}) {
    this.config = {
      enableBatching: true,
      enableCulling: true,
      enableDepthSorting: true,
      maxBatches: 100,
      cullMargin: 50,
      ...config,
    }
  }

  get stats() {
    return { ...this._stats }
  }

  addCommand(command: IRenderCommand): void {
    this.commands.push(command)
    this._stats.totalCommands++
  }

  setViewport(viewport: IRect): void {
    this.viewport = {
      x: viewport.x - this.config.cullMargin,
      y: viewport.y - this.config.cullMargin,
      width: viewport.width + this.config.cullMargin * 2,
      height: viewport.height + this.config.cullMargin * 2,
    }
  }

  flush(context: IGraphicsContext): void {
    if (this.commands.length === 0) return

    let visibleCommands = this.commands

    // 视锥剔除
    if (this.config.enableCulling && this.viewport) {
      visibleCommands = this.cullCommands(this.commands)
    }

    // Z轴排序
    if (this.config.enableDepthSorting) {
      visibleCommands.sort((a, b) => a.zIndex - b.zIndex)
    }

    // 批处理
    if (this.config.enableBatching) {
      this.executeBatched(context, visibleCommands)
    } else {
      this.executeImmediate(context, visibleCommands)
    }

    // 更新统计信息
    this._stats.visibleCommands = visibleCommands.length
    this._stats.totalBatches = this.batches.size
    this._stats.culledCommands = this.commands.length - visibleCommands.length
  }

  clear(): void {
    // 清理命令
    for (const command of this.commands) {
      command.dispose()
    }
    this.commands = []

    // 清理批次
    this.batches.clear()

    // 重置统计
    this._stats = {
      totalCommands: 0,
      visibleCommands: 0,
      totalBatches: 0,
      culledCommands: 0,
    }
  }

  getStats(): RenderQueueStats {
    const batchStats = Array.from(this.batches.values()).map((batch) => batch.getStats())
    return {
      ...this._stats,
      batches: batchStats,
      totalDrawCalls: batchStats.reduce((sum, stats) => sum + stats.estimatedDrawCalls, 0),
      totalMemoryUsage: batchStats.reduce((sum, stats) => sum + stats.memoryUsage, 0),
    }
  }

  private cullCommands(commands: IRenderCommand[]): IRenderCommand[] {
    if (!this.viewport) return commands

    return commands.filter((command) => command.isVisible(this.viewport))
  }

  private executeBatched(context: IGraphicsContext, commands: IRenderCommand[]): void {
    this.batches.clear()

    // 将命令分组到批次中
    for (const command of commands) {
      this.addToBatch(command)
    }

    // 执行所有批次
    for (const batch of this.batches.values()) {
      batch.execute(context)
    }
  }

  private executeImmediate(context: IGraphicsContext, commands: IRenderCommand[]): void {
    for (const command of commands) {
      command.execute(context)
    }
  }

  private addToBatch(command: IRenderCommand): void {
    const batchKey = this.getBatchKey(command)
    let batch = this.batches.get(batchKey)

    if (!batch) {
      batch = new RenderBatch(command.materialKey, command.type)
      this.batches.set(batchKey, batch)
    }

    if (!batch.addCommand(command)) {
      // 如果当前批次已满，创建新批次
      const newBatchKey = `${batchKey}_${this.batches.size}`
      const newBatch = new RenderBatch(command.materialKey, command.type)
      newBatch.addCommand(command)
      this.batches.set(newBatchKey, newBatch)
    }
  }

  private getBatchKey(command: IRenderCommand): string {
    const mk = command.materialKey
    return `${command.type}_${mk.textureId || ''}_${mk.shaderId || ''}_${mk.blendMode || ''}_${mk.fillColor || ''}_${mk.strokeColor || ''}`
  }
}
