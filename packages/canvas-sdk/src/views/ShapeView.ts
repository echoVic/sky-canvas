/**
 * 形状视图
 * 负责渲染各种形状（矩形、圆形、路径、文本等）
 */

import type {
  ICircleEntity,
  IPathEntity,
  IRectangleEntity,
  ITextEntity,
  ShapeEntity,
} from '../models/entities/Shape'
import type { IViewportState } from '../viewmodels/interfaces/IViewModel'

export interface IShapeRenderContext {
  ctx: CanvasRenderingContext2D
  viewport: IViewportState
  isSelected: boolean
  isHovered: boolean
}

export class ShapeView {
  constructor() {}

  /**
   * 渲染形状
   */
  render(shape: ShapeEntity, context: IShapeRenderContext): void {
    const { ctx, viewport, isSelected, isHovered } = context

    ctx.save()

    // 应用视口变换
    this.applyViewportTransform(ctx, viewport)

    // 应用形状变换
    this.applyShapeTransform(ctx, shape)

    // 应用形状样式
    this.applyShapeStyle(ctx, shape, isSelected, isHovered)

    // 根据形状类型渲染
    switch (shape.type) {
      case 'rectangle':
        this.renderRectangle(ctx, shape as IRectangleEntity)
        break
      case 'circle':
        this.renderCircle(ctx, shape as ICircleEntity)
        break
      case 'path':
        this.renderPath(ctx, shape as IPathEntity)
        break
      case 'text':
        this.renderText(ctx, shape as ITextEntity)
        break
    }

    ctx.restore()
  }

  /**
   * 批量渲染形状
   */
  renderShapes(
    shapes: ShapeEntity[],
    context: IShapeRenderContext,
    selectedIds: Set<string> = new Set()
  ): void {
    // 按 zIndex 排序
    const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex)

    for (const shape of sortedShapes) {
      if (!shape.visible) continue

      const shapeContext = {
        ...context,
        isSelected: selectedIds.has(shape.id),
        isHovered: false, // TODO: 添加悬停状态管理
      }

      this.render(shape, shapeContext)
    }
  }

  /**
   * 应用视口变换
   */
  private applyViewportTransform(ctx: CanvasRenderingContext2D, viewport: IViewportState): void {
    ctx.translate(viewport.x, viewport.y)
    ctx.scale(viewport.zoom, viewport.zoom)
  }

  /**
   * 应用形状变换
   */
  private applyShapeTransform(ctx: CanvasRenderingContext2D, shape: ShapeEntity): void {
    const transform = shape.transform

    // 平移
    ctx.translate(transform.position.x, transform.position.y)

    // 旋转
    if (transform.rotation !== 0) {
      ctx.rotate(transform.rotation)
    }

    // 缩放
    if (transform.scale.x !== 1 || transform.scale.y !== 1) {
      ctx.scale(transform.scale.x, transform.scale.y)
    }
  }

  /**
   * 应用形状样式
   */
  private applyShapeStyle(
    ctx: CanvasRenderingContext2D,
    shape: ShapeEntity,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const style = shape.style

    // 填充样式
    if (style.fillColor) {
      ctx.fillStyle = style.fillColor
    }

    // 描边样式
    if (style.strokeColor) {
      ctx.strokeStyle = style.strokeColor
    }

    // 线宽
    const lineWidth = style.strokeWidth || style.lineWidth || 0
    if (lineWidth > 0) {
      ctx.lineWidth = lineWidth
    }

    // 透明度
    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity
    }

    // 虚线样式
    if (style.lineDash) {
      ctx.setLineDash(style.lineDash)
    }

    // 选中状态样式
    if (isSelected) {
      ctx.shadowColor = '#007AFF'
      ctx.shadowBlur = 4
    }

    // 悬停状态样式
    if (isHovered) {
      ctx.globalAlpha = Math.min(1, (ctx.globalAlpha || 1) + 0.1)
    }
  }

  /**
   * 渲染矩形
   */
  private renderRectangle(ctx: CanvasRenderingContext2D, shape: IRectangleEntity): void {
    const { width, height } = shape.size
    const { borderRadius = 0 } = shape

    if (borderRadius > 0) {
      this.drawRoundedRect(ctx, 0, 0, width, height, borderRadius)
    } else {
      ctx.rect(0, 0, width, height)
    }

    this.fillAndStroke(ctx)
  }

  /**
   * 渲染圆形
   */
  private renderCircle(ctx: CanvasRenderingContext2D, shape: ICircleEntity): void {
    ctx.beginPath()
    ctx.arc(0, 0, shape.radius, 0, Math.PI * 2)
    this.fillAndStroke(ctx)
  }

  /**
   * 渲染路径
   */
  private renderPath(ctx: CanvasRenderingContext2D, shape: IPathEntity): void {
    const path = new Path2D(shape.pathData)

    if (ctx.fillStyle && ctx.fillStyle !== 'rgba(0, 0, 0, 0)') {
      ctx.fill(path)
    }
    if (ctx.strokeStyle && ctx.lineWidth > 0) {
      ctx.stroke(path)
    }
  }

  /**
   * 渲染文本
   */
  private renderText(ctx: CanvasRenderingContext2D, shape: ITextEntity): void {
    const { fontSize, fontFamily, fontWeight, textAlign, content } = shape

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.textAlign = textAlign
    ctx.textBaseline = 'top'

    if (ctx.fillStyle && ctx.fillStyle !== 'rgba(0, 0, 0, 0)') {
      ctx.fillText(content, 0, 0)
    }
    if (ctx.strokeStyle && ctx.lineWidth > 0) {
      ctx.strokeText(content, 0, 0)
    }
  }

  /**
   * 填充和描边
   */
  private fillAndStroke(ctx: CanvasRenderingContext2D): void {
    if (ctx.fillStyle && ctx.fillStyle !== 'rgba(0, 0, 0, 0)') {
      ctx.fill()
    }
    if (ctx.strokeStyle && ctx.lineWidth > 0) {
      ctx.stroke()
    }
  }

  /**
   * 绘制圆角矩形
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  /**
   * 获取形状在屏幕上的边界框
   */
  getScreenBounds(
    shape: ShapeEntity,
    viewport: IViewportState
  ): { x: number; y: number; width: number; height: number } {
    // TODO: 实现精确的屏幕边界计算
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  /**
   * 命中测试
   */
  hitTest(shape: ShapeEntity, point: { x: number; y: number }, viewport: IViewportState): boolean {
    // TODO: 实现精确的命中测试
    return false
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    // 清理资源
  }
}
