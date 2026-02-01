/**
 * 投影阴影实现
 */

import type { Point2D } from '../../animation/types/PathTypes'
import { type DropShadowConfig, type IShadow, ShadowType } from '../types/LightingTypes'
import { BaseShadow } from './BaseShadow'

export class DropShadow extends BaseShadow {
  protected _config: DropShadowConfig

  constructor(config: DropShadowConfig) {
    super(ShadowType.DROP_SHADOW, config)
    this._config = config
  }

  render(ctx: CanvasRenderingContext2D, target: HTMLCanvasElement | ImageData): void {
    if (!this._enabled) {
      return
    }

    ctx.save()

    try {
      // 设置阴影参数
      this.setShadowStyle(ctx)
      ctx.shadowOffsetX = this._config.offsetX
      ctx.shadowOffsetY = this._config.offsetY

      // 根据目标类型进行不同的处理
      if (target instanceof HTMLCanvasElement) {
        this.renderCanvasShadow(ctx, target)
      } else {
        this.renderImageDataShadow(ctx, target)
      }
    } finally {
      this.clearShadowStyle(ctx)
      ctx.restore()
    }
  }

  /**
   * 渲染Canvas阴影
   */
  private renderCanvasShadow(ctx: CanvasRenderingContext2D, target: HTMLCanvasElement): void {
    // 直接绘制目标画布，阴影会自动生成
    ctx.drawImage(target, 0, 0)
  }

  /**
   * 渲染ImageData阴影
   */
  private renderImageDataShadow(ctx: CanvasRenderingContext2D, target: ImageData): void {
    // 创建临时画布
    const { canvas: tempCanvas, ctx: tempCtx } = this.createTempCanvas(target.width, target.height)

    // 绘制ImageData到临时画布
    tempCtx.putImageData(target, 0, 0)

    // 使用临时画布绘制阴影
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * 创建高质量投影
   */
  renderHighQuality(ctx: CanvasRenderingContext2D, target: HTMLCanvasElement | ImageData): void {
    if (!this._enabled) {
      return
    }

    ctx.save()

    try {
      // 创建阴影层
      const shadowLayer = this.createShadowLayer(target)

      // 应用模糊
      if (this._config.blur > 0) {
        const blurredShadow = this.gaussianBlur(shadowLayer, this._config.blur)

        // 绘制模糊后的阴影
        const { canvas: shadowCanvas, ctx: shadowCtx } = this.createTempCanvas(
          blurredShadow.width,
          blurredShadow.height
        )
        shadowCtx.putImageData(blurredShadow, 0, 0)

        ctx.drawImage(shadowCanvas, this._config.offsetX, this._config.offsetY)
      } else {
        // 直接绘制无模糊阴影
        const { canvas: shadowCanvas, ctx: shadowCtx } = this.createTempCanvas(
          shadowLayer.width,
          shadowLayer.height
        )
        shadowCtx.putImageData(shadowLayer, 0, 0)

        ctx.drawImage(shadowCanvas, this._config.offsetX, this._config.offsetY)
      }

      // 绘制原始对象（在阴影上方）
      if (target instanceof HTMLCanvasElement) {
        ctx.drawImage(target, 0, 0)
      } else {
        ctx.putImageData(target, 0, 0)
      }
    } finally {
      ctx.restore()
    }
  }

  /**
   * 创建阴影层
   */
  private createShadowLayer(target: HTMLCanvasElement | ImageData): ImageData {
    let targetData: ImageData

    if (target instanceof HTMLCanvasElement) {
      const tempCtx = target.getContext('2d')!
      targetData = tempCtx.getImageData(0, 0, target.width, target.height)
    } else {
      targetData = target
    }

    // 创建阴影ImageData
    const shadowData = new ImageData(targetData.width, targetData.height)
    const shadowColor = this.parseColor(this._config.color, this._config.opacity)

    // 将非透明像素转换为阴影颜色
    for (let i = 0; i < targetData.data.length; i += 4) {
      const alpha = targetData.data[i + 3]

      if (alpha > 0) {
        shadowData.data[i] = shadowColor.r
        shadowData.data[i + 1] = shadowColor.g
        shadowData.data[i + 2] = shadowColor.b
        shadowData.data[i + 3] = (alpha / 255) * shadowColor.a
      }
    }

    return shadowData
  }

  /**
   * 设置阴影样式
   */
  protected setShadowStyle(ctx: CanvasRenderingContext2D): void {
    super.setShadowStyle(ctx)
    ctx.shadowOffsetX = this._config.offsetX
    ctx.shadowOffsetY = this._config.offsetY
  }

  clone(): IShadow {
    return new DropShadow({ ...this._config })
  }

  /**
   * 获取偏移量
   */
  getOffset(): Point2D {
    return {
      x: this._config.offsetX,
      y: this._config.offsetY,
    }
  }

  /**
   * 设置偏移量
   */
  setOffset(offsetX: number, offsetY: number): void {
    this._config.offsetX = offsetX
    this._config.offsetY = offsetY
  }

  /**
   * 获取阴影边界
   */
  getShadowBounds(originalBounds: { x: number; y: number; width: number; height: number }): {
    x: number
    y: number
    width: number
    height: number
  } {
    const blur = this._config.blur
    const spread = this._config.spread || 0

    return {
      x: originalBounds.x + this._config.offsetX - blur - spread,
      y: originalBounds.y + this._config.offsetY - blur - spread,
      width: originalBounds.width + 2 * (blur + spread),
      height: originalBounds.height + 2 * (blur + spread),
    }
  }

  /**
   * 预估渲染时间
   */
  estimateRenderTime(width: number, height: number): number {
    const pixelCount = width * height
    const blurComplexity = this._config.blur > 0 ? this._config.blur * 2 : 1
    const qualityMultiplier = this.getQualityMultiplier()

    return (pixelCount * blurComplexity * qualityMultiplier) / 1000000 // 返回毫秒
  }

  private getQualityMultiplier(): number {
    switch (this._config.quality) {
      case 'low':
        return 0.5
      case 'medium':
        return 1
      case 'high':
        return 2
      case 'ultra':
        return 4
      default:
        return 1
    }
  }
}
