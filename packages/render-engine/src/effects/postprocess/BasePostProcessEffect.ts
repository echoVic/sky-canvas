/**
 * 基础后处理效果类
 */

import type {
  IPostProcessEffect,
  PostProcessConfig,
  PostProcessType,
} from '../types/PostProcessTypes'

export abstract class BasePostProcessEffect implements IPostProcessEffect {
  private readonly _id: string
  protected _type: PostProcessType
  protected _config: PostProcessConfig

  constructor(type: PostProcessType, config: PostProcessConfig) {
    this._id = this.generateId()
    this._type = type
    this._config = { ...config }
  }

  get id(): string {
    return this._id
  }

  get type(): PostProcessType {
    return this._type
  }

  get config(): PostProcessConfig {
    return { ...this._config }
  }

  abstract apply(imageData: ImageData, targetData?: ImageData): ImageData

  applyToCanvas(canvas: HTMLCanvasElement, targetCanvas?: HTMLCanvasElement): HTMLCanvasElement {
    const target = targetCanvas || document.createElement('canvas')
    target.width = canvas.width
    target.height = canvas.height

    const ctx = canvas.getContext('2d')
    const targetCtx = target.getContext('2d')
    if (!ctx || !targetCtx) {
      throw new Error('Cannot create 2D context for post process')
    }

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // 应用后处理效果
    const processedData = this.apply(imageData)

    // 绘制到目标画布
    targetCtx.putImageData(processedData, 0, 0)

    return target
  }

  updateConfig(config: Partial<PostProcessConfig>): void {
    this._config = { ...this._config, ...config }
  }

  abstract clone(): IPostProcessEffect

  dispose(): void {
    // 基础清理
  }

  protected generateId(): string {
    return `postprocess_${this._type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  protected clamp(value: number, min: number = 0, max: number = 255): number {
    return Math.max(min, Math.min(max, Math.round(value)))
  }

  protected clampFloat(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value))
  }

  protected copyImageData(source: ImageData, target?: ImageData): ImageData {
    const result = target || new ImageData(source.width, source.height)
    result.data.set(source.data)
    return result
  }

  protected createKernel(size: number, sigma?: number): number[] {
    const kernel: number[] = []
    const center = Math.floor(size / 2)
    let sum = 0

    if (sigma) {
      // 高斯内核
      for (let i = 0; i < size; i++) {
        const x = i - center
        const value = Math.exp(-(x * x) / (2 * sigma * sigma))
        kernel[i] = value
        sum += value
      }
    } else {
      // 平均内核
      for (let i = 0; i < size; i++) {
        kernel[i] = 1
        sum += 1
      }
    }

    // 归一化
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum
    }

    return kernel
  }

  protected convolve(
    imageData: ImageData,
    kernel: number[],
    kernelSize: number,
    targetData?: ImageData
  ): ImageData {
    const { width, height, data } = imageData
    const result = targetData || new ImageData(width, height)
    const resultData = result.data

    const half = Math.floor(kernelSize / 2)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx - half))
            const py = Math.min(height - 1, Math.max(0, y + ky - half))

            const idx = (py * width + px) * 4
            const weight = kernel[ky * kernelSize + kx]

            r += data[idx] * weight
            g += data[idx + 1] * weight
            b += data[idx + 2] * weight
            a += data[idx + 3] * weight
          }
        }

        const resultIdx = (y * width + x) * 4
        resultData[resultIdx] = this.clamp(r)
        resultData[resultIdx + 1] = this.clamp(g)
        resultData[resultIdx + 2] = this.clamp(b)
        resultData[resultIdx + 3] = this.clamp(a)
      }
    }

    return result
  }

  protected rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min
    const sum = max + min

    const l = sum / 2

    if (diff === 0) {
      return { h: 0, s: 0, l }
    }

    const s = l > 0.5 ? diff / (2 - sum) : diff / sum

    let h: number
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / diff + 2) / 6
        break
      case b:
        h = ((r - g) / diff + 4) / 6
        break
      default:
        h = 0
    }

    return { h, s, l }
  }

  protected hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      const gray = Math.round(l * 255)
      return { r: gray, g: gray, b: gray }
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    }
  }

  protected getLuminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b
  }

  protected adjustColor(
    r: number,
    g: number,
    b: number,
    adjustment: (value: number) => number
  ): { r: number; g: number; b: number } {
    return {
      r: this.clamp(adjustment(r)),
      g: this.clamp(adjustment(g)),
      b: this.clamp(adjustment(b)),
    }
  }

  protected mixColors(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number,
    factor: number
  ): { r: number; g: number; b: number } {
    const f = this.clampFloat(factor)
    return {
      r: Math.round(r1 * (1 - f) + r2 * f),
      g: Math.round(g1 * (1 - f) + g2 * f),
      b: Math.round(b1 * (1 - f) + b2 * f),
    }
  }

  protected random(seed?: number): number {
    if (seed !== undefined) {
      // 简单的伪随机生成器
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    return Math.random()
  }
}
