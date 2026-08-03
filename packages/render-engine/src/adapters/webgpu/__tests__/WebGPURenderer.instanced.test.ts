import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CIRCLE_INSTANCE_STRIDE,
  type CircleInstance,
  LINE_INSTANCE_STRIDE,
  type LineInstance,
  packCircleInstances,
  packLineInstances,
  packRectInstances,
  RECT_INSTANCE_STRIDE,
  type RectInstance,
  WebGPURenderer,
} from '../WebGPURenderer'
import type { GlyphAtlas, GlyphMetric } from '../WebGPUTextSDF'

describe('packRectInstances', () => {
  it('每实例打包为 8 个 float,布局为 [x,y,w,h,r,g,b,a]', () => {
    const rects: RectInstance[] = [
      { x: 10, y: 20, width: 30, height: 40, color: { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
    ]
    const data = packRectInstances(rects)
    expect(data).toBeInstanceOf(Float32Array)
    expect(data.length).toBe(RECT_INSTANCE_STRIDE)
    expect(Array.from(data)).toEqual([
      10,
      20,
      30,
      40,
      // 颜色用 float32,需近似比较
      expect.closeTo(0.1, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
      1,
    ])
  })

  it('多个实例按顺序连续排布,总长 = n * 8', () => {
    const rects: RectInstance[] = [
      { x: 1, y: 2, width: 3, height: 4, color: { r: 0, g: 0, b: 0, a: 1 } },
      { x: 5, y: 6, width: 7, height: 8, color: { r: 1, g: 1, b: 1, a: 1 } },
      { x: 9, y: 10, width: 11, height: 12, color: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 } },
    ]
    const data = packRectInstances(rects)
    expect(data.length).toBe(3 * RECT_INSTANCE_STRIDE)
    // 第二个实例从 offset 8 开始
    expect(data[8]).toBe(5)
    expect(data[9]).toBe(6)
    expect(data[10]).toBe(7)
    expect(data[11]).toBe(8)
    // 第三个实例的 x 在 offset 16
    expect(data[16]).toBe(9)
  })

  it('空数组返回空 Float32Array', () => {
    const data = packRectInstances([])
    expect(data.length).toBe(0)
  })
})

describe('packCircleInstances', () => {
  it('每实例 7 float,布局为 [cx,cy,radius,r,g,b,a]', () => {
    const circles: CircleInstance[] = [
      { cx: 100, cy: 200, radius: 15, color: { r: 1, g: 0, b: 0, a: 1 } },
    ]
    const data = packCircleInstances(circles)
    expect(data.length).toBe(CIRCLE_INSTANCE_STRIDE)
    expect(data[0]).toBe(100)
    expect(data[1]).toBe(200)
    expect(data[2]).toBe(15)
    expect(data[3]).toBe(1)
    expect(data[6]).toBe(1)
  })

  it('多实例连续排布,第二个从 offset 7 起', () => {
    const data = packCircleInstances([
      { cx: 1, cy: 2, radius: 3, color: { r: 0, g: 0, b: 0, a: 1 } },
      { cx: 4, cy: 5, radius: 6, color: { r: 1, g: 1, b: 1, a: 1 } },
    ])
    expect(data.length).toBe(2 * CIRCLE_INSTANCE_STRIDE)
    expect(data[7]).toBe(4)
    expect(data[8]).toBe(5)
    expect(data[9]).toBe(6)
  })

  it('CIRCLE_INSTANCE_STRIDE 为 7,且颜色四通道完整落位在 offset 3~6', () => {
    expect(CIRCLE_INSTANCE_STRIDE).toBe(7)
    const data = packCircleInstances([
      { cx: 0, cy: 0, radius: 1, color: { r: 0.11, g: 0.22, b: 0.33, a: 0.44 } },
    ])
    expect(data[3]).toBeCloseTo(0.11, 5)
    expect(data[4]).toBeCloseTo(0.22, 5)
    expect(data[5]).toBeCloseTo(0.33, 5)
    expect(data[6]).toBeCloseTo(0.44, 5)
  })

  it('空数组返回空 Float32Array', () => {
    const data = packCircleInstances([])
    expect(data).toBeInstanceOf(Float32Array)
    expect(data.length).toBe(0)
  })
})

describe('packLineInstances', () => {
  it('每实例 9 float,布局为 [x1,y1,x2,y2,width,r,g,b,a]', () => {
    const lines: LineInstance[] = [
      { x1: 0, y1: 0, x2: 10, y2: 20, width: 2, color: { r: 0.5, g: 0.6, b: 0.7, a: 0.8 } },
    ]
    const data = packLineInstances(lines)
    expect(data.length).toBe(LINE_INSTANCE_STRIDE)
    expect(Array.from(data.slice(0, 5))).toEqual([0, 0, 10, 20, 2])
    expect(data[5]).toBeCloseTo(0.5, 5)
    expect(data[6]).toBeCloseTo(0.6, 5)
    expect(data[7]).toBeCloseTo(0.7, 5)
    expect(data[8]).toBeCloseTo(0.8, 5)
  })

  it('LINE_INSTANCE_STRIDE 为 9,多实例连续排布,第二个从 offset 9 起', () => {
    expect(LINE_INSTANCE_STRIDE).toBe(9)
    const data = packLineInstances([
      { x1: 1, y1: 2, x2: 3, y2: 4, width: 5, color: { r: 0, g: 0, b: 0, a: 1 } },
      { x1: 11, y1: 12, x2: 13, y2: 14, width: 15, color: { r: 1, g: 1, b: 1, a: 1 } },
    ])
    expect(data.length).toBe(2 * LINE_INSTANCE_STRIDE)
    expect(data[9]).toBe(11)
    expect(data[10]).toBe(12)
    expect(data[11]).toBe(13)
    expect(data[12]).toBe(14)
    expect(data[13]).toBe(15)
  })

  it('空数组返回空 Float32Array', () => {
    expect(packLineInstances([]).length).toBe(0)
    expect(packCircleInstances([]).length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 本轮变更的行为契约测试：每种图元(rect/circle/line)使用独立的 instance buffer,
// 按 quadKey 缓存于 Map,容量不足按 2 倍扩容并复用,dispose 遍历销毁全部。
// 通过 mock GPUDevice + GPURenderPassEncoder 观测 createBuffer / writeBuffer /
// setVertexBuffer 的真实调用来锁定该契约。
// ---------------------------------------------------------------------------

interface FakeBuffer {
  label: string
  size: number
  destroy: ReturnType<typeof vi.fn>
  destroyed: boolean
}

interface WriteRecord {
  buffer: FakeBuffer
  data: Float32Array | ArrayBufferView
  count: number | undefined
}

interface SetVertexRecord {
  slot: number
  buffer: FakeBuffer
}

function createRendererHarness() {
  // @webgpu/types 只提供类型,不提供运行时值;jsdom 环境缺少 GPUBufferUsage 全局常量,
  // 被测源码在 createBuffer 时读取其位标志,故在测试基础设施层补齐(不修改业务源码)。
  if (typeof (globalThis as { GPUBufferUsage?: unknown }).GPUBufferUsage === 'undefined') {
    ;(globalThis as { GPUBufferUsage?: Record<string, number> }).GPUBufferUsage = {
      MAP_READ: 0x0001,
      MAP_WRITE: 0x0002,
      COPY_SRC: 0x0004,
      COPY_DST: 0x0008,
      INDEX: 0x0010,
      VERTEX: 0x0020,
      UNIFORM: 0x0040,
      STORAGE: 0x0080,
      INDIRECT: 0x0100,
      QUERY_RESOLVE: 0x0200,
    }
  }

  if (typeof (globalThis as { GPUShaderStage?: unknown }).GPUShaderStage === 'undefined') {
    ;(globalThis as { GPUShaderStage?: Record<string, number> }).GPUShaderStage = {
      VERTEX: 0x1,
      FRAGMENT: 0x2,
      COMPUTE: 0x4,
    }
  }

  const createdBuffers: FakeBuffer[] = []
  const writes: WriteRecord[] = []
  const setVertexCalls: SetVertexRecord[] = []

  const makeBuffer = (label: string, size: number): FakeBuffer => {
    const buf: FakeBuffer = {
      label,
      size,
      destroyed: false,
      destroy: vi.fn(() => {
        buf.destroyed = true
      }),
    }
    createdBuffers.push(buf)
    return buf
  }

  const renderPass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    setVertexBuffer: vi.fn((slot: number, buffer: FakeBuffer) => {
      setVertexCalls.push({ slot, buffer })
    }),
    setIndexBuffer: vi.fn(),
    drawIndexed: vi.fn(),
    end: vi.fn(),
  }

  const device = {
    // WebGPURenderer.uploadInstanceData 直接调用 this.device.createBuffer
    createBuffer: vi.fn((desc: { label?: string; size: number }) =>
      makeBuffer(desc.label ?? '', desc.size)
    ),
    createCommandEncoder: vi.fn(() => ({
      beginRenderPass: vi.fn(() => renderPass),
      finish: vi.fn(() => ({})),
    })),
    createBindGroup: vi.fn(() => ({})),
    createBindGroupLayout: vi.fn(() => ({})),
    createPipelineLayout: vi.fn(() => ({})),
    createRenderPipeline: vi.fn((desc: { label?: string }) => ({ label: desc.label })),
    createShaderModule: vi.fn(() => ({})),
    queue: {
      writeBuffer: vi.fn(
        (
          buffer: FakeBuffer,
          _offset: number,
          data: Float32Array,
          _dataOffset?: number,
          size?: number
        ) => {
          writes.push({ buffer, data, count: size })
        }
      ),
      submit: vi.fn(),
    },
  }

  const context = {
    configure: vi.fn(),
    getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
  }

  const renderer = new WebGPURenderer({
    device: device as unknown as GPUDevice,
    context: context as unknown as GPUCanvasContext,
    format: 'bgra8unorm',
    width: 800,
    height: 600,
  })

  // 只统计 instance buffer(label 以 "Instanced Instance Buffer" 开头),
  // 与 uniform / quad 顶点缓冲区分开。
  const instanceBuffers = () =>
    createdBuffers.filter((b) => b.label.startsWith('Instanced Instance Buffer'))

  return { renderer, device, renderPass, writes, setVertexCalls, instanceBuffers }
}

describe('WebGPURenderer 实例化 instance buffer 分块契约', () => {
  let h: ReturnType<typeof createRendererHarness>

  beforeEach(() => {
    h = createRendererHarness()
    h.renderer.beginFrame()
  })

  it('同帧内 rect/circle/line 各自分配独立的 instance buffer(互不共用)', () => {
    h.renderer.drawInstancedRects([
      { x: 0, y: 0, width: 1, height: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
    ])
    h.renderer.drawInstancedCircles([
      { cx: 0, cy: 0, radius: 1, color: { r: 0, g: 1, b: 0, a: 1 } },
    ])
    h.renderer.drawInstancedLines([
      { x1: 0, y1: 0, x2: 1, y2: 1, width: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ])

    const bufs = h.instanceBuffers()
    // 三种图元 => 三块独立 buffer
    expect(bufs.length).toBe(3)
    // label 各带 key,互不相同
    const labels = bufs.map((b) => b.label).sort()
    expect(labels).toEqual([
      'Instanced Instance Buffer (circle)',
      'Instanced Instance Buffer (line)',
      'Instanced Instance Buffer (rect)',
    ])
    // 三块 buffer 引用互不相同(核心回归点:不再共用一块)
    expect(new Set(bufs).size).toBe(3)
  })

  it('每种图元的 setVertexBuffer(slot=1) 绑定的是该图元自己的 instance buffer', () => {
    h.renderer.drawInstancedRects([
      { x: 0, y: 0, width: 1, height: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
    ])
    h.renderer.drawInstancedCircles([
      { cx: 0, cy: 0, radius: 1, color: { r: 0, g: 1, b: 0, a: 1 } },
    ])

    const slot1 = h.setVertexCalls.filter((c) => c.slot === 1)
    expect(slot1.length).toBe(2)
    // rect 与 circle 绑定的 slot1 buffer 必须是两块不同 buffer
    expect(slot1[0].buffer).not.toBe(slot1[1].buffer)
    // 绑定的 buffer 即写入数据的 buffer
    const rectWrite = h.writes.find(
      (w) => (w.buffer as FakeBuffer).label === 'Instanced Instance Buffer (rect)'
    )
    expect(slot1[0].buffer).toBe(rectWrite?.buffer)
  })

  it('同一图元重复绘制:容量足够时复用同一块 buffer,不重复 createBuffer', () => {
    const rects = (n: number): RectInstance[] =>
      Array.from({ length: n }, (_, i) => ({
        x: i,
        y: i,
        width: 1,
        height: 1,
        color: { r: 1, g: 1, b: 1, a: 1 },
      }))

    h.renderer.drawInstancedRects(rects(2))
    const afterFirst = h.instanceBuffers().length
    // 第二次数据量 <= 第一次容量 => 复用,不新建
    h.renderer.drawInstancedRects(rects(1))
    expect(h.instanceBuffers().length).toBe(afterFirst)
    expect(afterFirst).toBe(1)
    // 两次都写入了同一块 rect instance buffer(容量足够,复用同一块)
    const rectWrites = h.writes.filter(
      (w) => (w.buffer as FakeBuffer).label === 'Instanced Instance Buffer (rect)'
    )
    expect(rectWrites.length).toBe(2)
    expect(rectWrites[0].buffer).toBe(rectWrites[1].buffer)
  })

  it('同一图元数据超过容量时:销毁旧 buffer,按至少 2 倍扩容重建', () => {
    const rects = (n: number): RectInstance[] =>
      Array.from({ length: n }, (_, i) => ({
        x: i,
        y: 0,
        width: 1,
        height: 1,
        color: { r: 1, g: 1, b: 1, a: 1 },
      }))

    h.renderer.drawInstancedRects(rects(1)) // byteLength = 8 float * 4 = 32
    const firstBufs = h.instanceBuffers()
    expect(firstBufs.length).toBe(1)
    const first = firstBufs[0]
    const firstCap = first.size

    // 更大的数据触发扩容
    h.renderer.drawInstancedRects(rects(4)) // 需要 128 字节 > 32
    const bufs = h.instanceBuffers()
    expect(bufs.length).toBe(2)
    // 旧 buffer 被销毁
    expect(first.destroy).toHaveBeenCalledTimes(1)
    expect(first.destroyed).toBe(true)
    // 新容量 >= max(需求, 旧容量*2)
    const second = bufs[1]
    expect(second.size).toBeGreaterThanOrEqual(4 * RECT_INSTANCE_STRIDE * 4)
    expect(second.size).toBeGreaterThanOrEqual(firstCap * 2)
  })

  it('count 为 0(空数据)时不创建 instance buffer,也不写入', () => {
    h.renderer.drawInstancedRects([])
    expect(h.instanceBuffers().length).toBe(0)
    expect(h.writes.length).toBe(0)
  })

  it('writeBuffer 写入长度等于打包后的 float 元素个数', () => {
    h.renderer.drawInstancedCircles([
      { cx: 1, cy: 2, radius: 3, color: { r: 0, g: 0, b: 0, a: 1 } },
      { cx: 4, cy: 5, radius: 6, color: { r: 1, g: 1, b: 1, a: 1 } },
    ])
    const w = h.writes.find(
      (x) => (x.buffer as FakeBuffer).label === 'Instanced Instance Buffer (circle)'
    )
    expect(w).toBeDefined()
    // 第 5 个参数(size)为元素个数 = 2 * 7
    expect(w?.count).toBe(2 * CIRCLE_INSTANCE_STRIDE)
  })

  it('dispose 遍历销毁所有图元的 instance buffer 并清空缓存', () => {
    h.renderer.drawInstancedRects([
      { x: 0, y: 0, width: 1, height: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
    ])
    h.renderer.drawInstancedCircles([
      { cx: 0, cy: 0, radius: 1, color: { r: 0, g: 1, b: 0, a: 1 } },
    ])
    h.renderer.drawInstancedLines([
      { x1: 0, y1: 0, x2: 1, y2: 1, width: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ])
    const bufs = h.instanceBuffers()
    expect(bufs.length).toBe(3)

    h.renderer.dispose()
    // 全部 instance buffer 都被销毁
    for (const b of bufs) {
      expect(b.destroy).toHaveBeenCalled()
      expect(b.destroyed).toBe(true)
    }

    // dispose 后再次绘制会重新分配全新 buffer(缓存已清空)
    const before = h.instanceBuffers().length
    h.renderer.beginFrame()
    h.renderer.drawInstancedRects([
      { x: 0, y: 0, width: 1, height: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
    ])
    expect(h.instanceBuffers().length).toBe(before + 1)
  })

  it('LINE_INSTANCE_STRIDE 决定 line 数据 count,drawIndexed 以实例数为第二参', () => {
    h.renderer.drawInstancedLines([
      { x1: 0, y1: 0, x2: 1, y2: 1, width: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      { x1: 2, y1: 2, x2: 3, y2: 3, width: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
    ])
    // drawIndexed(6, count) count=2
    expect(h.renderPass.drawIndexed).toHaveBeenCalledWith(6, 2)
    const w = h.writes.find(
      (x) => (x.buffer as FakeBuffer).label === 'Instanced Instance Buffer (line)'
    )
    expect(w?.count).toBe(2 * LINE_INSTANCE_STRIDE)
  })
})

// ---------------------------------------------------------------------------
// 本轮 diff 新增:SDF 文字渲染路径 setTextAtlas / drawText。
// - setTextAtlas 上传图集纹理并建立 glyph bind group;
// - drawText 排版后一次 drawIndexed(6, glyphCount) 完成整段文字(draw call 恒为 1);
//   未先 setTextAtlas 时 drawText 应静默返回(不崩溃、不发起绘制)。
// 通过在 rect/circle/line 的 harness 上补齐 createTexture/writeTexture/createSampler 观测。
// ---------------------------------------------------------------------------

function makeAtlas(): GlyphAtlas {
  const glyphs = new Map<string, GlyphMetric>()
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
  return {
    data: new Uint8ClampedArray(4 * 4 * 4),
    width: 4,
    height: 4,
    glyphs,
    fontSize: 48,
    spread: 6,
  }
}

function createTextHarness() {
  const base = createRendererHarness()
  // jsdom 缺少 GPUTextureUsage 运行时常量,被测 setTextAtlas 读取其位标志;
  // 在测试基础设施层补齐(不修改业务源码),与 createRendererHarness 补 GPUBufferUsage 同理。
  if (typeof (globalThis as { GPUTextureUsage?: unknown }).GPUTextureUsage === 'undefined') {
    ;(globalThis as { GPUTextureUsage?: Record<string, number> }).GPUTextureUsage = {
      COPY_SRC: 0x01,
      COPY_DST: 0x02,
      TEXTURE_BINDING: 0x04,
      STORAGE_BINDING: 0x08,
      RENDER_ATTACHMENT: 0x10,
    }
  }
  const textureWrites: Array<{ width: number; height: number }> = []
  const samplers: unknown[] = []
  const textures: Array<{ destroy: ReturnType<typeof vi.fn> }> = []

  const device = base.device as unknown as {
    createTexture: (d: { size: { width: number; height: number } }) => unknown
    createSampler: (d?: unknown) => unknown
    queue: {
      writeTexture: (
        dst: unknown,
        data: unknown,
        layout: unknown,
        size: { width: number; height: number }
      ) => void
    }
  }
  device.createTexture = vi.fn((d) => {
    const tex = { destroy: vi.fn(), createView: vi.fn(() => ({})) }
    textures.push(tex)
    return tex
  })
  device.createSampler = vi.fn((d) => {
    const s = {}
    samplers.push(s)
    return s
  })
  device.queue.writeTexture = vi.fn((_dst, _data, _layout, size) => {
    textureWrites.push({ width: size.width, height: size.height })
  })

  return { ...base, textureWrites, samplers, textures }
}

describe('WebGPURenderer SDF 文字渲染', () => {
  it('未先 setTextAtlas 时 drawText 静默返回:不发起 drawIndexed', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.drawText('AB', 0, 0, 24, { r: 1, g: 1, b: 1, a: 1 })
    // 没有图集/bindGroup,drawText 早退,不应发出任何 glyph drawIndexed(6, n)
    const glyphDraws = h.renderPass.drawIndexed.mock.calls.filter(
      (c) => c[0] === 6 && (c[1] as number) >= 1
    )
    expect(glyphDraws.length).toBe(0)
  })

  it('setTextAtlas 上传图集纹理并建立 sampler', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())
    // 纹理写入尺寸即图集尺寸
    expect(h.textureWrites).toEqual([{ width: 4, height: 4 }])
    expect(h.samplers.length).toBe(1)
  })

  it('drawText 一次 drawIndexed(6, glyphCount) 完成整段文字,且累计到统计', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())
    h.renderer.drawText('AB', 100, 200, 24, { r: 1, g: 0, b: 0, a: 1 })

    // 'A' + 'B' 两个字形 => drawIndexed(6, 2)
    expect(h.renderPass.drawIndexed).toHaveBeenCalledWith(6, 2)
    const stats = h.renderer.getStats()
    expect(stats.drawCalls).toBeGreaterThanOrEqual(1)
    expect(stats.triangles).toBeGreaterThanOrEqual(2 * 2)
    expect(stats.vertices).toBeGreaterThanOrEqual(2 * 4)
  })

  it('drawText 文本全为未知字符时不产出实例,不发起 glyph drawIndexed', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())
    h.renderer.drawText('☃☃', 0, 0, 24, { r: 1, g: 1, b: 1, a: 1 })
    const glyphDraws = h.renderPass.drawIndexed.mock.calls.filter((c) => c[0] === 6)
    expect(glyphDraws.length).toBe(0)
  })

  // ---- 本轮核心回归点(锁定 fix) ----
  // 修复前:drawText 每次都用固定 key 'glyph' 上传 instance buffer,同帧多段文字
  // 复用同一块 buffer,后写覆盖前写 => 只有最后一段能正确渲染。
  // 修复后:每次 drawText 用唯一 key `glyph_${glyphDrawSeq++}`,同帧每段文字各占独立 buffer。
  const glyphInstanceBuffers = (h: ReturnType<typeof createTextHarness>) =>
    h.setVertexCalls
      .filter((c) => c.slot === 1)
      .map((c) => c.buffer)
      .filter((b) => b.label.startsWith('Instanced Instance Buffer (glyph'))

  it('同帧内两次 drawText 使用互不相同的 instance buffer(修复同帧覆盖)', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())

    h.renderer.drawText('AB', 0, 0, 24, { r: 1, g: 0, b: 0, a: 1 })
    h.renderer.drawText('BA', 100, 50, 24, { r: 0, g: 1, b: 0, a: 1 })

    const glyphBufs = glyphInstanceBuffers(h)
    // 两次绘制 => slot1 绑定两次
    expect(glyphBufs.length).toBe(2)
    // 核心:两次绑定的是两块不同的 buffer(不再共用一块被覆盖)
    expect(glyphBufs[0]).not.toBe(glyphBufs[1])
    expect(new Set(glyphBufs).size).toBe(2)
    // key 递增:glyph_0 / glyph_1
    const labels = glyphBufs.map((b) => b.label).sort()
    expect(labels).toEqual([
      'Instanced Instance Buffer (glyph_0)',
      'Instanced Instance Buffer (glyph_1)',
    ])
  })

  it('同帧多次 drawText 各自 writeBuffer 到独立 buffer,数据互不覆盖', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())

    h.renderer.drawText('AB', 0, 0, 24, { r: 1, g: 0, b: 0, a: 1 })
    h.renderer.drawText('AB', 200, 0, 24, { r: 0, g: 0, b: 1, a: 1 })

    const glyphWrites = h.writes.filter((w) =>
      (w.buffer as FakeBuffer).label.startsWith('Instanced Instance Buffer (glyph')
    )
    // 两次绘制 => 两次写入,写入到不同 buffer
    expect(glyphWrites.length).toBe(2)
    expect(glyphWrites[0].buffer).not.toBe(glyphWrites[1].buffer)
    // 每段 'AB' => 2 glyph * 12 float
    expect(glyphWrites[0].count).toBe(2 * 12)
    expect(glyphWrites[1].count).toBe(2 * 12)
  })

  it('beginFrame 重置 glyphDrawSeq:新一帧首个 drawText 重新从 glyph_0 开始', () => {
    const h = createTextHarness()
    h.renderer.beginFrame()
    h.renderer.setTextAtlas(makeAtlas())
    h.renderer.drawText('AB', 0, 0, 24, { r: 1, g: 0, b: 0, a: 1 })
    h.renderer.drawText('AB', 10, 0, 24, { r: 1, g: 0, b: 0, a: 1 })
    // 第一帧结束时序号已推进到 2

    // 新一帧:序号应被重置,首个 drawText 再次使用 glyph_0
    h.renderer.beginFrame()
    h.renderer.drawText('AB', 0, 0, 24, { r: 1, g: 0, b: 0, a: 1 })

    const glyphBufs = glyphInstanceBuffers(h)
    // 三次绘制 => 三次 slot1 绑定
    expect(glyphBufs.length).toBe(3)
    // 第三次(新帧首个)重新使用 glyph_0 => 与第一帧首个 glyph_0 复用同一块缓存 buffer
    expect(glyphBufs[2].label).toBe('Instanced Instance Buffer (glyph_0)')
    expect(glyphBufs[2]).toBe(glyphBufs[0])
  })
})
