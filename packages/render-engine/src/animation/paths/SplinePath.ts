/**
 * 样条曲线路径
 * 实现平滑的样条曲线
 */

import { type IPath, PathType, type Point2D, type SplinePathConfig } from '../types/PathTypes'
import { BasePath } from './BasePath'

export class SplinePath extends BasePath {
  readonly type = PathType.SPLINE

  private points: Point2D[]
  private tension: number
  private closed: boolean
  private controlPoints: Point2D[] = []

  constructor(config: SplinePathConfig) {
    super()
    this.points = [...config.points]
    this.tension = config.tension || 0.5
    this.closed = config.closed || false

    if (this.points.length < 2) {
      throw new Error('Spline path must have at least 2 points')
    }

    this.calculateControlPoints()
  }

  /**
   * 计算控制点（用于Catmull-Rom样条）
   */
  private calculateControlPoints(): void {
    this.controlPoints = []
    const n = this.points.length

    for (let i = 0; i < n; i++) {
      const p0 = this.getPointAt(i - 1)
      const p1 = this.getPointAt(i)
      const p2 = this.getPointAt(i + 1)
      const p3 = this.getPointAt(i + 2)

      // Catmull-Rom控制点计算
      const cp1 = {
        x: p1.x + ((p2.x - p0.x) * this.tension) / 6,
        y: p1.y + ((p2.y - p0.y) * this.tension) / 6,
      }

      const cp2 = {
        x: p2.x - ((p3.x - p1.x) * this.tension) / 6,
        y: p2.y - ((p3.y - p1.y) * this.tension) / 6,
      }

      this.controlPoints.push(cp1, cp2)
    }
  }

  /**
   * 获取指定索引的点，处理边界情况
   */
  private getPointAt(index: number): Point2D {
    const n = this.points.length

    if (this.closed) {
      // 循环索引
      const i = ((index % n) + n) % n
      return this.points[i]
    } else {
      // 限制在边界内
      if (index < 0) return this.points[0]
      if (index >= n) return this.points[n - 1]
      return this.points[index]
    }
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    const n = this.points.length

    if (n === 1) {
      return { ...this.points[0] }
    }

    if (n === 2) {
      return this.lerpPoint(this.points[0], this.points[1], clamped)
    }

    // 确定当前段
    const totalSegments = this.closed ? n : n - 1
    const segmentLength = 1 / totalSegments
    const segmentIndex = Math.floor(clamped / segmentLength)
    const localT = (clamped % segmentLength) / segmentLength

    // 获取当前段的四个控制点
    const p0 = this.getPointAt(segmentIndex - 1)
    const p1 = this.getPointAt(segmentIndex)
    const p2 = this.getPointAt(segmentIndex + 1)
    const p3 = this.getPointAt(segmentIndex + 2)

    // Catmull-Rom样条插值
    return this.catmullRomInterpolate(p0, p1, p2, p3, localT)
  }

  /**
   * Catmull-Rom样条插值
   */
  private catmullRomInterpolate(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    t: number
  ): Point2D {
    const t2 = t * t
    const t3 = t2 * t

    // Catmull-Rom基函数
    const f1 = -0.5 * t3 + t2 - 0.5 * t
    const f2 = 1.5 * t3 - 2.5 * t2 + 1
    const f3 = -1.5 * t3 + 2 * t2 + 0.5 * t
    const f4 = 0.5 * t3 - 0.5 * t2

    return {
      x: p0.x * f1 + p1.x * f2 + p2.x * f3 + p3.x * f4,
      y: p0.y * f1 + p1.y * f2 + p2.y * f3 + p3.y * f4,
    }
  }

  getTangent(t: number): Point2D {
    const clamped = this.clampT(t)
    const n = this.points.length

    if (n === 1) {
      return { x: 1, y: 0 }
    }

    if (n === 2) {
      const dx = this.points[1].x - this.points[0].x
      const dy = this.points[1].y - this.points[0].y
      return this.normalizeVector({ x: dx, y: dy })
    }

    // 确定当前段
    const totalSegments = this.closed ? n : n - 1
    const segmentLength = 1 / totalSegments
    const segmentIndex = Math.floor(clamped / segmentLength)
    const localT = (clamped % segmentLength) / segmentLength

    // 获取当前段的四个控制点
    const p0 = this.getPointAt(segmentIndex - 1)
    const p1 = this.getPointAt(segmentIndex)
    const p2 = this.getPointAt(segmentIndex + 1)
    const p3 = this.getPointAt(segmentIndex + 2)

    // Catmull-Rom样条的导数
    const tangent = this.catmullRomDerivative(p0, p1, p2, p3, localT)
    return this.normalizeVector(tangent)
  }

  /**
   * Catmull-Rom样条导数
   */
  private catmullRomDerivative(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    t: number
  ): Point2D {
    const t2 = t * t

    // Catmull-Rom导数基函数
    const df1 = -1.5 * t2 + 2 * t - 0.5
    const df2 = 4.5 * t2 - 5 * t
    const df3 = -4.5 * t2 + 4 * t + 0.5
    const df4 = 1.5 * t2 - t

    return {
      x: p0.x * df1 + p1.x * df2 + p2.x * df3 + p3.x * df4,
      y: p0.y * df1 + p1.y * df2 + p2.y * df3 + p3.y * df4,
    }
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t)
    const splitPoint = this.getPoint(clamped)

    // 找到分割点所在的段
    const n = this.points.length
    const totalSegments = this.closed ? n : n - 1
    const segmentLength = 1 / totalSegments
    const segmentIndex = Math.floor(clamped / segmentLength)

    // 创建两个新的样条路径
    const firstPoints = [...this.points.slice(0, segmentIndex + 1), splitPoint]
    const secondPoints = [splitPoint, ...this.points.slice(segmentIndex + 1)]

    const firstPath = new SplinePath({
      type: PathType.SPLINE,
      points: firstPoints,
      tension: this.tension,
      closed: false,
    })

    const secondPath = new SplinePath({
      type: PathType.SPLINE,
      points: secondPoints,
      tension: this.tension,
      closed: this.closed && segmentIndex === totalSegments - 1,
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

    const transformPoint = (p: Point2D): Point2D => ({
      x: a * p.x + c * p.y + e,
      y: b * p.x + d * p.y + f,
    })

    const transformedPoints = this.points.map(transformPoint)

    return new SplinePath({
      type: PathType.SPLINE,
      points: transformedPoints,
      tension: this.tension,
      closed: this.closed,
    })
  }

  /**
   * 获取样条配置
   */
  getConfig(): SplinePathConfig {
    return {
      type: PathType.SPLINE,
      points: this.points.map((p) => ({ ...p })),
      tension: this.tension,
      closed: this.closed,
    }
  }

  /**
   * 添加点
   */
  addPoint(point: Point2D, index?: number): void {
    if (index === undefined || index >= this.points.length) {
      this.points.push({ ...point })
    } else {
      this.points.splice(Math.max(0, index), 0, { ...point })
    }

    this.calculateControlPoints()
    this.invalidateCache()
  }

  /**
   * 移除点
   */
  removePoint(index: number): boolean {
    if (index < 0 || index >= this.points.length || this.points.length <= 2) {
      return false
    }

    this.points.splice(index, 1)
    this.calculateControlPoints()
    this.invalidateCache()
    return true
  }

  /**
   * 更新点
   */
  updatePoint(index: number, point: Point2D): boolean {
    if (index < 0 || index >= this.points.length) {
      return false
    }

    this.points[index] = { ...point }
    this.calculateControlPoints()
    this.invalidateCache()
    return true
  }

  /**
   * 设置张力
   */
  setTension(tension: number): void {
    this.tension = Math.max(0, Math.min(1, tension))
    this.calculateControlPoints()
    this.invalidateCache()
  }

  /**
   * 设置是否闭合
   */
  setClosed(closed: boolean): void {
    this.closed = closed
    this.calculateControlPoints()
    this.invalidateCache()
  }

  /**
   * 获取所有控制点
   */
  getPoints(): Point2D[] {
    return this.points.map((p) => ({ ...p }))
  }

  /**
   * 获取段数
   */
  getSegmentCount(): number {
    return this.closed ? this.points.length : this.points.length - 1
  }

  /**
   * 简化路径（减少点的数量）
   */
  simplify(tolerance: number = 1.0): SplinePath {
    if (this.points.length <= 2) {
      return new SplinePath(this.getConfig())
    }

    const simplified = [this.points[0]]

    for (let i = 1; i < this.points.length - 1; i++) {
      const prev = simplified[simplified.length - 1]
      const curr = this.points[i]
      const next = this.points[i + 1]

      // 计算当前点到前后点连线的距离
      const distance = this.pointToLineDistance(curr, prev, next)

      if (distance > tolerance) {
        simplified.push(curr)
      }
    }

    simplified.push(this.points[this.points.length - 1])

    return new SplinePath({
      type: PathType.SPLINE,
      points: simplified,
      tension: this.tension,
      closed: this.closed,
    })
  }

  /**
   * 计算点到直线的距离
   */
  private pointToLineDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y

    if (dx === 0 && dy === 0) {
      return this.distanceToPoint(point, lineStart)
    }

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)

    let closestPoint: Point2D
    if (t < 0) {
      closestPoint = lineStart
    } else if (t > 1) {
      closestPoint = lineEnd
    } else {
      closestPoint = {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy,
      }
    }

    return this.distanceToPoint(point, closestPoint)
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
