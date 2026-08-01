/**
 * CanvasSession:无头画布运行时(CLI 的内核)。
 *
 * 把 SceneDocument + snapshot + applyOps + 出图组装成一个有状态会话:
 * agent 通过它 loadScene / snapshot / applyOps / renderPNG / saveScene。
 * 状态就是一份 SceneDocument;出图有两种后端:
 *   - 'raster'(默认):Canvas2D(@napi-rs/canvas),零依赖、无 GPU 可用,CI 兜底;
 *   - 'webgpu':playwright 驱动真实 WebGPU 管线(高保真,像素与线上一致),需 harnessUrl + GPU/软件渲染栈。
 */

import { writeFile } from 'node:fs/promises'
import { renderSceneToPNG } from '../raster'
import { SceneDocument } from '../scene/document'
import { applyOps, type OpResult, type SceneOp } from '../scene/ops'
import { type SceneSnapshot, snapshot, type SnapshotOptions, snapshotText } from '../scene/snapshot'
import type { Scene } from '../scene/types'
import { WebGPUHeadlessRenderer } from './WebGPUHeadlessRenderer'

export type RenderMode = 'raster' | 'webgpu'

export interface CanvasSessionOptions {
  /** 出图画布像素宽,默认 800 */
  width?: number
  /** 出图画布像素高,默认 600 */
  height?: number
  /** devicePixelRatio,默认 1 */
  dpr?: number
  /** 出图背景色(CSS),默认深色底便于直接可读 */
  background?: string
  /** 出图后端:'raster'(默认,零依赖)| 'webgpu'(高保真,需 harnessUrl) */
  renderMode?: RenderMode
  /** renderMode='webgpu' 时的 harness 页地址(examples/headless-render 的 URL) */
  harnessUrl?: string
  /** renderMode='webgpu' 时可选的 chromium 可执行路径 */
  chromeExecutablePath?: string
}

export class CanvasSession {
  doc: SceneDocument
  width: number
  height: number
  dpr: number
  background: string
  renderMode: RenderMode
  harnessUrl?: string
  private chromeExecutablePath?: string
  private headless?: WebGPUHeadlessRenderer

  constructor(opts: CanvasSessionOptions = {}) {
    this.doc = new SceneDocument()
    this.width = opts.width ?? 800
    this.height = opts.height ?? 600
    this.dpr = opts.dpr ?? 1
    this.background = opts.background ?? '#0d1117'
    this.renderMode = opts.renderMode ?? 'raster'
    this.harnessUrl = opts.harnessUrl
    this.chromeExecutablePath = opts.chromeExecutablePath
  }

  /** 全量装载一份 Scene(bulk-load),替换当前文档 */
  loadScene(scene: Scene): void {
    this.doc = SceneDocument.fromScene(scene)
  }

  /** 结构化快照 */
  snapshot(opts?: SnapshotOptions): SceneSnapshot {
    return snapshot(this.doc, opts)
  }

  /** 文本快照(给 agent/LLM 读) */
  snapshotText(opts?: SnapshotOptions): string {
    return snapshotText(this.doc, opts)
  }

  /** 批量应用一组 ops,逐条回结果 */
  applyOps(ops: SceneOp[]): OpResult[] {
    return applyOps(this.doc, ops)
  }

  /** 导出当前文档为 Scene(含连线摊平) */
  toScene(): Scene {
    return this.doc.toScene()
  }

  /** 惰性启动 headless WebGPU 渲染器(renderMode='webgpu' 时) */
  private async ensureHeadless(): Promise<WebGPUHeadlessRenderer> {
    if (!this.harnessUrl) {
      throw new Error("renderMode='webgpu' 需要提供 harnessUrl(examples/headless-render 的页面地址)")
    }
    if (!this.headless) {
      this.headless = new WebGPUHeadlessRenderer({
        harnessUrl: this.harnessUrl,
        executablePath: this.chromeExecutablePath,
      })
      await this.headless.start()
    }
    return this.headless
  }

  /** 渲染当前画布为 PNG 字节(按 renderMode 选后端) */
  async renderPNG(): Promise<Buffer> {
    if (this.renderMode === 'webgpu') {
      const hr = await this.ensureHeadless()
      return hr.render(this.toScene(), {
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        background: this.background,
      })
    }
    return renderSceneToPNG(this.toScene(), {
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      background: this.background,
    })
  }

  /** 渲染并写入 PNG 文件,返回路径 */
  async renderToFile(path: string): Promise<string> {
    const buf = await this.renderPNG()
    await writeFile(path, buf)
    return path
  }

  /** 释放 headless 渲染器持有的浏览器(webgpu 模式用完调用) */
  async dispose(): Promise<void> {
    await this.headless?.close()
    this.headless = undefined
  }

  /** 序列化会话状态(Scene JSON,可持久化跨调用) */
  serialize(): string {
    return JSON.stringify(this.toScene())
  }

  /** 从序列化的 Scene JSON 恢复会话文档 */
  static deserialize(json: string, opts?: CanvasSessionOptions): CanvasSession {
    const session = new CanvasSession(opts)
    session.loadScene(JSON.parse(json) as Scene)
    return session
  }
}
