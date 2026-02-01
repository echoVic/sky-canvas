/**
 * 渲染系统
 * 实现三层架构的核心渲染逻辑
 */

import type { IRect } from '../../graphics/IGraphicsContext'
import type { BaseRenderer, RenderContext } from '../index'
import { Extension, ExtensionType } from './ExtensionSystem'
import { BaseSystem } from './SystemManager'

/**
 * 渲染对象接口
 */
export interface IRenderObject {
  readonly id: string
  readonly bounds: IRect
  readonly visible: boolean
  readonly zIndex: number

  render(renderer: BaseRenderer, context: RenderContext): void
  getBounds(): IRect
  hitTest(point: { x: number; y: number }): boolean
}

/**
 * 渲染层接口
 */
export interface IRenderLayer {
  readonly id: string
  readonly visible: boolean
  readonly zIndex: number

  addObject(object: IRenderObject): void
  removeObject(id: string): void
  getObjects(): IRenderObject[]
  clear(): void
}

/**
 * 渲染层实现
 */
export class RenderLayer implements IRenderLayer {
  private objects = new Map<string, IRenderObject>()

  constructor(
    public readonly id: string,
    public visible: boolean = true,
    public zIndex: number = 0
  ) {}

  addObject(object: IRenderObject): void {
    this.objects.set(object.id, object)
  }

  removeObject(id: string): void {
    this.objects.delete(id)
  }

  getObjects(): IRenderObject[] {
    return Array.from(this.objects.values())
      .filter((obj) => obj.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
  }

  clear(): void {
    this.objects.clear()
  }
}

/**
 * 渲染系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'render-system',
  priority: 1000,
})
export class RenderSystem extends BaseSystem {
  readonly name = 'render-system'
  readonly priority = 1000

  private renderer: BaseRenderer | null = null
  private context: RenderContext | null = null
  private layers = new Map<string, IRenderLayer>()
  private viewport: IRect = { x: 0, y: 0, width: 800, height: 600 }

  // 性能统计
  private stats = {
    objectsRendered: 0,
    layersRendered: 0,
    renderTime: 0,
  }

  /**
   * 设置渲染器
   */
  setRenderer(renderer: BaseRenderer): void {
    this.renderer = renderer
  }

  /**
   * 设置渲染上下文
   */
  setContext(context: RenderContext): void {
    this.context = context
    this.updateViewport()
  }

  /**
   * 创建渲染层
   */
  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    const layer = new RenderLayer(id, true, zIndex)
    this.layers.set(id, layer)
    return layer
  }

  /**
   * 获取渲染层
   */
  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id)
  }

  /**
   * 移除渲染层
   */
  removeLayer(id: string): void {
    this.layers.delete(id)
  }

  /**
   * 设置视口
   */
  setViewport(viewport: IRect): void {
    this.viewport = { ...viewport }
  }

  /**
   * 渲染所有层
   */
  render(): void {
    if (!this.renderer || !this.context) {
      return
    }

    const startTime = performance.now()

    // 重置统计
    this.stats.objectsRendered = 0
    this.stats.layersRendered = 0

    // 清除画布
    this.renderer.clear()

    // 按 zIndex 排序层
    const sortedLayers = Array.from(this.layers.values())
      .filter((layer) => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex)

    // 渲染每一层
    for (const layer of sortedLayers) {
      this.renderLayer(layer)
      this.stats.layersRendered++
    }

    this.stats.renderTime = performance.now() - startTime
  }

  /**
   * 渲染单个层
   */
  private renderLayer(layer: IRenderLayer): void {
    if (!this.renderer || !this.context) {
      return
    }

    const objects = layer.getObjects()

    for (const object of objects) {
      // 视锥剔除
      if (this.isObjectInViewport(object)) {
        object.render(this.renderer, this.context)
        this.stats.objectsRendered++
      }
    }
  }

  /**
   * 检查对象是否在视口内
   */
  private isObjectInViewport(object: IRenderObject): boolean {
    const bounds = object.getBounds()

    return !(
      bounds.x + bounds.width < this.viewport.x ||
      bounds.x > this.viewport.x + this.viewport.width ||
      bounds.y + bounds.height < this.viewport.y ||
      bounds.y > this.viewport.y + this.viewport.height
    )
  }

  /**
   * 更新视口
   */
  private updateViewport(): void {
    if (this.context) {
      this.viewport = { ...this.context.viewport }
    }
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 点击测试
   */
  hitTest(point: { x: number; y: number }): IRenderObject | null {
    // 从最上层开始测试
    const sortedLayers = Array.from(this.layers.values())
      .filter((layer) => layer.visible)
      .sort((a, b) => b.zIndex - a.zIndex)

    for (const layer of sortedLayers) {
      const objects = layer
        .getObjects()
        .filter((obj) => obj.visible)
        .sort((a, b) => b.zIndex - a.zIndex)

      for (const object of objects) {
        if (object.hitTest(point)) {
          return object
        }
      }
    }

    return null
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number): void {
    this.viewport.width = width
    this.viewport.height = height
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.layers.clear()
    this.renderer = null
    this.context = null
  }
}
