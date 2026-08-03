import { describe, expect, it } from 'vitest'
import { computeSDF, encodeSDF, type GlyphAtlas, layoutText } from '../WebGPUTextSDF'

// 用一个 7x7 网格,中心 3x3 为字形内部,验证 SDF 符号与量级
function centerBlock(): { cov: Float32Array; w: number; h: number } {
  const w = 7
  const h = 7
  const cov = new Float32Array(w * h)
  for (let y = 2; y <= 4; y++) {
    for (let x = 2; x <= 4; x++) {
      cov[y * w + x] = 1
    }
  }
  return { cov, w, h }
}

describe('computeSDF', () => {
  it('内部为负、外部为正、边缘接近 0', () => {
    const { cov, w, h } = centerBlock()
    const sdf = computeSDF(cov, w, h)
    // 中心像素 (3,3) 在内部,距离应为负
    expect(sdf[3 * w + 3]).toBeLessThan(0)
    // 远角 (0,0) 在外部,距离应为正且较大
    expect(sdf[0]).toBeGreaterThan(0)
    // 紧贴内部块外一格 (1,3) 应为正且较小(约 1 像素)
    expect(sdf[3 * w + 1]).toBeGreaterThan(0)
    expect(sdf[3 * w + 1]).toBeLessThan(2)
  })

  it('全内部时处处为负(或非正)', () => {
    const w = 4
    const h = 4
    const cov = new Float32Array(w * h).fill(1)
    const sdf = computeSDF(cov, w, h)
    for (const d of sdf) expect(d).toBeLessThanOrEqual(0)
  })

  it('全外部时处处为正(或非负)', () => {
    const w = 4
    const h = 4
    const cov = new Float32Array(w * h) // 全 0
    const sdf = computeSDF(cov, w, h)
    for (const d of sdf) expect(d).toBeGreaterThanOrEqual(0)
  })
})

describe('encodeSDF', () => {
  it('边缘(距离 0)编码为 ~128,内部 >128,外部 <128', () => {
    const sdf = new Float32Array([0, -4, 4])
    const enc = encodeSDF(sdf, 4)
    expect(enc[0]).toBe(128)
    expect(enc[1]).toBeGreaterThan(128) // 内部(负距离)
    expect(enc[2]).toBeLessThan(128) // 外部(正距离)
  })

  it('超出 spread 的距离被夹紧到 0/255', () => {
    const sdf = new Float32Array([-100, 100])
    const enc = encodeSDF(sdf, 4)
    expect(enc[0]).toBe(255)
    expect(enc[1]).toBe(0)
  })
})

function fakeAtlas(): GlyphAtlas {
  const glyphs = new Map()
  // 每个字形 cell 60px,advance 30,bearingX 6,bearingY 40
  const mk = () => ({
    u0: 0,
    v0: 0,
    u1: 0.5,
    v1: 0.5,
    width: 60,
    height: 60,
    bearingX: 6,
    bearingY: 40,
    advance: 30,
  })
  glyphs.set('A', mk())
  glyphs.set('B', mk())
  glyphs.set(' ', { ...mk(), advance: 20 })
  return { data: new Uint8ClampedArray(0), width: 120, height: 60, glyphs, fontSize: 48, spread: 6 }
}

describe('layoutText', () => {
  it('按 advance 依次推进笔位,空格只前进不产出实例', () => {
    const atlas = fakeAtlas()
    const scale = 24 / 48 // pxSize/fontSize = 0.5
    const g = layoutText('A B', atlas, 100, 200, 24)
    // 'A' 和 'B' 产出实例,空格不产出
    expect(g).toHaveLength(2)
    // 第一个字形 x = 起点 100
    expect(g[0].x).toBe(100)
    // 第二个字形 x = 100 + advanceA*scale + space*scale = 100 + 30*0.5 + 20*0.5 = 125
    expect(g[1].x).toBeCloseTo(125, 5)
    // y = baseline - bearingY*scale
    expect(g[0].y).toBeCloseTo(200 - 40 * scale, 5)
    // size = cell * scale
    expect(g[0].width).toBeCloseTo(60 * scale, 5)
  })

  it('未知字符被跳过', () => {
    const atlas = fakeAtlas()
    expect(layoutText('A☃B', atlas, 0, 0, 24)).toHaveLength(2)
  })
})
