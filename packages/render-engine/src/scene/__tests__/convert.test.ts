import { describe, expect, it } from 'vitest'
import { parseColor, sceneToInstances } from '../convert'
import type { Scene } from '../types'

describe('parseColor', () => {
  it('解析 #rrggbb', () => {
    const c = parseColor('#ff8000')
    expect(c.r).toBeCloseTo(1, 5)
    expect(c.g).toBeCloseTo(128 / 255, 5)
    expect(c.b).toBeCloseTo(0, 5)
    expect(c.a).toBe(1)
  })

  it('解析 #rrggbbaa 带 alpha', () => {
    const c = parseColor('#00ff0080')
    expect(c.g).toBeCloseTo(1, 5)
    expect(c.a).toBeCloseTo(128 / 255, 5)
  })

  it('解析短式 #rgb', () => {
    const c = parseColor('#f00')
    expect(c.r).toBeCloseTo(1, 5)
    expect(c.g).toBe(0)
    expect(c.b).toBe(0)
  })

  it('无 # 前缀也能解析', () => {
    expect(parseColor('ffffff').r).toBe(1)
  })

  it('缺省/非法输入回退为白色(不抛错)', () => {
    for (const bad of [undefined, '', '#zzz', '#12', 'not-a-color']) {
      const c = parseColor(bad as string)
      expect(c).toEqual({ r: 1, g: 1, b: 1, a: 1 })
    }
  })
})

describe('sceneToInstances', () => {
  it('按 type 分桶,字段正确映射', () => {
    const scene: Scene = {
      nodes: [
        { type: 'rect', x: 10, y: 20, width: 30, height: 40, color: '#000000' },
        { type: 'circle', cx: 5, cy: 6, radius: 7, color: '#ffffff' },
        { type: 'line', x1: 0, y1: 1, x2: 2, y2: 3, width: 4, color: '#ff0000' },
        { type: 'text', x: 1, y: 2, size: 24, text: 'Hi', color: '#00ff00' },
      ],
    }
    const out = sceneToInstances(scene)
    expect(out.rects).toHaveLength(1)
    expect(out.circles).toHaveLength(1)
    expect(out.lines).toHaveLength(1)
    expect(out.texts).toHaveLength(1)
    expect(out.rects[0]).toMatchObject({ x: 10, y: 20, width: 30, height: 40 })
    expect(out.circles[0]).toMatchObject({ cx: 5, cy: 6, radius: 7 })
    expect(out.lines[0]).toMatchObject({ x1: 0, y1: 1, x2: 2, y2: 3, width: 4 })
    expect(out.texts[0]).toMatchObject({ text: 'Hi', x: 1, y: 2, size: 24 })
  })

  it('line.width 缺省为 1', () => {
    const out = sceneToInstances({
      nodes: [{ type: 'line', x1: 0, y1: 0, x2: 1, y2: 1 }],
    })
    expect(out.lines[0].width).toBe(1)
  })

  it('未知 type 静默跳过', () => {
    const scene = {
      nodes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
        { type: 'polygon', points: [] },
      ],
    } as unknown as Scene
    const out = sceneToInstances(scene)
    expect(out.rects).toHaveLength(1)
    expect(out.circles).toHaveLength(0)
  })

  it('空场景返回四个空桶', () => {
    const out = sceneToInstances({ nodes: [] })
    expect(out).toEqual({ rects: [], circles: [], lines: [], texts: [] })
  })

  it('同类型多节点合并到同一桶(合批前提)', () => {
    const out = sceneToInstances({
      nodes: [
        { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
        { type: 'circle', cx: 0, cy: 0, radius: 1 },
        { type: 'rect', x: 5, y: 5, width: 2, height: 2 },
      ],
    })
    // 交错的两个 rect 归到同一桶 → 底层一次实例化 draw call
    expect(out.rects).toHaveLength(2)
    expect(out.circles).toHaveLength(1)
  })
})
