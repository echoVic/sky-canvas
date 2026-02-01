/**
 * 路径动画
 * 实现对象沿路径移动的动画
 */

import { BaseAnimation } from '../core/BaseAnimation'
import { PathFactory } from '../paths/PathFactory'
import type {
  IPath,
  PathAnimationConfig,
  PathConfig,
  PathMotionInfo,
  Point2D,
} from '../types/PathTypes'

export class PathAnimation extends BaseAnimation {
  private target: Record<string, unknown>
  private path: IPath
  private autoRotate: boolean
  private rotationOffset: number
  private startOffset: number
  private endOffset: number
  private positionProperty: string
  private rotationProperty: string

  constructor(target: Record<string, unknown>, config: PathAnimationConfig) {
    super({
      duration: config.duration,
      easing: config.easing,
      loop: config.loop,
      yoyo: config.yoyo,
      delay: config.delay,
      autoStart: config.autoStart,
    })

    this.target = target
    this.path = PathFactory.createPath(config.path)
    this.autoRotate = config.autoRotate || false
    this.rotationOffset = config.rotationOffset || 0
    this.startOffset = Math.max(0, Math.min(1, config.startOffset || 0))
    this.endOffset = Math.max(0, Math.min(1, config.endOffset || 1))

    // 默认属性名
    this.positionProperty = 'position'
    this.rotationProperty = 'rotation'

    // 检测目标对象的属性结构
    this.detectPropertyStructure()
  }

  protected applyAnimation(progress: number): void {
    if (!this.target || typeof this.target !== 'object') {
      console.warn('PathAnimation target is not valid')
      return
    }

    // 计算路径上的实际进度
    const pathProgress = this.startOffset + (this.endOffset - this.startOffset) * progress
    const motionInfo = this.getMotionInfo(pathProgress)

    try {
      // 更新位置
      this.updatePosition(motionInfo.position)

      // 更新旋转（如果启用自动旋转）
      if (this.autoRotate && motionInfo.rotation !== undefined) {
        this.updateRotation(motionInfo.rotation)
      }

      // 触发路径动画特定事件
      this.emit('pathUpdate', this, motionInfo)
    } catch (error) {
      console.error('Failed to apply path animation:', error)
    }
  }

  /**
   * 获取路径运动信息
   */
  getMotionInfo(pathProgress: number): PathMotionInfo {
    const position = this.path.getPoint(pathProgress)
    const tangent = this.path.getTangent(pathProgress)
    const normal = this.path.getNormal(pathProgress)

    let rotation: number | undefined
    if (this.autoRotate) {
      rotation = Math.atan2(tangent.y, tangent.x) + this.degToRad(this.rotationOffset)
    }

    return {
      position,
      rotation,
      tangent,
      normal,
      progress: pathProgress,
      distance: pathProgress * this.path.getLength(),
      totalDistance: this.path.getLength(),
    }
  }

  /**
   * 检测目标对象的属性结构
   */
  private detectPropertyStructure(): void {
    // 检查常见的位置属性结构
    if (this.hasProperty('x') && this.hasProperty('y')) {
      this.positionProperty = 'xy'
    } else if (this.hasProperty('position.x') && this.hasProperty('position.y')) {
      this.positionProperty = 'position'
    } else if (this.hasProperty('transform.x') && this.hasProperty('transform.y')) {
      this.positionProperty = 'transform'
    } else if (this.hasProperty('pos.x') && this.hasProperty('pos.y')) {
      this.positionProperty = 'pos'
    }

    // 检查旋转属性
    if (this.hasProperty('rotation')) {
      this.rotationProperty = 'rotation'
    } else if (this.hasProperty('angle')) {
      this.rotationProperty = 'angle'
    } else if (this.hasProperty('rotate')) {
      this.rotationProperty = 'rotate'
    } else if (this.hasProperty('transform.rotation')) {
      this.rotationProperty = 'transform.rotation'
    }
  }

  /**
   * 检查对象是否有指定属性
   */
  private hasProperty(path: string): boolean {
    try {
      const keys = path.split('.')
      let current = this.target

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key]
        } else {
          return false
        }
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * 更新位置属性
   */
  private updatePosition(position: Point2D): void {
    switch (this.positionProperty) {
      case 'xy':
        this.target.x = position.x
        this.target.y = position.y
        break

      case 'position':
        if (!this.target.position) {
          this.target.position = {}
        }
        this.target.position.x = position.x
        this.target.position.y = position.y
        break

      case 'transform':
        if (!this.target.transform) {
          this.target.transform = {}
        }
        this.target.transform.x = position.x
        this.target.transform.y = position.y
        break

      case 'pos':
        if (!this.target.pos) {
          this.target.pos = {}
        }
        this.target.pos.x = position.x
        this.target.pos.y = position.y
        break

      default:
        // 尝试设置x, y属性
        this.target.x = position.x
        this.target.y = position.y
        break
    }
  }

  /**
   * 更新旋转属性
   */
  private updateRotation(rotation: number): void {
    switch (this.rotationProperty) {
      case 'rotation':
        this.target.rotation = rotation
        break

      case 'angle':
        this.target.angle = rotation
        break

      case 'rotate':
        this.target.rotate = rotation
        break

      case 'transform.rotation':
        if (!this.target.transform) {
          this.target.transform = {}
        }
        this.target.transform.rotation = rotation
        break

      default:
        this.target.rotation = rotation
        break
    }
  }

  /**
   * 获取路径实例
   */
  getPath(): IPath {
    return this.path
  }

  /**
   * 设置新路径
   */
  setPath(pathConfig: PathConfig): this {
    this.path = PathFactory.createPath(pathConfig)
    return this
  }

  /**
   * 设置自动旋转
   */
  setAutoRotate(enabled: boolean, offset: number = 0): this {
    this.autoRotate = enabled
    this.rotationOffset = offset
    return this
  }

  /**
   * 设置路径范围
   */
  setPathRange(start: number, end: number): this {
    this.startOffset = Math.max(0, Math.min(1, start))
    this.endOffset = Math.max(0, Math.min(1, end))
    return this
  }

  /**
   * 获取指定进度的位置
   */
  getPositionAt(progress: number): Point2D {
    const pathProgress = this.startOffset + (this.endOffset - this.startOffset) * progress
    return this.path.getPoint(pathProgress)
  }

  /**
   * 获取指定进度的旋转角度
   */
  getRotationAt(progress: number): number {
    const pathProgress = this.startOffset + (this.endOffset - this.startOffset) * progress
    const tangent = this.path.getTangent(pathProgress)
    return Math.atan2(tangent.y, tangent.x) + this.degToRad(this.rotationOffset)
  }

  /**
   * 获取路径长度
   */
  getPathLength(): number {
    return this.path.getLength() * (this.endOffset - this.startOffset)
  }

  /**
   * 获取路径边界框
   */
  getPathBounds(): { min: Point2D; max: Point2D } {
    return this.path.getBounds()
  }

  /**
   * 创建路径预览点
   */
  createPathPreview(segments: number = 50): Point2D[] {
    const points: Point2D[] = []

    for (let i = 0; i <= segments; i++) {
      const progress = i / segments
      const pathProgress = this.startOffset + (this.endOffset - this.startOffset) * progress
      points.push(this.path.getPoint(pathProgress))
    }

    return points
  }

  /**
   * 查找最接近指定点的路径位置
   */
  findClosestPathPosition(point: Point2D): number {
    const closestPoint = this.path.getClosestPoint(point)

    // 将路径t值转换为动画进度
    const animationProgress =
      (closestPoint.t - this.startOffset) / (this.endOffset - this.startOffset)
    return Math.max(0, Math.min(1, animationProgress))
  }

  /**
   * 度到弧度转换
   */
  private degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  /**
   * 设置属性映射
   */
  setPropertyMapping(positionProperty: string, rotationProperty?: string): this {
    this.positionProperty = positionProperty
    if (rotationProperty) {
      this.rotationProperty = rotationProperty
    }
    return this
  }

  /**
   * 获取动画配置信息
   */
  getAnimationInfo() {
    return {
      target: this.target,
      pathType: this.path.type,
      pathLength: this.path.getLength(),
      autoRotate: this.autoRotate,
      rotationOffset: this.rotationOffset,
      startOffset: this.startOffset,
      endOffset: this.endOffset,
      positionProperty: this.positionProperty,
      rotationProperty: this.rotationProperty,
      duration: this.duration,
      currentProgress: this.progress,
    }
  }
}
