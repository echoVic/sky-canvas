/**
 * Canvas2D raster 后端:把一份 Scene 渲染成像素(不依赖 GPU)。
 *
 * 用途:无头/CI 环境出图(agent 拿 PNG 回看),以及无 WebGPU 时的兜底渲染。
 * 与 WebGPU 主线共用 Scene/SceneDocument/snapshot/ops——只替换最后的光栅化。
 *
 * 一份绘制代码两处通用:CanvasLike 接口既被浏览器原生 CanvasRenderingContext2D 满足,
 * 也被 @napi-rs/canvas 的 ctx 满足。renderSceneToCtx 是纯函数(可用假 ctx 单测)。
 */

import { sceneToInstances } from '../scene/convert'
import type { Scene } from '../scene/types'
import type { Color } from '../adapters/webgpu'

/** 渲染需要用到的 Canvas2D 子集——浏览器与 @napi-rs/canvas 都满足 */
export interface CanvasLike {
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  font: string
  textBaseline: string
  save(): void
  restore(): void
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  fill(): void
  stroke(): void
  fillText(text: string, x: number, y: number): void
}

export interface RasterOptions {
  /** 画布像素宽 */
  width: number
  /** 画布像素高 */
  height: number
  /** devicePixelRatio,默认 1 */
  dpr?: number
  /** 背景色(CSS 字符串);不传则透明,不铺底 */
  background?: string
}

/** Color(0..1 float)转 CSS rgba 字符串 */
export function colorToCss(c: Color): string {
  const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)))
  return `rgba(${to255(c.r)},${to255(c.g)},${to255(c.b)},${c.a})`
}

/**
 * 把场景渲染到一个 Canvas2D 上下文(全量重画)。纯函数:只调用 ctx 的方法,不碰环境。
 * viewport 变换与 WebGPU 主线一致:屏幕像素 = (world - center) * zoom * dpr + 屏幕中心。
 */
export function renderSceneToCtx(scene: Scene, ctx: CanvasLike, opts: RasterOptions): void {
  const { width, height } = opts
  const dpr = opts.dpr ?? 1
  const vp = scene.viewport ?? { x: width / (2 * dpr), y: height / (2 * dpr), zoom: 1 }
  const scale = vp.zoom * dpr

  // 背景:在世界变换之前,按设备像素铺满
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, width, height)
  }

  // world → screen 仿射:与 SceneRenderer.updateTransform 同一套
  ctx.setTransform(scale, 0, 0, scale, width / 2 - vp.x * scale, height / 2 - vp.y * scale)

  const { rects, circles, lines, texts } = sceneToInstances(scene)

  for (const r of rects) {
    ctx.fillStyle = colorToCss(r.color)
    ctx.fillRect(r.x, r.y, r.width, r.height)
  }
  for (const c of circles) {
    ctx.fillStyle = colorToCss(c.color)
    ctx.beginPath()
    ctx.arc(c.cx, c.cy, c.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const l of lines) {
    ctx.strokeStyle = colorToCss(l.color)
    ctx.lineWidth = l.width
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
  }
  // 文字:Scene 的 text (x,y) 视为左上角,故 textBaseline=top
  ctx.textBaseline = 'top'
  for (const t of texts) {
    ctx.fillStyle = colorToCss(t.color)
    ctx.font = `${t.size}px sans-serif`
    ctx.fillText(t.text, t.x, t.y)
  }
}
