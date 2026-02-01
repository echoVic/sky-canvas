/**
 * 路径简化和编辑
 * 实现Douglas-Peucker算法、曲线拟合和路径编辑功能
 */

import type { IEventBus } from '../events/EventBus'
import type { Path, PathPoint, PathSegment } from './PathBooleanOperations'

export interface SimplificationOptions {
  tolerance: number
  preserveCorners: boolean
  preserveTopology: boolean
  minSegmentLength: number
  maxSegments: number
}

export interface SimplificationResult {
  originalPoints: number
  simplifiedPoints: number
  compressionRatio: number
  path: Path
}

export interface CurvePoint {
  point: PathPoint
  curvature: number
  tangent: { x: number; y: number }
}

export interface PathEditOperation {
  type: 'insert' | 'delete' | 'move' | 'smooth' | 'corner'
  segmentIndex: number
  point?: PathPoint
  controlPoints?: PathPoint[]
}

export interface PathSimplificationEvents {
  'simplification-started': { originalPoints: number; tolerance: number }
  'simplification-completed': { result: SimplificationResult }
  'curve-fitting-started': { points: number }
  'curve-fitting-completed': { curves: number }
  'path-edited': { operation: PathEditOperation }
}

/**
 * 路径简化和编辑器
 */
export class PathSimplification {
  private eventBus?: IEventBus

  constructor() {}

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus
  }

  /**
   * 使用Douglas-Peucker算法简化路径
   */
  simplifyPath(path: Path, options: Partial<SimplificationOptions> = {}): SimplificationResult {
    const opts: SimplificationOptions = {
      tolerance: options.tolerance || 1.0,
      preserveCorners: options.preserveCorners !== false,
      preserveTopology: options.preserveTopology !== false,
      minSegmentLength: options.minSegmentLength || 0.1,
      maxSegments: options.maxSegments || Infinity,
    }

    const originalPoints = this.countPathPoints(path)

    this.eventBus?.emit('simplification-started', {
      originalPoints,
      tolerance: opts.tolerance,
    })

    const simplifiedPath = this.performSimplification(path, opts)
    const simplifiedPoints = this.countPathPoints(simplifiedPath)

    const result: SimplificationResult = {
      originalPoints,
      simplifiedPoints,
      compressionRatio: originalPoints > 0 ? simplifiedPoints / originalPoints : 1,
      path: simplifiedPath,
    }

    this.eventBus?.emit('simplification-completed', { result })

    return result
  }

  /**
   * 执行路径简化
   */
  private performSimplification(path: Path, options: SimplificationOptions): Path {
    const simplifiedSegments: PathSegment[] = []
    let currentSubpath: PathPoint[] = []

    for (const segment of path.segments) {
      switch (segment.type) {
        case 'moveTo':
          // 处理之前的子路径
          if (currentSubpath.length > 0) {
            const simplified = this.douglasPeucker(currentSubpath, options.tolerance)
            simplifiedSegments.push(...this.pointsToSegments(simplified))
            currentSubpath = []
          }

          currentSubpath.push(segment.points[0])
          simplifiedSegments.push(segment)
          break

        case 'lineTo':
          currentSubpath.push(segment.points[0])
          break

        case 'closePath':
          // 简化当前子路径
          if (currentSubpath.length > 1) {
            const simplified = this.douglasPeucker(currentSubpath, options.tolerance)
            const lineSegments = this.pointsToSegments(simplified.slice(1)) // 跳过moveTo点
            simplifiedSegments.push(...lineSegments)
          }
          simplifiedSegments.push(segment)
          currentSubpath = []
          break

        default: {
          // 对于曲线段，先转换为点序列再简化
          const points = this.segmentToPoints(segment, currentSubpath[currentSubpath.length - 1])
          currentSubpath.push(...points.slice(1))
          break
        }
      }
    }

    // 处理最后的子路径
    if (currentSubpath.length > 1) {
      const simplified = this.douglasPeucker(currentSubpath, options.tolerance)
      const lineSegments = this.pointsToSegments(simplified.slice(1))
      simplifiedSegments.push(...lineSegments)
    }

    return {
      segments: simplifiedSegments,
      closed: path.closed,
      fillRule: path.fillRule,
    }
  }

  /**
   * Douglas-Peucker算法实现
   */
  private douglasPeucker(points: PathPoint[], tolerance: number): PathPoint[] {
    if (points.length <= 2) return points

    // 找到距离起点终点连线最远的点
    let maxDistance = 0
    let maxIndex = 0
    const start = points[0]
    const end = points[points.length - 1]

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], start, end)
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    // 如果最大距离大于容差，递归处理
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance)

      // 合并结果，去掉重复的连接点
      return left.slice(0, -1).concat(right)
    } else {
      // 所有点都在容差范围内，只保留起点和终点
      return [start, end]
    }
  }

  /**
   * 计算点到直线的距离
   */
  private pointToLineDistance(point: PathPoint, lineStart: PathPoint, lineEnd: PathPoint): number {
    const A = lineEnd.y - lineStart.y
    const B = lineStart.x - lineEnd.x
    const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y

    return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
  }

  /**
   * 路径曲线拟合
   * 将直线段序列拟合为贝塞尔曲线
   */
  fitCurves(points: PathPoint[], tolerance: number = 2.0): Path {
    this.eventBus?.emit('curve-fitting-started', { points: points.length })

    if (points.length < 3) {
      return {
        segments: [
          { type: 'moveTo', points: [points[0]] },
          ...points.slice(1).map((p) => ({ type: 'lineTo' as const, points: [p] })),
        ],
        closed: false,
        fillRule: 'nonzero',
      }
    }

    const segments: PathSegment[] = []
    segments.push({ type: 'moveTo', points: [points[0]] })

    let i = 0
    while (i < points.length - 1) {
      const curveResult = this.fitCubicBezier(points, i, tolerance)

      if (curveResult.endIndex - i > 1) {
        // 拟合成功，添加贝塞尔曲线
        segments.push({
          type: 'bezierCurveTo',
          points: [curveResult.endPoint],
          controlPoints: [curveResult.cp1, curveResult.cp2],
        })
        i = curveResult.endIndex
      } else {
        // 拟合失败，使用直线
        segments.push({
          type: 'lineTo',
          points: [points[i + 1]],
        })
        i++
      }
    }

    const curveCount = segments.filter((s) => s.type === 'bezierCurveTo').length
    this.eventBus?.emit('curve-fitting-completed', { curves: curveCount })

    return {
      segments,
      closed: false,
      fillRule: 'nonzero',
    }
  }

  /**
   * 拟合三次贝塞尔曲线
   */
  private fitCubicBezier(
    points: PathPoint[],
    startIndex: number,
    tolerance: number
  ): {
    cp1: PathPoint
    cp2: PathPoint
    endPoint: PathPoint
    endIndex: number
  } {
    if (startIndex >= points.length - 1) {
      return {
        cp1: points[startIndex],
        cp2: points[startIndex],
        endPoint: points[startIndex],
        endIndex: startIndex,
      }
    }

    let bestEndIndex = startIndex + 1
    let bestCp1 = points[startIndex]
    let bestCp2 = points[bestEndIndex]

    // 尝试不同的结束点
    for (
      let endIndex = startIndex + 2;
      endIndex < Math.min(points.length, startIndex + 10);
      endIndex++
    ) {
      const result = this.calculateBezierControlPoints(points, startIndex, endIndex)
      const error = this.calculateBezierError(points, startIndex, endIndex, result.cp1, result.cp2)

      if (error < tolerance) {
        bestEndIndex = endIndex
        bestCp1 = result.cp1
        bestCp2 = result.cp2
      } else {
        break // 误差太大，停止尝试更远的点
      }
    }

    return {
      cp1: bestCp1,
      cp2: bestCp2,
      endPoint: points[bestEndIndex],
      endIndex: bestEndIndex,
    }
  }

  /**
   * 计算贝塞尔曲线控制点
   */
  private calculateBezierControlPoints(
    points: PathPoint[],
    startIndex: number,
    endIndex: number
  ): { cp1: PathPoint; cp2: PathPoint } {
    const start = points[startIndex]
    const end = points[endIndex]

    // 使用最小二乘法计算最佳控制点
    let cp1: PathPoint
    let cp2: PathPoint

    if (endIndex - startIndex === 2) {
      // 三点情况，控制点在中点
      const mid = points[startIndex + 1]
      const t = 0.5

      // 根据贝塞尔公式反推控制点
      cp1 = {
        x: start.x + (mid.x - start.x * (1 - t) * (1 - t) - end.x * t * t) / (2 * t * (1 - t)),
        y: start.y + (mid.y - start.y * (1 - t) * (1 - t) - end.y * t * t) / (2 * t * (1 - t)),
      }
      cp2 = cp1
    } else {
      // 多点情况，使用切线方向
      const startTangent = this.calculateTangent(points, startIndex)
      const endTangent = this.calculateTangent(points, endIndex)

      const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
      const controlDistance = distance / 3

      cp1 = {
        x: start.x + startTangent.x * controlDistance,
        y: start.y + startTangent.y * controlDistance,
      }

      cp2 = {
        x: end.x - endTangent.x * controlDistance,
        y: end.y - endTangent.y * controlDistance,
      }
    }

    return { cp1, cp2 }
  }

  /**
   * 计算点的切线方向
   */
  private calculateTangent(points: PathPoint[], index: number): { x: number; y: number } {
    const tangent = { x: 0, y: 0 }

    if (index === 0 && points.length > 1) {
      // 起点：使用下一个点的方向
      tangent.x = points[1].x - points[0].x
      tangent.y = points[1].y - points[0].y
    } else if (index === points.length - 1 && points.length > 1) {
      // 终点：使用前一个点的方向
      tangent.x = points[index].x - points[index - 1].x
      tangent.y = points[index].y - points[index - 1].y
    } else if (points.length > 2) {
      // 中间点：使用前后点的平均方向
      const prev = index > 0 ? points[index - 1] : points[index]
      const next = index < points.length - 1 ? points[index + 1] : points[index]

      tangent.x = (next.x - prev.x) / 2
      tangent.y = (next.y - prev.y) / 2
    }

    // 归一化
    const length = Math.sqrt(tangent.x ** 2 + tangent.y ** 2)
    if (length > 0) {
      tangent.x /= length
      tangent.y /= length
    }

    return tangent
  }

  /**
   * 计算贝塞尔曲线拟合误差
   */
  private calculateBezierError(
    points: PathPoint[],
    startIndex: number,
    endIndex: number,
    cp1: PathPoint,
    cp2: PathPoint
  ): number {
    const start = points[startIndex]
    const end = points[endIndex]
    let totalError = 0

    for (let i = startIndex + 1; i < endIndex; i++) {
      const t = (i - startIndex) / (endIndex - startIndex)
      const bezierPoint = this.evaluateCubicBezier(start, cp1, cp2, end, t)

      const distance = Math.sqrt(
        (points[i].x - bezierPoint.x) ** 2 + (points[i].y - bezierPoint.y) ** 2
      )

      totalError += distance
    }

    return totalError / (endIndex - startIndex - 1)
  }

  /**
   * 计算三次贝塞尔曲线上的点
   */
  private evaluateCubicBezier(
    p0: PathPoint,
    p1: PathPoint,
    p2: PathPoint,
    p3: PathPoint,
    t: number
  ): PathPoint {
    const u = 1 - t
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    }
  }

  /**
   * 路径编辑：插入点
   */
  editPath(path: Path, operation: PathEditOperation): Path {
    const newSegments = [...path.segments]

    switch (operation.type) {
      case 'insert':
        if (
          operation.point &&
          operation.segmentIndex >= 0 &&
          operation.segmentIndex < newSegments.length
        ) {
          // 在指定位置插入新的线段
          newSegments.splice(operation.segmentIndex + 1, 0, {
            type: 'lineTo',
            points: [operation.point],
          })
        }
        break

      case 'delete':
        if (operation.segmentIndex >= 0 && operation.segmentIndex < newSegments.length) {
          newSegments.splice(operation.segmentIndex, 1)
        }
        break

      case 'move':
        if (
          operation.point &&
          operation.segmentIndex >= 0 &&
          operation.segmentIndex < newSegments.length
        ) {
          const segment = newSegments[operation.segmentIndex]
          if (segment.points.length > 0) {
            segment.points[0] = operation.point
          }
        }
        break

      case 'smooth':
        if (operation.segmentIndex >= 0 && operation.segmentIndex < newSegments.length - 1) {
          // 将直线段转换为平滑的贝塞尔曲线
          this.smoothSegment(newSegments, operation.segmentIndex)
        }
        break

      case 'corner':
        if (operation.segmentIndex >= 0 && operation.segmentIndex < newSegments.length) {
          // 将贝塞尔曲线转换为直线段
          this.sharpenSegment(newSegments, operation.segmentIndex)
        }
        break
    }

    this.eventBus?.emit('path-edited', { operation })

    return {
      segments: newSegments,
      closed: path.closed,
      fillRule: path.fillRule,
    }
  }

  /**
   * 平滑线段（转换为贝塞尔曲线）
   */
  private smoothSegment(segments: PathSegment[], index: number): void {
    if (index < 1 || index >= segments.length - 1) return

    const prevPoint = segments[index - 1].points[0]
    const currentPoint = segments[index].points[0]
    const nextPoint = segments[index + 1].points[0]

    // 计算控制点
    const distance1 = this.distance(prevPoint, currentPoint)
    const distance2 = this.distance(currentPoint, nextPoint)
    const totalDistance = distance1 + distance2

    if (totalDistance === 0) return

    const factor = 0.3
    const cp1 = {
      x: currentPoint.x - ((nextPoint.x - prevPoint.x) * factor * distance1) / totalDistance,
      y: currentPoint.y - ((nextPoint.y - prevPoint.y) * factor * distance1) / totalDistance,
    }

    const cp2 = {
      x: currentPoint.x + ((nextPoint.x - prevPoint.x) * factor * distance2) / totalDistance,
      y: currentPoint.y + ((nextPoint.y - prevPoint.y) * factor * distance2) / totalDistance,
    }

    // 替换为贝塞尔曲线段
    segments[index] = {
      type: 'bezierCurveTo',
      points: [nextPoint],
      controlPoints: [cp1, cp2],
    }

    // 移除下一个段（因为已经包含在贝塞尔曲线中）
    segments.splice(index + 1, 1)
  }

  /**
   * 锐化线段（转换为直线）
   */
  private sharpenSegment(segments: PathSegment[], index: number): void {
    const segment = segments[index]
    if (segment.type === 'bezierCurveTo' || segment.type === 'quadraticCurveTo') {
      segments[index] = {
        type: 'lineTo',
        points: segment.points,
      }
    }
  }

  /**
   * 计算两点距离
   */
  private distance(p1: PathPoint, p2: PathPoint): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  }

  /**
   * 计算路径中的点数
   */
  private countPathPoints(path: Path): number {
    return path.segments.reduce((count, segment) => {
      return count + segment.points.length + (segment.controlPoints?.length || 0)
    }, 0)
  }

  /**
   * 将点序列转换为线段序列
   */
  private pointsToSegments(points: PathPoint[]): PathSegment[] {
    return points.slice(1).map((point) => ({
      type: 'lineTo' as const,
      points: [point],
    }))
  }

  /**
   * 将段转换为点序列（用于曲线细分）
   */
  private segmentToPoints(segment: PathSegment, startPoint: PathPoint): PathPoint[] {
    switch (segment.type) {
      case 'lineTo':
        return [startPoint, segment.points[0]]

      case 'bezierCurveTo':
        return this.tessellateBezier(
          startPoint,
          segment.controlPoints![0],
          segment.controlPoints![1],
          segment.points[0],
          16
        )

      case 'quadraticCurveTo':
        return this.tessellateQuadratic(
          startPoint,
          segment.controlPoints![0],
          segment.points[0],
          12
        )

      default:
        return [startPoint]
    }
  }

  /**
   * 贝塞尔曲线细分
   */
  private tessellateBezier(
    start: PathPoint,
    cp1: PathPoint,
    cp2: PathPoint,
    end: PathPoint,
    segments: number
  ): PathPoint[] {
    const points: PathPoint[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = this.evaluateCubicBezier(start, cp1, cp2, end, t)
      points.push(point)
    }

    return points
  }

  /**
   * 二次贝塞尔曲线细分
   */
  private tessellateQuadratic(
    start: PathPoint,
    cp: PathPoint,
    end: PathPoint,
    segments: number
  ): PathPoint[] {
    const points: PathPoint[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const u = 1 - t

      points.push({
        x: u * u * start.x + 2 * u * t * cp.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * cp.y + t * t * end.y,
      })
    }

    return points
  }

  /**
   * 分析路径曲率
   */
  analyzeCurvature(path: Path): CurvePoint[] {
    const curvePoints: CurvePoint[] = []
    const points = this.pathToPoints(path, 2.0) // 2像素精度

    if (points.length < 3) return curvePoints

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const current = points[i]
      const next = points[i + 1]

      const curvature = this.calculateCurvature(prev, current, next)
      const tangent = this.calculateTangentVector(prev, next)

      curvePoints.push({
        point: current,
        curvature,
        tangent,
      })
    }

    return curvePoints
  }

  /**
   * 计算三点曲率
   */
  private calculateCurvature(p1: PathPoint, p2: PathPoint, p3: PathPoint): number {
    const area = Math.abs((p1.x - p3.x) * (p2.y - p1.y) - (p1.x - p2.x) * (p3.y - p1.y)) / 2
    const a = this.distance(p1, p2)
    const b = this.distance(p2, p3)
    const c = this.distance(p1, p3)

    return a * b * c > 0 ? (4 * area) / (a * b * c) : 0
  }

  /**
   * 计算切线向量
   */
  private calculateTangentVector(p1: PathPoint, p3: PathPoint): { x: number; y: number } {
    const dx = p3.x - p1.x
    const dy = p3.y - p1.y
    const length = Math.sqrt(dx * dx + dy * dy)

    return length > 0 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 }
  }

  /**
   * 将路径转换为点序列
   */
  private pathToPoints(path: Path, tolerance: number): PathPoint[] {
    const points: PathPoint[] = []
    let currentPoint: PathPoint = { x: 0, y: 0 }

    for (const segment of path.segments) {
      switch (segment.type) {
        case 'moveTo':
          currentPoint = segment.points[0]
          points.push(currentPoint)
          break

        case 'lineTo':
          currentPoint = segment.points[0]
          points.push(currentPoint)
          break

        case 'bezierCurveTo': {
          const bezierPoints = this.tessellateBezier(
            currentPoint,
            segment.controlPoints![0],
            segment.controlPoints![1],
            segment.points[0],
            Math.ceil(this.distance(currentPoint, segment.points[0]) / tolerance)
          )
          points.push(...bezierPoints.slice(1))
          currentPoint = segment.points[0]
          break
        }

        case 'quadraticCurveTo': {
          const quadPoints = this.tessellateQuadratic(
            currentPoint,
            segment.controlPoints![0],
            segment.points[0],
            Math.ceil(this.distance(currentPoint, segment.points[0]) / tolerance)
          )
          points.push(...quadPoints.slice(1))
          currentPoint = segment.points[0]
          break
        }
      }
    }

    return points
  }
}
