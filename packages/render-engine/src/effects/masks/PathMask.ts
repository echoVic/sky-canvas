/**
 * 路径遮罩
 */

import type { Point2D } from '../../animation/types/PathTypes'

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

import {
  type IMask,
  MaskBlendMode,
  MaskEdgeType,
  MaskShape,
  MaskType,
  type PathMaskConfig,
} from '../types/MaskTypes'
import { BaseMask } from './BaseMask'

export class PathMask extends BaseMask {
  protected _config: PathMaskConfig
  private pathObject: Path2D | null = null

  constructor(config: PathMaskConfig) {
    super(config)
    this._config = config
    this.initializePath()
  }

  private initializePath(): void {
    if (typeof this._config.path === 'string') {
      this.pathObject = new Path2D(this._config.path)
    } else if (this._config.path instanceof Path2D) {
      this.pathObject = this._config.path
    }
  }

  apply(
    ctx: CanvasRenderingContext2D | WebGLRenderingContext,
    _target: IShape | HTMLCanvasElement
  ): void {
    if (!this._enabled || !(ctx instanceof CanvasRenderingContext2D) || !this.pathObject) {
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
    if (this.pathObject) {
      ctx.beginPath()
      // Use Path2D API if available, otherwise fallback to manual path creation
      if (this.pathObject instanceof Path2D) {
        ctx.clip(this.pathObject)
      } else {
        // Fallback: manually recreate the path
        this.recreatePath(ctx)
      }
    }
  }

  private applyClipMask(ctx: CanvasRenderingContext2D): void {
    if (!this.pathObject) return

    if (this._config.inverted) {
      const canvas = ctx.canvas
      ctx.beginPath()
      ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2)
      if (this.pathObject instanceof Path2D) {
        // For inverted mask, we need to create a path that excludes the mask area
        this.recreatePath(ctx)
      } else {
        this.recreatePath(ctx)
      }
      ctx.clip('evenodd')
    } else {
      ctx.clip(this.pathObject)
    }
  }

  private recreatePath(ctx: CanvasRenderingContext2D): void {
    // Fallback method to recreate path manually
    // This would need to be implemented based on the specific path data
    // For now, we'll create a simple rectangle as a fallback
    ctx.rect(0, 0, 100, 100)
  }

  private applyAlphaMask(ctx: CanvasRenderingContext2D): void {
    if (!this.pathObject) return

    // 路径羽化效果
    if (this._config.featherRadius && this._config.featherRadius > 0) {
      ctx.shadowColor = `rgba(255, 255, 255, ${this._config.opacity})`
      ctx.shadowBlur = this._config.featherRadius
      ctx.fillStyle = `rgba(255, 255, 255, ${this._config.opacity})`
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${this._config.opacity})`
    }

    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'destination-in'
    }

    ctx.fill(this.pathObject)
  }

  private applyStencilMask(ctx: CanvasRenderingContext2D): void {
    if (!this.pathObject) return

    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    ctx.fill(this.pathObject)

    if (this._config.inverted) {
      ctx.globalCompositeOperation = 'source-out'
    } else {
      ctx.globalCompositeOperation = 'source-in'
    }
  }

  private applyInvertedMask(ctx: CanvasRenderingContext2D): void {
    if (!this.pathObject) return

    const canvas = ctx.canvas

    ctx.beginPath()
    ctx.rect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2)
    if (this.pathObject instanceof Path2D) {
      // For inverted mask, recreate path manually
      this.recreatePath(ctx)
    }
    ctx.clip('evenodd')
  }

  contains(point: Point2D): boolean {
    if (!this.pathObject) return false

    // 创建临时canvas来检测点击
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) {
      throw new Error('Cannot create 2D context for path mask')
    }

    tempCtx.translate(this._config.position.x, this._config.position.y)

    const result = tempCtx.isPointInPath(this.pathObject, point.x, point.y)
    return this._config.inverted ? !result : result
  }

  getBounds(): { min: Point2D; max: Point2D } {
    if (!this.pathObject) {
      return { min: this._config.position, max: this._config.position }
    }

    // Path2D没有直接获取边界的方法，需要近似计算
    // 这里返回一个保守的边界估算
    const position = this._config.position
    const estimate = 100 // 假设路径在±100像素范围内

    return {
      min: { x: position.x - estimate, y: position.y - estimate },
      max: { x: position.x + estimate, y: position.y + estimate },
    }
  }

  clone(): IMask {
    return new PathMask({ ...this._config })
  }

  /**
   * 更新路径
   */
  updatePath(path: string | Path2D): void {
    this._config.path = path
    this.initializePath()
  }

  /**
   * 获取路径字符串
   */
  getPathString(): string | null {
    return typeof this._config.path === 'string' ? this._config.path : null
  }

  /**
   * 获取Path2D对象
   */
  getPath2D(): Path2D | null {
    return this.pathObject
  }

  /**
   * 从SVG路径创建遮罩
   */
  static fromSVGPath(pathData: string, position: Point2D): PathMask {
    return new PathMask({
      type: MaskType.CLIP,
      shape: MaskShape.PATH,
      position,
      path: pathData,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
    })
  }

  /**
   * 从现有Path2D创建遮罩
   */
  static fromPath2D(path: Path2D, position: Point2D): PathMask {
    return new PathMask({
      type: MaskType.CLIP,
      shape: MaskShape.PATH,
      position,
      path,
      enabled: true,
      opacity: 1,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
    })
  }
}
