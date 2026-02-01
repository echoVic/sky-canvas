/**
 * 渲染引擎核心实现
 */
import type {
  IGraphicsContext,
  IGraphicsContextFactory,
  IPoint,
} from '../graphics/IGraphicsContext'
import { createLogger } from '../utils/Logger'
import { DirtyRegionManager } from './DirtyRegionManager'
import type { IBounds } from './GeometryAdapter'
import type {
  IRenderable,
  IRenderEngine,
  IRenderEngineConfig,
  IRenderLayer,
  IRenderStats,
  IViewport,
} from './IRenderEngine'
import { LayerCache } from './LayerCache'
import { RenderLayer } from './RenderLayer'

const logger = createLogger('RenderEngine')

/**
 * 渲染引擎实现
 */
export class RenderEngine implements IRenderEngine {
  private context: IGraphicsContext | null = null
  private layers: Map<string, IRenderLayer> = new Map()
  private viewport: IViewport = { x: 0, y: 0, width: 800, height: 600, zoom: 1 }
  private config: IRenderEngineConfig
  private stats: IRenderStats = {
    frameCount: 0,
    fps: 0,
    renderTime: 0,
    objectsRendered: 0,
  }

  private dirtyRegionManager: DirtyRegionManager = new DirtyRegionManager()
  private layerCache: LayerCache = new LayerCache()

  private isRunningFlag = false
  private animationId: number | null = null
  private frameTimeHistory: number[] = []

  constructor(config: IRenderEngineConfig = {}) {
    this.config = {
      targetFPS: 60,
      enableVSync: true,
      enableCulling: true,
      cullMargin: 50,
      ...config,
    }
  }

  async initialize<TCanvas>(
    factory: IGraphicsContextFactory<TCanvas>,
    canvas: TCanvas
  ): Promise<void> {
    if (this.context) {
      throw new Error('Render engine already initialized')
    }
    if (!factory.isSupported()) {
      throw new Error('Graphics context not supported')
    }

    this.context = await factory.createContext(canvas)

    this.viewport.width = this.context.width
    this.viewport.height = this.context.height
  }

  start(): void {
    logger.debug('start() called, isRunning:', this.isRunningFlag, 'context:', !!this.context)
    if (this.isRunningFlag || !this.context) {
      logger.debug('start() aborted - already running or no context')
      return
    }

    this.isRunningFlag = true
    logger.debug('Starting render loop, enableVSync:', this.config.enableVSync)
    if (this.config.enableVSync) {
      this.startVSyncLoop()
    } else {
      this.startCustomLoop()
    }
  }

  stop(): void {
    this.isRunningFlag = false
    if (this.animationId !== null) {
      if (this.config.enableVSync) {
        cancelAnimationFrame(this.animationId)
      } else {
        clearTimeout(this.animationId)
      }
      this.animationId = null
    }
  }

  render(): void {
    if (!this.context) {
      logger.debug('render() aborted - no context')
      return
    }

    const startTime = performance.now()
    const dirtyRegions = this.dirtyRegionManager.optimizeDirtyRegions()

    if (dirtyRegions.length > 0) {
      for (const region of dirtyRegions) {
        this.renderRegion(region)
      }
    } else {
      this.context.clear()
      this.context.save()
      this.setupViewportTransform()
      this.renderLayers()
      this.context.restore()
    }

    // 提交渲染命令到 GPU（关键：WebGL batchManager 需要 flush）
    this.context.present()

    this.dirtyRegionManager.prepareNextFrame()
    this.updateStats(performance.now() - startTime)
  }

  isRunning(): boolean {
    return this.isRunningFlag
  }

  getContext(): IGraphicsContext | null {
    return this.context
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport }
  }

  getViewport(): IViewport {
    return { ...this.viewport }
  }

  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    const layer = new RenderLayer(id, true, 1, zIndex)
    this.layers.set(id, layer)
    return layer
  }

  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id)
  }

  removeLayer(id: string): void {
    this.layers.delete(id)
  }

  screenToWorld(point: IPoint): IPoint {
    if (!this.context) return point
    const screenPoint = this.context.screenToWorld(point)
    return {
      x: (screenPoint.x + this.viewport.x) / this.viewport.zoom,
      y: (screenPoint.y + this.viewport.y) / this.viewport.zoom,
    }
  }

  worldToScreen(point: IPoint): IPoint {
    if (!this.context) return point
    const worldPoint = {
      x: point.x * this.viewport.zoom - this.viewport.x,
      y: point.y * this.viewport.zoom - this.viewport.y,
    }
    return this.context.worldToScreen(worldPoint)
  }

  getStats(): IRenderStats {
    return { ...this.stats }
  }

  // 性能优化方法
  markRegionDirty(bounds: IBounds): void {
    this.dirtyRegionManager.markRegionDirty(
      bounds as unknown as Parameters<typeof this.dirtyRegionManager.markRegionDirty>[0]
    )
  }

  invalidateLayerCache(layerId: string): void {
    this.layerCache.invalidateCache(layerId)
  }

  getCacheMemoryUsage(): number {
    return this.layerCache.getCacheMemoryUsage()
  }

  cleanupExpiredCache(): void {
    this.layerCache.cleanupExpiredCache()
  }

  hitTest(point: IPoint): IRenderable | null {
    const worldPoint = this.screenToWorld(point)
    const sortedLayers = this.getSortedLayers(true)

    for (const layer of sortedLayers) {
      const renderables = layer.getRenderables().reverse()
      for (const renderable of renderables) {
        if (renderable.hitTest(worldPoint)) {
          return renderable
        }
      }
    }
    return null
  }

  getObjectsInViewport(): IRenderable[] {
    const cullMargin = this.config.cullMargin || 50
    const viewportBounds: IBounds = {
      x: this.viewport.x - cullMargin,
      y: this.viewport.y - cullMargin,
      width: this.viewport.width / this.viewport.zoom + cullMargin * 2,
      height: this.viewport.height / this.viewport.zoom + cullMargin * 2,
    }

    const result: IRenderable[] = []
    for (const layer of this.layers.values()) {
      if (!layer.visible) continue
      for (const renderable of layer.getRenderables()) {
        if (this.boundsIntersect(renderable.getBounds(), viewportBounds)) {
          result.push(renderable)
        }
      }
    }
    return result
  }

  dispose(): void {
    this.stop()
    if (this.context) {
      this.context.dispose()
      this.context = null
    }
    this.layers.clear()
  }

  // 私有方法
  private renderRegion(region: IBounds): void {
    if (!this.context) return
    this.context.save()
    this.context.beginPath()
    this.context.rect(region.x, region.y, region.width, region.height)
    this.context.clip()
    this.renderLayers()
    this.context.restore()
  }

  private startVSyncLoop(): void {
    const loop = () => {
      if (!this.isRunningFlag) return
      this.render()
      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  private startCustomLoop(): void {
    const targetInterval = 1000 / (this.config.targetFPS || 60)
    const loop = () => {
      if (!this.isRunningFlag) return
      this.render()
      this.animationId = setTimeout(loop, targetInterval) as unknown as number
    }
    this.animationId = setTimeout(loop, targetInterval) as unknown as number
  }

  private setupViewportTransform(): void {
    if (!this.context) return
    this.context.scale(this.viewport.zoom, this.viewport.zoom)
    this.context.translate(-this.viewport.x, -this.viewport.y)
  }

  private getSortedLayers(descending: boolean = false): IRenderLayer[] {
    const sorted = Array.from(this.layers.values())
      .filter((layer) => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
    return descending ? sorted.reverse() : sorted
  }

  private renderLayers(): void {
    if (!this.context) return

    const sortedLayers = this.getSortedLayers()
    let objectsRendered = 0

    for (const layer of sortedLayers) {
      this.context.save()
      this.context.setOpacity(layer.opacity)

      const renderables = layer.getRenderables()

      // 直接渲染，跳过缓存逻辑
      this.renderLayerRenderables(renderables)
      objectsRendered += renderables.length

      this.context.restore()
    }

    this.stats.objectsRendered = objectsRendered
  }

  private renderLayerRenderables(renderables: IRenderable[]): void {
    if (!this.context) return
    for (const renderable of renderables) {
      this.context.save()
      renderable.render(this.context)
      // 直接传递 renderable 对象，它有 getBounds 方法
      this.dirtyRegionManager.updateCurrentFrameShape(renderable)
      this.context.restore()
    }
  }

  private boundsIntersect(a: IBounds, b: IBounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  private updateStats(renderTime: number): void {
    this.stats.frameCount++
    this.stats.renderTime = renderTime

    const currentTime = performance.now()
    this.frameTimeHistory.push(currentTime)

    while (this.frameTimeHistory.length > 0) {
      const firstFrameTime = this.frameTimeHistory[0]
      if (firstFrameTime !== undefined && currentTime - firstFrameTime > 1000) {
        this.frameTimeHistory.shift()
      } else {
        break
      }
    }

    this.stats.fps = this.frameTimeHistory.length
  }
}
