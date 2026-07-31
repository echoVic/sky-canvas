/**
 * 场景节点几何:包围盒与中心点(纯函数,不依赖 GPU)。
 *
 * 供 connect(按节点中心连线)与 snapshot(视口裁剪按包围盒相交)共用。
 * text 无法精确测量,用 size 估算宽高,用于裁剪足够、不追求像素精确。
 */

import type { SceneNode } from './types'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** 节点包围盒(世界坐标 AABB) */
export function nodeBounds(node: SceneNode): Bounds {
  switch (node.type) {
    case 'rect':
      return { x: node.x, y: node.y, width: node.width, height: node.height }
    case 'circle':
      return { x: node.cx - node.radius, y: node.cy - node.radius, width: node.radius * 2, height: node.radius * 2 }
    case 'line': {
      const x = Math.min(node.x1, node.x2)
      const y = Math.min(node.y1, node.y2)
      return { x, y, width: Math.abs(node.x2 - node.x1), height: Math.abs(node.y2 - node.y1) }
    }
    case 'text': {
      // 估算:等宽近似 0.6em,高度约等于 size;text 的 (x,y) 视为左上角
      const width = Math.max(1, node.text.length) * node.size * 0.6
      return { x: node.x, y: node.y, width, height: node.size }
    }
  }
}

/** 节点中心点 */
export function nodeCenter(node: SceneNode): { x: number; y: number } {
  const b = nodeBounds(node)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** 两个 AABB 是否相交(边界接触算相交) */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
}
