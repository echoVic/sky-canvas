/**
 * 视口 ViewModel 实现 - 中等复杂度
 * 使用 ZoomService + ConfigurationService，不需要 Manager
 */

import { proxy, snapshot } from 'valtio'
import type { ShapeEntity } from '../models/entities/Shape'
import type { IConfigurationService } from '../services/configuration/configurationService'
import type { IZoomService } from '../services/zoom/zoomService'
import type { IViewportState, IViewportViewModel } from './interfaces/IViewModel'
import { getShapeBounds } from './tools/selection'

export class ViewportViewModel implements IViewportViewModel {
  private readonly _state: IViewportState

  constructor(
    private zoomService: IZoomService,
    private configService: IConfigurationService
  ) {
    this._state = proxy<IViewportState>({
      x: this.configService.get<number>('viewport.x') || 0,
      y: this.configService.get<number>('viewport.y') || 0,
      width: this.configService.get<number>('viewport.width') || 800,
      height: this.configService.get<number>('viewport.height') || 600,
      zoom: this.zoomService.getCurrentZoom(),
    })
  }

  /**
   * 保存视口位置到配置
   */
  private saveViewportPosition(): void {
    this.configService.set('viewport.x', this._state.x)
    this.configService.set('viewport.y', this._state.y)
  }

  /**
   * 保存视口尺寸到配置
   */
  private saveViewportSize(): void {
    this.configService.set('viewport.width', this._state.width)
    this.configService.set('viewport.height', this._state.height)
  }

  get state(): IViewportState {
    return this._state
  }

  async initialize(): Promise<void> {}

  dispose(): void {}

  getSnapshot() {
    return snapshot(this._state)
  }

  setViewport(viewport: Partial<IViewportState>): void {
    Object.assign(this._state, viewport)

    if (viewport.x !== undefined || viewport.y !== undefined) {
      this.saveViewportPosition()
    }
    if (viewport.width !== undefined || viewport.height !== undefined) {
      this.saveViewportSize()
    }

    if (viewport.zoom !== undefined) {
      this.zoomService.setZoom(viewport.zoom)
    }
  }

  pan(deltaX: number, deltaY: number): void {
    this._state.x += deltaX
    this._state.y += deltaY

    this.saveViewportPosition()
  }

  zoom(factor: number, centerX?: number, centerY?: number): void {
    const currentZoom = this._state.zoom
    const newZoom = currentZoom * factor

    if (this.zoomService.setZoom(newZoom, centerX, centerY)) {
      this._state.zoom = this.zoomService.getCurrentZoom()

      if (centerX !== undefined && centerY !== undefined) {
        const actualNewZoom = this.zoomService.getCurrentZoom()
        const zoomDelta = actualNewZoom - currentZoom
        const worldCenterX = (centerX - this._state.x) / currentZoom
        const worldCenterY = (centerY - this._state.y) / currentZoom

        this._state.x -= worldCenterX * zoomDelta
        this._state.y -= worldCenterY * zoomDelta

        this.saveViewportPosition()
      }
    }
  }

  fitToContent(shapes: ShapeEntity[]): void {
    if (shapes.length === 0) {
      this.reset()
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const shape of shapes) {
      const bounds = this.getShapeBounds(shape)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    const padding = 0.9
    const scaleX = (this._state.width * padding) / contentWidth
    const scaleY = (this._state.height * padding) / contentHeight
    const scale = Math.min(scaleX, scaleY)

    this._state.zoom = Math.max(0.1, Math.min(10, scale))
    this._state.x =
      (this._state.width - contentWidth * this._state.zoom) / 2 - minX * this._state.zoom
    this._state.y =
      (this._state.height - contentHeight * this._state.zoom) / 2 - minY * this._state.zoom
  }

  reset(): void {
    this._state.x = 0
    this._state.y = 0
    this._state.zoom = 1
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this._state.x) / this._state.zoom,
      y: (y - this._state.y) / this._state.zoom,
    }
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this._state.zoom + this._state.x,
      y: y * this._state.zoom + this._state.y,
    }
  }

  /**
   * 获取形状边界
   */
  private getShapeBounds(shape: ShapeEntity): {
    x: number
    y: number
    width: number
    height: number
  } {
    const { position } = shape.transform

    switch (shape.type) {
      case 'rectangle':
        return {
          x: position.x,
          y: position.y,
          width: (shape as any).size.width,
          height: (shape as any).size.height,
        }
      case 'circle': {
        const radius = (shape as any).radius
        return {
          x: position.x - radius,
          y: position.y - radius,
          width: radius * 2,
          height: radius * 2,
        }
      }
      case 'text': {
        const fontSize = (shape as any).fontSize || 16
        const content = (shape as any).content || ''
        return {
          x: position.x,
          y: position.y,
          width: content.length * fontSize * 0.6,
          height: fontSize,
        }
      }
      default:
        return {
          x: position.x,
          y: position.y,
          width: 100,
          height: 100,
        }
    }
  }
}
