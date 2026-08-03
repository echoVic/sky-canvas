/**
 * Node 侧:把 Scene 渲染成 PNG Buffer(用 @napi-rs/canvas,Skia 预编译、无系统依赖)。
 *
 * 与浏览器共用 renderSceneToCtx——这里只负责在 Node 造一个 Canvas2D 上下文、拿字节。
 * @napi-rs/canvas 是可选依赖:未安装时给出清晰报错,不拖垮主包(浏览器路径不需要它)。
 */

import type { Scene } from '../scene/types'
import { type CanvasLike, type RasterOptions, renderSceneToCtx } from './renderToCanvas'

/** @napi-rs/canvas 的最小类型(避免把它作为硬类型依赖) */
interface NapiCanvasModule {
  createCanvas(
    width: number,
    height: number
  ): {
    getContext(type: '2d'): CanvasLike
    toBuffer(mime: 'image/png'): Buffer
  }
}

let cached: NapiCanvasModule | undefined

async function loadNapiCanvas(): Promise<NapiCanvasModule> {
  if (cached) return cached
  try {
    // 动态导入:浏览器构建不会打进来;Node 未装时落到 catch。
    // @napi-rs/canvas 是可选 peer 依赖,类型可能不在场,故忽略解析错误。
    // @ts-ignore 可选依赖,未安装时由 catch 兜底
    cached = (await import('@napi-rs/canvas')) as unknown as NapiCanvasModule
    return cached
  } catch {
    throw new Error(
      '渲染 PNG 需要 @napi-rs/canvas,请先安装:npm i @napi-rs/canvas(仅 Node 出图路径需要,浏览器渲染不依赖它)'
    )
  }
}

/**
 * 把一份 Scene 渲染成 PNG 字节。width/height 为设备像素;background 传 CSS 字符串铺底,
 * 便于 agent 出图直接可读(不传则透明)。
 */
export async function renderSceneToPNG(scene: Scene, opts: RasterOptions): Promise<Buffer> {
  const napi = await loadNapiCanvas()
  const canvas = napi.createCanvas(opts.width, opts.height)
  const ctx = canvas.getContext('2d')
  renderSceneToCtx(scene, ctx, opts)
  return canvas.toBuffer('image/png')
}
