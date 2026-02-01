/**
 * 贝塞尔路径
 * 实现二次和三次贝塞尔曲线
 */

import {
  type CubicBezierPathConfig,
  type IPath,
  PathType,
  type Point2D,
  type QuadraticBezierPathConfig,
} from '../types/PathTypes'
import { BasePath } from './BasePath'

/**
 * 二次贝塞尔路径
 */
export class QuadraticBezierPath extends BasePath {
  readonly type = PathType.BEZIER_QUADRATIC

  private start: Point2D
  private control: Point2D
  private end: Point2D

  constructor(config: QuadraticBezierPathConfig) {
    super()
    this.start = { ...config.start }
    this.control = { ...config.control }
    this.end = { ...config.end }
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    const mt = 1 - clamped

    // 二次贝塞尔公式: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    return {
      x:
        mt * mt * this.start.x + 2 * mt * clamped * this.control.x + clamped * clamped * this.end.x,
      y:
        mt * mt * this.start.y + 2 * mt * clamped * this.control.y + clamped * clamped * this.end.y,
    }
  }

  getTangent(t: number): Point2D {
    const clamped = this.clampT(t)
    const mt = 1 - clamped

    // 二次贝塞尔的导数: B'(t) = 2(1-t)(P₁-P₀) + 2t(P₂-P₁)
    const tangent = {
      x: 2 * mt * (this.control.x - this.start.x) + 2 * clamped * (this.end.x - this.control.x),
      y: 2 * mt * (this.control.y - this.start.y) + 2 * clamped * (this.end.y - this.control.y),
    }

    return this.normalizeVector(tangent)
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t)

    // De Casteljau算法分割贝塞尔曲线
    const p01 = this.lerpPoint(this.start, this.control, clamped)
    const p12 = this.lerpPoint(this.control, this.end, clamped)
    const p012 = this.lerpPoint(p01, p12, clamped)

    const firstPath = new QuadraticBezierPath({
      type: PathType.BEZIER_QUADRATIC,
      start: this.start,
      control: p01,
      end: p012,
    })

    const secondPath = new QuadraticBezierPath({
      type: PathType.BEZIER_QUADRATIC,
      start: p012,
      control: p12,
      end: this.end,
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

    return new QuadraticBezierPath({
      type: PathType.BEZIER_QUADRATIC,
      start: transformPoint(this.start),
      control: transformPoint(this.control),
      end: transformPoint(this.end),
    })
  }

  /**
   * 获取控制点
   */
  getControlPoints(): { start: Point2D; control: Point2D; end: Point2D } {
    return {
      start: { ...this.start },
      control: { ...this.control },
      end: { ...this.end },
    }
  }

  /**
   * 设置控制点
   */
  setControlPoints(start: Point2D, control: Point2D, end: Point2D): void {
    this.start = { ...start }
    this.control = { ...control }
    this.end = { ...end }
    this.invalidateCache()
  }
}

/**
 * 三次贝塞尔路径
 */
export class CubicBezierPath extends BasePath {
  readonly type = PathType.BEZIER_CUBIC

  private start: Point2D
  private control1: Point2D
  private control2: Point2D
  private end: Point2D

  constructor(config: CubicBezierPathConfig) {
    super()
    this.start = { ...config.start }
    this.control1 = { ...config.control1 }
    this.control2 = { ...config.control2 }
    this.end = { ...config.end }
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    const mt = 1 - clamped
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = clamped * clamped
    const t3 = t2 * clamped

    // 三次贝塞尔公式: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    return {
      x:
        mt3 * this.start.x +
        3 * mt2 * clamped * this.control1.x +
        3 * mt * t2 * this.control2.x +
        t3 * this.end.x,
      y:
        mt3 * this.start.y +
        3 * mt2 * clamped * this.control1.y +
        3 * mt * t2 * this.control2.y +
        t3 * this.end.y,
    }
  }

  getTangent(t: number): Point2D {
    const clamped = this.clampT(t)
    const mt = 1 - clamped
    const mt2 = mt * mt
    const t2 = clamped * clamped

    // 三次贝塞尔的导数: B'(t) = 3(1-t)²(P₁-P₀) + 6(1-t)t(P₂-P₁) + 3t²(P₃-P₂)
    const tangent = {
      x:
        3 * mt2 * (this.control1.x - this.start.x) +
        6 * mt * clamped * (this.control2.x - this.control1.x) +
        3 * t2 * (this.end.x - this.control2.x),
      y:
        3 * mt2 * (this.control1.y - this.start.y) +
        6 * mt * clamped * (this.control2.y - this.control1.y) +
        3 * t2 * (this.end.y - this.control2.y),
    }

    return this.normalizeVector(tangent)
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t)

    // De Casteljau算法分割三次贝塞尔曲线
    const p01 = this.lerpPoint(this.start, this.control1, clamped)
    const p12 = this.lerpPoint(this.control1, this.control2, clamped)
    const p23 = this.lerpPoint(this.control2, this.end, clamped)

    const p012 = this.lerpPoint(p01, p12, clamped)
    const p123 = this.lerpPoint(p12, p23, clamped)

    const p0123 = this.lerpPoint(p012, p123, clamped)

    const firstPath = new CubicBezierPath({
      type: PathType.BEZIER_CUBIC,
      start: this.start,
      control1: p01,
      control2: p012,
      end: p0123,
    })

    const secondPath = new CubicBezierPath({
      type: PathType.BEZIER_CUBIC,
      start: p0123,
      control1: p123,
      control2: p23,
      end: this.end,
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

    const transformPoint = (p: Point2D): Point2D => ({
      x: a * p.x + c * p.y + e,
      y: b * p.x + d * p.y + f,
    })

    return new CubicBezierPath({
      type: PathType.BEZIER_CUBIC,
      start: transformPoint(this.start),
      control1: transformPoint(this.control1),
      control2: transformPoint(this.control2),
      end: transformPoint(this.end),
    })
  }

  /**
   * 获取控制点
   */
  getControlPoints(): {
    start: Point2D
    control1: Point2D
    control2: Point2D
    end: Point2D
  } {
    return {
      start: { ...this.start },
      control1: { ...this.control1 },
      control2: { ...this.control2 },
      end: { ...this.end },
    }
  }

  /**
   * 设置控制点
   */
  setControlPoints(start: Point2D, control1: Point2D, control2: Point2D, end: Point2D): void {
    this.start = { ...start }
    this.control1 = { ...control1 }
    this.control2 = { ...control2 }
    this.end = { ...end }
    this.invalidateCache()
  }

  /**
   * 从CSS贝塞尔曲线创建（输入范围0-1）
   */
  static fromCSS(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number = 1,
    height: number = 1
  ): CubicBezierPath {
    return new CubicBezierPath({
      type: PathType.BEZIER_CUBIC,
      start: { x: 0, y: 0 },
      control1: { x: x1 * width, y: y1 * height },
      control2: { x: x2 * width, y: y2 * height },
      end: { x: width, y: height },
    })
  }
}

/**
 * 复合路径类（从LinearPath移动到这里以避免循环依赖）
 */
class CompositePath extends BasePath {
  readonly type = PathType.CUSTOM

  private paths: IPath[]
  private pathLengths: number[]
  private totalLength: number

  constructor(paths: IPath[]) {
    super()
    this.paths = [...paths]
    this.pathLengths = paths.map((path) => path.getLength())
    this.totalLength = this.pathLengths.reduce((sum, length) => sum + length, 0)
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)

    if (clamped === 0) {
      return this.paths[0].getPoint(0)
    }

    if (clamped === 1) {
      const lastPath = this.paths[this.paths.length - 1]
      return lastPath.getPoint(1)
    }

    const targetDistance = clamped * this.totalLength
    let accumulatedDistance = 0

    for (let i = 0; i < this.paths.length; i++) {
      const pathLength = this.pathLengths[i]

      if (accumulatedDistance + pathLength >= targetDistance) {
        const pathProgress = (targetDistance - accumulatedDistance) / pathLength
        return this.paths[i].getPoint(pathProgress)
      }

      accumulatedDistance += pathLength
    }

    const lastPath = this.paths[this.paths.length - 1]
    return lastPath.getPoint(1)
  }

  split(t: number): [IPath, IPath] {
    // 简化实现
    const splitPoint = this.getPoint(t)
    return [this, this] // 实际实现需要更复杂的逻辑
  }

  concat(other: IPath): IPath {
    if (other instanceof CompositePath) {
      return new CompositePath([...this.paths, ...other.paths])
    }
    return new CompositePath([...this.paths, other])
  }

  transform(matrix: number[]): IPath {
    const transformedPaths = this.paths.map((path) => path.transform(matrix))
    return new CompositePath(transformedPaths)
  }

  protected calculateLength(): number {
    return this.totalLength
  }
}
