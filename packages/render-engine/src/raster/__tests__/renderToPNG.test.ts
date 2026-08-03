import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasLike } from '../renderToCanvas'
import type { Scene } from '../../scene/types'

/**
 * renderToPNG 单测:@napi-rs/canvas 是可选原生依赖(本环境未安装),
 * 已在 vitest.config 里别名到测试桩使其可被静态解析;这里再用 vi.mock 覆盖真实行为,
 * 验证 renderSceneToPNG 的组装逻辑(createCanvas→getContext→renderSceneToCtx→toBuffer)
 * 与"依赖不可用时抛清晰错误"的 catch 分支。
 */

/** 满足 CanvasLike 的空操作 ctx(renderSceneToCtx 会真实调用其方法) */
function makeNoopCtx(): CanvasLike {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textBaseline: '',
    save: () => {},
    restore: () => {},
    setTransform: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
  }
}

const h = vi.hoisted(() => {
  const toBuffer = vi.fn(() => Buffer.from([137, 80, 78, 71]))
  const state = { shouldThrow: false }
  return { toBuffer, state }
})

const getContext = vi.fn<() => CanvasLike>()
const createCanvas = vi.fn((_w: number, _h: number) => ({ getContext, toBuffer: h.toBuffer }))

vi.mock('@napi-rs/canvas', () => {
  if (h.state.shouldThrow) throw new Error('Cannot find module @napi-rs/canvas')
  return { createCanvas }
})

const scene: Scene = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, color: '#ff0000' }],
}

describe('renderSceneToPNG (napi 可用)', () => {
  beforeEach(() => {
    vi.resetModules()
    h.state.shouldThrow = false
    h.toBuffer.mockClear()
    getContext.mockReset()
    getContext.mockImplementation(() => makeNoopCtx())
    createCanvas.mockClear()
  })

  it('用 opts 尺寸造 canvas,取 2d ctx,渲染后返回 PNG Buffer', async () => {
    const { renderSceneToPNG } = await import('../renderToPNG')
    const buf = await renderSceneToPNG(scene, { width: 320, height: 240, background: '#000' })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(Array.from(buf)).toEqual([137, 80, 78, 71])
    expect(createCanvas).toHaveBeenCalledWith(320, 240)
    expect(getContext).toHaveBeenCalledWith('2d')
    expect(h.toBuffer).toHaveBeenCalledWith('image/png')
  })

  it('模块缓存:两次出图各造一次 canvas(缓存的是模块,不阻止再次 createCanvas)', async () => {
    const { renderSceneToPNG } = await import('../renderToPNG')
    await renderSceneToPNG(scene, { width: 10, height: 10 })
    await renderSceneToPNG(scene, { width: 20, height: 20 })
    expect(createCanvas).toHaveBeenCalledTimes(2)
    expect(createCanvas).toHaveBeenNthCalledWith(1, 10, 10)
    expect(createCanvas).toHaveBeenNthCalledWith(2, 20, 20)
  })
})

describe('renderSceneToPNG (napi 未安装)', () => {
  beforeEach(() => {
    vi.resetModules()
    // 用 doMock(非提升)覆盖:让动态 import('@napi-rs/canvas') 抛错,走 loadNapiCanvas 的 catch
    vi.doMock('@napi-rs/canvas', () => {
      throw new Error('Cannot find module @napi-rs/canvas')
    })
  })

  afterEach(() => {
    vi.doUnmock('@napi-rs/canvas')
    vi.resetModules()
  })

  it('缺少 @napi-rs/canvas 时抛出带安装指引的清晰错误', async () => {
    const { renderSceneToPNG } = await import('../renderToPNG')
    await expect(renderSceneToPNG(scene, { width: 10, height: 10 })).rejects.toThrow(/@napi-rs\/canvas/)
    await expect(renderSceneToPNG(scene, { width: 10, height: 10 })).rejects.toThrow(/npm i @napi-rs\/canvas/)
  })
})
