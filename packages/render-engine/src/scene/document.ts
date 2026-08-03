/**
 * SceneDocument:有状态的画布文档模型(阶段 C)。
 *
 * 阶段 B 的 Scene 是无状态渲染输入(nodes 数组,无 id)。这里引入有状态文档:
 * 每个节点带稳定 id(agent 的长期寻址句柄),额外持有连线(connection)与分组(group)。
 * 渲染仍复用阶段 B:toScene() 摊平成 Scene 交给 SceneRenderer。
 *
 * id 生成不依赖 Math.random(worker/测试环境不可用):用自增计数器。
 */

import { nodeCenter } from './geometry'
import type { Scene, SceneNode, SceneViewport } from './types'

/** 文档里的一个带 id 节点 */
export interface DocNode {
  id: string
  node: SceneNode
}

/** 连线:连接两个节点的 id,渲染时按各自中心算成一条 line */
export interface DocConnection {
  id: string
  from: string
  to: string
  width?: number
  color?: string
}

/** 分组:一组节点 id 的逻辑聚合,move 时整体移动 */
export interface DocGroup {
  id: string
  members: string[]
}

export class SceneDocument {
  private nodes = new Map<string, SceneNode>()
  private connections = new Map<string, DocConnection>()
  private groups = new Map<string, DocGroup>()
  /** 自增序号:节点 n1/n2..、连线 c1/c2..、分组 g1/g2.. */
  private seq = { n: 0, c: 0, g: 0 }
  viewport: SceneViewport = { x: 0, y: 0, zoom: 1 }

  /**
   * 接纳一个显式 id 时,若它形如 n{数字}/c{数字}/g{数字},抬高对应计数器,
   * 使后续自增 id 不会再生成同名 id 覆盖它。
   */
  private reserveId(explicit: string, kind: 'n' | 'c' | 'g'): void {
    const m = explicit.match(/^([ncg])(\d+)$/)
    if (m && m[1] === kind) {
      const num = Number.parseInt(m[2], 10)
      if (num > this.seq[kind]) this.seq[kind] = num
    }
  }

  /**
   * 新增节点,返回其 id(未显式给 id 时按 n{seq} 生成)。
   * 显式 id 已被占用时拒绝覆盖并返回 undefined,避免静默替换既有节点。
   */
  add(node: SceneNode, id?: string): string | undefined {
    if (id !== undefined) {
      if (this.nodes.has(id)) return undefined // 显式 id 已占用:拒绝覆盖
      this.nodes.set(id, node)
      this.reserveId(id, 'n')
      return id
    }
    const nid = `n${++this.seq.n}`
    this.nodes.set(nid, node)
    return nid
  }

  /** 局部更新节点字段(patch 合并);节点不存在返回 false */
  update(id: string, patch: Partial<SceneNode>): boolean {
    const cur = this.nodes.get(id)
    if (!cur) return false
    // 同 type 内合并;patch 不应改 type,过滤掉 type 字段避免污染判别式
    const { type: _ignore, ...rest } = patch as Partial<SceneNode> & { type?: string }
    this.nodes.set(id, { ...cur, ...rest } as SceneNode)
    return true
  }

  /** 删除节点,连带清理引用它的连线与分组成员 */
  remove(id: string): boolean {
    const existed = this.nodes.delete(id)
    if (!existed) return false
    for (const [cid, c] of this.connections) {
      if (c.from === id || c.to === id) this.connections.delete(cid)
    }
    for (const g of this.groups.values()) {
      g.members = g.members.filter((m) => m !== id)
    }
    return true
  }

  get(id: string): DocNode | undefined {
    const node = this.nodes.get(id)
    return node ? { id, node } : undefined
  }

  has(id: string): boolean {
    return this.nodes.has(id)
  }

  /**
   * 连接两个已存在节点,返回连线 id;任一端不存在或显式连线 id 已占用时返回 undefined。
   */
  connect(from: string, to: string, opts?: { width?: number; color?: string; id?: string }): string | undefined {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return undefined
    if (opts?.id !== undefined) {
      if (this.connections.has(opts.id)) return undefined // 显式 id 已占用:拒绝覆盖
      this.connections.set(opts.id, { id: opts.id, from, to, width: opts.width, color: opts.color })
      this.reserveId(opts.id, 'c')
      return opts.id
    }
    const cid = `c${++this.seq.c}`
    this.connections.set(cid, { id: cid, from, to, width: opts?.width, color: opts?.color })
    return cid
  }

  /**
   * 把一组已存在节点归为一组,返回 group id;显式分组 id 已占用时返回 undefined。
   * 过滤掉不存在的成员。
   */
  group(members: string[], id?: string): string | undefined {
    const filtered = members.filter((m) => this.nodes.has(m))
    if (id !== undefined) {
      if (this.groups.has(id)) return undefined // 显式 id 已占用:拒绝覆盖
      this.groups.set(id, { id, members: filtered })
      this.reserveId(id, 'g')
      return id
    }
    const gid = `g${++this.seq.g}`
    this.groups.set(gid, { id: gid, members: filtered })
    return gid
  }

  getGroup(id: string): DocGroup | undefined {
    return this.groups.get(id)
  }

  /** 全部带 id 节点(插入顺序) */
  listNodes(): DocNode[] {
    return [...this.nodes.entries()].map(([id, node]) => ({ id, node }))
  }

  listConnections(): DocConnection[] {
    return [...this.connections.values()]
  }

  listGroups(): DocGroup[] {
    return [...this.groups.values()]
  }

  /**
   * 摊平成阶段 B 的 Scene 供渲染:节点原样输出,连线按两端节点中心算成 line 节点。
   * 端点节点缺失的连线跳过。
   */
  toScene(): Scene {
    const nodes: SceneNode[] = [...this.nodes.values()]
    for (const c of this.connections.values()) {
      const a = this.nodes.get(c.from)
      const b = this.nodes.get(c.to)
      if (!a || !b) continue
      const p1 = nodeCenter(a)
      const p2 = nodeCenter(b)
      nodes.push({ type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, width: c.width ?? 1, color: c.color })
    }
    return { viewport: this.viewport, nodes }
  }

  /** 从阶段 B 的全量 Scene 装载(bulk-load):每个节点分配自增 id */
  static fromScene(scene: Scene): SceneDocument {
    const doc = new SceneDocument()
    if (scene.viewport) doc.viewport = { ...scene.viewport }
    for (const node of scene.nodes ?? []) doc.add(node)
    return doc
  }
}
