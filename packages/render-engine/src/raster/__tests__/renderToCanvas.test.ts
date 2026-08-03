import { describe, expect, it } from 'vitest'
import { colorToCss, type CanvasLike, renderSceneToCtx } from '../renderToCanvas'
import type { Scene } from '../../scene/types'

/** 记录调用序列的假 ctx(不依赖真实 canvas,验证绘制逻辑) */
function makeFakeCtx() {
  const calls: string[] = []
  const state = { fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '' }
  const ctx: CanvasLike = {
    get fillStyle() {
      return state.fillStyle
    },
    set fillStyle(v: string) {
      state.fillStyle = v
    },
    get strokeStyle() {
      return state.strokeStyle
    },
    set strokeStyle(v: string) {
      state.strokeStyle = v
    },
    get lineWidth() {
      return state.lineWidth
    },
    set lineWidth(v: number) {
      state.lineWidth = v
    },
    get font() {
      return state.font
    },
    set font(v: string) {
      state.font = v
    },
    get textBaseline() {
      return state.textBaseline
    },
    set textBaseline(v: string) {
      state.textBaseline = v
    },
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    setTransform: (a, b, c, d, e, f) => calls.push(`setTransform(${a},${b},${c},${d},${e},${f})`),
    fillRect: (x, y, w, h) => calls.push(`fillRect(${x},${y},${w},${h})@${state.fillStyle}`),
    beginPath: () => calls.push('beginPath'),
    arc: (x, y, r) => calls.push(`arc(${x},${y},${r})@${state.fillStyle}`),
    moveTo: (x, y) => calls.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => calls.push(`lineTo(${x},${y})`),
    fill: () => calls.push('fill'),
    stroke: () => calls.push(`stroke@${state.strokeStyle}/${state.lineWidth}`),
    fillText: (t, x, y) => calls.push(`fillText(${JSON.stringify(t)},${x},${y})@${state.fillStyle}`),
  }
  return { ctx, calls }
}

describe('colorToCss', () => {
  it('0..1 float → rgba 255', () => {
    expect(colorToCss({ r: 1, g: 0.5019607843, b: 0, a: 1 })).toBe('rgba(255,128,0,1)')
    expect(colorToCss({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('rgba(0,0,0,0.5)')
  })
  it('越界钳制到 0..255', () => {
    expect(colorToCss({ r: 2, g: -1, b: 0.5, a: 1 })).toBe('rgba(255,0,128,1)')
  })
})

describe('renderSceneToCtx', () => {
  const opts = { width: 400, height: 300, dpr: 1 }

  it('四种图元各自走对应的 Canvas2D 调用', () => {
    const scene: Scene = {
      viewport: { x: 200, y: 150, zoom: 1 }, // center 对齐画布中心 → 世界(200,150)映射到屏幕(200,150)
      nodes: [
        { type: 'rect', x: 10, y: 20, width: 30, height: 40, color: '#000000' },
        { type: 'circle', cx: 5, cy: 6, radius: 7, color: '#ffffff' },
        { type: 'line', x1: 0, y1: 1, x2: 2, y2: 3, width: 4, color: '#ff0000' },
        { type: 'text', x: 1, y: 2, size: 24, text: 'Hi', color: '#00ff00' },
      ],
    }
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx(scene, ctx, opts)
    const joined = calls.join('\n')
    expect(joined).toContain('fillRect(10,20,30,40)@rgba(0,0,0,1)')
    expect(joined).toContain('arc(5,6,7)@rgba(255,255,255,1)')
    expect(joined).toContain('stroke@rgba(255,0,0,1)/4')
    expect(joined).toContain('fillText("Hi",1,2)@rgba(0,255,0,1)')
  })

  it('背景色在世界变换之前铺满设备像素', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx({ nodes: [] }, ctx, { ...opts, background: '#0d1117' })
    // 第一个 setTransform 应是单位矩阵(铺背景),之后才是世界变换
    expect(calls[0]).toBe('setTransform(1,0,0,1,0,0)')
    expect(calls[1]).toBe('fillRect(0,0,400,300)@#0d1117')
  })

  it('不传 background 则不铺底', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx({ nodes: [] }, ctx, opts)
    expect(calls.some((c) => c.startsWith('fillRect(0,0,400,300)'))).toBe(false)
  })

  it('viewport 变换:zoom+dpr 影响世界→屏幕仿射', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx({ viewport: { x: 100, y: 50, zoom: 2 }, nodes: [] }, ctx, { width: 400, height: 300, dpr: 2 })
    // scale = zoom*dpr = 4;e = w/2 - vp.x*scale = 200 - 400 = -200;f = 150 - 200 = -50
    expect(calls).toContain('setTransform(4,0,0,4,-200,-50)')
  })

  it('text 用 textBaseline=top(把 (x,y) 当左上角)', () => {
    const { ctx } = makeFakeCtx()
    renderSceneToCtx({ nodes: [{ type: 'text', x: 0, y: 0, size: 12, text: 'x' }] }, ctx, opts)
    expect(ctx.textBaseline).toBe('top')
  })

  it('缺省 viewport:世界原点对齐屏幕原点(不同 dpr 下 e/f 仍为 0)', () => {
    const { ctx, calls } = makeFakeCtx()
    // 不传 viewport:默认 center = (width/(2*dpr), height/(2*dpr)),zoom=1
    renderSceneToCtx({ nodes: [] }, ctx, { width: 400, height: 300, dpr: 2 })
    // scale = zoom*dpr = 2;e = w/2 - vp.x*scale = 200 - (400/4)*2 = 200 - 200 = 0;f = 150 - (300/4)*2 = 0
    expect(calls).toContain('setTransform(2,0,0,2,0,0)')
  })

  it('缺省 dpr 时按 1 处理', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: [] }, ctx, { width: 200, height: 100 })
    // scale = 1;e = 100 - 0 = 100;f = 50 - 0 = 50
    expect(calls).toContain('setTransform(1,0,0,1,100,50)')
  })

  it('空 nodes 时不产生任何图元绘制调用', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx({ nodes: [] }, ctx, opts)
    expect(calls.some((c) => c.startsWith('arc('))).toBe(false)
    expect(calls.some((c) => c.startsWith('fillText('))).toBe(false)
    expect(calls.some((c) => c.startsWith('stroke@'))).toBe(false)
  })

  it('line 使用节点 color 与 width 设置描边样式', () => {
    const { ctx, calls } = makeFakeCtx()
    renderSceneToCtx(
      { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [{ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4, width: 5, color: '#0000ff' }] },
      ctx,
      opts
    )
    const joined = calls.join('\n')
    expect(joined).toContain('moveTo(1,2)')
    expect(joined).toContain('lineTo(3,4)')
    expect(joined).toContain('stroke@rgba(0,0,255,1)/5')
  })
})
