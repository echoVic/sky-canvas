/**
 * 路径动画类型定义
 */

import type { EasingFunction, EasingType } from './AnimationTypes'

export interface Point2D {
  x: number
  y: number
}

export interface Vector2D extends Point2D {
  length?: number
  angle?: number
}

export enum PathType {
  LINEAR = 'linear',
  BEZIER_QUADRATIC = 'bezier-quadratic',
  BEZIER_CUBIC = 'bezier-cubic',
  SPLINE = 'spline',
  CIRCLE = 'circle',
  ELLIPSE = 'ellipse',
  CUSTOM = 'custom',
}

export interface PathPoint extends Point2D {
  t: number // 参数化位置 0-1
  tangent?: Vector2D // 切线向量
  normal?: Vector2D // 法线向量
  curvature?: number // 曲率
}

export interface LinearPathConfig {
  type: PathType.LINEAR
  start: Point2D
  end: Point2D
}

export interface QuadraticBezierPathConfig {
  type: PathType.BEZIER_QUADRATIC
  start: Point2D
  control: Point2D
  end: Point2D
}

export interface CubicBezierPathConfig {
  type: PathType.BEZIER_CUBIC
  start: Point2D
  control1: Point2D
  control2: Point2D
  end: Point2D
}

export interface SplinePathConfig {
  type: PathType.SPLINE
  points: Point2D[]
  tension?: number // 张力系数，默认0.5
  closed?: boolean // 是否闭合
}

export interface CirclePathConfig {
  type: PathType.CIRCLE
  center: Point2D
  radius: number
  startAngle?: number // 起始角度（弧度）
  endAngle?: number // 结束角度（弧度）
  clockwise?: boolean // 顺时针方向，默认true
}

export interface EllipsePathConfig {
  type: PathType.ELLIPSE
  center: Point2D
  radiusX: number
  radiusY: number
  rotation?: number // 椭圆旋转角度（弧度）
  startAngle?: number
  endAngle?: number
  clockwise?: boolean
}

export interface CustomPathConfig {
  type: PathType.CUSTOM
  getPoint: (t: number) => Point2D
  getTangent?: (t: number) => Vector2D
  getNormal?: (t: number) => Vector2D
  getLength?: () => number
}

export type PathConfig =
  | LinearPathConfig
  | QuadraticBezierPathConfig
  | CubicBezierPathConfig
  | SplinePathConfig
  | CirclePathConfig
  | EllipsePathConfig
  | CustomPathConfig

export interface PathAnimationConfig {
  path: PathConfig
  duration: number
  easing?: EasingType | EasingFunction
  autoRotate?: boolean // 是否自动根据路径方向旋转
  rotationOffset?: number // 旋转偏移量（度）
  startOffset?: number // 起始位置偏移 0-1
  endOffset?: number // 结束位置偏移 0-1
  loop?: boolean | number
  yoyo?: boolean
  delay?: number
  autoStart?: boolean
}

export interface PathMotionInfo {
  position: Point2D
  rotation?: number
  tangent?: Vector2D
  normal?: Vector2D
  progress: number
  distance: number
  totalDistance: number
}

export interface IPath {
  readonly type: PathType
  readonly length: number

  getPoint(t: number): Point2D
  getTangent(t: number): Vector2D
  getNormal(t: number): Vector2D
  getLength(): number
  getCurvature(t: number): number

  // 路径采样
  sample(segments?: number): PathPoint[]

  // 获取最接近给定点的路径点
  getClosestPoint(point: Point2D): PathPoint

  // 路径分割
  split(t: number): [IPath, IPath]

  // 路径连接
  concat(other: IPath): IPath

  // 路径变换
  transform(matrix: number[]): IPath

  // 获取边界框
  getBounds(): { min: Point2D; max: Point2D }
}
