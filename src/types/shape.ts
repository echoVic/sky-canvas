/**
 * 前端 Shape 数据类型定义
 * 避免直接依赖 render-engine 的 Shape 类
 */

/**
 * 基础形状数据接口
 */
export interface ShapeData {
  id: string
  type: string
  x: number
  y: number
  visible: boolean
  zIndex: number
  style: ShapeStyle
}

/**
 * 形状样式接口
 */
export interface ShapeStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  [key: string]: any
}

/**
 * 矩形数据接口
 */
export interface RectangleData extends ShapeData {
  type: 'rectangle'
  width: number
  height: number
}

/**
 * 圆形数据接口
 */
export interface CircleData extends ShapeData {
  type: 'circle'
  radius: number
}

/**
 * 路径数据接口
 */
export interface PathData extends ShapeData {
  type: 'path'
  points: { x: number; y: number }[]
}

/**
 * 文本数据接口
 */
export interface TextData extends ShapeData {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
}

/**
 * 联合类型：所有形状数据
 */
export type AnyShapeData = RectangleData | CircleData | PathData | TextData

/**
 * 选择区域数据
 */
export interface SelectionBounds {
  x: number
  y: number
  width: number
  height: number
}
