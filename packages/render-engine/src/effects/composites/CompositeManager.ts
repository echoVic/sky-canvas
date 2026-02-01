/**
 * 复合操作管理器
 */

import { EventEmitter } from '../../animation/core/EventEmitter'
import {
  type CompositeEvents,
  type CompositeLayer,
  CompositeOperation,
  type CompositeResult,
  type CompositeStats,
  type ICompositeManager,
  type ICompositeOperation,
} from '../types/CompositeTypes'

export class CompositeManager extends EventEmitter<CompositeEvents> implements ICompositeManager {
  private operations: Map<string, ICompositeOperation> = new Map()
  private stats: CompositeStats = {
    totalOperations: 0,
    activeOperations: 0,
    totalComposites: 0,
    averageCompositeTime: 0,
    memoryUsage: 0,
  }

  constructor() {
    super()
  }

  addCompositeOperation(operation: ICompositeOperation): void {
    this.operations.set(operation.id, operation)
    this.stats.totalOperations++
    this.stats.activeOperations++
    this.emit('compositeOperationAdded', operation)
  }

  removeCompositeOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId)
    if (operation) {
      operation.dispose()
      this.operations.delete(operationId)
      this.stats.activeOperations--
      this.emit('compositeOperationRemoved', operationId)
      return true
    }
    return false
  }

  getCompositeOperation(operationId: string): ICompositeOperation | undefined {
    return this.operations.get(operationId)
  }

  getAllCompositeOperations(): ICompositeOperation[] {
    return Array.from(this.operations.values())
  }

  composite(layers: CompositeLayer[]): HTMLCanvasElement {
    if (layers.length === 0) {
      throw new Error('No layers to composite')
    }

    const startTime = performance.now()
    this.emit('compositeStarted', layers)

    try {
      const visibleLayers = layers.filter((layer) => layer.visible && layer.globalAlpha > 0)

      if (visibleLayers.length === 0) {
        throw new Error('No visible layers to composite')
      }

      const bounds = this.calculateBounds(visibleLayers)
      const result = this.performComposite(visibleLayers, bounds)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      this.updateStats(renderTime)

      const compositeResult: CompositeResult = {
        canvas: result,
        bounds,
        compositedLayers: visibleLayers.length,
        renderTime,
      }

      this.emit('compositeCompleted', compositeResult)
      return result
    } catch (error) {
      this.emit('compositeError', error as Error)
      throw error
    }
  }

  clear(): void {
    for (const operation of Array.from(this.operations.values())) {
      operation.dispose()
    }
    this.operations.clear()
    this.stats.activeOperations = 0
  }

  dispose(): void {
    this.clear()
    this.removeAllListeners()
  }

  getStats(): CompositeStats {
    return { ...this.stats }
  }

  private performComposite(
    layers: CompositeLayer[],
    bounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = bounds.width
    canvas.height = bounds.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Cannot create 2D context for composite canvas')
    }

    // 清除画布
    ctx.clearRect(0, 0, bounds.width, bounds.height)

    // 如果只有一层，直接绘制
    if (layers.length === 1) {
      const layer = layers[0]
      this.drawLayer(ctx, layer, bounds)
      return canvas
    }

    // 绘制第一层
    const firstLayer = layers[0]
    this.drawLayer(ctx, firstLayer, bounds)

    // 复合其余层
    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i]
      this.compositeLayer(ctx, layer, bounds)
    }

    return canvas
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    layer: CompositeLayer,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    ctx.save()
    ctx.globalAlpha = layer.globalAlpha
    ctx.globalCompositeOperation = CompositeOperation.SOURCE_OVER

    const offsetX = (layer.bounds?.x || 0) - bounds.x
    const offsetY = (layer.bounds?.y || 0) - bounds.y

    // 应用遮罩
    if (layer.mask) {
      this.applyMask(ctx, layer.mask, offsetX, offsetY)
    }

    ctx.drawImage(layer.canvas, offsetX, offsetY)
    ctx.restore()
  }

  private compositeLayer(
    ctx: CanvasRenderingContext2D,
    layer: CompositeLayer,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const operation = this.getCompositeOperationByType(layer.operation)

    if (operation) {
      const offsetX = (layer.bounds?.x || 0) - bounds.x
      const offsetY = (layer.bounds?.y || 0) - bounds.y

      // 创建临时画布
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = layer.canvas.width
      tempCanvas.height = layer.canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) {
        throw new Error('Cannot create 2D context for composite temp canvas')
      }

      tempCtx.globalAlpha = layer.globalAlpha

      // 应用遮罩
      if (layer.mask) {
        this.applyMask(tempCtx, layer.mask, 0, 0)
      }

      tempCtx.drawImage(layer.canvas, 0, 0)

      // 应用复合操作
      operation.apply(ctx, tempCanvas, {
        x: offsetX,
        y: offsetY,
        width: tempCanvas.width,
        height: tempCanvas.height,
      })
    } else {
      // 回退到标准绘制
      this.drawLayer(ctx, layer, bounds)
    }
  }

  private applyMask(
    ctx: CanvasRenderingContext2D,
    mask: HTMLCanvasElement | ImageData,
    offsetX: number,
    offsetY: number
  ): void {
    ctx.save()
    ctx.globalCompositeOperation = CompositeOperation.DESTINATION_IN

    if (mask instanceof HTMLCanvasElement) {
      ctx.drawImage(mask, offsetX, offsetY)
    } else {
      ctx.putImageData(mask, offsetX, offsetY)
    }

    ctx.restore()
  }

  private getCompositeOperationByType(
    operation: CompositeOperation
  ): ICompositeOperation | undefined {
    for (const op of Array.from(this.operations.values())) {
      if (op.operation === operation) {
        return op
      }
    }
    return undefined
  }

  private calculateBounds(layers: CompositeLayer[]): {
    x: number
    y: number
    width: number
    height: number
  } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const layer of layers) {
      const bounds = layer.bounds || {
        x: 0,
        y: 0,
        width: layer.canvas.width,
        height: layer.canvas.height,
      }

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

  private updateStats(renderTime: number): void {
    this.stats.totalComposites++
    this.stats.averageCompositeTime =
      (this.stats.averageCompositeTime * (this.stats.totalComposites - 1) + renderTime) /
      this.stats.totalComposites

    // 估算内存使用量
    this.stats.memoryUsage = this.operations.size * 1024 // 简单估算
  }
}
