/**
 * Sky Canvas · 声明式场景 Demo(JSON → 画布)
 *
 * 目标:证明"喂一份声明式 JSON(agent/LLM 可产出的形态)→ 画布正确渲染"这条闭环。
 * 左侧编辑 Scene JSON,右侧 WebGPU 实时渲染。渲染核心复用 SceneRenderer,
 * 它把 JSON 按 type 分桶,合批喂给底层 WebGPURenderer 的实例化绘制 API。
 */
import { buildGlyphAtlas, WebGPURenderer } from '@sky-canvas/render-engine/adapters/webgpu'
import type { Scene } from '@sky-canvas/render-engine/scene'
import { SceneRenderer } from '@sky-canvas/render-engine/scene'
import { EXAMPLES } from './examples'

const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement
const overlay = document.getElementById('err-overlay') as HTMLDivElement
const editor = document.getElementById('editor') as HTMLTextAreaElement
const examplesSel = document.getElementById('examples') as HTMLSelectElement
const renderBtn = document.getElementById('render') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement

function fatal(msg: string): void {
  overlay.style.display = 'flex'
  overlay.textContent = msg
}

function setStatus(msg: string, ok: boolean): void {
  statusEl.textContent = msg
  statusEl.className = ok ? 'ok' : 'err'
}

async function main(): Promise<void> {
  if (!navigator.gpu) {
    fatal('当前浏览器不支持 WebGPU(navigator.gpu 不存在)。请用 Chrome/Edge 113+ 打开。')
    return
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    fatal('无法获取 WebGPU adapter(可能无可用 GPU)。')
    return
  }
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) {
    fatal('无法获取 webgpu canvas context。')
    return
  }
  const format = navigator.gpu.getPreferredCanvasFormat()

  const dpr = window.devicePixelRatio || 1
  function resizeCanvas(): void {
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
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
  // SDF 文字图集:运行时用 canvas 2D + 距离变换生成,上传给渲染器
  renderer.setTextAtlas(buildGlyphAtlas({ fontSize: 48, spread: 6 }))

  const sceneRenderer = new SceneRenderer(renderer, {
    width: canvas.width,
    height: canvas.height,
    dpr,
  })

  // 解析当前编辑器内容并渲染;错误不致命,只提示、保留上一帧
  function renderFromEditor(): void {
    let scene: Scene
    try {
      scene = JSON.parse(editor.value) as Scene
    } catch (e) {
      setStatus(`JSON 解析失败:${(e as Error).message}`, false)
      return
    }
    if (!scene || !Array.isArray(scene.nodes)) {
      setStatus('场景格式错误:缺少 nodes 数组', false)
      return
    }
    try {
      sceneRenderer.render(scene)
      setStatus(`已渲染 ${scene.nodes.length} 个节点`, true)
    } catch (e) {
      setStatus(`渲染失败:${(e as Error).message}`, false)
    }
  }

  // 填充示例下拉;切换即载入对应 JSON 并渲染
  for (const [i, ex] of EXAMPLES.entries()) {
    const opt = document.createElement('option')
    opt.value = String(i)
    opt.textContent = ex.label
    examplesSel.appendChild(opt)
  }
  function loadExample(i: number): void {
    editor.value = JSON.stringify(EXAMPLES[i].scene, null, 2)
    renderFromEditor()
  }

  examplesSel.addEventListener('change', () => loadExample(Number(examplesSel.value)))
  renderBtn.addEventListener('click', renderFromEditor)
  // 编辑即时渲染(轻量防抖)
  let timer: ReturnType<typeof setTimeout> | undefined
  editor.addEventListener('input', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(renderFromEditor, 250)
  })

  window.addEventListener('resize', () => {
    resizeCanvas()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    renderer.resize(canvas.width, canvas.height)
    sceneRenderer.setSize(canvas.width, canvas.height, dpr)
    renderFromEditor()
  })

  // 首屏载入第一个示例
  loadExample(0)
}

main().catch((err) => fatal(`初始化失败: ${err?.message ?? String(err)}`))
