/**
 * WebGPU 上下文渲染方法扩展
 * 将渲染相关方法从主上下文中分离出来
 */

import type {
  IColor,
  IGraphicsCapabilities,
  IImageData,
  IPoint,
  ITextStyle,
} from '../../graphics/IGraphicsContext'
import type { Rectangle } from '../../math/Rectangle'
import { WebGPUContext } from './WebGPUContextImpl'
import type { Color } from './WebGPUGeometry'

/**
 * 将 IColor 或 string 转换为 Color
 */
function toColor(color: IColor | string, opacity: number = 1): Color {
  if (typeof color === 'string') {
    // 简单的颜色字符串解析
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return { r, g, b, a: a * opacity }
    }
    return { r: 0, g: 0, b: 0, a: opacity }
  }
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: (color.a ?? 1) * opacity,
  }
}

// 扩展 WebGPUContext 类添加渲染方法
declare module './WebGPUContextImpl' {
  interface WebGPUContext {
    beginFrame(): void
    endFrame(): void
    clear(): void
    clearRect(x: number, y: number, width: number, height: number): void
    present(): void
    beginPath(): void
    closePath(): void
    moveTo(x: number, y: number): void
    lineTo(x: number, y: number): void
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
    bezierCurveTo(
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number
    ): void
    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean
    ): void
    rect(x: number, y: number, width: number, height: number): void
    fill(): void
    stroke(): void
    fillRect(x: number, y: number, width: number, height: number): void
    strokeRect(x: number, y: number, width: number, height: number): void
    fillCircle(x: number, y: number, radius: number): void
    strokeCircle(x: number, y: number, radius: number): void
    fillText(text: string, x: number, y: number, style?: ITextStyle): void
    strokeText(text: string, x: number, y: number, style?: ITextStyle): void
    measureText(text: string, style?: ITextStyle): { width: number; height: number }
    drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void
    getImageData(x: number, y: number, width: number, height: number): IImageData
    putImageData(imageData: IImageData, x: number, y: number): void
    clip(): void
    clipRect(x: number, y: number, width: number, height: number): void
    screenToWorld(point: IPoint): IPoint
    worldToScreen(point: IPoint): IPoint
    setLineDash(segments: number[]): void
    setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void
    setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void
    setFont(font: string): void
    drawLine(x1: number, y1: number, x2: number, y2: number): void
    drawRect(
      rect: IPoint & { width: number; height: number },
      fill?: boolean,
      stroke?: boolean
    ): void
    drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void
    resize(width: number, height: number): void
    setViewport(x: number, y: number, width: number, height: number): void
    getViewport(): Rectangle
    setScissorTest(enabled: boolean, rect?: Rectangle): void
    setBlendMode(mode: string): void
    setDepthTest(enabled: boolean): void
    setCullFace(enabled: boolean): void
    getCapabilities(): IGraphicsCapabilities
    getStats(): {
      drawCalls: number
      triangles: number
      vertices: number
      textureMemory: number
      bufferMemory: number
    }
  }
}

// 实现渲染方法
Object.assign(WebGPUContext.prototype, {
  beginFrame(this: WebGPUContext): void {
    ;(this as unknown as { renderer: { beginFrame: () => void } }).renderer?.beginFrame()
    ;(
      this as unknown as { renderer: { updateTransform: (t: unknown) => void } }
    ).renderer?.updateTransform(this.getState().transform)
  },

  endFrame(this: WebGPUContext): void {
    ;(this as unknown as { renderer: { endFrame: () => void } }).renderer?.endFrame()
  },

  clear(this: WebGPUContext): void {
    this.beginFrame()
    this.endFrame()
  },

  clearRect(this: WebGPUContext, _x: number, _y: number, _width: number, _height: number): void {
    this.clear()
  },

  present(this: WebGPUContext): void {
    this.endFrame()
  },

  fillRect(this: WebGPUContext, x: number, y: number, width: number, height: number): void {
    const state = this.getState()
    const color = toColor(state.style.fillColor as IColor, state.style.opacity)
    ;(
      this as unknown as {
        renderer: { fillRect: (x: number, y: number, w: number, h: number, c: Color) => void }
      }
    ).renderer?.fillRect(x, y, width, height, color)
  },

  strokeRect(this: WebGPUContext, x: number, y: number, width: number, height: number): void {
    const state = this.getState()
    const color = toColor(state.style.strokeColor as IColor, state.style.opacity ?? 1)
    const lineWidth = state.style.lineWidth ?? 1
    ;(
      this as unknown as {
        renderer: {
          strokeRect: (x: number, y: number, w: number, h: number, lw: number, c: Color) => void
        }
      }
    ).renderer?.strokeRect(x, y, width, height, lineWidth, color)
  },

  fillCircle(this: WebGPUContext, x: number, y: number, radius: number): void {
    const state = this.getState()
    const color = toColor(state.style.fillColor as IColor, state.style.opacity)
    ;(
      this as unknown as {
        renderer: { fillCircle: (x: number, y: number, r: number, c: Color) => void }
      }
    ).renderer?.fillCircle(x, y, radius, color)
  },

  strokeCircle(this: WebGPUContext, _x: number, _y: number, _radius: number): void {
    console.warn('WebGPU strokeCircle not yet implemented')
  },

  drawLine(this: WebGPUContext, x1: number, y1: number, x2: number, y2: number): void {
    const state = this.getState()
    const color = toColor(state.style.strokeColor as IColor, state.style.opacity ?? 1)
    const lineWidth = state.style.lineWidth ?? 1
    ;(
      this as unknown as {
        renderer: {
          drawLine: (x1: number, y1: number, x2: number, y2: number, lw: number, c: Color) => void
        }
      }
    ).renderer?.drawLine(x1, y1, x2, y2, lineWidth, color)
  },

  // 路径方法 - 暂未实现
  beginPath(): void {
    /* TODO */
  },
  closePath(): void {
    /* TODO */
  },
  moveTo(_x: number, _y: number): void {
    /* TODO */
  },
  lineTo(_x: number, _y: number): void {
    /* TODO */
  },
  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {
    /* TODO */
  },
  bezierCurveTo(
    _cp1x: number,
    _cp1y: number,
    _cp2x: number,
    _cp2y: number,
    _x: number,
    _y: number
  ): void {
    /* TODO */
  },
  arc(
    _x: number,
    _y: number,
    _radius: number,
    _startAngle: number,
    _endAngle: number,
    _counterclockwise?: boolean
  ): void {
    /* TODO */
  },
  rect(_x: number, _y: number, _width: number, _height: number): void {
    /* TODO */
  },
  fill(): void {
    /* TODO */
  },
  stroke(): void {
    /* TODO */
  },

  // 文本方法 - 暂未实现
  fillText(_text: string, _x: number, _y: number, _style?: ITextStyle): void {
    console.warn('WebGPU fillText not yet implemented')
  },
  strokeText(_text: string, _x: number, _y: number, _style?: ITextStyle): void {
    console.warn('WebGPU strokeText not yet implemented')
  },
  measureText(_text: string, _style?: ITextStyle): { width: number; height: number } {
    return { width: 0, height: 0 }
  },

  // 图像方法 - 暂未实现
  drawImage(_imageData: IImageData, _dx: number, _dy: number, _dw?: number, _dh?: number): void {
    console.warn('WebGPU drawImage not yet implemented')
  },
  getImageData(_x: number, _y: number, width: number, height: number): IImageData {
    return { width, height, data: new Uint8ClampedArray(width * height * 4) }
  },
  putImageData(_imageData: IImageData, _x: number, _y: number): void {
    console.warn('WebGPU putImageData not yet implemented')
  },

  // 裁剪方法
  clip(): void {
    /* TODO */
  },
  clipRect(_x: number, _y: number, _width: number, _height: number): void {
    /* TODO */
  },

  // 坐标转换
  screenToWorld(point: IPoint): IPoint {
    return { ...point }
  },
  worldToScreen(point: IPoint): IPoint {
    return { ...point }
  },

  // 其他设置方法
  setLineDash(_segments: number[]): void {
    /* TODO */
  },
  setTextAlign(_align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    /* TODO */
  },
  setTextBaseline(_baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    /* TODO */
  },
  setFont(_font: string): void {
    /* TODO */
  },

  drawRect(
    this: WebGPUContext,
    rect: IPoint & { width: number; height: number },
    fill = true,
    stroke = false
  ): void {
    if (fill) this.fillRect(rect.x, rect.y, rect.width, rect.height)
    if (stroke) this.strokeRect(rect.x, rect.y, rect.width, rect.height)
  },

  drawCircle(
    this: WebGPUContext,
    center: IPoint,
    radius: number,
    fill = true,
    stroke = false
  ): void {
    if (fill) this.fillCircle(center.x, center.y, radius)
    if (stroke) this.strokeCircle(center.x, center.y, radius)
  },

  resize(this: WebGPUContext, width: number, height: number): void {
    ;(this as unknown as { canvas: HTMLCanvasElement }).canvas.width = width
    ;(this as unknown as { canvas: HTMLCanvasElement }).canvas.height = height
    ;(this as unknown as { renderer: { resize: (w: number, h: number) => void } }).renderer?.resize(
      width,
      height
    )
  },

  setViewport(_x: number, _y: number, _width: number, _height: number): void {
    /* TODO */
  },
  getViewport(this: WebGPUContext): Rectangle {
    return (this as unknown as { renderState: { viewport: Rectangle } }).renderState.viewport
  },
  setScissorTest(_enabled: boolean, _rect?: Rectangle): void {
    /* TODO */
  },
  setBlendMode(_mode: string): void {
    /* TODO */
  },
  setDepthTest(_enabled: boolean): void {
    /* TODO */
  },
  setCullFace(_enabled: boolean): void {
    /* TODO */
  },

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 8192,
      supportedFormats: ['rgba8unorm', 'bgra8unorm', 'rgba16float'],
    }
  },

  getStats(this: WebGPUContext): {
    drawCalls: number
    triangles: number
    vertices: number
    textureMemory: number
    bufferMemory: number
  } {
    const stats = (
      this as unknown as {
        renderer: { getStats: () => { drawCalls: number; triangles: number; vertices: number } }
      }
    ).renderer?.getStats() ?? { drawCalls: 0, triangles: 0, vertices: 0 }
    return { ...stats, textureMemory: 0, bufferMemory: 0 }
  },
})

export { toColor }
