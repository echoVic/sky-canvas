/**
 * SceneRenderer:声明式场景 → 命令式绘制的桥接层。
 *
 * 把一份 Scene JSON 分桶为实例数组,喂给底层 WebGPURenderer 的实例化绘制 API。
 * 分桶天然合批:无论 JSON 里各类型节点如何交错,同类型都合成一次实例化 draw call。
 */

import type { WebGPURenderer } from '../adapters/webgpu'
import { sceneToInstances } from './convert'
import type { Scene } from './types'

export interface SceneRendererOptions {
  /** 画布设备像素宽 */
  width: number
  /** 画布设备像素高 */
  height: number
  /** devicePixelRatio */
  dpr?: number
}

export class SceneRenderer {
  private renderer: WebGPURenderer
  private width: number
  private height: number
  private dpr: number

  constructor(renderer: WebGPURenderer, opts: SceneRendererOptions) {
    this.renderer = renderer
    this.width = opts.width
    this.height = opts.height
    this.dpr = opts.dpr ?? 1
  }

  /** 更新画布尺寸(resize 时调用) */
  setSize(width: number, height: number, dpr?: number): void {
    this.width = width
    this.height = height
    if (dpr !== undefined) this.dpr = dpr
  }

  /**
   * 渲染一份场景(全量重画)。
   * viewport 映射到 world→screen 变换:屏幕像素 = (world - center) * zoom * dpr + 屏幕中心。
   */
  render(scene: Scene): void {
    const vp = scene.viewport ?? { x: this.width / (2 * this.dpr), y: this.height / (2 * this.dpr), zoom: 1 }
    const scale = vp.zoom * this.dpr

    this.renderer.updateTransform({
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      e: this.width / 2 - vp.x * scale,
      f: this.height / 2 - vp.y * scale,
    })

    const { rects, circles, lines, texts } = sceneToInstances(scene)

    this.renderer.beginFrame()
    if (rects.length > 0) this.renderer.drawInstancedRects(rects)
    if (lines.length > 0) this.renderer.drawInstancedLines(lines)
    if (circles.length > 0) this.renderer.drawInstancedCircles(circles)
    for (const t of texts) {
      this.renderer.drawText(t.text, t.x, t.y, t.size, t.color)
    }
    this.renderer.endFrame()
  }
}
