/**
 * applyOps:按 id 寻址的增量编辑操作(阶段 C 的「写」)。
 *
 * 对标 ego-lite 的「一趟批量执行」:agent 一次发一组 ops,顺序应用、逐条回结果。
 * 未知 id 记 error 而非抛错(延续阶段 B「脏数据也不崩」的健壮性基调)。
 * 纯函数式副作用:只改传入的 SceneDocument,不碰渲染。
 */

import type { SceneDocument } from './document'
import type { SceneNode, SceneViewport } from './types'

/** 七种编辑操作 */
export type SceneOp =
  | { op: 'add'; node: SceneNode; id?: string }
  | { op: 'update'; id: string; patch: Partial<SceneNode> }
  | { op: 'move'; id: string; dx: number; dy: number }
  | { op: 'remove'; id: string }
  | { op: 'setViewport'; viewport: SceneViewport }
  | { op: 'connect'; from: string; to: string; width?: number; color?: string; id?: string }
  | { op: 'group'; members: string[]; id?: string }

export interface OpResult {
  ok: boolean
  /** add/connect/group 成功时回传新建 id */
  id?: string
  error?: string
}

/** 把一个节点整体平移 dx/dy(按 type 移动对应几何字段) */
function shiftNode(node: SceneNode, dx: number, dy: number): SceneNode {
  switch (node.type) {
    case 'rect':
      return { ...node, x: node.x + dx, y: node.y + dy }
    case 'circle':
      return { ...node, cx: node.cx + dx, cy: node.cy + dy }
    case 'line':
      return { ...node, x1: node.x1 + dx, y1: node.y1 + dy, x2: node.x2 + dx, y2: node.y2 + dy }
    case 'text':
      return { ...node, x: node.x + dx, y: node.y + dy }
  }
}

/** 移动单个节点;不存在返回 false */
function moveNode(doc: SceneDocument, id: string, dx: number, dy: number): boolean {
  const cur = doc.get(id)
  if (!cur) return false
  const moved = shiftNode(cur.node, dx, dy)
  // 用 update 落回;patch 为移动后的几何字段(update 会剔除 type)
  return doc.update(id, moved)
}

/** 应用单条 op */
function applyOne(doc: SceneDocument, op: SceneOp): OpResult {
  switch (op.op) {
    case 'add': {
      const id = doc.add(op.node, op.id)
      return id !== undefined
        ? { ok: true, id }
        : { ok: false, error: `add: id #${op.id} 已存在,拒绝覆盖` }
    }

    case 'update':
      return doc.update(op.id, op.patch)
        ? { ok: true, id: op.id }
        : { ok: false, error: `update: 节点 #${op.id} 不存在` }

    case 'move': {
      // id 可能是分组:移动全体成员
      const g = doc.getGroup(op.id)
      if (g) {
        for (const m of g.members) moveNode(doc, m, op.dx, op.dy)
        return { ok: true, id: op.id }
      }
      return moveNode(doc, op.id, op.dx, op.dy)
        ? { ok: true, id: op.id }
        : { ok: false, error: `move: 节点/分组 #${op.id} 不存在` }
    }

    case 'remove':
      return doc.remove(op.id) ? { ok: true, id: op.id } : { ok: false, error: `remove: 节点 #${op.id} 不存在` }

    case 'setViewport':
      doc.viewport = { ...op.viewport }
      return { ok: true }

    case 'connect': {
      const cid = doc.connect(op.from, op.to, { width: op.width, color: op.color, id: op.id })
      return cid
        ? { ok: true, id: cid }
        : { ok: false, error: `connect: 端点 #${op.from} 或 #${op.to} 不存在` }
    }

    case 'group': {
      const gid = doc.group(op.members, op.id)
      return gid !== undefined
        ? { ok: true, id: gid }
        : { ok: false, error: `group: id #${op.id} 已存在,拒绝覆盖` }
    }

    default:
      // 未知 op:不抛错,记 error(前向兼容)
      return { ok: false, error: `未知 op: ${JSON.stringify((op as { op?: unknown }).op)}` }
  }
}

/** 批量应用一组 ops,逐条返回结果(某条失败不影响其余) */
export function applyOps(doc: SceneDocument, ops: SceneOp[]): OpResult[] {
  const results: OpResult[] = []
  for (const op of ops ?? []) {
    try {
      results.push(applyOne(doc, op))
    } catch (e) {
      results.push({ ok: false, error: (e as Error).message })
    }
  }
  return results
}
