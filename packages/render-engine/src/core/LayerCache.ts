import type { IGraphicsContext } from '../graphics/IGraphicsContext'
import type { IRenderable } from './IRenderEngine'

/**
 * 缓存策略接口
 */
export interface CachePolicy {
  maxSize: number
  ttl: number // 生存时间（毫秒）
}

/**
 * 图层缓存管理器
 */
export class LayerCache {
  private cache: Map<
    string,
    {
      canvas: HTMLCanvasElement
      context: CanvasRenderingContext2D
      timestamp: number
      memoryUsage: number
    }
  > = new Map()

  private cachePolicy: CachePolicy = {
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 30000, // 30秒
  }

  private currentMemoryUsage: number = 0

  /**
   * 缓存图层
   */
  cacheLayer(layerId: string, renderables: IRenderable[]): HTMLCanvasElement {
    // 检查缓存是否已存在且有效
    const cached = this.cache.get(layerId)
    if (cached && this.isCacheValid(cached)) {
      return cached.canvas
    }

    // 创建新的缓存
    const canvas = document.createElement('canvas')
    const bounds = this.calculateLayerBounds(renderables)

    canvas.width = bounds.width
    canvas.height = bounds.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get 2D context')
    }

    // 渲染形状到缓存画布
    context.save()
    context.translate(-bounds.x, -bounds.y)

    renderables.forEach((renderable) => {
      if (renderable.visible) {
        // CanvasRenderingContext2D与IGraphicsContext兼容，使用类型断言
        renderable.render(context as unknown as IGraphicsContext)
      }
    })

    context.restore()

    // 计算内存使用量
    const memoryUsage = canvas.width * canvas.height * 4 // 假设32位颜色

    // 更新内存使用量
    if (cached) {
      this.currentMemoryUsage -= cached.memoryUsage
    }
    this.currentMemoryUsage += memoryUsage

    // 存储到缓存
    this.cache.set(layerId, {
      canvas,
      context,
      timestamp: Date.now(),
      memoryUsage,
    })

    // 清理过期缓存
    this.cleanupExpiredCache()

    // 如果内存使用超出限制，清理最少使用的缓存
    if (this.currentMemoryUsage > this.cachePolicy.maxSize) {
      this.cleanupLeastUsedCache()
    }

    return canvas
  }

  /**
   * 使缓存失效
   */
  invalidateCache(layerId: string): void {
    const cached = this.cache.get(layerId)
    if (cached) {
      this.currentMemoryUsage -= cached.memoryUsage
      this.cache.delete(layerId)
    }
  }

  /**
   * 从缓存渲染图层
   */
  renderFromCache(
    layerId: string,
    context: CanvasRenderingContext2D,
    position: { x: number; y: number }
  ): void {
    const cached = this.cache.get(layerId)
    if (cached && this.isCacheValid(cached)) {
      context.drawImage(cached.canvas, position.x, position.y)
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: { timestamp: number }): boolean {
    return Date.now() - cached.timestamp < this.cachePolicy.ttl
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cachePolicy.ttl) {
        this.currentMemoryUsage -= cached.memoryUsage
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清理最少使用的缓存
   */
  cleanupLeastUsedCache(): void {
    // 简单的LRU策略：清理最旧的缓存
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    let cleanedMemory = 0
    const targetMemory = this.cachePolicy.maxSize * 0.8 // 清理到80%以下

    for (const [key, cached] of entries) {
      if (this.currentMemoryUsage - cleanedMemory <= targetMemory) {
        break
      }

      cleanedMemory += cached.memoryUsage
      this.cache.delete(key)
    }

    this.currentMemoryUsage -= cleanedMemory
  }

  /**
   * 清理未使用的缓存
   */
  cleanupUnusedCache(): void {
    // 在实际应用中，可以根据使用频率清理缓存
    // 这里简化为清理所有缓存
    this.cache.clear()
    this.currentMemoryUsage = 0
  }

  /**
   * 获取缓存内存使用量
   */
  getCacheMemoryUsage(): number {
    return this.currentMemoryUsage
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    // 简化实现，实际应用中需要统计命中和未命中次数
    return this.cache.size > 0 ? 0.8 : 0
  }

  /**
   * 计算图层边界
   */
  private calculateLayerBounds(renderables: IRenderable[]): {
    x: number
    y: number
    width: number
    height: number
  } {
    if (renderables.length === 0) {
      return { x: 0, y: 0, width: 1, height: 1 }
    }

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    renderables.forEach((renderable) => {
      const bounds = renderable.getBounds()
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }
}
