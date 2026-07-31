import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WebGPURenderer } from '../../adapters/webgpu'
import { SceneRenderer } from '../SceneRenderer'
import type { Scene } from '../types'

/**
 * 用一个纯 spy 对象替身 WebGPURenderer:SceneRenderer 只调用其绘制/变换 API,
 * 不触碰真实 GPU,因此可在 jsdom 下单测。
 */
function createMockRenderer() {
  return {
    updateTransform: vi.fn(),
    beginFrame: vi.fn(),
    endFrame: vi.fn(),
    drawInstancedRects: vi.fn(),
    drawInstancedCircles: vi.fn(),
    drawInstancedLines: vi.fn(),
    drawText: vi.fn(),
  }
}

type MockRenderer = ReturnType<typeof createMockRenderer>

function makeSceneRenderer(mock: MockRenderer, opts?: { width?: number; height?: number; dpr?: number }) {
  return new SceneRenderer(mock as unknown as WebGPURenderer, {
    width: opts?.width ?? 800,
    height: opts?.height ?? 600,
    dpr: opts?.dpr,
  })
}

describe('SceneRenderer', () => {
  let mock: MockRenderer

  beforeEach(() => {
    mock = createMockRenderer()
  })

  describe('render - viewport transform', () => {
    it('无 viewport 时默认居中(平移量为 0),scale = dpr', () => {
      const sr = makeSceneRenderer(mock, { width: 800, height: 600, dpr: 1 })
      sr.render({ nodes: [] })
      expect(mock.updateTransform).toHaveBeenCalledTimes(1)
      const t = mock.updateTransform.mock.calls[0][0]
      // dpr=1 → scale = zoom(1) * dpr(1) = 1
      expect(t.a).toBe(1)
      expect(t.d).toBe(1)
      expect(t.b).toBe(0)
      expect(t.c).toBe(0)
      // 默认 vp.x = width/(2*dpr)=400, e = width/2 - vp.x*scale = 400 - 400 = 0
      expect(t.e).toBe(0)
      expect(t.f).toBe(0)
    })

    it('无 viewport 且 dpr>1 时默认仍居中,scale 计入 dpr', () => {
      const sr = makeSceneRenderer(mock, { width: 800, height: 600, dpr: 2 })
      sr.render({ nodes: [] })
      const t = mock.updateTransform.mock.calls[0][0]
      // scale = 1 * 2 = 2
      expect(t.a).toBe(2)
      expect(t.d).toBe(2)
      // 默认 vp.x = 800/(2*2)=200, e = 400 - 200*2 = 0
      expect(t.e).toBe(0)
      expect(t.f).toBe(0)
    })

    it('显式 viewport 计算 world→screen 变换', () => {
      const sr = makeSceneRenderer(mock, { width: 800, height: 600, dpr: 1 })
      const scene: Scene = { viewport: { x: 100, y: 50, zoom: 2 }, nodes: [] }
      sr.render(scene)
      const t = mock.updateTransform.mock.calls[0][0]
      // scale = zoom(2) * dpr(1) = 2
      expect(t.a).toBe(2)
      expect(t.d).toBe(2)
      // e = 800/2 - 100*2 = 400 - 200 = 200
      expect(t.e).toBe(200)
      // f = 600/2 - 50*2 = 300 - 100 = 200
      expect(t.f).toBe(200)
    })
  })

  describe('render - draw call bucketing', () => {
    it('每帧 begin/endFrame 各调用一次', () => {
      const sr = makeSceneRenderer(mock)
      sr.render({ nodes: [] })
      expect(mock.beginFrame).toHaveBeenCalledTimes(1)
      expect(mock.endFrame).toHaveBeenCalledTimes(1)
    })

    it('空场景不发起任何实例化 draw call', () => {
      const sr = makeSceneRenderer(mock)
      sr.render({ nodes: [] })
      expect(mock.drawInstancedRects).not.toHaveBeenCalled()
      expect(mock.drawInstancedLines).not.toHaveBeenCalled()
      expect(mock.drawInstancedCircles).not.toHaveBeenCalled()
      expect(mock.drawText).not.toHaveBeenCalled()
    })

    it('各类型节点分别合批为一次 draw call,文字逐条绘制', () => {
      const sr = makeSceneRenderer(mock)
      const scene: Scene = {
        nodes: [
          { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
          { type: 'rect', x: 5, y: 5, width: 2, height: 2 },
          { type: 'circle', cx: 0, cy: 0, radius: 3 },
          { type: 'line', x1: 0, y1: 0, x2: 1, y2: 1 },
          { type: 'text', x: 1, y: 2, size: 12, text: 'A' },
          { type: 'text', x: 3, y: 4, size: 14, text: 'B' },
        ],
      }
      sr.render(scene)
      // 两个 rect 合并进一次 drawInstancedRects 调用
      expect(mock.drawInstancedRects).toHaveBeenCalledTimes(1)
      expect(mock.drawInstancedRects.mock.calls[0][0]).toHaveLength(2)
      expect(mock.drawInstancedCircles).toHaveBeenCalledTimes(1)
      expect(mock.drawInstancedLines).toHaveBeenCalledTimes(1)
      // 文字逐条:两条各一次 drawText
      expect(mock.drawText).toHaveBeenCalledTimes(2)
      expect(mock.drawText.mock.calls[0]).toEqual(['A', 1, 2, 12, expect.anything()])
      expect(mock.drawText.mock.calls[1]).toEqual(['B', 3, 4, 14, expect.anything()])
    })

    it('绘制顺序:beginFrame → rects → lines → circles → 之后 endFrame', () => {
      const order: string[] = []
      mock.beginFrame.mockImplementation(() => order.push('begin'))
      mock.drawInstancedRects.mockImplementation(() => order.push('rects'))
      mock.drawInstancedLines.mockImplementation(() => order.push('lines'))
      mock.drawInstancedCircles.mockImplementation(() => order.push('circles'))
      mock.endFrame.mockImplementation(() => order.push('end'))
      const sr = makeSceneRenderer(mock)
      sr.render({
        nodes: [
          { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
          { type: 'line', x1: 0, y1: 0, x2: 1, y2: 1 },
          { type: 'circle', cx: 0, cy: 0, radius: 1 },
        ],
      })
      expect(order).toEqual(['begin', 'rects', 'lines', 'circles', 'end'])
    })
  })

  describe('setSize', () => {
    it('更新宽高后影响后续 render 的变换平移量', () => {
      const sr = makeSceneRenderer(mock, { width: 800, height: 600, dpr: 1 })
      sr.setSize(1000, 400)
      sr.render({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] })
      const t = mock.updateTransform.mock.calls[0][0]
      // e = width/2 - 0 = 500, f = height/2 - 0 = 200
      expect(t.e).toBe(500)
      expect(t.f).toBe(200)
    })

    it('未传 dpr 时保留原 dpr;传入时更新 dpr', () => {
      const sr = makeSceneRenderer(mock, { width: 800, height: 600, dpr: 2 })
      // 不传 dpr:保留 dpr=2
      sr.setSize(800, 600)
      sr.render({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] })
      expect(mock.updateTransform.mock.calls[0][0].a).toBe(2)

      // 传入 dpr=3:更新
      sr.setSize(800, 600, 3)
      sr.render({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] })
      expect(mock.updateTransform.mock.calls[1][0].a).toBe(3)
    })
  })

  describe('constructor', () => {
    it('dpr 缺省为 1', () => {
      const sr = new SceneRenderer(mock as unknown as WebGPURenderer, { width: 800, height: 600 })
      sr.render({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] })
      // scale = zoom(1) * dpr(1) = 1
      expect(mock.updateTransform.mock.calls[0][0].a).toBe(1)
    })
  })
})
