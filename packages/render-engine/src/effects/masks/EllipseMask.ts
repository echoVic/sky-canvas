/**
 * 椭圆遮罩
 */

import type { Point2D } from '../../animation/types/PathTypes'
import { type EllipseMaskConfig, type IMask, MaskType } from '../types/MaskTypes'
import { BaseMask } from './BaseMask'

// Shape interface definition for render-engine
interface IShape {
  id: string
  visible: boolean
  zIndex: number
  bounds: {
    x: number
    y: number
    width: number
    height: number
    left: number
    right: number
    top: number
    bottom: number
    center: { x: number; y: number }
  }
}

export class EllipseMask extends BaseMask {
  protected _config: EllipseMaskConfig

  constructor(config: EllipseMaskConfig) {
    super(config)
    this._config = config
  }

  apply(
    ctx: CanvasRenderingContext2D | WebGLRenderingContext,
    _target: IShape | HTMLCanvasElement
  ): void {
    if (!this._enabled || !(ctx instanceof CanvasRenderingContext2D)) {
      return
    }

    ctx.save()

    this.applyTransform(ctx)
    this.setBlendMode(ctx)
    this.applyOpacity(ctx)

    if (this._config.rotation) {
      ctx.rotate(this._config.rotation)
    }

    switch (this._config.type) {
      case MaskType.CLIP:
        this.applyClipMask(ctx)
        break
      case MaskType.ALPHA:
        this.applyAlphaMask(ctx)
        break
      case MaskType.STENCIL:
        this.applyStencilMask(ctx)
        break
      case MaskType.INVERTED:
        this.applyInvertedMask(ctx)
        break
    }

    ctx.restore()
  }

  protected createPath(ctx: CanvasRenderingContext2D): void {
    const { radiusX, radiusY } = this._config

    ctx.beginPath()
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.closePath()
  }

  private applyClipMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx)
    if (this._config.inverted) {
      const canvas = ctx.canvas
      ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2)
      ctx.clip('evenodd')
    } else {
      ctx.clip()
    }
  }

  private applyAlphaMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx)

    // 椭圆渐变遮罩
    if (this._config.featherRadius && this._config.featherRadius > 0) {
      const { radiusX, radiusY } = this._config
      const maxRadius = Math.max(radiusX, radiusY)

      // 使用径向渐变近似椭圆羽化
      const gradient = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        maxRadius + this._config.featherRadius
      )

      gradient.addColorStop(0, `rgba(255, 255, 255, ${this._config.opacity})`)
      gradient.addColorStop(
        maxRadius / (maxRadius + this._config.featherRadius),
        `rgba(255, 255, 255, ${this._config.opacity})`
      )
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${this._config.opacity})`
    }

    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'destination-in'
    }

    ctx.fill()
  }

  private applyStencilMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx)
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    ctx.fill()

    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'source-out'
    } else {
      ctx.globalCompositeOperation = 'source-in'
    }
  }

  private applyInvertedMask(ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas

    ctx.beginPath()
    ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2)
    this.createPath(ctx)
    ctx.clip('evenodd')
  }

  contains(point: Point2D): boolean {
    const result = this.isPointInEllipse(
      point,
      this._config.position,
      this._config.radiusX,
      this._config.radiusY,
      this._config.rotation
    )
    return this._config.inverted ? !result : result
  }

  getBounds(): { min: Point2D; max: Point2D } {
    const { position, radiusX, radiusY, rotation = 0 } = this._config

    if (rotation === 0) {
      return {
        min: {
          x: position.x - radiusX,
          y: position.y - radiusY,
        },
        max: {
          x: position.x + radiusX,
          y: position.y + radiusY,
        },
      }
    }

    // 计算旋转椭圆的边界框
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const a = radiusX * cos
    const b = radiusX * sin
    const c = radiusY * -sin
    const d = radiusY * cos

    const width = Math.sqrt(a * a + c * c)
    const height = Math.sqrt(b * b + d * d)

    return {
      min: {
        x: position.x - width,
        y: position.y - height,
      },
      max: {
        x: position.x + width,
        y: position.y + height,
      },
    }
  }

  clone(): IMask {
    return new EllipseMask({ ...this._config })
  }
}
