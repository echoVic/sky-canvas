/**
 * 自定义路径
 * 允许用户定义自己的路径函数
 */

import {
  type CustomPathConfig,
  type IPath,
  PathType,
  type Point2D,
  type Vector2D,
} from '../types/PathTypes'
import { BasePath } from './BasePath'

export class CustomPath extends BasePath {
  readonly type = PathType.CUSTOM

  private getPointFn: (t: number) => Point2D
  private getTangentFn?: (t: number) => Vector2D
  private getNormalFn?: (t: number) => Vector2D
  private getLengthFn?: () => number

  constructor(config: CustomPathConfig) {
    super()
    this.getPointFn = config.getPoint
    this.getTangentFn = config.getTangent
    this.getNormalFn = config.getNormal
    this.getLengthFn = config.getLength
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t)
    try {
      return this.getPointFn(clamped)
    } catch (error) {
      console.error('Error in custom path getPoint function:', error)
      return { x: 0, y: 0 }
    }
  }

  getTangent(t: number): Vector2D {
    if (this.getTangentFn) {
      const clamped = this.clampT(t)
      try {
        return this.normalizeVector(this.getTangentFn(clamped))
      } catch (error) {
        console.error('Error in custom path getTangent function:', error)
      }
    }

    // 后备方案：使用数值微分
    return super.getTangent(t)
  }

  getNormal(t: number): Vector2D {
    if (this.getNormalFn) {
      const clamped = this.clampT(t)
      try {
        return this.normalizeVector(this.getNormalFn(clamped))
      } catch (error) {
        console.error('Error in custom path getNormal function:', error)
      }
    }

    // 后备方案：从切线计算法线
    return super.getNormal(t)
  }

  protected calculateLength(): number {
    if (this.getLengthFn) {
      try {
        return this.getLengthFn()
      } catch (error) {
        console.error('Error in custom path getLength function:', error)
      }
    }

    // 后备方案：使用数值积分
    return super.calculateLength()
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t)

    // 创建两个新的自定义路径
    const firstPath = new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (localT: number) => {
        return this.getPoint(localT * clamped)
      },
      getTangent: this.getTangentFn
        ? (localT: number) => {
            return this.getTangent(localT * clamped)
          }
        : undefined,
      getNormal: this.getNormalFn
        ? (localT: number) => {
            return this.getNormal(localT * clamped)
          }
        : undefined,
      getLength: this.getLengthFn
        ? () => {
            return this.getLength() * clamped
          }
        : undefined,
    })

    const secondPath = new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (localT: number) => {
        return this.getPoint(clamped + localT * (1 - clamped))
      },
      getTangent: this.getTangentFn
        ? (localT: number) => {
            return this.getTangent(clamped + localT * (1 - clamped))
          }
        : undefined,
      getNormal: this.getNormalFn
        ? (localT: number) => {
            return this.getNormal(clamped + localT * (1 - clamped))
          }
        : undefined,
      getLength: this.getLengthFn
        ? () => {
            return this.getLength() * (1 - clamped)
          }
        : undefined,
    })

    return [firstPath, secondPath]
  }

  concat(other: IPath): IPath {
    // 创建复合自定义路径
    const thisLength = this.getLength()
    const otherLength = other.getLength()
    const totalLength = thisLength + otherLength

    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const distance = t * totalLength
        if (distance <= thisLength) {
          return this.getPoint(distance / thisLength)
        } else {
          return other.getPoint((distance - thisLength) / otherLength)
        }
      },
      getTangent: (t: number) => {
        const distance = t * totalLength
        if (distance <= thisLength) {
          return this.getTangent(distance / thisLength)
        } else {
          return other.getTangent((distance - thisLength) / otherLength)
        }
      },
      getLength: () => totalLength,
    })
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

    const transformVector = (v: Vector2D): Vector2D => ({
      x: a * v.x + c * v.y,
      y: b * v.x + d * v.y,
    })

    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        return transformPoint(this.getPoint(t))
      },
      getTangent: this.getTangentFn
        ? (t: number) => {
            return this.normalizeVector(transformVector(this.getTangent(t)))
          }
        : undefined,
      getNormal: this.getNormalFn
        ? (t: number) => {
            return this.normalizeVector(transformVector(this.getNormal(t)))
          }
        : undefined,
      getLength: this.getLengthFn
        ? () => {
            // 简化处理：假设等比例缩放
            const scaleX = Math.sqrt(a * a + b * b)
            const scaleY = Math.sqrt(c * c + d * d)
            const averageScale = (scaleX + scaleY) / 2
            return this.getLength() * averageScale
          }
        : undefined,
    })
  }

  /**
   * 创建参数化函数路径
   */
  static createParametric(
    xFn: (t: number) => number,
    yFn: (t: number) => number,
    dxFn?: (t: number) => number,
    dyFn?: (t: number) => number
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => ({
        x: xFn(t),
        y: yFn(t),
      }),
      getTangent:
        dxFn && dyFn
          ? (t: number) => ({
              x: dxFn(t),
              y: dyFn(t),
            })
          : undefined,
    })
  }

  /**
   * 创建极坐标路径
   */
  static createPolar(
    radiusFn: (angle: number) => number,
    startAngle: number = 0,
    endAngle: number = 2 * Math.PI,
    center: Point2D = { x: 0, y: 0 }
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = startAngle + (endAngle - startAngle) * t
        const radius = radiusFn(angle)

        return {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        }
      },
      getTangent: (t: number) => {
        const angle = startAngle + (endAngle - startAngle) * t
        const radius = radiusFn(angle)

        // 数值微分计算径向导数
        const deltaAngle = 0.001
        const r1 = radiusFn(angle - deltaAngle)
        const r2 = radiusFn(angle + deltaAngle)
        const drda = (r2 - r1) / (2 * deltaAngle)

        const angleScale = endAngle - startAngle
        const dx = (drda * Math.cos(angle) - radius * Math.sin(angle)) * angleScale
        const dy = (drda * Math.sin(angle) + radius * Math.cos(angle)) * angleScale

        return { x: dx, y: dy }
      },
    })
  }

  /**
   * 创建函数图形路径
   */
  static createFunction(
    fn: (x: number) => number,
    xStart: number,
    xEnd: number,
    derivative?: (x: number) => number
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const x = xStart + (xEnd - xStart) * t
        return {
          x: x,
          y: fn(x),
        }
      },
      getTangent: derivative
        ? (t: number) => {
            const x = xStart + (xEnd - xStart) * t
            const dx = xEnd - xStart
            const dy = derivative(x) * dx

            return { x: dx, y: dy }
          }
        : undefined,
    })
  }

  /**
   * 创建Lissajous曲线
   */
  static createLissajous(
    a: number = 3,
    b: number = 2,
    delta: number = Math.PI / 2,
    amplitude: number = 100,
    center: Point2D = { x: 0, y: 0 }
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = t * 2 * Math.PI

        return {
          x: center.x + amplitude * Math.sin(a * angle + delta),
          y: center.y + amplitude * Math.sin(b * angle),
        }
      },
      getTangent: (t: number) => {
        const angle = t * 2 * Math.PI
        const angleScale = 2 * Math.PI

        const dx = amplitude * a * Math.cos(a * angle + delta) * angleScale
        const dy = amplitude * b * Math.cos(b * angle) * angleScale

        return { x: dx, y: dy }
      },
    })
  }

  /**
   * 创建Rose曲线
   */
  static createRose(
    n: number = 4,
    d: number = 1,
    amplitude: number = 100,
    center: Point2D = { x: 0, y: 0 }
  ): CustomPath {
    const k = n / d

    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = t * 2 * Math.PI
        const radius = amplitude * Math.cos(k * angle)

        return {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        }
      },
    })
  }

  /**
   * 创建Cycloid曲线
   */
  static createCycloid(
    radius: number = 50,
    cycles: number = 1,
    center: Point2D = { x: 0, y: 0 }
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = t * cycles * 2 * Math.PI

        return {
          x: center.x + radius * (angle - Math.sin(angle)),
          y: center.y + radius * (1 - Math.cos(angle)),
        }
      },
      getTangent: (t: number) => {
        const angle = t * cycles * 2 * Math.PI
        const angleScale = cycles * 2 * Math.PI

        const dx = radius * (1 - Math.cos(angle)) * angleScale
        const dy = radius * Math.sin(angle) * angleScale

        return { x: dx, y: dy }
      },
    })
  }

  /**
   * 获取自定义路径的配置函数
   */
  getPathFunctions() {
    return {
      getPoint: this.getPointFn,
      getTangent: this.getTangentFn,
      getNormal: this.getNormalFn,
      getLength: this.getLengthFn,
    }
  }

  /**
   * 检查路径函数的有效性
   */
  validateFunctions(): boolean {
    try {
      // 测试几个点
      const testPoints = [0, 0.25, 0.5, 0.75, 1]

      for (const t of testPoints) {
        const point = this.getPointFn(t)
        if (
          typeof point.x !== 'number' ||
          typeof point.y !== 'number' ||
          !isFinite(point.x) ||
          !isFinite(point.y)
        ) {
          return false
        }
      }

      return true
    } catch {
      return false
    }
  }
}
