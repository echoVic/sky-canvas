/**
 * 遮罩渲染器
 */

import { type IMask, type IMaskRenderer, MaskBlendMode } from '../types/MaskTypes'

export class MaskRenderer implements IMaskRenderer {
  private currentBlendMode: MaskBlendMode = MaskBlendMode.NORMAL
  private maskStack: boolean = false

  render(mask: IMask, ctx: CanvasRenderingContext2D | WebGLRenderingContext): void {
    if (!mask.enabled || !(ctx instanceof CanvasRenderingContext2D)) {
      return
    }

    // 应用遮罩到目标
    mask.apply(ctx, ctx.canvas)
  }

  setBlendMode(mode: MaskBlendMode): void {
    this.currentBlendMode = mode
  }

  beginMask(): void {
    this.maskStack = true
  }

  endMask(): void {
    this.maskStack = false
  }

  /**
   * 渲染多个遮罩组合
   */
  renderMaskGroup(masks: IMask[], ctx: CanvasRenderingContext2D | WebGLRenderingContext): void {
    if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
      return
    }

    if (masks.length === 0) {
      return
    }

    ctx.save()

    this.beginMask()

    try {
      // 按顺序应用所有遮罩
      for (const mask of masks) {
        if (mask.enabled) {
          this.render(mask, ctx)
        }
      }
    } finally {
      this.endMask()
      ctx.restore()
    }
  }

  /**
   * 使用遮罩组合模式渲染
   */
  renderWithCompositeMode(
    masks: IMask[],
    ctx: CanvasRenderingContext2D,
    compositeMode: 'intersect' | 'union' | 'subtract' | 'xor' = 'intersect'
  ): void {
    if (masks.length === 0) return

    ctx.save()

    try {
      switch (compositeMode) {
        case 'intersect':
          this.renderIntersection(masks, ctx)
          break
        case 'union':
          this.renderUnion(masks, ctx)
          break
        case 'subtract':
          this.renderSubtraction(masks, ctx)
          break
        case 'xor':
          this.renderXor(masks, ctx)
          break
      }
    } finally {
      ctx.restore()
    }
  }

  private renderIntersection(masks: IMask[], ctx: CanvasRenderingContext2D): void {
    // 交集：所有遮罩都必须通过
    for (const mask of masks) {
      if (mask.enabled) {
        ctx.save()
        mask.apply(ctx, ctx.canvas)
        ctx.restore()
      }
    }
  }

  private renderUnion(masks: IMask[], ctx: CanvasRenderingContext2D): void {
    // 并集：任意遮罩通过即可
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')!

    tempCanvas.width = ctx.canvas.width
    tempCanvas.height = ctx.canvas.height

    // 在临时画布上渲染所有遮罩
    for (const mask of masks) {
      if (mask.enabled) {
        tempCtx.save()
        tempCtx.globalCompositeOperation = 'source-over'
        mask.apply(tempCtx, tempCanvas)
        tempCtx.restore()
      }
    }

    // 将结果作为遮罩应用到主画布
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(tempCanvas, 0, 0)
  }

  private renderSubtraction(masks: IMask[], ctx: CanvasRenderingContext2D): void {
    // 减法：第一个遮罩减去后续遮罩
    if (masks.length === 0) return

    // 应用第一个遮罩
    const firstMask = masks[0]
    if (firstMask && firstMask.enabled) {
      firstMask.apply(ctx, ctx.canvas)
    }

    // 减去其他遮罩
    for (let i = 1; i < masks.length; i++) {
      const mask = masks[i]
      if (mask && mask.enabled) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        mask.apply(ctx, ctx.canvas)
        ctx.restore()
      }
    }
  }

  private renderXor(masks: IMask[], ctx: CanvasRenderingContext2D): void {
    // 异或：奇数个遮罩覆盖的区域
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')!

    tempCanvas.width = ctx.canvas.width
    tempCanvas.height = ctx.canvas.height

    for (const mask of masks) {
      if (mask.enabled) {
        tempCtx.save()
        tempCtx.globalCompositeOperation = 'xor'
        mask.apply(tempCtx, tempCanvas)
        tempCtx.restore()
      }
    }

    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(tempCanvas, 0, 0)
  }

  /**
   * 预览遮罩效果（调试用）
   */
  previewMask(
    mask: IMask,
    ctx: CanvasRenderingContext2D,
    style: {
      strokeColor?: string
      fillColor?: string
      strokeWidth?: number
      opacity?: number
    } = {}
  ): void {
    const {
      strokeColor = '#ff0000',
      fillColor = 'rgba(255, 0, 0, 0.2)',
      strokeWidth = 2,
      opacity = 0.5,
    } = style

    ctx.save()

    ctx.globalAlpha = opacity
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = fillColor
    ctx.lineWidth = strokeWidth

    // 绘制遮罩边界
    const bounds = mask.getBounds()
    ctx.strokeRect(
      bounds.min.x,
      bounds.min.y,
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y
    )

    // 填充遮罩区域（简化显示）
    ctx.fillRect(
      bounds.min.x,
      bounds.min.y,
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y
    )

    ctx.restore()
  }

  /**
   * 创建遮罩预览纹理
   */
  createMaskTexture(mask: IMask, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = width
    canvas.height = height

    // 填充白色背景
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    // 应用遮罩
    mask.apply(ctx, canvas)

    return canvas
  }

  /**
   * 检查遮罩是否与矩形区域相交
   */
  isIntersecting(
    mask: IMask,
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    const bounds = mask.getBounds()

    return !(
      bounds.max.x < rect.x ||
      bounds.min.x > rect.x + rect.width ||
      bounds.max.y < rect.y ||
      bounds.min.y > rect.y + rect.height
    )
  }
}
