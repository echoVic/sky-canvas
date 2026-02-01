import type { ICanvas2DContext } from '../adapters/Canvas2DContext'
import type { Drawable, RenderContext, RendererCapabilities, RenderState } from '../core'
import type { IColor, IPoint, IRect } from '../graphics/IGraphicsContext'
import type { Transform } from '../math'
import {
  type IDrawCircleOptions,
  type IDrawImageOptions,
  type IDrawLineOptions,
  type IDrawRectOptions,
  type IDrawTextOptions,
  type IImageSource,
  RendererBase,
} from './BaseRenderer'

export class CanvasRenderer extends RendererBase {
  private animationId: number | null = null
  private lastTime = 0
  private currentContext: RenderContext | null = null
  private canvasAdapter: ICanvas2DContext

  constructor(adapter: ICanvas2DContext) {
    super()
    this.canvasAdapter = adapter
  }

  render(context: RenderContext): void {
    this.currentContext = context
    const { viewport, devicePixelRatio } = context

    this.clear()

    this.canvasAdapter.save()
    this.canvasAdapter.scale(devicePixelRatio, devicePixelRatio)
    this.canvasAdapter.translate(-viewport.x, -viewport.y)

    this.applyRenderStateToAdapter(this.renderState)

    for (const drawable of this.drawables) {
      if (drawable.visible && this.isDrawableInViewport(drawable, viewport)) {
        this.canvasAdapter.save()
        this.applyTransformToAdapter(drawable.transform)
        drawable.draw(context)
        this.canvasAdapter.restore()
      }
    }

    this.canvasAdapter.restore()
  }

  clear(color?: IColor | string): void {
    if (color) {
      const colorStr = typeof color === 'string' ? color : this.colorToString(color)
      this.canvasAdapter.setFillStyle(colorStr)
    }
    this.canvasAdapter.clear()
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    }
  }

  getContext(): RenderContext | null {
    return this.currentContext
  }

  // 渲染循环管理
  startRenderLoop(context: RenderContext): void {
    const renderFrame = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime
      this.lastTime = currentTime

      this.update(deltaTime)
      this.render(context)

      this.animationId = requestAnimationFrame(renderFrame)
    }

    this.animationId = requestAnimationFrame(renderFrame)
  }

  stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  drawLine(start: IPoint, end: IPoint, options?: IDrawLineOptions): void {
    this.canvasAdapter.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
      this.applyRenderStateToAdapter(this.renderState)
    }

    this.canvasAdapter.beginPath()
    this.canvasAdapter.moveTo(start.x, start.y)
    this.canvasAdapter.lineTo(end.x, end.y)
    this.canvasAdapter.stroke()

    this.canvasAdapter.restore()
  }

  drawRect(x: number, y: number, width: number, height: number, options?: IDrawRectOptions): void {
    this.canvasAdapter.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
      this.applyRenderStateToAdapter(this.renderState)
    }

    if (options?.filled) {
      this.canvasAdapter.fillRect(x, y, width, height)
    } else {
      this.canvasAdapter.strokeRect(x, y, width, height)
    }

    this.canvasAdapter.restore()
  }

  drawCircle(center: IPoint, radius: number, options?: IDrawCircleOptions): void {
    this.canvasAdapter.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
      this.applyRenderStateToAdapter(this.renderState)
    }

    this.canvasAdapter.beginPath()
    this.canvasAdapter.arc(center.x, center.y, radius, 0, Math.PI * 2)

    if (options?.filled) {
      this.canvasAdapter.fill()
    } else {
      this.canvasAdapter.stroke()
    }

    this.canvasAdapter.restore()
  }

  drawText(text: string, position: IPoint, options?: IDrawTextOptions): void {
    this.canvasAdapter.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
      this.applyRenderStateToAdapter(this.renderState)

      const style = options.style
      if (style.fontFamily && style.fontSize) {
        const fontWeight = style.fontWeight || 'normal'
        const fontStyle = style.fontStyle || 'normal'
        this.canvasAdapter.setFont(
          `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`
        )
      }
      if (style.textAlign) {
        this.canvasAdapter.setTextAlign(style.textAlign)
      }
      if (style.textBaseline) {
        this.canvasAdapter.setTextBaseline(style.textBaseline)
      }
    }

    this.canvasAdapter.fillText(text, position.x, position.y)

    this.canvasAdapter.restore()
  }

  drawImage(
    image: IImageSource,
    position: IPoint,
    size?: { width: number; height: number },
    options?: IDrawImageOptions
  ): void {
    this.canvasAdapter.save()

    if (options?.opacity !== undefined) {
      this.canvasAdapter.setGlobalAlpha(options.opacity)
    }

    const targetWidth = size?.width ?? image.width
    const targetHeight = size?.height ?? image.height

    if (image.data) {
      if (image.data instanceof ImageData) {
        this.canvasAdapter.putImageData(image.data, position.x, position.y)
      } else if (image.data instanceof Uint8ClampedArray) {
        const imageData = new ImageData(image.width, image.height)
        imageData.data.set(image.data)
        this.canvasAdapter.putImageData(imageData, position.x, position.y)
      }
    }

    this.canvasAdapter.restore()
  }

  // 工具方法
  private applyRenderStateToAdapter(state: RenderState): void {
    // 转换Canvas原生类型到适配器统一类型
    const fillStyle = typeof state.fillStyle === 'string' ? state.fillStyle : '#000000'
    const strokeStyle = typeof state.strokeStyle === 'string' ? state.strokeStyle : '#000000'

    this.canvasAdapter.setFillStyle(fillStyle)
    this.canvasAdapter.setStrokeStyle(strokeStyle)
    this.canvasAdapter.setLineWidth(state.lineWidth)
    this.canvasAdapter.setGlobalAlpha(state.globalAlpha)
    // 其他状态可以根据需要添加
  }

  private applyTransformToAdapter(transform: Transform): void {
    if (transform) {
      const matrix = transform.matrix
      const e = matrix.elements
      // Canvas2D变换矩阵格式: [a, b, c, d, e, f]
      // 对应Matrix3x3的: [m00, m10, m01, m11, m02, m12]
      this.canvasAdapter.transform(e[0], e[1], e[3], e[4], e[6], e[7])
    }
  }

  private isDrawableInViewport(drawable: Drawable, viewport: IRect): boolean {
    const bounds = drawable.getBounds()
    return this.boundsIntersect(bounds, viewport)
  }

  dispose(): void {
    this.stopRenderLoop()
    this.currentContext = null
    super.dispose()
  }
}
