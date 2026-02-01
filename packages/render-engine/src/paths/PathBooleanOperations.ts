/**
 * 路径布尔运算
 * 实现路径的并集、交集、差集和异或等布尔操作
 */

import type { IEventBus } from '../events/EventBus'

export interface PathPoint {
  x: number
  y: number
}

export interface PathSegment {
  type: 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'quadraticCurveTo' | 'arc' | 'closePath'
  points: PathPoint[]
  // 贝塞尔曲线的控制点
  controlPoints?: PathPoint[]
  // 圆弧参数
  radius?: number
  startAngle?: number
  endAngle?: number
  anticlockwise?: boolean
}

export interface Path {
  segments: PathSegment[]
  closed: boolean
  fillRule: 'nonzero' | 'evenodd'
}

export interface BooleanOperationResult {
  paths: Path[]
  operation: BooleanOperation
  success: boolean
  error?: string
}

export type BooleanOperation = 'union' | 'intersection' | 'difference' | 'exclusion'

export interface PathBooleanEvents {
  'operation-started': { operation: BooleanOperation; pathCount: number }
  'operation-completed': { operation: BooleanOperation; result: BooleanOperationResult }
  'operation-failed': { operation: BooleanOperation; error: string }
}

/**
 * 路径布尔运算器
 * 使用Sutherland-Hodgman算法和Weiler-Atherton算法实现
 */
export class PathBooleanOperations {
  private eventBus?: IEventBus
  private precision = 1e-10

  constructor() {}

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus
  }

  /**
   * 设置计算精度
   */
  setPrecision(precision: number): void {
    this.precision = Math.max(1e-15, Math.min(1e-1, precision))
  }

  /**
   * 路径并集操作
   */
  union(pathA: Path, pathB: Path): BooleanOperationResult {
    return this.performBooleanOperation(pathA, pathB, 'union')
  }

  /**
   * 路径交集操作
   */
  intersection(pathA: Path, pathB: Path): BooleanOperationResult {
    return this.performBooleanOperation(pathA, pathB, 'intersection')
  }

  /**
   * 路径差集操作 (A - B)
   */
  difference(pathA: Path, pathB: Path): BooleanOperationResult {
    return this.performBooleanOperation(pathA, pathB, 'difference')
  }

  /**
   * 路径异或操作
   */
  exclusion(pathA: Path, pathB: Path): BooleanOperationResult {
    return this.performBooleanOperation(pathA, pathB, 'exclusion')
  }

  /**
   * 执行布尔操作
   */
  private performBooleanOperation(
    pathA: Path,
    pathB: Path,
    operation: BooleanOperation
  ): BooleanOperationResult {
    this.eventBus?.emit('operation-started', {
      operation,
      pathCount: 2,
    })

    try {
      // 将路径转换为多边形
      const polyA = this.pathToPolygon(pathA)
      const polyB = this.pathToPolygon(pathB)

      // 执行布尔运算
      let resultPolygons: PathPoint[][]

      switch (operation) {
        case 'union':
          resultPolygons = this.polygonUnion(polyA, polyB)
          break
        case 'intersection':
          resultPolygons = this.polygonIntersection(polyA, polyB)
          break
        case 'difference':
          resultPolygons = this.polygonDifference(polyA, polyB)
          break
        case 'exclusion':
          resultPolygons = this.polygonExclusion(polyA, polyB)
          break
        default:
          throw new Error(`Unknown boolean operation: ${operation}`)
      }

      // 将多边形转换回路径
      const resultPaths = resultPolygons.map((poly) => this.polygonToPath(poly))

      const result: BooleanOperationResult = {
        paths: resultPaths,
        operation,
        success: true,
      }

      this.eventBus?.emit('operation-completed', { operation, result })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.eventBus?.emit('operation-failed', { operation, error: errorMessage })

      return {
        paths: [],
        operation,
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 将路径转换为多边形点数组
   */
  private pathToPolygon(path: Path): PathPoint[][] {
    const polygons: PathPoint[][] = []
    let currentPolygon: PathPoint[] = []
    let currentPoint: PathPoint = { x: 0, y: 0 }

    for (const segment of path.segments) {
      switch (segment.type) {
        case 'moveTo':
          if (currentPolygon.length > 0) {
            polygons.push(currentPolygon)
            currentPolygon = []
          }
          currentPoint = segment.points[0]
          currentPolygon.push({ ...currentPoint })
          break

        case 'lineTo':
          currentPoint = segment.points[0]
          currentPolygon.push({ ...currentPoint })
          break

        case 'bezierCurveTo': {
          // 将贝塞尔曲线分解为直线段
          const bezierPoints = this.tessellateBezier(
            currentPoint,
            segment.controlPoints![0],
            segment.controlPoints![1],
            segment.points[0],
            16 // 细分段数
          )
          currentPolygon.push(...bezierPoints.slice(1)) // 跳过第一个点
          currentPoint = segment.points[0]
          break
        }

        case 'quadraticCurveTo': {
          // 将二次贝塞尔曲线分解为直线段
          const quadPoints = this.tessellateQuadratic(
            currentPoint,
            segment.controlPoints![0],
            segment.points[0],
            12 // 细分段数
          )
          currentPolygon.push(...quadPoints.slice(1))
          currentPoint = segment.points[0]
          break
        }

        case 'arc': {
          // 将圆弧分解为直线段
          const arcPoints = this.tessellateArc(
            currentPoint,
            segment.radius!,
            segment.startAngle!,
            segment.endAngle!,
            segment.anticlockwise || false,
            24 // 细分段数
          )
          currentPolygon.push(...arcPoints.slice(1))
          currentPoint = arcPoints[arcPoints.length - 1]
          break
        }

        case 'closePath':
          if (currentPolygon.length > 2) {
            // 确保多边形闭合
            const first = currentPolygon[0]
            const last = currentPolygon[currentPolygon.length - 1]
            if (
              Math.abs(first.x - last.x) > this.precision ||
              Math.abs(first.y - last.y) > this.precision
            ) {
              currentPolygon.push({ ...first })
            }
          }
          break
      }
    }

    if (currentPolygon.length > 0) {
      polygons.push(currentPolygon)
    }

    return polygons
  }

  /**
   * 将多边形转换为路径
   */
  private polygonToPath(polygon: PathPoint[]): Path {
    if (polygon.length === 0) {
      return { segments: [], closed: false, fillRule: 'nonzero' }
    }

    const segments: PathSegment[] = []

    // 移动到起始点
    segments.push({
      type: 'moveTo',
      points: [polygon[0]],
    })

    // 添加直线段
    for (let i = 1; i < polygon.length; i++) {
      segments.push({
        type: 'lineTo',
        points: [polygon[i]],
      })
    }

    // 闭合路径
    segments.push({
      type: 'closePath',
      points: [],
    })

    return {
      segments,
      closed: true,
      fillRule: 'nonzero',
    }
  }

  /**
   * 多边形并集运算
   */
  private polygonUnion(polyA: PathPoint[][], polyB: PathPoint[][]): PathPoint[][] {
    // 使用Sutherland-Hodgman算法的简化版本
    const result: PathPoint[][] = []

    // 对于每个多边形A，与所有多边形B计算并集
    for (const a of polyA) {
      let currentResult = [a]

      for (const b of polyB) {
        const newResult: PathPoint[][] = []

        for (const poly of currentResult) {
          const unionResult = this.clipPolygonUnion(poly, b)
          newResult.push(...unionResult)
        }

        currentResult = newResult
      }

      result.push(...currentResult)
    }

    // 去重和清理
    return this.cleanupPolygons(result)
  }

  /**
   * 多边形交集运算
   */
  private polygonIntersection(polyA: PathPoint[][], polyB: PathPoint[][]): PathPoint[][] {
    const result: PathPoint[][] = []

    for (const a of polyA) {
      for (const b of polyB) {
        const intersection = this.clipPolygonIntersection(a, b)
        if (intersection.length > 2) {
          result.push(intersection)
        }
      }
    }

    return this.cleanupPolygons(result)
  }

  /**
   * 多边形差集运算
   */
  private polygonDifference(polyA: PathPoint[][], polyB: PathPoint[][]): PathPoint[][] {
    let result = [...polyA]

    for (const b of polyB) {
      const newResult: PathPoint[][] = []

      for (const a of result) {
        const difference = this.clipPolygonDifference(a, b)
        newResult.push(...difference)
      }

      result = newResult
    }

    return this.cleanupPolygons(result)
  }

  /**
   * 多边形异或运算
   */
  private polygonExclusion(polyA: PathPoint[][], polyB: PathPoint[][]): PathPoint[][] {
    const unionResult = this.polygonUnion(polyA, polyB)
    const intersectionResult = this.polygonIntersection(polyA, polyB)

    return this.polygonDifference(unionResult, intersectionResult)
  }

  /**
   * 使用Sutherland-Hodgman算法裁剪多边形（并集）
   */
  private clipPolygonUnion(subject: PathPoint[], clip: PathPoint[]): PathPoint[][] {
    // 简化实现：如果不相交，返回两个多边形；如果相交，合并
    if (this.polygonsIntersect(subject, clip)) {
      return [this.mergePolygons(subject, clip)]
    } else {
      return [subject, clip]
    }
  }

  /**
   * 多边形交集裁剪
   */
  private clipPolygonIntersection(subject: PathPoint[], clip: PathPoint[]): PathPoint[] {
    let outputList = [...subject]

    for (let i = 0; i < clip.length; i++) {
      if (outputList.length === 0) break

      const inputList = outputList
      outputList = []

      if (inputList.length === 0) continue

      const clipEdgeStart = clip[i]
      const clipEdgeEnd = clip[(i + 1) % clip.length]

      let s = inputList[inputList.length - 1]

      for (const e of inputList) {
        if (this.isInside(e, clipEdgeStart, clipEdgeEnd)) {
          if (!this.isInside(s, clipEdgeStart, clipEdgeEnd)) {
            const intersection = this.getIntersection(s, e, clipEdgeStart, clipEdgeEnd)
            if (intersection) {
              outputList.push(intersection)
            }
          }
          outputList.push(e)
        } else if (this.isInside(s, clipEdgeStart, clipEdgeEnd)) {
          const intersection = this.getIntersection(s, e, clipEdgeStart, clipEdgeEnd)
          if (intersection) {
            outputList.push(intersection)
          }
        }
        s = e
      }
    }

    return outputList
  }

  /**
   * 多边形差集裁剪
   */
  private clipPolygonDifference(subject: PathPoint[], clip: PathPoint[]): PathPoint[][] {
    // 反转clip的方向，然后执行交集操作
    const reversedClip = [...clip].reverse()
    const result = this.clipPolygonIntersection(subject, reversedClip)

    return result.length > 2 ? [result] : []
  }

  /**
   * 判断点是否在边的内侧
   */
  private isInside(point: PathPoint, edgeStart: PathPoint, edgeEnd: PathPoint): boolean {
    // 使用叉积判断点在边的哪一侧
    const cross =
      (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
      (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
    return cross >= 0
  }

  /**
   * 计算两条线段的交点
   */
  private getIntersection(
    p1: PathPoint,
    p2: PathPoint,
    p3: PathPoint,
    p4: PathPoint
  ): PathPoint | null {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)

    if (Math.abs(denom) < this.precision) {
      return null // 平行线
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom

    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    }
  }

  /**
   * 检查两个多边形是否相交
   */
  private polygonsIntersect(polyA: PathPoint[], polyB: PathPoint[]): boolean {
    // 简化检查：检查任意边是否相交
    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i]
      const a2 = polyA[(i + 1) % polyA.length]

      for (let j = 0; j < polyB.length; j++) {
        const b1 = polyB[j]
        const b2 = polyB[(j + 1) % polyB.length]

        if (this.linesIntersect(a1, a2, b1, b2)) {
          return true
        }
      }
    }

    // 检查一个多边形是否在另一个内部
    return this.pointInPolygon(polyA[0], polyB) || this.pointInPolygon(polyB[0], polyA)
  }

  /**
   * 检查两条线段是否相交
   */
  private linesIntersect(p1: PathPoint, p2: PathPoint, p3: PathPoint, p4: PathPoint): boolean {
    const d1 = this.direction(p3, p4, p1)
    const d2 = this.direction(p3, p4, p2)
    const d3 = this.direction(p1, p2, p3)
    const d4 = this.direction(p1, p2, p4)

    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  }

  /**
   * 计算点相对于直线的方向
   */
  private direction(p1: PathPoint, p2: PathPoint, p3: PathPoint): number {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y)
  }

  /**
   * 点在多边形内测试
   */
  private pointInPolygon(point: PathPoint, polygon: PathPoint[]): boolean {
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x <
          ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
            (polygon[j].y - polygon[i].y) +
            polygon[i].x
      ) {
        inside = !inside
      }
    }

    return inside
  }

  /**
   * 合并两个相交的多边形（简化版本）
   */
  private mergePolygons(polyA: PathPoint[], polyB: PathPoint[]): PathPoint[] {
    // 这是一个简化实现，实际应该使用更复杂的凸包算法
    const allPoints = [...polyA, ...polyB]
    return this.convexHull(allPoints)
  }

  /**
   * 计算凸包
   */
  private convexHull(points: PathPoint[]): PathPoint[] {
    if (points.length < 3) return points

    // Graham扫描算法
    const sortedPoints = points.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))

    const lower = []
    for (const point of sortedPoints) {
      while (
        lower.length >= 2 &&
        this.crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
      ) {
        lower.pop()
      }
      lower.push(point)
    }

    const upper = []
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
      const point = sortedPoints[i]
      while (
        upper.length >= 2 &&
        this.crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
      ) {
        upper.pop()
      }
      upper.push(point)
    }

    // 移除重复的点
    upper.pop()
    lower.pop()

    return lower.concat(upper)
  }

  /**
   * 计算叉积
   */
  private crossProduct(o: PathPoint, a: PathPoint, b: PathPoint): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  }

  /**
   * 清理和去重多边形
   */
  private cleanupPolygons(polygons: PathPoint[][]): PathPoint[][] {
    return polygons.filter((poly) => poly.length > 2)
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
      const u = 1 - t

      points.push({
        x: u * u * u * start.x + 3 * u * u * t * cp1.x + 3 * u * t * t * cp2.x + t * t * t * end.x,
        y: u * u * u * start.y + 3 * u * u * t * cp1.y + 3 * u * t * t * cp2.y + t * t * t * end.y,
      })
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
   * 圆弧细分
   */
  private tessellateArc(
    center: PathPoint,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise: boolean,
    segments: number
  ): PathPoint[] {
    const points: PathPoint[] = []

    let angleStep = (endAngle - startAngle) / segments
    if (anticlockwise) {
      angleStep = -angleStep
    }

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      })
    }

    return points
  }
}
