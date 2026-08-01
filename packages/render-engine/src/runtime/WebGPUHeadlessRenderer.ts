/**
 * WebGPUHeadlessRenderer:用 playwright 驱动 headless chromium,以**真实 WebGPU 管线**
 * 出图(高保真:像素与线上浏览器一致)。
 *
 * 与 raster(Canvas2D)后端的分工:
 *   - raster:零依赖、无 GPU 也能出图(CI/容器兜底),但走的是另一套 Canvas2D 光栅;
 *   - 本类:复用 examples/headless-render 的真实 WGSL 管线,所见即线上所得,
 *     代价是依赖 playwright + 一个能初始化 WebGPU 的 chromium(需 GPU 或可用的软件渲染栈)。
 *
 * playwright 是可选依赖:未安装或环境无法初始化 WebGPU 时,抛清晰错误,由调用方回退到 raster。
 */

import type { Scene } from '../scene/types'

export interface WebGPUHeadlessOptions {
  /** harness 页面地址(examples/headless-render 的 dev/preview URL 或 file://) */
  harnessUrl: string
  /** chromium 可执行文件路径;缺省用 playwright 自带 */
  executablePath?: string
  /** 传给 chromium 的额外 flag(如指向 SwiftShader 的软件渲染参数) */
  extraArgs?: string[]
  /** 初始化/渲染超时(ms),默认 20000 */
  timeout?: number
}

export interface HeadlessRenderOptions {
  width: number
  height: number
  dpr?: number
  background?: string
}

/** 在无 GPU 容器里让 chromium 用 SwiftShader 软件渲染 WebGPU 的一组 flag(有 GPU 时无害) */
export const SWIFTSHADER_ARGS: string[] = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-angle=vulkan',
  '--use-vulkan=swiftshader',
  '--enable-webgpu-developer-features',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--disable-gpu-sandbox',
]

// playwright 的最小结构类型(避免把它作为硬类型依赖)
interface PWPage {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<unknown>
  waitForFunction(fn: string, arg?: unknown, opts?: { timeout?: number }): Promise<unknown>
  evaluate<T>(fn: string | ((arg: unknown) => T), arg?: unknown): Promise<T>
  setViewportSize(size: { width: number; height: number }): Promise<void>
  locator(sel: string): { screenshot(opts: { path?: string }): Promise<Buffer> }
}
interface PWBrowser {
  newPage(opts?: { viewport?: { width: number; height: number }; deviceScaleFactor?: number }): Promise<PWPage>
  close(): Promise<void>
}
interface PWChromium {
  launch(opts: {
    headless?: boolean
    executablePath?: string
    args?: string[]
  }): Promise<PWBrowser>
}

async function loadPlaywright(): Promise<{ chromium: PWChromium }> {
  try {
    // 用变量间接 + @vite-ignore,阻止打包器在构建/测试期静态解析这个可选依赖;
    // 未安装时落到 catch。playwright 只在 Node 出图路径需要。
    const mod = 'playwright'
    return (await import(/* @vite-ignore */ mod)) as unknown as { chromium: PWChromium }
  } catch {
    throw new Error(
      'WebGPU headless 出图需要 playwright,请先安装:npm i -D playwright && npx playwright install chromium(无 GPU 时可改用 raster 后端)'
    )
  }
}

export class WebGPUHeadlessRenderer {
  private opts: WebGPUHeadlessOptions
  private browser?: PWBrowser
  private page?: PWPage

  constructor(opts: WebGPUHeadlessOptions) {
    this.opts = opts
  }

  /** 启动 chromium、打开 harness、等 WebGPU 初始化就绪 */
  async start(): Promise<void> {
    const { chromium } = await loadPlaywright()
    const timeout = this.opts.timeout ?? 20000
    this.browser = await chromium.launch({
      headless: true,
      executablePath: this.opts.executablePath,
      // headless=new 用完整 chrome 栈(WebGPU 需要),叠加软件渲染/自定义 flag
      args: ['--headless=new', ...SWIFTSHADER_ARGS, ...(this.opts.extraArgs ?? [])],
    })
    this.page = await this.browser.newPage()
    await this.page.goto(this.opts.harnessUrl, { waitUntil: 'load', timeout })
    // 等 harness 就绪或报错
    await this.page.waitForFunction('window.__ready === true || !!window.__error', undefined, { timeout })
    const err = await this.page.evaluate<string | undefined>('window.__error')
    if (err) throw new Error(`headless WebGPU 初始化失败: ${err}`)
  }

  /** 渲染一份 Scene,截图返回 PNG 字节 */
  async render(scene: Scene, opts: HeadlessRenderOptions): Promise<Buffer> {
    if (!this.page) throw new Error('WebGPUHeadlessRenderer 未 start()')
    const dpr = opts.dpr ?? 1
    await this.page.setViewportSize({ width: opts.width, height: opts.height })
    // 调 harness 的 __renderScene,等 GPU 提交完成
    await this.page.evaluate<void>(
      `(async () => { await window.__renderScene(${JSON.stringify(scene)}, ${JSON.stringify({
        width: opts.width * dpr,
        height: opts.height * dpr,
        dpr,
        background: opts.background,
      })}); })()`
    )
    return this.page.locator('#gpu-canvas').screenshot({})
  }

  /** 渲染并写文件 */
  async renderToFile(scene: Scene, path: string, opts: HeadlessRenderOptions): Promise<string> {
    if (!this.page) throw new Error('WebGPUHeadlessRenderer 未 start()')
    await this.render(scene, opts)
    await this.page.locator('#gpu-canvas').screenshot({ path })
    return path
  }

  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = undefined
    this.page = undefined
  }
}
