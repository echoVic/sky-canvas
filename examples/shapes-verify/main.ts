/**
 * WebGPU 渲染引擎 · 圆/线/文本验证 Demo
 *
 * 使用 WebGPURenderer 的实例化绘制 API:
 * - drawInstancedCircles: 实例化圆形
 * - drawInstancedLines: 实例化线段
 * - drawText (SDF): SDF 文本渲染
 */
import type { CircleInstance, LineInstance } from '@sky-canvas/render-engine/adapters/webgpu'
import { WebGPURenderer, buildGlyphAtlas } from '@sky-canvas/render-engine/adapters/webgpu'

const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement
const errorEl = document.getElementById('error') as HTMLDivElement
const fpsEl = document.getElementById('fps') as HTMLDivElement
const circleEl = document.getElementById('circle-status') as HTMLElement
const lineEl = document.getElementById('line-status') as HTMLElement
const textEl = document.getElementById('text-status') as HTMLElement
const countEl = document.getElementById('count') as HTMLElement
const drawcallsEl = document.getElementById('drawcalls') as HTMLElement

function fail(msg: string): void {
  errorEl.style.display = 'flex'
  errorEl.textContent = msg
}

// 伪随机
let seed = 7654321
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

const WORLD = 10000
const CIRCLE_COUNT = 2000
const LINE_COUNT = 1000
const TEXT_COUNT = 200

// 生成圆形场景
function makeCircles(): CircleInstance[] {
  const arr: CircleInstance[] = []
  for (let i = 0; i < CIRCLE_COUNT; i++) {
    arr.push({
      cx: rand() * WORLD,
      cy: rand() * WORLD,
      radius: 5 + rand() * 30,
      color: { r: rand(), g: rand() * 0.7 + 0.3, b: rand() * 0.7 + 0.3, a: 0.8 },
    })
  }
  return arr
}

// 生成线段场景
function makeLines(): LineInstance[] {
  const arr: LineInstance[] = []
  for (let i = 0; i < LINE_COUNT; i++) {
    arr.push({
      x1: rand() * WORLD,
      y1: rand() * WORLD,
      x2: rand() * WORLD,
      y2: rand() * WORLD,
      width: 1 + rand() * 4,
      color: { r: rand(), g: rand() * 0.6 + 0.4, b: rand() * 0.5 + 0.5, a: 0.9 },
    })
  }
  return arr
}

// 文本内容
const TEXT_SAMPLES = [
  'Sky Canvas',
  'WebGPU Rendering',
  'Hello World',
  'SDF Text',
  'GPU Instancing',
  'Performance',
]

interface TextItem {
  text: string
  x: number
  y: number
  size: number
  color: { r: number; g: number; b: number; a: number }
}

function makeTexts(): TextItem[] {
  const arr: TextItem[] = []
  for (let i = 0; i < TEXT_COUNT; i++) {
    arr.push({
      text: TEXT_SAMPLES[Math.floor(rand() * TEXT_SAMPLES.length)],
      x: rand() * WORLD,
      y: rand() * WORLD,
      size: 16 + rand() * 40,
      color: { r: 0.9 + rand() * 0.1, g: 0.9 + rand() * 0.1, b: 0.9 + rand() * 0.1, a: 1 },
    })
  }
  return arr
}

// 视口
const view = { x: WORLD / 2, y: WORLD / 2, zoom: 0.08 }

async function main(): Promise<void> {
  if (!navigator.gpu) {
    fail('当前浏览器不支持 WebGPU。请用 Chrome/Edge 113+ 打开。')
    return
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    fail('无法获取 WebGPU adapter。')
    return
  }
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) {
    fail('无法获取 webgpu canvas context。')
    return
  }
  const format = navigator.gpu.getPreferredCanvasFormat()

  const dpr = window.devicePixelRatio || 1
  function resizeCanvas(): void {
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
  }
  resizeCanvas()
  context.configure({ device, format, alphaMode: 'premultiplied' })

  const renderer = new WebGPURenderer({
    device,
    context,
    format,
    width: canvas.width,
    height: canvas.height,
  })

  // 构建 SDF 字形图集（ASCII + 常用字符）
  const atlas = buildGlyphAtlas({
    chars: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
    fontSize: 48,
    fontFamily: 'sans-serif',
  })
  renderer.setTextAtlas(atlas)

  const circles = makeCircles()
  const lines = makeLines()
  const texts = makeTexts()

  countEl.textContent = String(CIRCLE_COUNT + LINE_COUNT + TEXT_COUNT)

  let circleOk = false
  let lineOk = false
  let textOk = false

  let lastT = performance.now()
  let frameCount = 0
  let fpsAccum = 0

  function frame(now: number): void {
    const dt = now - lastT
    lastT = now
    frameCount++
    fpsAccum += dt

    const scale = view.zoom * dpr
    renderer.updateTransform({
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      e: canvas.width / 2 - view.x * scale,
      f: canvas.height / 2 - view.y * scale,
    })

    renderer.beginFrame()

    // 1) 实例化线段
    renderer.drawInstancedLines(lines)
    lineOk = true

    // 2) 实例化圆形
    renderer.drawInstancedCircles(circles)
    circleOk = true

    // 3) SDF 文本
    for (const t of texts) {
      renderer.drawText(t.text, t.x, t.y, t.size, t.color)
    }
    textOk = true

    renderer.endFrame()

    const stats = renderer.getStats()

    if (fpsAccum >= 500) {
      const fps = (frameCount / fpsAccum) * 1000
      fpsEl.textContent = `${fps.toFixed(0)} FPS`
      fpsEl.className = `fps ${fps >= 55 ? 'good' : fps >= 30 ? 'warn' : 'bad'}`
      drawcallsEl.textContent = String(stats.drawCalls)
      circleEl.textContent = circleOk ? `✓ ${CIRCLE_COUNT} 个 (instanced)` : '✗'
      circleEl.className = circleOk ? 'pass' : 'fail'
      lineEl.textContent = lineOk ? `✓ ${LINE_COUNT} 条 (instanced)` : '✗'
      lineEl.className = lineOk ? 'pass' : 'fail'
      textEl.textContent = textOk ? `✓ ${TEXT_COUNT} 个 (SDF)` : '✗'
      textEl.className = textOk ? 'pass' : 'fail'
      frameCount = 0
      fpsAccum = 0
    }

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  // 交互：拖拽平移 + 滚轮缩放
  let dragging = false
  let lastX = 0
  let lastY = 0
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const scale = view.zoom * dpr
    view.x -= ((e.clientX - lastX) * dpr) / scale
    view.y -= ((e.clientY - lastY) * dpr) / scale
    lastX = e.clientX
    lastY = e.clientY
  })
  canvas.addEventListener('pointerup', (e) => {
    dragging = false
    canvas.releasePointerCapture(e.pointerId)
  })
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      view.zoom = Math.max(0.005, Math.min(20, view.zoom * factor))
    },
    { passive: false }
  )

  window.addEventListener('resize', () => {
    resizeCanvas()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    renderer.resize(canvas.width, canvas.height)
  })
}

main().catch((err) => fail(`初始化失败: ${err?.message ?? String(err)}`))
