import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Scene } from '../../scene/types'

/**
 * CanvasSession 单测。renderPNG/renderToFile 依赖 raster(@napi-rs/canvas),
 * 通过 mock '../raster' 隔离出图;renderToFile 写入真实临时文件后校验并清理。
 */

const renderSceneToPNG = vi.fn(async () => Buffer.from([1, 2, 3]))
vi.mock('../../raster', () => ({ renderSceneToPNG: (...args: unknown[]) => renderSceneToPNG(...args) }))

import { CanvasSession } from '../CanvasSession'

const tmpFiles: string[] = []

const rectScene: Scene = {
  viewport: { x: 5, y: 6, zoom: 2 },
  nodes: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, color: '#ff0000' }],
}

describe('CanvasSession', () => {
  beforeEach(() => {
    renderSceneToPNG.mockClear()
  })

  afterAll(async () => {
    for (const f of tmpFiles) await rm(f, { force: true })
  })

  it('默认构造使用默认尺寸/背景', () => {
    const s = new CanvasSession()
    expect(s.width).toBe(800)
    expect(s.height).toBe(600)
    expect(s.dpr).toBe(1)
    expect(s.background).toBe('#0d1117')
  })

  it('构造可覆盖尺寸/dpr/背景', () => {
    const s = new CanvasSession({ width: 100, height: 50, dpr: 2, background: '#fff' })
    expect(s.width).toBe(100)
    expect(s.height).toBe(50)
    expect(s.dpr).toBe(2)
    expect(s.background).toBe('#fff')
  })

  it('loadScene 后 toScene 保留 viewport 与节点', () => {
    const s = new CanvasSession()
    s.loadScene(rectScene)
    const out = s.toScene()
    expect(out.viewport).toEqual({ x: 5, y: 6, zoom: 2 })
    expect(out.nodes.some((n) => n.type === 'rect')).toBe(true)
  })

  it('applyOps 返回逐条结果:add 成功回传 id', () => {
    const s = new CanvasSession()
    const results = s.applyOps([{ op: 'add', node: { type: 'rect', x: 0, y: 0, width: 1, height: 1 } }])
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
    expect(results[0].id).toBeDefined()
  })

  it('snapshot / snapshotText 反映当前文档', () => {
    const s = new CanvasSession()
    s.loadScene(rectScene)
    const snap = s.snapshot()
    expect(snap).toBeTruthy()
    expect(typeof s.snapshotText()).toBe('string')
  })

  it('renderPNG 用当前尺寸/背景调用 raster 并返回 Buffer', async () => {
    const s = new CanvasSession({ width: 300, height: 200, dpr: 2, background: '#123456' })
    s.loadScene(rectScene)
    const buf = await s.renderPNG()
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(renderSceneToPNG).toHaveBeenCalledTimes(1)
    const [, opts] = renderSceneToPNG.mock.calls[0] as [Scene, { width: number; height: number; dpr: number; background: string }]
    expect(opts).toEqual({ width: 300, height: 200, dpr: 2, background: '#123456' })
  })

  it('renderToFile 写文件并返回路径', async () => {
    const s = new CanvasSession()
    const target = join(tmpdir(), `sky-canvas-session-test-${process.pid}.png`)
    tmpFiles.push(target)
    const path = await s.renderToFile(target)
    expect(path).toBe(target)
    expect(renderSceneToPNG).toHaveBeenCalledTimes(1)
    // 校验落盘内容为 renderPNG 返回的字节
    const written = await readFile(target)
    expect(Array.from(written)).toEqual([1, 2, 3])
  })

  it('serialize / deserialize 往返保持 Scene 内容', () => {
    const s = new CanvasSession({ width: 111 })
    s.loadScene(rectScene)
    const json = s.serialize()
    const restored = CanvasSession.deserialize(json, { width: 111 })
    expect(restored.width).toBe(111)
    expect(restored.toScene().viewport).toEqual({ x: 5, y: 6, zoom: 2 })
    expect(restored.toScene().nodes.some((n) => n.type === 'rect')).toBe(true)
  })
})
