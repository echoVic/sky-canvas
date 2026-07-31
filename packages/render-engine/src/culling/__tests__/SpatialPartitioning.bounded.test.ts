import { describe, expect, it } from 'vitest'
import { type IBoundedObject, QuadTreeNode } from '../SpatialPartitioning'

// 松绑回归:四叉树应能索引任意「只实现 getBounds」的对象(不必是完整 IRenderCommand)
interface Box extends IBoundedObject {
  id: number
}
function box(id: number, x: number, y: number, w = 10, h = 10): Box {
  return { id, getBounds: () => ({ x, y, width: w, height: h }) }
}

describe('QuadTreeNode with IBoundedObject', () => {
  it('可索引仅含 getBounds 的对象,并按区域查询命中', () => {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: 1000, height: 1000 }, 4, 5)
    const a = box(1, 10, 10)
    const b = box(2, 900, 900)
    tree.addObject(a)
    tree.addObject(b)

    const hitTopLeft = tree.query({ x: 0, y: 0, width: 100, height: 100 })
    expect(hitTopLeft).toContain(a)
    expect(hitTopLeft).not.toContain(b)

    const hitBottomRight = tree.query({ x: 850, y: 850, width: 100, height: 100 })
    expect(hitBottomRight).toContain(b)
    expect(hitBottomRight).not.toContain(a)
  })

  it('查询区域外无命中', () => {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: 1000, height: 1000 })
    tree.addObject(box(1, 500, 500))
    expect(tree.query({ x: 0, y: 0, width: 50, height: 50 })).toHaveLength(0)
  })

  it('大量对象插入后查询只返回落在区域内的子集', () => {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: 10000, height: 10000 }, 16, 8)
    for (let i = 0; i < 5000; i++) {
      tree.addObject(box(i, (i * 37) % 10000, (i * 53) % 10000, 5, 5))
    }
    const region = { x: 0, y: 0, width: 100, height: 100 }
    const hits = tree.query(region)
    // 命中数应远小于总数,且每个命中确实与区域相交
    expect(hits.length).toBeLessThan(5000)
    for (const h of hits) {
      const b = h.getBounds()
      expect(b.x + b.width >= region.x && b.x <= region.x + region.width).toBe(true)
    }
  })
})
