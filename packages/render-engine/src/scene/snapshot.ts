/**
 * snapshot:把画布文档压成一份 agent 友好的语义快照(阶段 C 的「读」)。
 *
 * 对标 ego-lite 的 Snapshot:不给 agent 原始实例数据,只给对象级语义视图——
 * 每个对象一行:@N(当轮短号)+ #id(稳定长号)+ 类型 + 关键几何 + 颜色/文本。
 * 双轨寻址:@N 只在本次快照有效;#id 跨轮稳定。
 *
 * 支持视口裁剪(scope='viewport'):只快照与当前视口相交的对象,对标 ego 的
 * only_within_viewport。纯函数,不依赖 GPU。
 */

import type { SceneDocument } from './document'
import { boundsIntersect, type Bounds, nodeBounds } from './geometry'
import type { SceneNode } from './types'

export interface SnapshotObject {
  /** 当轮短号,从 1 起;只对本次快照有效 */
  ref: number
  /** 稳定 id,跨轮有效 */
  id: string
  type: SceneNode['type']
  /** 一行式摘要(几何 + 颜色/文本) */
  summary: string
}

export interface SnapshotConnection {
  ref: number
  id: string
  from: string
  to: string
}

export interface SceneSnapshot {
  viewport: { x: number; y: number; zoom: number }
  scope: 'full' | 'viewport'
  /** 场景中对象总数(裁剪前),便于 agent 知道视口外还有多少 */
  total: number
  objects: SnapshotObject[]
  connections: SnapshotConnection[]
  groups: { id: string; members: string[] }[]
}

export interface SnapshotOptions {
  /** 'full' 全量(默认) | 'viewport' 只含与视口相交的对象 */
  scope?: 'full' | 'viewport'
  /** 视口对应的世界可见区域(scope='viewport' 时必需);由渲染侧按画布尺寸/缩放算出 */
  visibleRegion?: Bounds
}

const round = (n: number) => Math.round(n * 100) / 100

/** 单个节点的一行摘要 */
function summarize(node: SceneNode): string {
  switch (node.type) {
    case 'rect':
      return `(${round(node.x)},${round(node.y)}) ${round(node.width)}x${round(node.height)}${node.color ? ` ${node.color}` : ''}`
    case 'circle':
      return `(${round(node.cx)},${round(node.cy)}) r=${round(node.radius)}${node.color ? ` ${node.color}` : ''}`
    case 'line':
      return `(${round(node.x1)},${round(node.y1)})->(${round(node.x2)},${round(node.y2)})${node.color ? ` ${node.color}` : ''}`
    case 'text':
      return `(${round(node.x)},${round(node.y)}) ${JSON.stringify(node.text)} size=${node.size}${node.color ? ` ${node.color}` : ''}`
  }
}

/** 生成结构化快照 */
export function snapshot(doc: SceneDocument, opts: SnapshotOptions = {}): SceneSnapshot {
  const scope = opts.scope ?? 'full'
  const all = doc.listNodes()
  const region = opts.visibleRegion

  const visible =
    scope === 'viewport' && region
      ? all.filter(({ node }) => boundsIntersect(nodeBounds(node), region))
      : all

  const objects: SnapshotObject[] = visible.map(({ id, node }, i) => ({
    ref: i + 1,
    id,
    type: node.type,
    summary: summarize(node),
  }))

  const connections: SnapshotConnection[] = doc.listConnections().map((c, i) => ({
    ref: i + 1,
    id: c.id,
    from: c.from,
    to: c.to,
  }))

  return {
    viewport: doc.viewport,
    scope,
    total: all.length,
    objects,
    connections,
    groups: doc.listGroups().map((g) => ({ id: g.id, members: g.members })),
  }
}

/**
 * 结构化快照 → 文本形态(给 LLM 直接读)。示例:
 *   viewport: (0,0) zoom=1 | 4 objects (showing 4)
 *   @1 #n1 rect   (120,60) 360x320 #161b22
 *   @2 #n2 text   (150,110) "Sign In" size=26 #e6edf3
 *   connections: c1 n1->n2
 *   groups: g1 [n1,n2]
 */
export function snapshotText(doc: SceneDocument, opts: SnapshotOptions = {}): string {
  const snap = snapshot(doc, opts)
  const vp = snap.viewport
  const lines: string[] = []
  lines.push(
    `viewport: (${round(vp.x)},${round(vp.y)}) zoom=${vp.zoom} | ${snap.total} objects (showing ${snap.objects.length})`
  )
  for (const o of snap.objects) {
    lines.push(`@${o.ref} #${o.id} ${o.type.padEnd(6)} ${o.summary}`)
  }
  if (snap.connections.length > 0) {
    lines.push(`connections: ${snap.connections.map((c) => `${c.id} ${c.from}->${c.to}`).join('  ')}`)
  }
  if (snap.groups.length > 0) {
    lines.push(`groups: ${snap.groups.map((g) => `${g.id} [${g.members.join(',')}]`).join('  ')}`)
  }
  return lines.join('\n')
}
