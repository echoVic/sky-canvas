/**
 * Sky Canvas · headless 渲染 harness
 *
 * 供 WebGPUHeadlessRenderer(playwright)驱动:import 真实 WebGPURenderer + SceneRenderer,
 * 暴露 window.__renderScene(scene, opts) —— 按 opts 重设画布尺寸、渲染一份 Scene、
 * 渲染完成后 resolve。这样 headless 出图复用的是**真实 WGSL 管线**,与线上像素一致,
 * 而不是另写一套渲染代码。
 *
 * 关键契约(供 Node 侧 page.evaluate / waitForFunction 使用):
 *   window.__ready: boolean            —— WebGPU 初始化完成
 *   window.__error: string | undefined —— 初始化失败原因
 *   window.__renderScene(scene, {width,height,dpr,background}): Promise<void>
 */
import { buildGlyphAtlas, WebGPURenderer } from '@sky-canvas/renderer/adapters/webgpu'
import type { Scene } from '@sky-canvas/renderer/scene'
import { SceneRenderer } from '@sky-canvas/renderer/scene'

interface HeadlessWindow extends Window {
  __ready?: boolean
  __error?: string
  __renderScene?: (
    scene: Scene,
    opts?: { width?: number; height?: number; dpr?: number; background?: string }
  ) => Promise<void>
}
declare const window: HeadlessWindow

const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement

async function init(): Promise<void> {
  if (!navigator.gpu) throw new Error('navigator.gpu 不存在(浏览器/环境不支持 WebGPU)')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('无法获取 WebGPU adapter')
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) throw new Error('无法获取 webgpu canvas context')
  const format = navigator.gpu.getPreferredCanvasFormat()

  // 初始尺寸,__renderScene 会按 opts 覆盖
  canvas.width = 800
  canvas.height = 600
  context.configure({ device, format, alphaMode: 'premultiplied' })

  const renderer = new WebGPURenderer({ device, context, format, width: canvas.width, height: canvas.height })
  renderer.setTextAtlas(buildGlyphAtlas({ fontSize: 48, spread: 6 }))
  const sceneRenderer = new SceneRenderer(renderer, { width: canvas.width, height: canvas.height, dpr: 1 })

  window.__renderScene = async (scene, opts = {}) => {
    const width = opts.width ?? canvas.width
    const height = opts.height ?? canvas.height
    const dpr = opts.dpr ?? 1
    const background = opts.background
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      context.configure({ device, format, alphaMode: 'premultiplied' })
      renderer.resize(width, height)
    }
    sceneRenderer.setSize(width, height, dpr)

    // 如果指定了背景色,在 scene 节点前插一个全屏 rect 铺底
    const sceneToRender = background
      ? {
          ...scene,
          nodes: [
            {
              type: 'rect' as const,
              x: (scene.viewport?.x ?? width / 2) - width / 2,
              y: (scene.viewport?.y ?? height / 2) - height / 2,
              width: width * 2,
              height: height * 2,
              color: background,
            },
            ...scene.nodes,
          ],
        }
      : scene

    sceneRenderer.render(sceneToRender)
    // 确保 GPU 提交完成,截图才拿得到稳定像素
    await device.queue.onSubmittedWorkDone()
  }
  window.__ready = true
}

init().catch((e) => {
  window.__error = (e as Error)?.message ?? String(e)
})
