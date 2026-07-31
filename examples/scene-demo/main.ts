/**
 * Sky Canvas · 面向 agent 的画布编辑闭环 Demo
 *
 * 阶段 C:证明 agent 的「观察 → 引用 → 增量改」循环。
 * ① 全量装载 Scene JSON(阶段 B 的 bulk-load)
 * ② snapshot:把文档压成对象级语义快照(读,支持视口裁剪)
 * ③ ops 控制台:一组 ops 增量编辑(写,按 #id 寻址)
 * ④ 真接 LLM:读快照 → 吐 ops → 应用,跑通全闭环
 *
 * 渲染仍复用阶段 B 的 SceneRenderer(doc.toScene() 摊平后交给它)。
 */
import { buildGlyphAtlas, WebGPURenderer } from '@sky-canvas/render-engine/adapters/webgpu'
import type { Bounds, SceneOp } from '@sky-canvas/render-engine/scene'
import { applyOps, SceneDocument, SceneRenderer, snapshotText } from '@sky-canvas/render-engine/scene'
import { EXAMPLES } from './examples'
import { requestOps } from './llm'

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
const canvas = $<HTMLCanvasElement>('gpu-canvas')
const overlay = $<HTMLDivElement>('err-overlay')
const editor = $<HTMLTextAreaElement>('editor')
const opsEl = $<HTMLTextAreaElement>('ops')
const snapEl = $<HTMLTextAreaElement>('snap')
const examplesSel = $<HTMLSelectElement>('examples')
const statusEl = $<HTMLDivElement>('status')
const vpOnly = $<HTMLInputElement>('vpOnly')

function fatal(msg: string): void {
  overlay.style.display = 'flex'
  overlay.textContent = msg
}
function setStatus(msg: string, ok: boolean): void {
  statusEl.textContent = msg
  statusEl.className = `status ${ok ? 'ok' : 'err'}`
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

  const renderer = new WebGPURenderer({ device, context, format, width: canvas.width, height: canvas.height })
  renderer.setTextAtlas(buildGlyphAtlas({ fontSize: 48, spread: 6 }))
  const sceneRenderer = new SceneRenderer(renderer, { width: canvas.width, height: canvas.height, dpr })

  // 文档模型:人与 agent 共用的单一真相
  let doc = new SceneDocument()

  /** 当前视口对应的世界可见区域(用于 snapshot 视口裁剪),与渲染 transform 同一套换算 */
  function visibleRegion(): Bounds {
    const vp = doc.viewport
    const scale = vp.zoom * dpr
    const w = canvas.width / scale
    const h = canvas.height / scale
    return { x: vp.x - w / 2, y: vp.y - h / 2, width: w, height: h }
  }

  function refreshSnapshot(): void {
    snapEl.value = vpOnly.checked
      ? snapshotText(doc, { scope: 'viewport', visibleRegion: visibleRegion() })
      : snapshotText(doc)
  }

  function rerender(): void {
    sceneRenderer.render(doc.toScene())
    refreshSnapshot()
  }

  // ① 全量装载
  function loadFromEditor(): void {
    try {
      const scene = JSON.parse(editor.value)
      if (!scene || !Array.isArray(scene.nodes)) throw new Error('缺少 nodes 数组')
      doc = SceneDocument.fromScene(scene)
      rerender()
      setStatus(`已装载 ${scene.nodes.length} 个节点(分配稳定 id n1..n${scene.nodes.length})`, true)
    } catch (e) {
      setStatus(`装载失败:${(e as Error).message}`, false)
    }
  }

  // ③ 应用 ops
  function applyFromConsole(text: string, label: string): void {
    let ops: SceneOp[]
    try {
      ops = JSON.parse(text)
      if (!Array.isArray(ops)) throw new Error('ops 必须是数组')
    } catch (e) {
      setStatus(`${label}:ops JSON 解析失败:${(e as Error).message}`, false)
      return
    }
    const results = applyOps(doc, ops)
    const okN = results.filter((r) => r.ok).length
    const errs = results.filter((r) => !r.ok).map((r) => r.error)
    rerender()
    if (errs.length > 0) {
      setStatus(`${label}:${okN}/${results.length} 成功。失败:\n${errs.join('\n')}`, errs.length < results.length)
    } else {
      setStatus(`${label}:${okN} 个 op 全部应用成功`, true)
    }
  }

  // 示例下拉
  for (const [i, ex] of EXAMPLES.entries()) {
    const opt = document.createElement('option')
    opt.value = String(i)
    opt.textContent = ex.label
    examplesSel.appendChild(opt)
  }
  function loadExample(i: number): void {
    editor.value = JSON.stringify(EXAMPLES[i].scene, null, 2)
    loadFromEditor()
  }

  $<HTMLButtonElement>('load').addEventListener('click', loadFromEditor)
  $<HTMLButtonElement>('refresh').addEventListener('click', refreshSnapshot)
  vpOnly.addEventListener('change', refreshSnapshot)
  examplesSel.addEventListener('change', () => loadExample(Number(examplesSel.value)))
  $<HTMLButtonElement>('apply').addEventListener('click', () => applyFromConsole(opsEl.value, 'ops'))

  // ④ LLM 编辑
  $<HTMLButtonElement>('llmGo').addEventListener('click', async () => {
    const apiKey = $<HTMLInputElement>('llmKey').value.trim()
    const model = $<HTMLInputElement>('llmModel').value.trim()
    const instruction = $<HTMLInputElement>('llmInstr').value.trim()
    if (!apiKey) return setStatus('请先填 Anthropic API Key', false)
    if (!instruction) return setStatus('请先填编辑指令', false)
    setStatus('LLM 生成中…', true)
    try {
      const { ops } = await requestOps({ apiKey, model, snapshotText: snapshotText(doc), instruction })
      opsEl.value = JSON.stringify(ops, null, 2)
      applyFromConsole(opsEl.value, 'LLM')
    } catch (e) {
      setStatus(`LLM 失败:${(e as Error).message}`, false)
    }
  })

  window.addEventListener('resize', () => {
    resizeCanvas()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    renderer.resize(canvas.width, canvas.height)
    sceneRenderer.setSize(canvas.width, canvas.height, dpr)
    rerender()
  })

  loadExample(0)
}

main().catch((err) => fatal(`初始化失败: ${err?.message ?? String(err)}`))
