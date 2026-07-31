import { describe, expect, it } from 'vitest'
import { SceneDocument } from '../document'
import { applyOps, type SceneOp } from '../ops'
import { snapshot, snapshotText } from '../snapshot'
import type { Scene } from '../types'

describe('SceneDocument', () => {
  it('add 生成自增 id,get 取回', () => {
    const doc = new SceneDocument()
    const id1 = doc.add({ type: 'rect', x: 0, y: 0, width: 10, height: 10 })
    const id2 = doc.add({ type: 'circle', cx: 5, cy: 5, radius: 3 })
    expect(id1).toBe('n1')
    expect(id2).toBe('n2')
    expect(doc.get('n1')?.node.type).toBe('rect')
    expect(doc.listNodes()).toHaveLength(2)
  })

  it('update 局部合并,不改 type', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 10, height: 10, color: '#fff' }, 'r')
    expect(doc.update('r', { color: '#000' } as Partial<Scene['nodes'][number]>)).toBe(true)
    const n = doc.get('r')?.node
    expect(n).toMatchObject({ type: 'rect', x: 0, color: '#000' })
    // type 字段即使被塞进 patch 也不应污染
    doc.update('r', { type: 'circle' } as never)
    expect(doc.get('r')?.node.type).toBe('rect')
  })

  it('update 不存在的 id 返回 false', () => {
    expect(new SceneDocument().update('nope', { color: '#000' } as never)).toBe(false)
  })

  it('remove 连带清理连线与分组成员', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 1, height: 1 }, 'a')
    doc.add({ type: 'rect', x: 5, y: 5, width: 1, height: 1 }, 'b')
    doc.connect('a', 'b')
    doc.group(['a', 'b'], 'g')
    expect(doc.remove('a')).toBe(true)
    expect(doc.listConnections()).toHaveLength(0) // 连线被清
    expect(doc.getGroup('g')?.members).toEqual(['b']) // 分组成员被清
  })

  it('connect 端点不存在返回 undefined', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 1, height: 1 }, 'a')
    expect(doc.connect('a', 'ghost')).toBeUndefined()
  })

  it('toScene 把连线按中心算成 line 节点', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 10, height: 10 }, 'a') // center (5,5)
    doc.add({ type: 'rect', x: 20, y: 20, width: 10, height: 10 }, 'b') // center (25,25)
    doc.connect('a', 'b', { width: 2 })
    const scene = doc.toScene()
    const line = scene.nodes.find((n) => n.type === 'line')
    expect(line).toMatchObject({ type: 'line', x1: 5, y1: 5, x2: 25, y2: 25, width: 2 })
  })

  it('fromScene / toScene bulk-load 往返', () => {
    const scene: Scene = {
      viewport: { x: 1, y: 2, zoom: 3 },
      nodes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
        { type: 'text', x: 2, y: 3, size: 12, text: 'hi' },
      ],
    }
    const doc = SceneDocument.fromScene(scene)
    expect(doc.viewport).toEqual({ x: 1, y: 2, zoom: 3 })
    expect(doc.toScene().nodes).toHaveLength(2)
    expect(doc.listNodes()[0].id).toBe('n1')
  })

  it('显式 id 命中已存在对象时拒绝覆盖并返回 undefined', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 1, height: 1 }, 'a')
    doc.add({ type: 'rect', x: 5, y: 5, width: 1, height: 1 }, 'b')
    // add 同名:拒绝覆盖,原节点保持
    expect(doc.add({ type: 'circle', cx: 9, cy: 9, radius: 9 }, 'a')).toBeUndefined()
    expect(doc.get('a')?.node).toMatchObject({ type: 'rect', x: 0 })
    // connect 同名连线 id:拒绝覆盖
    expect(doc.connect('a', 'b', { id: 'c1' })).toBe('c1')
    expect(doc.connect('a', 'b', { id: 'c1' })).toBeUndefined()
    expect(doc.listConnections()).toHaveLength(1)
    // group 同名分组 id:拒绝覆盖
    expect(doc.group(['a'], 'g1')).toBe('g1')
    expect(doc.group(['b'], 'g1')).toBeUndefined()
    expect(doc.getGroup('g1')?.members).toEqual(['a'])
  })

  it('显式 id 抬高自增计数器,后续自增 id 不再与既有显式 id 相撞', () => {
    // fromScene 装载 n1..n3 后,自增 add 应从 n4 起,不覆盖既有 n2
    const doc = SceneDocument.fromScene({
      nodes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
        { type: 'rect', x: 1, y: 1, width: 1, height: 1 },
        { type: 'rect', x: 2, y: 2, width: 1, height: 1 },
      ],
    })
    const auto = doc.add({ type: 'circle', cx: 0, cy: 0, radius: 1 })
    expect(auto).toBe('n4')
    expect(doc.listNodes()).toHaveLength(4)
    // 显式高位 id 也应抬高计数器
    doc.add({ type: 'rect', x: 0, y: 0, width: 1, height: 1 }, 'n10')
    expect(doc.add({ type: 'rect', x: 0, y: 0, width: 1, height: 1 })).toBe('n11')
    // 连线计数器同理
    doc.connect('n1', 'n2', { id: 'c5' })
    expect(doc.connect('n1', 'n2')).toBe('c6')
  })
})

describe('applyOps', () => {
  const seed = (): SceneDocument => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 10, height: 10, color: '#fff' }, 'a')
    doc.add({ type: 'circle', cx: 50, cy: 50, radius: 5 }, 'b')
    return doc
  }

  it('add/update/remove/setViewport 基本流', () => {
    const doc = seed()
    const res = applyOps(doc, [
      { op: 'add', node: { type: 'text', x: 1, y: 1, size: 10, text: 'x' }, id: 't' },
      { op: 'update', id: 'a', patch: { color: '#000' } },
      { op: 'remove', id: 'b' },
      { op: 'setViewport', viewport: { x: 9, y: 9, zoom: 2 } },
    ])
    expect(res.map((r) => r.ok)).toEqual([true, true, true, true])
    expect(doc.get('t')?.node.type).toBe('text')
    expect(doc.get('a')?.node.color).toBe('#000')
    expect(doc.has('b')).toBe(false)
    expect(doc.viewport).toEqual({ x: 9, y: 9, zoom: 2 })
  })

  it('move 平移各类型几何', () => {
    const doc = seed()
    applyOps(doc, [{ op: 'move', id: 'a', dx: 5, dy: 7 }])
    expect(doc.get('a')?.node).toMatchObject({ x: 5, y: 7 })
    applyOps(doc, [{ op: 'move', id: 'b', dx: 10, dy: 10 }])
    expect(doc.get('b')?.node).toMatchObject({ cx: 60, cy: 60 })
  })

  it('move 作用于分组移动全体成员', () => {
    const doc = seed()
    applyOps(doc, [
      { op: 'group', members: ['a', 'b'], id: 'g' },
      { op: 'move', id: 'g', dx: 100, dy: 0 },
    ])
    expect(doc.get('a')?.node).toMatchObject({ x: 100 })
    expect(doc.get('b')?.node).toMatchObject({ cx: 150 })
  })

  it('connect 成功返回连线 id', () => {
    const doc = seed()
    const [r] = applyOps(doc, [{ op: 'connect', from: 'a', to: 'b' }])
    expect(r.ok).toBe(true)
    expect(r.id).toBe('c1')
  })

  it('未知 id 记 error 而非抛错,不影响其余 op', () => {
    const doc = seed()
    const res = applyOps(doc, [
      { op: 'update', id: 'ghost', patch: { color: '#000' } },
      { op: 'move', id: 'ghost', dx: 1, dy: 1 },
      { op: 'connect', from: 'a', to: 'ghost' },
      { op: 'add', node: { type: 'rect', x: 0, y: 0, width: 1, height: 1 } },
    ])
    expect(res[0]).toMatchObject({ ok: false })
    expect(res[1]).toMatchObject({ ok: false })
    expect(res[2]).toMatchObject({ ok: false })
    expect(res[3].ok).toBe(true) // 后续 op 不受影响
  })

  it('未知 op 类型记 error 不抛错', () => {
    const doc = seed()
    const [r] = applyOps(doc, [{ op: 'explode', id: 'a' } as unknown as SceneOp])
    expect(r.ok).toBe(false)
    expect(r.error).toContain('未知 op')
  })

  it('add/group 显式 id 已占用时 OpResult.ok=false 且不覆盖', () => {
    const doc = seed() // 已有 a(rect)/b(circle)
    const res = applyOps(doc, [
      { op: 'add', node: { type: 'text', x: 0, y: 0, size: 10, text: 'x' }, id: 'a' },
      { op: 'group', members: ['a', 'b'], id: 'gg' },
      { op: 'group', members: ['a'], id: 'gg' },
    ])
    expect(res[0]).toMatchObject({ ok: false }) // add 'a' 已占用
    expect(res[0].error).toContain('已存在')
    expect(doc.get('a')?.node.type).toBe('rect') // 原节点未被覆盖
    expect(res[1].ok).toBe(true)
    expect(res[2]).toMatchObject({ ok: false }) // group 'gg' 已占用
  })
})

describe('snapshot', () => {
  const build = (): SceneDocument => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 120, y: 60, width: 360, height: 320, color: '#161b22' }, 'n1')
    doc.add({ type: 'text', x: 150, y: 110, size: 26, text: 'Sign In', color: '#e6edf3' }, 'n2')
    doc.connect('n1', 'n2', {})
    doc.group(['n1', 'n2'], 'g1')
    return doc
  }

  it('结构化快照:ref 从 1 起,含 id/type/summary', () => {
    const snap = snapshot(build())
    expect(snap.total).toBe(2)
    expect(snap.objects[0]).toMatchObject({ ref: 1, id: 'n1', type: 'rect' })
    expect(snap.objects[1]).toMatchObject({ ref: 2, id: 'n2', type: 'text' })
    expect(snap.connections[0]).toMatchObject({ id: 'c1', from: 'n1', to: 'n2' })
    expect(snap.groups[0]).toMatchObject({ id: 'g1', members: ['n1', 'n2'] })
  })

  it('文本形态含 @N #id 双轨与几何摘要', () => {
    const text = snapshotText(build())
    expect(text).toContain('@1 #n1 rect')
    expect(text).toContain('@2 #n2 text')
    expect(text).toContain('"Sign In"')
    expect(text).toContain('connections: c1 n1->n2')
    expect(text).toContain('groups: g1 [n1,n2]')
  })

  it('视口裁剪:只含与可见区域相交的对象', () => {
    const doc = new SceneDocument()
    doc.add({ type: 'rect', x: 0, y: 0, width: 10, height: 10 }, 'near') // 视口内
    doc.add({ type: 'rect', x: 9000, y: 9000, width: 10, height: 10 }, 'far') // 视口外
    const snap = snapshot(doc, {
      scope: 'viewport',
      visibleRegion: { x: -100, y: -100, width: 500, height: 500 },
    })
    expect(snap.total).toBe(2) // 总数仍报 2
    expect(snap.objects).toHaveLength(1) // 只 1 个可见
    expect(snap.objects[0].id).toBe('near')
  })
})
