/**
 * 声明式场景 → 命令式实例数据的纯转换(不依赖 GPU,可单测)
 */

import type { CircleInstance, Color, LineInstance, RectInstance } from '../adapters/webgpu'
import type { Scene, SceneNode } from './types'

/** 文本节点转成 drawText 所需参数 */
export interface TextDraw {
  text: string
  x: number
  y: number
  size: number
  color: Color
}

/** 分桶后的实例数据 */
export interface SceneInstances {
  rects: RectInstance[]
  circles: CircleInstance[]
  lines: LineInstance[]
  texts: TextDraw[]
}

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 }

/**
 * 解析颜色字符串为 Color。支持 #rgb / #rgba / #rrggbb / #rrggbbaa。
 * 解析失败或缺省时返回白色(不抛错,保证 agent 生成的脏数据也能渲染)。
 */
export function parseColor(hex?: string): Color {
  if (!hex) return WHITE
  let s = hex.trim()
  if (s.startsWith('#')) s = s.slice(1)
  // 展开短式 #rgb / #rgba
  if (s.length === 3 || s.length === 4) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (s.length !== 6 && s.length !== 8) return WHITE
  const n = (i: number) => Number.parseInt(s.slice(i, i + 2), 16) / 255
  const r = n(0)
  const g = n(2)
  const b = n(4)
  const a = s.length === 8 ? n(6) : 1
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) return WHITE
  return { r, g, b, a }
}

/**
 * 把场景节点按 type 分桶为实例数组。未知 type 静默跳过(前向兼容)。
 * 纯函数:同一输入恒定输出,便于单测。
 */
export function sceneToInstances(scene: Scene): SceneInstances {
  const out: SceneInstances = { rects: [], circles: [], lines: [], texts: [] }
  const nodes: SceneNode[] = scene?.nodes ?? []
  for (const node of nodes) {
    switch (node.type) {
      case 'rect':
        out.rects.push({
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          color: parseColor(node.color),
        })
        break
      case 'circle':
        out.circles.push({
          cx: node.cx,
          cy: node.cy,
          radius: node.radius,
          color: parseColor(node.color),
        })
        break
      case 'line':
        out.lines.push({
          x1: node.x1,
          y1: node.y1,
          x2: node.x2,
          y2: node.y2,
          width: node.width ?? 1,
          color: parseColor(node.color),
        })
        break
      case 'text':
        out.texts.push({
          text: node.text,
          x: node.x,
          y: node.y,
          size: node.size,
          color: parseColor(node.color),
        })
        break
      default:
        // 未知 type:跳过,不抛错(前向兼容后续新增节点类型)
        break
    }
  }
  return out
}
