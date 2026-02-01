/**
 * 渲染器抽象基类
 * 提供 IRenderer 接口的默认实现和通用功能
 */

import {
  BaseRenderer as CoreBaseRenderer,
  type RenderContext,
  type RendererCapabilities,
} from '../core'
import type { IColor, IGraphicsStyle, IPoint } from '../graphics/IGraphicsContext'
import type {
  IDrawCircleOptions,
  IDrawImageOptions,
  IDrawLineOptions,
  IDrawRectOptions,
  IDrawTextOptions,
  IImageSource,
  IRenderer,
} from './IRenderer'

export abstract class RendererBase extends CoreBaseRenderer implements IRenderer {
  protected fillColor: IColor | string = '#000000'
  protected strokeColor: IColor | string = '#000000'
  protected currentLineWidth: number = 1
  protected currentAlpha: number = 1
  protected stateStackRenderer: Array<{
    fillColor: IColor | string
    strokeColor: IColor | string
    lineWidth: number
    alpha: number
  }> = []

  abstract render(context: RenderContext): void
  abstract clear(color?: IColor | string): void
  abstract getCapabilities(): RendererCapabilities

  abstract drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: IDrawRectOptions
  ): void
  abstract drawCircle(center: IPoint, radius: number, options?: IDrawCircleOptions): void
  abstract drawLine(start: IPoint, end: IPoint, options?: IDrawLineOptions): void
  abstract drawText(text: string, position: IPoint, options?: IDrawTextOptions): void
  abstract drawImage(
    image: IImageSource,
    position: IPoint,
    size?: { width: number; height: number },
    options?: IDrawImageOptions
  ): void

  drawPath(points: IPoint[], closed: boolean = false, options?: IDrawLineOptions): void {
    if (points.length < 2) return

    for (let i = 0; i < points.length - 1; i++) {
      this.drawLine(points[i], points[i + 1], options)
    }

    if (closed && points.length > 2) {
      this.drawLine(points[points.length - 1], points[0], options)
    }
  }

  drawPolygon(points: IPoint[], options?: IDrawRectOptions): void {
    if (points.length < 3) return
    this.drawPath(points, true, { style: options?.style })
  }

  drawEllipse(
    center: IPoint,
    radiusX: number,
    radiusY: number,
    options?: IDrawCircleOptions
  ): void {
    const segments = Math.max(32, Math.ceil(Math.max(radiusX, radiusY) * 0.5))
    const points: IPoint[] = []

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push({
        x: center.x + Math.cos(angle) * radiusX,
        y: center.y + Math.sin(angle) * radiusY,
      })
    }

    if (options?.filled) {
      this.drawPolygon(points, { filled: true, style: options.style })
    } else {
      this.drawPath(points, true, { style: options?.style })
    }
  }

  drawArc(
    center: IPoint,
    radius: number,
    startAngle: number,
    endAngle: number,
    options?: IDrawLineOptions
  ): void {
    const segments = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) * radius * 0.5))
    const points: IPoint[] = []
    const angleStep = (endAngle - startAngle) / segments

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    }

    this.drawPath(points, false, options)
  }

  setFillStyle(style: IColor | string): void {
    this.fillColor = style
    if (typeof style === 'string') {
      this.renderState.fillStyle = style
    } else {
      this.renderState.fillStyle = this.colorToString(style)
    }
  }

  setStrokeStyle(style: IColor | string): void {
    this.strokeColor = style
    if (typeof style === 'string') {
      this.renderState.strokeStyle = style
    } else {
      this.renderState.strokeStyle = this.colorToString(style)
    }
  }

  setLineWidth(width: number): void {
    this.currentLineWidth = width
    this.renderState.lineWidth = width
  }

  setGlobalAlpha(alpha: number): void {
    this.currentAlpha = Math.max(0, Math.min(1, alpha))
    this.renderState.globalAlpha = this.currentAlpha
  }

  save(): void {
    this.stateStackRenderer.push({
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      lineWidth: this.currentLineWidth,
      alpha: this.currentAlpha,
    })
    this.pushState()
  }

  restore(): void {
    const state = this.stateStackRenderer.pop()
    if (state) {
      this.fillColor = state.fillColor
      this.strokeColor = state.strokeColor
      this.currentLineWidth = state.lineWidth
      this.currentAlpha = state.alpha
    }
    this.popState()
  }

  protected colorToString(color: IColor): string {
    const a = color.a !== undefined ? color.a : 1
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${a})`
  }

  protected parseColor(color: IColor | string): [number, number, number, number] {
    if (typeof color === 'string') {
      return this.parseColorString(color)
    }
    return [color.r, color.g, color.b, color.a ?? 1]
  }

  protected parseColorString(color: string): [number, number, number, number] {
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return [r, g, b, 1]
      } else if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return [r, g, b, 1]
      } else if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return [r, g, b, a]
      }
    }

    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10) / 255
      const g = parseInt(rgbaMatch[2], 10) / 255
      const b = parseInt(rgbaMatch[3], 10) / 255
      const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
      return [r, g, b, a]
    }

    return [0, 0, 0, 1]
  }

  protected applyStyleFromOptions(options?: { style?: Partial<IGraphicsStyle> }): void {
    if (!options?.style) return

    const { fillColor, strokeColor, lineWidth, opacity } = options.style
    if (fillColor) this.setFillStyle(fillColor)
    if (strokeColor) this.setStrokeStyle(strokeColor)
    if (lineWidth !== undefined) this.setLineWidth(lineWidth)
    if (opacity !== undefined) this.setGlobalAlpha(opacity)
  }

  dispose(): void {
    this.stateStackRenderer = []
    super.dispose()
  }
}

export type {
  IDrawCircleOptions,
  IDrawImageOptions,
  IDrawLineOptions,
  IDrawRectOptions,
  IDrawTextOptions,
  IImageSource,
  IRenderer,
}
