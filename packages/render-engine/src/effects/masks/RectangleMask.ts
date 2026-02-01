/**
 * 矩形遮罩
 */

import type { Point2D } from '../../animation/types/PathTypes'
import { type IMask, MaskShape, MaskType, type RectangleMaskConfig } from '../types/MaskTypes'
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

export class RectangleMask extends BaseMask {
  protected _config: RectangleMaskConfig

  constructor(config: RectangleMaskConfig) {
    super(config)
    this._config = config
  }

  apply(
    ctx: CanvasRenderingContext2D | WebGLRenderingContext,
    target: IShape | HTMLCanvasElement
  ): void {
    if (!this._enabled || !(ctx instanceof CanvasRenderingContext2D)) {
      return
    }

    ctx.save()

    this.applyTransform(ctx)
    this.setBlendMode(ctx)
    this.applyOpacity(ctx)

    // 根据遮罩类型应用不同的操作
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
    const { width, height, rotation = 0, borderRadius = 0 } = this._config
    const x = -width / 2
    const y = -height / 2

    ctx.beginPath()

    if (rotation !== 0) {
      ctx.rotate(rotation)
    }

    if (borderRadius > 0) {
      // 绘制圆角矩形
      const r = Math.min(borderRadius, width / 2, height / 2)
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + width - r, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + r)
      ctx.lineTo(x + width, y + height - r)
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
      ctx.lineTo(x + r, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
    } else {
      // 绘制普通矩形
      ctx.rect(x, y, width, height)
    }

    ctx.closePath()
  }

  private applyClipMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx)
    if (this._config.inverted) {
      // 反转剪切：先剪切整个画布，再剪切掉矩形区域
      const canvas = ctx.canvas
      ctx.rect(0, 0, canvas.width, canvas.height)
      ctx.clip('evenodd')
    } else {
      ctx.clip()
    }
  }

  private applyAlphaMask(ctx: CanvasRenderingContext2D): void {
    this.createPath(ctx)
    this.applyFeathering(ctx)

    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'destination-in'
    }

    ctx.fill()
  }

  private applyStencilMask(ctx: CanvasRenderingContext2D): void {
    // 模板遮罩：使用模板缓冲区
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
    // 反转遮罩：绘制矩形外的区域
    const canvas = ctx.canvas

    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    this.createPath(ctx)
    ctx.clip('evenodd')
  }

  contains(point: Point2D): boolean {
    const { position, width, height, rotation = 0 } = this._config

    // 转换点到遮罩坐标系
    let localX = point.x - position.x
    let localY = point.y - position.y

    // 应用旋转
    if (rotation !== 0) {
      const cos = Math.cos(-rotation)
      const sin = Math.sin(-rotation)
      const rotatedX = localX * cos - localY * sin
      const rotatedY = localX * sin + localY * cos
      localX = rotatedX
      localY = rotatedY
    }

    const result = this.isPointInRectangle(
      { x: localX, y: localY },
      -width / 2,
      -height / 2,
      width,
      height
    )

    return this._config.inverted ? !result : result
  }

  getBounds(): { min: Point2D; max: Point2D } {
    const { position, width, height, rotation = 0 } = this._config

    if (rotation === 0) {
      return {
        min: {
          x: position.x - width / 2,
          y: position.y - height / 2,
        },
        max: {
          x: position.x + width / 2,
          y: position.y + height / 2,
        },
      }
    }

    // 计算旋转后的边界框
    const corners = [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 },
    ]

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const rotatedCorners = corners.map((corner) => ({
      x: corner.x * cos - corner.y * sin + position.x,
      y: corner.x * sin + corner.y * cos + position.y,
    }))

    return this.getPolygonBounds(rotatedCorners)
  }

  clone(): IMask {
    return new RectangleMask({ ...this._config })
  }
}
