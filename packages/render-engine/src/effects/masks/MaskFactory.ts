/**
 * 遮罩工厂
 */

import type { Point2D } from '../../animation/types/PathTypes'
import {
  type CircleMaskConfig,
  type CustomMaskConfig,
  type EllipseMaskConfig,
  type IMask,
  type IMaskFactory,
  MaskBlendMode,
  MaskEdgeType,
  MaskShape,
  MaskType,
  type PathMaskConfig,
  type PolygonMaskConfig,
  type RectangleMaskConfig,
} from '../types/MaskTypes'
import { CircleMask } from './CircleMask'
import { CustomMask } from './CustomMask'
import { EllipseMask } from './EllipseMask'
import { PathMask } from './PathMask'
import { PolygonMask } from './PolygonMask'
// 导入具体遮罩类
import { RectangleMask } from './RectangleMask'

export class MaskFactory implements IMaskFactory {
  /**
   * 创建矩形遮罩
   */
  createRectangleMask(config: Omit<RectangleMaskConfig, 'shape'>): IMask {
    const fullConfig: RectangleMaskConfig = {
      shape: MaskShape.RECTANGLE,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new RectangleMask(fullConfig)
  }

  /**
   * 创建圆形遮罩
   */
  createCircleMask(config: Omit<CircleMaskConfig, 'shape'>): IMask {
    const fullConfig: CircleMaskConfig = {
      shape: MaskShape.CIRCLE,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new CircleMask(fullConfig)
  }

  /**
   * 创建椭圆遮罩
   */
  createEllipseMask(config: Omit<EllipseMaskConfig, 'shape'>): IMask {
    const fullConfig: EllipseMaskConfig = {
      shape: MaskShape.ELLIPSE,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new EllipseMask(fullConfig)
  }

  /**
   * 创建多边形遮罩
   */
  createPolygonMask(config: Omit<PolygonMaskConfig, 'shape'>): IMask {
    const fullConfig: PolygonMaskConfig = {
      shape: MaskShape.POLYGON,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new PolygonMask(fullConfig)
  }

  /**
   * 创建路径遮罩
   */
  createPathMask(config: Omit<PathMaskConfig, 'shape'>): IMask {
    const fullConfig: PathMaskConfig = {
      shape: MaskShape.PATH,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new PathMask(fullConfig)
  }

  /**
   * 创建自定义遮罩
   */
  createCustomMask(config: Omit<CustomMaskConfig, 'shape'>): IMask {
    const fullConfig: CustomMaskConfig = {
      shape: MaskShape.CUSTOM,
      ...this.getDefaultConfig(),
      ...config,
    }

    return new CustomMask(fullConfig)
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig() {
    return {
      type: MaskType.CLIP,
      position: { x: 0, y: 0 } as Point2D,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      inverted: false,
    }
  }

  /**
   * 静态工厂方法 - 快速创建常用遮罩
   */

  /**
   * 创建圆形剪切遮罩
   */
  static createCircleClip(center: Point2D, radius: number): IMask {
    const factory = new MaskFactory()
    return factory.createCircleMask({
      type: MaskType.CLIP,
      position: center,
      radius,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
    })
  }

  /**
   * 创建矩形剪切遮罩
   */
  static createRectangleClip(position: Point2D, width: number, height: number): IMask {
    const factory = new MaskFactory()
    return factory.createRectangleMask({
      type: MaskType.CLIP,
      position,
      width,
      height,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
    })
  }

  /**
   * 创建羽化圆形遮罩
   */
  static createFeatheredCircle(center: Point2D, radius: number, featherRadius: number): IMask {
    const factory = new MaskFactory()
    return factory.createCircleMask({
      type: MaskType.ALPHA,
      position: center,
      radius,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.FEATHERED,
      featherRadius,
    })
  }

  /**
   * 创建径向渐变遮罩
   */
  static createRadialGradient(center: Point2D, innerRadius: number, outerRadius: number): IMask {
    const factory = new MaskFactory()
    return factory.createCustomMask({
      type: MaskType.ALPHA,
      position: center,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.SOFT,
      drawFunction: (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => {
        if (ctx instanceof CanvasRenderingContext2D) {
          const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius)
          gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.beginPath()
          ctx.arc(0, 0, outerRadius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      },
    })
  }

  /**
   * 创建线性渐变遮罩
   */
  static createLinearGradient(start: Point2D, end: Point2D, width: number): IMask {
    const factory = new MaskFactory()
    const center = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }

    return factory.createCustomMask({
      type: MaskType.ALPHA,
      position: center,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.SOFT,
      drawFunction: (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => {
        if (ctx instanceof CanvasRenderingContext2D) {
          const dx = end.x - start.x
          const dy = end.y - start.y
          const length = Math.sqrt(dx * dx + dy * dy)

          const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0)
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
          gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.save()
          ctx.rotate(Math.atan2(dy, dx))
          ctx.fillStyle = gradient
          ctx.fillRect(-length / 2, -width / 2, length, width)
          ctx.restore()
        }
      },
    })
  }

  /**
   * 创建文本遮罩
   */
  static createTextMask(text: string, font: string, position: Point2D): IMask {
    const factory = new MaskFactory()
    return factory.createCustomMask({
      type: MaskType.CLIP,
      position,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      drawFunction: (ctx: CanvasRenderingContext2D | WebGLRenderingContext) => {
        if (ctx instanceof CanvasRenderingContext2D) {
          ctx.font = font
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          // 创建文本路径用于剪切
          ctx.beginPath()
          const metrics = ctx.measureText(text)
          const width = metrics.width
          const height = parseInt(font) || 16 // 从字体大小估算高度

          // 简化：使用矩形近似文本边界
          ctx.rect(-width / 2, -height / 2, width, height)
        }
      },
    })
  }

  /**
   * 创建星形遮罩
   */
  static createStarMask(
    center: Point2D,
    outerRadius: number,
    innerRadius: number,
    points: number = 5
  ): IMask {
    const factory = new MaskFactory()
    const starPoints: Point2D[] = []

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      starPoints.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    }

    return factory.createPolygonMask({
      type: MaskType.CLIP,
      position: center,
      points: starPoints,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
    })
  }
}
