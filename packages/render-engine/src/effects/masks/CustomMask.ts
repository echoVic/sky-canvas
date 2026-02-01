/**
 * 自定义遮罩
 */

import type { Point2D } from '../../animation/types/PathTypes'
import { type CustomMaskConfig, type IMask, MaskType } from '../types/MaskTypes'
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

export class CustomMask extends BaseMask {
  protected _config: CustomMaskConfig
  private customBounds: { min: Point2D; max: Point2D } | null = null

  constructor(config: CustomMaskConfig) {
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
    // 自定义遮罩通过drawFunction创建路径
    if (this._config.drawFunction) {
      this._config.drawFunction(ctx)
    }
  }

  private applyClipMask(ctx: CanvasRenderingContext2D): void {
    if (this._config.inverted) {
      const canvas = ctx.canvas
      ctx.beginPath()
      ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2)

      // 执行自定义绘制，然后使用evenodd规则剪切
      if (this._config.drawFunction) {
        this._config.drawFunction(ctx)
      }
      ctx.clip('evenodd')
    } else {
      ctx.beginPath()
      if (this._config.drawFunction) {
        this._config.drawFunction(ctx)
      }
      ctx.clip()
    }
  }

  private applyAlphaMask(ctx: CanvasRenderingContext2D): void {
    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'destination-in'
    }

    if (this._config.drawFunction) {
      this._config.drawFunction(ctx)
    }
  }

  private applyStencilMask(ctx: CanvasRenderingContext2D): void {
    if (this._config.drawFunction) {
      this._config.drawFunction(ctx)
    }

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

    if (this._config.drawFunction) {
      this._config.drawFunction(ctx)
    }

    ctx.clip('evenodd')
  }

  contains(point: Point2D): boolean {
    // 自定义遮罩的点击检测需要特殊处理
    // 这里提供一个基础实现，可以被子类重写

    // 创建临时canvas进行点击测试
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) {
      throw new Error('Cannot create 2D context for custom mask')
    }

    // 设置canvas大小
    tempCanvas.width = 1
    tempCanvas.height = 1

    tempCtx.save()
    tempCtx.translate(-point.x + 0.5, -point.y + 0.5)
    tempCtx.translate(this._config.position.x, this._config.position.y)

    // 执行自定义绘制
    if (this._config.drawFunction) {
      tempCtx.fillStyle = 'rgba(255, 255, 255, 1)'
      this._config.drawFunction(tempCtx)
    }

    tempCtx.restore()

    // 检查像素透明度
    const imageData = tempCtx.getImageData(0, 0, 1, 1)
    const alpha = imageData.data[3]
    const result = alpha > 0

    return this._config.inverted ? !result : result
  }

  getBounds(): { min: Point2D; max: Point2D } {
    // 自定义遮罩无法自动计算边界，返回保守估计
    const position = this._config.position
    const estimate = 100

    return {
      min: { x: position.x - estimate, y: position.y - estimate },
      max: { x: position.x + estimate, y: position.y + estimate },
    }
  }

  clone(): IMask {
    return new CustomMask({ ...this._config })
  }

  /**
   * 更新绘制函数
   */
  updateDrawFunction(
    drawFunction: (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => void
  ): void {
    this._config.drawFunction = drawFunction
  }

  /**
   * 获取绘制函数
   */
  getDrawFunction(): (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => void {
    return this._config.drawFunction
  }

  /**
   * 设置边界（用于优化contains检测）
   */
  setBounds(bounds: { min: Point2D; max: Point2D }): void {
    this.customBounds = bounds
  }

  /**
   * 获取自定义边界
   */
  getCustomBounds(): { min: Point2D; max: Point2D } | null {
    return this.customBounds
  }
}
