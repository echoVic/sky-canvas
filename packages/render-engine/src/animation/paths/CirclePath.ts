/**
 * 圆形路径
 * 实现圆形和椭圆形路径
 */

import {
  type CirclePathConfig,
  type EllipsePathConfig,
  type IPath,
  PathType,
  type Point2D,
} from '../types/PathTypes'
import { BasePath } from './BasePath'

/**
 * 圆形路径
 */
export class CirclePath extends BasePath {
  readonly type = PathType.CIRCLE

  private center: Point2D
  private radius: number
  private startAngle: number
  private endAngle: number
  private clockwise: boolean
  private angleSpan: number = 0

  constructor(config: CirclePathConfig) {
    super()
    this.center = { ...config.center }
    this.radius = config.radius
    this.startAngle = config.startAngle || 0
    this.endAngle = config.endAngle || 2 * Math.PI
    this.clockwise = config.clockwise !== false

    // 计算角度跨度
    this.updateAngleSpan()
  }

  private updateAngleSpan(): void {
    let span = this.endAngle - this.startAngle

    if (!this.clockwise) {
      span = -span
    }

    // 确保角度跨度为正值
    while (span <= 0) {
      span += 2 * Math.PI
    }

    while (span > 2 * Math.PI) {
      span -= 2 * Math.PI
    }

    this.angleSpan = span
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    const angle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    return {
      x: this.center.x + this.radius * Math.cos(angle),
      y: this.center.y + this.radius * Math.sin(angle),
    }
  }

  getTangent(t: number): Point2D {
    const clamped = this.clampT(t)
    const angle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    // 圆的切线垂直于半径
    const tangentAngle = angle + (this.clockwise ? Math.PI / 2 : -Math.PI / 2)

    return {
      x: Math.cos(tangentAngle),
      y: Math.sin(tangentAngle),
    }
  }

  getCurvature(_t: number): number {
    // 圆的曲率是半径的倒数
    return 1 / this.radius
  }

  split(_t: number): [IPath, IPath] {
    const clamped = this.clampT(t)
    const splitAngle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    const firstPath = new CirclePath({
      type: PathType.CIRCLE,
      center: this.center,
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle: splitAngle,
      clockwise: this.clockwise,
    })

    const secondPath = new CirclePath({
      type: PathType.CIRCLE,
      center: this.center,
      radius: this.radius,
      startAngle: splitAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    })

    return [firstPath, secondPath]
  }

  concat(other: IPath): IPath {
    // 简化实现：创建复合路径
    return new CompositePath([this, other])
  }

  transform(matrix: number[]): IPath {
    if (matrix.length !== 6) {
      throw new Error('Transform matrix must be a 2x3 matrix (6 elements)')
    }

    const [a, b, c, d, e, f] = matrix

    // 变换中心点
    const transformedCenter = {
      x: a * this.center.x + c * this.center.y + e,
      y: b * this.center.x + d * this.center.y + f,
    }

    // 计算变换后的半径（简化处理，假设等比例缩放）
    const scaleX = Math.sqrt(a * a + b * b)
    const scaleY = Math.sqrt(c * c + d * d)
    const averageScale = (scaleX + scaleY) / 2

    // 如果缩放不均匀，转换为椭圆
    if (Math.abs(scaleX - scaleY) > 0.001) {
      return new EllipsePath({
        type: PathType.ELLIPSE,
        center: transformedCenter,
        radiusX: this.radius * scaleX,
        radiusY: this.radius * scaleY,
        rotation: Math.atan2(b, a),
        startAngle: this.startAngle,
        endAngle: this.endAngle,
        clockwise: this.clockwise,
      })
    }

    return new CirclePath({
      type: PathType.CIRCLE,
      center: transformedCenter,
      radius: this.radius * averageScale,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    })
  }

  protected calculateLength(): number {
    return this.radius * this.angleSpan
  }

  /**
   * 获取圆形配置
   */
  getConfig(): CirclePathConfig {
    return {
      type: PathType.CIRCLE,
      center: { ...this.center },
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    }
  }

  /**
   * 设置中心点
   */
  setCenter(center: Point2D): void {
    this.center = { ...center }
    this.invalidateCache()
  }

  /**
   * 设置半径
   */
  setRadius(radius: number): void {
    this.radius = Math.abs(radius)
    this.invalidateCache()
  }

  /**
   * 设置角度范围
   */
  setAngleRange(startAngle: number, endAngle: number, clockwise: boolean = true): void {
    this.startAngle = startAngle
    this.endAngle = endAngle
    this.clockwise = clockwise
    this.updateAngleSpan()
    this.invalidateCache()
  }
}

/**
 * 椭圆路径
 */
export class EllipsePath extends BasePath {
  readonly type = PathType.ELLIPSE

  private center: Point2D
  private radiusX: number
  private radiusY: number
  private rotation: number
  private startAngle: number
  private endAngle: number
  private clockwise: boolean
  private angleSpan: number = 0

  constructor(config: EllipsePathConfig) {
    super()
    this.center = { ...config.center }
    this.radiusX = config.radiusX
    this.radiusY = config.radiusY
    this.rotation = config.rotation || 0
    this.startAngle = config.startAngle || 0
    this.endAngle = config.endAngle || 2 * Math.PI
    this.clockwise = config.clockwise !== false

    this.updateAngleSpan()
  }

  private updateAngleSpan(): void {
    let span = this.endAngle - this.startAngle

    if (!this.clockwise) {
      span = -span
    }

    while (span <= 0) {
      span += 2 * Math.PI
    }

    while (span > 2 * Math.PI) {
      span -= 2 * Math.PI
    }

    this.angleSpan = span
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    const angle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    // 椭圆参数方程
    const x = this.radiusX * Math.cos(angle)
    const y = this.radiusY * Math.sin(angle)

    // 应用旋转
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)

    return {
      x: this.center.x + x * cos - y * sin,
      y: this.center.y + x * sin + y * cos,
    }
  }

  getTangent(t: number): Point2D {
    const clamped = this.clampT(t)
    const angle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    // 椭圆切线向量
    const dx = -this.radiusX * Math.sin(angle)
    const dy = this.radiusY * Math.cos(angle)

    // 应用旋转
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)

    const tangent = {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    }

    // 考虑方向
    if (!this.clockwise) {
      tangent.x = -tangent.x
      tangent.y = -tangent.y
    }

    return this.normalizeVector(tangent)
  }

  getCurvature(t: number): number {
    const clamped = this.clampT(t)
    const angle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    // 椭圆曲率公式
    const a = this.radiusX
    const b = this.radiusY
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const numerator = a * b
    const denominator = (a * a * sinA * sinA + b * b * cosA * cosA) ** 1.5

    return numerator / denominator
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t)
    const splitAngle = this.startAngle + (this.clockwise ? 1 : -1) * this.angleSpan * clamped

    const firstPath = new EllipsePath({
      type: PathType.ELLIPSE,
      center: this.center,
      radiusX: this.radiusX,
      radiusY: this.radiusY,
      rotation: this.rotation,
      startAngle: this.startAngle,
      endAngle: splitAngle,
      clockwise: this.clockwise,
    })

    const secondPath = new EllipsePath({
      type: PathType.ELLIPSE,
      center: this.center,
      radiusX: this.radiusX,
      radiusY: this.radiusY,
      rotation: this.rotation,
      startAngle: splitAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    })

    return [firstPath, secondPath]
  }

  concat(other: IPath): IPath {
    return new CompositePath([this, other])
  }

  transform(matrix: number[]): IPath {
    if (matrix.length !== 6) {
      throw new Error('Transform matrix must be a 2x3 matrix (6 elements)')
    }

    const [a, b, c, d, e, f] = matrix

    // 变换中心点
    const transformedCenter = {
      x: a * this.center.x + c * this.center.y + e,
      y: b * this.center.x + d * this.center.y + f,
    }

    // 简化处理：计算新的半径和旋转
    const scaleX = Math.sqrt(a * a + b * b)
    const scaleY = Math.sqrt(c * c + d * d)
    const rotationDelta = Math.atan2(b, a)

    return new EllipsePath({
      type: PathType.ELLIPSE,
      center: transformedCenter,
      radiusX: this.radiusX * scaleX,
      radiusY: this.radiusY * scaleY,
      rotation: this.rotation + rotationDelta,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    })
  }

  protected calculateLength(): number {
    // 椭圆周长的近似计算（Ramanujan公式）
    const a = this.radiusX
    const b = this.radiusY
    const h = ((a - b) / (a + b)) ** 2
    const circumference = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

    // 按角度范围缩放
    const fullAngle = 2 * Math.PI
    return circumference * (this.angleSpan / fullAngle)
  }

  /**
   * 获取椭圆配置
   */
  getConfig(): EllipsePathConfig {
    return {
      type: PathType.ELLIPSE,
      center: { ...this.center },
      radiusX: this.radiusX,
      radiusY: this.radiusY,
      rotation: this.rotation,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      clockwise: this.clockwise,
    }
  }
}

/**
 * 复合路径类
 */
class CompositePath extends BasePath {
  readonly type = PathType.CUSTOM
  private paths: IPath[]

  constructor(paths: IPath[]) {
    super()
    this.paths = [...paths]
  }

  getPoint(t: number): Point2D {
    // 简化实现
    return this.paths[0]?.getPoint(t) || { x: 0, y: 0 }
  }

  split(_t: number): [IPath, IPath] {
    return [this, this]
  }

  concat(other: IPath): IPath {
    return new CompositePath([...this.paths, other])
  }

  transform(matrix: number[]): IPath {
    const transformedPaths = this.paths.map((path) => path.transform(matrix))
    return new CompositePath(transformedPaths)
  }
}
