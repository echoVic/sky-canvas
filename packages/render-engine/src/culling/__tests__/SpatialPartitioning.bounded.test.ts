import { describe, expect, it } from 'vitest'
import { CullingManager, type IBoundedObject, QuadTreeNode } from '../SpatialPartitioning'

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

// 本轮 diff 新增:CullingManager.cull 的精确剔除对无 isVisible 的对象退化为
// 包围盒相交判断;有 isVisible 时优先用之。此分支在既有测试中未覆盖。
describe('CullingManager.cull isVisible 可选回退', () => {
  it('对象无 isVisible 时,退化为包围盒与视口相交判断(相交保留,不相交剔除)', () => {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: 1000, height: 1000 }, 4, 5)
    const inside = box(1, 100, 100, 10, 10) // 落在视口内
    const outside = box(2, 900, 900, 10, 10) // 落在视口外
    tree.addObject(inside)
    tree.addObject(outside)

    // cullMargin=0,使精确剔除判定不被扩展视口干扰
    const mgr = new CullingManager(tree, 0)
    const visible = mgr.cull({ x: 0, y: 0, width: 200, height: 200 })

    expect(visible).toContain(inside)
    expect(visible).not.toContain(outside)
  })

  it('对象自带 isVisible 时优先使用其返回值(覆盖包围盒结论)', () => {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: 1000, height: 1000 }, 4, 5)
    // 包围盒落在视口内,但 isVisible 显式返回 false => 应被剔除
    const obj: IBoundedObject & { id: number } = {
      id: 1,
      getBounds: () => ({ x: 100, y: 100, width: 10, height: 10 }),
      isVisible: () => false,
    }
    tree.addObject(obj)

    const mgr = new CullingManager(tree, 0)
    const visible = mgr.cull({ x: 0, y: 0, width: 200, height: 200 })

    expect(visible).not.toContain(obj)
    // 统计:查询命中 1,精确剔除后可见 0,被剔除 1
    const stats = mgr.getStats()
    expect(stats.visibleObjects).toBe(0)
    expect(stats.culledObjects).toBe(1)
  })
})
