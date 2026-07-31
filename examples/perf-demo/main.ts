/**
 * Sky Canvas · WebGPU 实例化渲染性能 Demo
 *
 * 目标:验证 WebGPURenderer.drawInstancedRects 能以单次 draw call 渲染海量矩形,
 * 支持无限画布的 pan/zoom,并用四叉树做视口剔除。
 *
 * 直接初始化 WebGPU 设备并使用底层 WebGPURenderer,聚焦渲染核心,不引入上层 SDK。
 */
import type {
  CircleInstance,
  LineInstance,
  RectInstance,
} from '@sky-canvas/render-engine/adapters/webgpu'
import { buildGlyphAtlas, WebGPURenderer } from '@sky-canvas/render-engine/adapters/webgpu'
import { QuadTreeNode } from '@sky-canvas/render-engine/culling'

const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement
const errorEl = document.getElementById('error') as HTMLDivElement
const fpsEl = document.getElementById('fps') as HTMLDivElement
const countEl = document.getElementById('count') as HTMLElement
const drawcallsEl = document.getElementById('drawcalls') as HTMLElement
const zoomEl = document.getElementById('zoom') as HTMLElement
const visibleEl = document.getElementById('visible') as HTMLElement
const countSlider = document.getElementById('countSlider') as HTMLInputElement
const countLabel = document.getElementById('countLabel') as HTMLElement

function fail(msg: string): void {
  errorEl.style.display = 'flex'
  errorEl.textContent = msg
}

// ---- 场景数据:在一个大世界里随机撒 N 个矩形 ----
const WORLD = 20000 // 世界坐标范围 [0, WORLD)
// 场景矩形:实现 getBounds 以便放入四叉树做视口剔除
interface SceneRect extends RectInstance {
  getBounds(): { x: number; y: number; width: number; height: number }
}

function makeScene(n: number): SceneRect[] {
  const rects: SceneRect[] = []
  // 固定伪随机(可复现),避免依赖 Math.random 的不可控性
  let seed = 1234567
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < n; i++) {
    const size = 6 + rand() * 24
    const x = rand() * WORLD
    const y = rand() * WORLD
    rects.push({
      x,
      y,
      width: size,
      height: size,
      color: { r: rand(), g: rand() * 0.6 + 0.3, b: rand() * 0.6 + 0.4, a: 1 },
      getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height }
      },
    })
  }
  return rects
}

// 固定伪随机工厂(可复现)
function makeRand(seedInit: number): () => number {
  let seed = seedInit
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// 少量圆 + 线,用于视觉验证圆(SDF)与线段实例化渲染是否正确
function makeCircles(n: number): CircleInstance[] {
  const rand = makeRand(2024)
  const out: CircleInstance[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      cx: rand() * WORLD,
      cy: rand() * WORLD,
      radius: 40 + rand() * 120,
      color: { r: rand() * 0.4 + 0.6, g: rand() * 0.4, b: rand() * 0.4, a: 0.9 },
    })
  }
  return out
}

function makeLines(n: number): LineInstance[] {
  const rand = makeRand(777)
  const out: LineInstance[] = []
  for (let i = 0; i < n; i++) {
    const x = rand() * WORLD
    const y = rand() * WORLD
    out.push({
      x1: x,
      y1: y,
      x2: x + (rand() - 0.5) * 1500,
      y2: y + (rand() - 0.5) * 1500,
      width: 4 + rand() * 12,
      color: { r: rand() * 0.4, g: rand() * 0.5 + 0.5, b: rand() * 0.4 + 0.6, a: 0.85 },
    })
  }
  return out
}

// ---- 视口(无限画布):世界坐标 <-> 屏幕坐标 ----
const view = { x: WORLD / 2, y: WORLD / 2, zoom: 0.05 } // 世界中心点 + 缩放

async function main(): Promise<void> {
  if (!navigator.gpu) {
    fail(
      '当前浏览器不支持 WebGPU(navigator.gpu 不存在)。请用 Chrome/Edge 113+ 或开启 WebGPU 的浏览器打开。'
    )
    return
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    fail('无法获取 WebGPU adapter(可能无可用 GPU)。')
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

  let scene = makeScene(Number(countSlider.value))
  countEl.textContent = String(scene.length)
  // 少量圆/线,叠加在矩形之上,验证 SDF 圆与线段实例化渲染
  const circles = makeCircles(200)
  const lines = makeLines(200)

  // SDF 文字图集:运行时用 canvas 2D + 距离变换生成,上传给渲染器
  renderer.setTextAtlas(buildGlyphAtlas({ fontSize: 48, spread: 6 }))
  // 在世界里撒几处文字标签,验证 SDF 文字在缩放下保持清晰
  const labels = [
    { text: 'Sky Canvas', x: WORLD * 0.5, y: WORLD * 0.5, size: 800 },
    { text: 'WebGPU SDF Text', x: WORLD * 0.3, y: WORLD * 0.35, size: 500 },
    { text: 'infinite canvas', x: WORLD * 0.6, y: WORLD * 0.65, size: 400 },
  ]

  // 构建四叉树:一次插入全部矩形,之后每帧按视口 query,近似 O(可见数),
  // 相比线性扫描全场景在放大(可见占比小)时优势显著。
  function buildTree(rects: SceneRect[]): QuadTreeNode {
    const tree = new QuadTreeNode({ x: 0, y: 0, width: WORLD, height: WORLD }, 16, 8)
    for (const r of rects) tree.addObject(r)
    return tree
  }
  let tree = buildTree(scene)

  // ---- 视口剔除:用四叉树查询可见矩形,只把可见的送进 instance buffer ----
  function computeVisible(): RectInstance[] {
    const halfW = canvas.width / 2
    const halfH = canvas.height / 2
    const scale = view.zoom * dpr
    const margin = 50 / scale
    const region = {
      x: view.x - halfW / scale - margin,
      y: view.y - halfH / scale - margin,
      width: (canvas.width + 100) / scale,
      height: (canvas.height + 100) / scale,
    }
    // QuadTreeNode.query 返回落在 region 的对象(SceneRect 满足 RectInstance)
    return tree.query(region) as unknown as RectInstance[]
  }

  // ---- 渲染循环 ----
  let lastT = performance.now()
  let frameCount = 0
  let fpsAccum = 0

  function frame(now: number): void {
    const dt = now - lastT
    lastT = now
    frameCount++
    fpsAccum += dt

    // updateTransform: world->screen。projectionMatrix 在 renderer 里做 screen->NDC,
    // 所以这里 model 矩阵负责 world->screen(像素)。
    const scale = view.zoom * dpr
    renderer.updateTransform({
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      e: canvas.width / 2 - view.x * scale,
      f: canvas.height / 2 - view.y * scale,
    })

    const visible = computeVisible()

    renderer.beginFrame()
    renderer.drawInstancedRects(visible)
    renderer.drawInstancedLines(lines)
    renderer.drawInstancedCircles(circles)
    for (const l of labels) {
      renderer.drawText(l.text, l.x, l.y, l.size, { r: 1, g: 1, b: 1, a: 1 })
    }
    renderer.endFrame()

    const stats = renderer.getStats()
    // 每 ~0.5s 刷新一次 HUD
    if (fpsAccum >= 500) {
      const fps = (frameCount / fpsAccum) * 1000
      fpsEl.textContent = `${fps.toFixed(0)} FPS`
      fpsEl.className = `fps ${fps >= 55 ? 'good' : fps >= 30 ? 'warn' : 'bad'}`
      drawcallsEl.textContent = String(stats.drawCalls)
      zoomEl.textContent = `${(view.zoom * 100).toFixed(0)}%`
      visibleEl.textContent = String(visible.length)
      frameCount = 0
      fpsAccum = 0
    }

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  // ---- 交互:拖拽平移 + 滚轮缩放 ----
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

  countSlider.addEventListener('input', () => {
    const n = Number(countSlider.value)
    countLabel.textContent = String(n)
    scene = makeScene(n)
    tree = buildTree(scene)
    countEl.textContent = String(scene.length)
  })
}

main().catch((err) => fail(`初始化失败: ${err?.message ?? String(err)}`))
