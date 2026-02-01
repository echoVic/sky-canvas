/**
 * 路径基类
 * 提供路径的基础实现和通用方法
 */

import type { IPath, PathPoint, PathType, Point2D, Vector2D } from '../types/PathTypes'

export abstract class BasePath implements IPath {
  abstract readonly type: PathType
  protected _length: number = 0
  protected _lengthDirty: boolean = true
  protected _sampleCache = new Map<number, PathPoint[]>()

  get length(): number {
    if (this._lengthDirty) {
      this._length = this.calculateLength()
      this._lengthDirty = false
    }
    return this._length
  }

  abstract getPoint(t: number): Point2D

  getTangent(t: number): Vector2D {
    const delta = 0.001
    const t1 = Math.max(0, t - delta)
    const t2 = Math.min(1, t + delta)

    const p1 = this.getPoint(t1)
    const p2 = this.getPoint(t2)

    const tangent = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
    }

    // 归一化切线向量
    const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
    if (length > 0) {
      tangent.x /= length
      tangent.y /= length
    }

    return tangent
  }

  getNormal(t: number): Vector2D {
    const tangent = this.getTangent(t)

    // 法线是切线逆时针旋转90度
    return {
      x: -tangent.y,
      y: tangent.x,
    }
  }

  getLength(): number {
    return this.length
  }

  getCurvature(t: number): number {
    const delta = 0.001
    const t1 = Math.max(0, t - delta)
    const t2 = Math.min(1, t + delta)

    const tangent1 = this.getTangent(t1)
    const tangent2 = this.getTangent(t2)

    // 曲率是切线角度的变化率
    const angle1 = Math.atan2(tangent1.y, tangent1.x)
    const angle2 = Math.atan2(tangent2.y, tangent2.x)

    let deltaAngle = angle2 - angle1

    // 处理角度跳跃
    if (deltaAngle > Math.PI) {
      deltaAngle -= 2 * Math.PI
    } else if (deltaAngle < -Math.PI) {
      deltaAngle += 2 * Math.PI
    }

    const deltaT = t2 - t1
    return deltaT > 0 ? Math.abs(deltaAngle / deltaT) : 0
  }

  sample(segments: number = 50): PathPoint[] {
    if (this._sampleCache.has(segments)) {
      const cached = this._sampleCache.get(segments)
      if (cached) {
        return cached
      }
    }

    const points: PathPoint[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const position = this.getPoint(t)
      const tangent = this.getTangent(t)
      const normal = this.getNormal(t)
      const curvature = this.getCurvature(t)

      points.push({
        x: position.x,
        y: position.y,
        t,
        tangent,
        normal,
        curvature,
      })
    }

    this._sampleCache.set(segments, points)
    return points
  }

  getClosestPoint(point: Point2D): PathPoint {
    const samples = this.sample(100)
    let closestPoint = samples[0]
    let minDistance = this.distanceToPoint(point, closestPoint)

    for (let i = 1; i < samples.length; i++) {
      const distance = this.distanceToPoint(point, samples[i])
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = samples[i]
      }
    }

    return closestPoint
  }

  abstract split(t: number): [IPath, IPath]

  abstract concat(other: IPath): IPath

  abstract transform(matrix: number[]): IPath

  getBounds(): { min: Point2D; max: Point2D } {
    const samples = this.sample(100)

    let minX = samples[0].x
    let minY = samples[0].y
    let maxX = samples[0].x
    let maxY = samples[0].y

    for (const point of samples) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    }
  }

  protected calculateLength(): number {
    const samples = this.sample(200)
    let length = 0

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1]
      const curr = samples[i]

      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      length += Math.sqrt(dx * dx + dy * dy)
    }

    return length
  }

  protected distanceToPoint(p1: Point2D, p2: Point2D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  protected invalidateCache(): void {
    this._lengthDirty = true
    this._sampleCache.clear()
  }

  /**
   * 将参数t限制在[0,1]范围内
   */
  protected clampT(t: number): number {
    return Math.max(0, Math.min(1, t))
  }

  /**
   * 线性插值
   */
  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * 点的线性插值
   */
  protected lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
    return {
      x: this.lerp(p1.x, p2.x, t),
      y: this.lerp(p1.y, p2.y, t),
    }
  }

  /**
   * 向量长度
   */
  protected vectorLength(v: Vector2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y)
  }

  /**
   * 向量归一化
   */
  protected normalizeVector(v: Vector2D): Vector2D {
    const length = this.vectorLength(v)
    if (length === 0) {
      return { x: 0, y: 0 }
    }
    return {
      x: v.x / length,
      y: v.y / length,
    }
  }

  /**
   * 向量点积
   */
  protected dotProduct(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y
  }

  /**
   * 向量叉积（2D中返回标量）
   */
  protected crossProduct(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.y - v1.y * v2.x
  }

  /**
   * 角度转换（度到弧度）
   */
  protected degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  /**
   * 角度转换（弧度到度）
   */
  protected radToDeg(radians: number): number {
    return (radians * 180) / Math.PI
  }
}
