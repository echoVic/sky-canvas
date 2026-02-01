/**
 * 场景管理器 - 协调图层、渲染、视口等复杂场景功能
 * 纯业务协调单元，不直接依赖 DI 容器
 */

import type { IRenderable } from '@sky-canvas/render-engine'
import { subscribe } from 'valtio/vanilla'
import { createDecorator } from '../di'
import { ICanvasRenderingService, IConfigurationService, ILogService } from '../services'
import { ICanvasManager } from './CanvasManager'

/**
 * 图层信息
 */
export interface ILayerInfo {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  zIndex: number
  shapes: string[] // 形状ID列表
}

/**
 * 场景管理器状态
 */
export interface ISceneManagerState {
  layers: ILayerInfo[]
  activeLayerId: string | null
  backgroundColor: string
  gridEnabled: boolean
  gridSize: number
  guidesEnabled: boolean
}

/**
 * 场景管理器接口
 */
export interface ISceneManager {
  readonly _serviceBrand: undefined

  // 图层管理
  createLayer(name: string): ILayerInfo
  removeLayer(layerId: string): boolean
  setActiveLayer(layerId: string): boolean
  getActiveLayer(): ILayerInfo | null
  getAllLayers(): ILayerInfo[]
  updateLayer(layerId: string, updates: Partial<ILayerInfo>): boolean

  // 形状到图层的映射
  addShapeToLayer(shapeId: string, layerId?: string): boolean
  removeShapeFromLayer(shapeId: string): boolean
  moveShapeToLayer(shapeId: string, targetLayerId: string): boolean
  getShapeLayer(shapeId: string): ILayerInfo | null

  // 场景设置
  setBackgroundColor(color: string): void
  toggleGrid(): void
  setGridSize(size: number): void
  toggleGuides(): void

  // 渲染控制
  render(): void
  refreshScene(): void

  // 状态查询
  getSceneState(): ISceneManagerState
  clear(): void
  dispose(): void
}

/**
 * 场景管理器服务标识符
 */
export const ISceneManager = createDecorator<ISceneManager>('SceneManager')

/**
 * 场景管理器实现
 */
export class SceneManager implements ISceneManager {
  readonly _serviceBrand: undefined

  private state: ISceneManagerState
  private nextLayerId = 1
  private unsubscribe?: () => void
  private trackedShapeIds = new Set<string>()

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @ICanvasRenderingService private renderingService: ICanvasRenderingService,
    @ILogService private logService: ILogService,
    @IConfigurationService private configService: IConfigurationService
  ) {
    this.state = {
      layers: [],
      activeLayerId: null,
      backgroundColor: this.configService.get('scene.backgroundColor') || '#ffffff',
      gridEnabled: this.configService.get('scene.gridEnabled') || false,
      gridSize: this.configService.get('scene.gridSize') || 20,
      guidesEnabled: this.configService.get('scene.guidesEnabled') || false,
    }

    this.createDefaultLayer()
    this.setupCanvasManagerSubscription()
    this.syncShapesWithLayers()
    this.logService.info('SceneManager initialized')
  }

  private setupCanvasManagerSubscription(): void {
    this.unsubscribe = subscribe(this.canvasManager.state, () => {
      this.syncShapesWithLayers()
    })
  }

  private syncShapesWithLayers(): void {
    const renderables = this.canvasManager.getRenderables()
    const currentShapeIds = new Set<string>()
    const renderableMap = new Map<string, IRenderable>()

    renderables.forEach((renderable) => {
      const shapeId = renderable.id
      if (shapeId) {
        currentShapeIds.add(shapeId)
        renderableMap.set(shapeId, renderable)

        if (!this.trackedShapeIds.has(shapeId)) {
          this.addShapeToLayer(shapeId)
          this.renderingService.addRenderable(renderable)
          this.trackedShapeIds.add(shapeId)
          this.logService.debug(`Shape ${shapeId} added to layer and rendering`)
        }
      }
    })

    const removedShapeIds = Array.from(this.trackedShapeIds).filter(
      (id) => !currentShapeIds.has(id)
    )
    removedShapeIds.forEach((shapeId) => {
      this.removeShapeFromLayer(shapeId)
      this.renderingService.removeRenderable(shapeId)
      this.trackedShapeIds.delete(shapeId)
      this.logService.debug(`Shape ${shapeId} removed from layer and rendering`)
    })
  }

  // === 图层管理 ===

  createLayer(name: string): ILayerInfo {
    const layer: ILayerInfo = {
      id: `layer_${this.nextLayerId++}`,
      name: name || `图层 ${this.nextLayerId - 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: this.state.layers.length,
      shapes: [],
    }

    this.state.layers.push(layer)

    if (!this.state.activeLayerId) {
      this.state.activeLayerId = layer.id
    }

    this.logService.debug(`Layer created: ${layer.name} (${layer.id})`)

    return layer
  }

  removeLayer(layerId: string): boolean {
    if (this.state.layers.length <= 1) {
      this.logService.warn('Cannot remove last layer')
      return false
    }

    const layerIndex = this.state.layers.findIndex((l) => l.id === layerId)
    if (layerIndex === -1) return false

    const layer = this.state.layers[layerIndex]

    if (layer.shapes.length > 0) {
      const targetLayer = this.state.layers.find((l) => l.id !== layerId)
      if (targetLayer) {
        targetLayer.shapes.push(...layer.shapes)
      }
    }

    this.state.layers.splice(layerIndex, 1)

    if (this.state.activeLayerId === layerId) {
      this.state.activeLayerId = this.state.layers.length > 0 ? this.state.layers[0].id : null
    }

    this.logService.debug(`Layer removed: ${layer.name} (${layerId})`)

    return true
  }

  setActiveLayer(layerId: string): boolean {
    const layer = this.state.layers.find((l) => l.id === layerId)
    if (!layer) return false

    this.state.activeLayerId = layerId

    this.logService.debug(`Active layer changed to: ${layer.name} (${layerId})`)

    return true
  }

  getActiveLayer(): ILayerInfo | null {
    if (!this.state.activeLayerId) return null
    return this.state.layers.find((l) => l.id === this.state.activeLayerId) || null
  }

  getAllLayers(): ILayerInfo[] {
    return [...this.state.layers].sort((a, b) => b.zIndex - a.zIndex)
  }

  updateLayer(layerId: string, updates: Partial<ILayerInfo>): boolean {
    const layer = this.state.layers.find((l) => l.id === layerId)
    if (!layer) return false

    Object.assign(layer, updates)

    this.logService.debug(`Layer updated: ${layer.name} (${layerId})`)

    return true
  }

  // === 形状到图层的映射 ===

  addShapeToLayer(shapeId: string, layerId?: string): boolean {
    const targetLayerId = layerId || this.state.activeLayerId
    if (!targetLayerId) return false

    const layer = this.state.layers.find((l) => l.id === targetLayerId)
    if (!layer) return false

    this.removeShapeFromLayer(shapeId)

    if (!layer.shapes.includes(shapeId)) {
      layer.shapes.push(shapeId)
      this.logService.debug(`Shape ${shapeId} added to layer ${layer.name}`)
    }

    return true
  }

  removeShapeFromLayer(shapeId: string): boolean {
    let removed = false
    for (const layer of this.state.layers) {
      const index = layer.shapes.indexOf(shapeId)
      if (index !== -1) {
        layer.shapes.splice(index, 1)
        removed = true
        this.logService.debug(`Shape ${shapeId} removed from layer ${layer.name}`)
      }
    }
    return removed
  }

  moveShapeToLayer(shapeId: string, targetLayerId: string): boolean {
    const targetLayer = this.state.layers.find((l) => l.id === targetLayerId)
    if (!targetLayer) return false

    this.removeShapeFromLayer(shapeId)
    targetLayer.shapes.push(shapeId)

    this.logService.debug(`Shape ${shapeId} moved to layer ${targetLayer.name}`)

    return true
  }

  getShapeLayer(shapeId: string): ILayerInfo | null {
    for (const layer of this.state.layers) {
      if (layer.shapes.includes(shapeId)) {
        return layer
      }
    }
    return null
  }

  // === 场景设置 ===

  setBackgroundColor(color: string): void {
    this.state.backgroundColor = color
    this.configService.set('scene.backgroundColor', color)
  }

  toggleGrid(): void {
    this.state.gridEnabled = !this.state.gridEnabled
    this.configService.set('scene.gridEnabled', this.state.gridEnabled)
  }

  setGridSize(size: number): void {
    this.state.gridSize = Math.max(1, size)
    this.configService.set('scene.gridSize', this.state.gridSize)
  }

  toggleGuides(): void {
    this.state.guidesEnabled = !this.state.guidesEnabled
    this.configService.set('scene.guidesEnabled', this.state.guidesEnabled)
  }

  // === 渲染控制 ===

  render(): void {
    const renderables = this.getRenderablesInLayerOrder()
    renderables.forEach((renderable) => {
      this.renderingService.addRenderable(renderable)
    })
  }

  refreshScene(): void {
    this.render()
  }

  // === 私有方法 ===

  private createDefaultLayer(): void {
    const defaultLayer = this.createLayer('默认图层')
    this.state.activeLayerId = defaultLayer.id
  }

  private getRenderablesInLayerOrder(): IRenderable[] {
    const allRenderables = this.canvasManager.getRenderables()
    const renderableMap = new Map<string, IRenderable>()

    allRenderables.forEach((renderable) => {
      renderableMap.set(renderable.id, renderable)
    })

    const orderedRenderables: IRenderable[] = []
    const sortedLayers = this.getAllLayers()

    for (const layer of sortedLayers) {
      if (!layer.visible) continue

      for (const shapeId of layer.shapes) {
        const renderable = renderableMap.get(shapeId)
        if (renderable) {
          orderedRenderables.push(renderable)
        }
      }
    }

    return orderedRenderables
  }

  // === 状态查询 ===

  getSceneState(): ISceneManagerState {
    return { ...this.state }
  }

  clear(): void {
    this.state.layers = []
    this.nextLayerId = 1
    this.createDefaultLayer()

    this.logService.info('Scene cleared')
  }

  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = undefined
    }
    this.trackedShapeIds.clear()
    this.logService.info('SceneManager disposed')
  }
}
