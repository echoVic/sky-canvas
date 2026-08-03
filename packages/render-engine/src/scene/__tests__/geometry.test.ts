import { describe, expect, it } from 'vitest'
import { boundsIntersect, nodeBounds, nodeCenter } from '../geometry'
import type { SceneNode } from '../types'

describe('nodeBounds', () => {
  it('rect 直接返回其 x/y/width/height', () => {
    const n: SceneNode = { type: 'rect', x: 10, y: 20, width: 30, height: 40 }
    expect(nodeBounds(n)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })

  it('circle 以圆心为中心展开为 2r 见方的 AABB', () => {
    const n: SceneNode = { type: 'circle', cx: 50, cy: 60, radius: 5 }
    expect(nodeBounds(n)).toEqual({ x: 45, y: 55, width: 10, height: 10 })
  })

  it('line 取两端点的 min 作为原点、绝对差作为宽高(方向无关)', () => {
    const n: SceneNode = { type: 'line', x1: 30, y1: 40, x2: 10, y2: 5 }
    expect(nodeBounds(n)).toEqual({ x: 10, y: 5, width: 20, height: 35 })
  })

  it('line 水平/垂直线宽或高为 0', () => {
    const horizontal: SceneNode = { type: 'line', x1: 0, y1: 5, x2: 100, y2: 5 }
    expect(nodeBounds(horizontal)).toEqual({ x: 0, y: 5, width: 100, height: 0 })
  })

  it('text 用 0.6em 估算宽度、size 作为高度', () => {
    const n: SceneNode = { type: 'text', x: 2, y: 3, size: 10, text: 'abcd' }
    // width = length(4) * size(10) * 0.6 = 24
    expect(nodeBounds(n)).toEqual({ x: 2, y: 3, width: 24, height: 10 })
  })

  it('text 空串仍保证至少 1 字宽度(Math.max(1,len))', () => {
    const n: SceneNode = { type: 'text', x: 0, y: 0, size: 20, text: '' }
    // width = max(1,0) * 20 * 0.6 = 12
    expect(nodeBounds(n)).toEqual({ x: 0, y: 0, width: 12, height: 20 })
  })
})

describe('nodeCenter', () => {
  it('rect 中心为几何中点', () => {
    expect(nodeCenter({ type: 'rect', x: 0, y: 0, width: 10, height: 20 })).toEqual({ x: 5, y: 10 })
  })

  it('circle 中心即圆心', () => {
    expect(nodeCenter({ type: 'circle', cx: 7, cy: 9, radius: 3 })).toEqual({ x: 7, y: 9 })
  })

  it('line 中心为两端点中点', () => {
    expect(nodeCenter({ type: 'line', x1: 0, y1: 0, x2: 10, y2: 20 })).toEqual({ x: 5, y: 10 })
  })
})

describe('boundsIntersect', () => {
  const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

  it('相交返回 true', () => {
    expect(boundsIntersect(box(0, 0, 10, 10), box(5, 5, 10, 10))).toBe(true)
  })

  it('完全分离返回 false', () => {
    expect(boundsIntersect(box(0, 0, 10, 10), box(100, 100, 10, 10))).toBe(false)
  })

  it('边界接触算相交(<= / >=)', () => {
    // a 右边 x=10，b 左边 x=10，恰好接触
    expect(boundsIntersect(box(0, 0, 10, 10), box(10, 0, 5, 5))).toBe(true)
  })

  it('仅在 x 轴分离即判为不相交', () => {
    expect(boundsIntersect(box(0, 0, 5, 100), box(6, 0, 5, 100))).toBe(false)
  })

  it('仅在 y 轴分离即判为不相交', () => {
    expect(boundsIntersect(box(0, 0, 100, 5), box(0, 6, 100, 5))).toBe(false)
  })
})
