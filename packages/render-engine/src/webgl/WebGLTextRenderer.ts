import type { IRenderable } from '../batch'
import type { TextureManager } from './TextureManager'
import { TextureConfig } from './WebGLResourceTypes'

export type TextAlign = 'left' | 'center' | 'right'
export type TextBaseline = 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'

export interface TextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  fontStyle?: 'normal' | 'italic' | 'oblique'
  color?: string
  textAlign?: TextAlign
  textBaseline?: TextBaseline
  letterSpacing?: number
  lineHeight?: number
}

export interface TextRenderOptions extends TextStyle {
  maxWidth?: number
  wordWrap?: boolean
}

interface TextCacheEntry {
  texture: WebGLTexture
  width: number
  height: number
  textureWidth: number
  textureHeight: number
  lastUsed: number
}

interface TextMeasureResult {
  width: number
  height: number
  lines: string[]
}

const DEFAULT_STYLE: Required<TextStyle> = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  letterSpacing: 0,
  lineHeight: 1.2,
}

export class WebGLTextRenderer {
  private gl: WebGLRenderingContext
  private textureManager: TextureManager
  private measureCanvas: HTMLCanvasElement
  private measureContext: CanvasRenderingContext2D
  private textCache: Map<string, TextCacheEntry> = new Map()
  private maxCacheSize: number
  private cacheCleanupInterval: number
  private lastCleanupTime: number = 0

  constructor(
    gl: WebGLRenderingContext,
    textureManager: TextureManager,
    options?: { maxCacheSize?: number; cacheCleanupInterval?: number }
  ) {
    this.gl = gl
    this.textureManager = textureManager
    this.maxCacheSize = options?.maxCacheSize ?? 100
    this.cacheCleanupInterval = options?.cacheCleanupInterval ?? 5000

    this.measureCanvas = document.createElement('canvas')
    this.measureCanvas.width = 1
    this.measureCanvas.height = 1
    const ctx = this.measureCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to create 2D context for text measurement')
    }
    this.measureContext = ctx
  }

  drawText(text: string, x: number, y: number, options?: TextRenderOptions): IRenderable | null {
    if (!text || text.length === 0) {
      return null
    }

    const style = this.mergeStyle(options)
    const cacheKey = this.generateCacheKey(text, style, options?.maxWidth)

    let cacheEntry: TextCacheEntry | undefined = this.textCache.get(cacheKey)
    if (!cacheEntry) {
      const newEntry = this.createTextTexture(text, style, options?.maxWidth)
      if (!newEntry) {
        return null
      }
      cacheEntry = newEntry
      this.addToCache(cacheKey, cacheEntry)
    } else {
      cacheEntry.lastUsed = performance.now()
    }

    const alignedX = this.calculateAlignedX(x, cacheEntry.width, style.textAlign)
    const alignedY = this.calculateAlignedY(
      y,
      cacheEntry.height,
      style.textBaseline,
      style.fontSize
    )

    return this.createTextRenderable(
      alignedX,
      alignedY,
      cacheEntry.width,
      cacheEntry.height,
      cacheEntry.texture,
      cacheEntry.textureWidth,
      cacheEntry.textureHeight
    )
  }

  measureText(text: string, style?: TextStyle): TextMeasureResult {
    const mergedStyle = this.mergeStyle(style)
    this.applyStyleToContext(this.measureContext, mergedStyle)

    const lines = text.split('\n')
    let maxWidth = 0

    for (const line of lines) {
      const metrics = this.measureContext.measureText(line)
      maxWidth = Math.max(maxWidth, metrics.width)
    }

    const lineHeight = mergedStyle.fontSize * mergedStyle.lineHeight
    const height = lines.length * lineHeight

    return {
      width: maxWidth,
      height,
      lines,
    }
  }

  measureTextWithWrap(text: string, maxWidth: number, style?: TextStyle): TextMeasureResult {
    const mergedStyle = this.mergeStyle(style)
    this.applyStyleToContext(this.measureContext, mergedStyle)

    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = this.measureContext.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    let actualMaxWidth = 0
    for (const line of lines) {
      const metrics = this.measureContext.measureText(line)
      actualMaxWidth = Math.max(actualMaxWidth, metrics.width)
    }

    const lineHeight = mergedStyle.fontSize * mergedStyle.lineHeight
    const height = lines.length * lineHeight

    return {
      width: Math.min(actualMaxWidth, maxWidth),
      height,
      lines,
    }
  }

  clearCache(): void {
    for (const entry of this.textCache.values()) {
      this.gl.deleteTexture(entry.texture)
    }
    this.textCache.clear()
  }

  dispose(): void {
    this.clearCache()
  }

  private mergeStyle(style?: TextStyle): Required<TextStyle> {
    return {
      fontFamily: style?.fontFamily ?? DEFAULT_STYLE.fontFamily,
      fontSize: style?.fontSize ?? DEFAULT_STYLE.fontSize,
      fontWeight: style?.fontWeight ?? DEFAULT_STYLE.fontWeight,
      fontStyle: style?.fontStyle ?? DEFAULT_STYLE.fontStyle,
      color: style?.color ?? DEFAULT_STYLE.color,
      textAlign: style?.textAlign ?? DEFAULT_STYLE.textAlign,
      textBaseline: style?.textBaseline ?? DEFAULT_STYLE.textBaseline,
      letterSpacing: style?.letterSpacing ?? DEFAULT_STYLE.letterSpacing,
      lineHeight: style?.lineHeight ?? DEFAULT_STYLE.lineHeight,
    }
  }

  private generateCacheKey(text: string, style: Required<TextStyle>, maxWidth?: number): string {
    return [
      text,
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.fontStyle,
      style.color,
      style.letterSpacing,
      style.lineHeight,
      maxWidth ?? 'none',
    ].join('|')
  }

  private createTextTexture(
    text: string,
    style: Required<TextStyle>,
    maxWidth?: number
  ): TextCacheEntry | null {
    const measurement = maxWidth
      ? this.measureTextWithWrap(text, maxWidth, style)
      : this.measureText(text, style)

    if (measurement.width <= 0 || measurement.height <= 0) {
      return null
    }

    const padding = 2
    const canvasWidth = this.nextPowerOfTwo(Math.ceil(measurement.width) + padding * 2)
    const canvasHeight = this.nextPowerOfTwo(Math.ceil(measurement.height) + padding * 2)

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    this.applyStyleToContext(ctx, style)

    const lineHeight = style.fontSize * style.lineHeight
    let y = padding + style.fontSize * 0.8

    for (const line of measurement.lines) {
      let x = padding
      if (style.textAlign === 'center') {
        const lineWidth = ctx.measureText(line).width
        x = padding + (measurement.width - lineWidth) / 2
      } else if (style.textAlign === 'right') {
        const lineWidth = ctx.measureText(line).width
        x = padding + measurement.width - lineWidth
      }

      if (style.letterSpacing !== 0) {
        this.drawTextWithLetterSpacing(ctx, line, x, y, style.letterSpacing)
      } else {
        ctx.fillText(line, x, y)
      }
      y += lineHeight
    }

    const texture = this.createTextureFromCanvas(canvas)
    if (!texture) {
      return null
    }

    return {
      texture,
      width: measurement.width,
      height: measurement.height,
      textureWidth: canvasWidth,
      textureHeight: canvasHeight,
      lastUsed: performance.now(),
    }
  }

  private applyStyleToContext(ctx: CanvasRenderingContext2D, style: Required<TextStyle>): void {
    const fontWeight =
      typeof style.fontWeight === 'number'
        ? style.fontWeight >= 700
          ? 'bold'
          : 'normal'
        : style.fontWeight

    ctx.font = `${style.fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`
    ctx.fillStyle = style.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  private drawTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    letterSpacing: number
  ): void {
    let currentX = x
    for (const char of text) {
      ctx.fillText(char, currentX, y)
      currentX += ctx.measureText(char).width + letterSpacing
    }
  }

  private createTextureFromCanvas(canvas: HTMLCanvasElement): WebGLTexture | null {
    const texture = this.gl.createTexture()
    if (!texture) {
      return null
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas
    )

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)

    this.gl.bindTexture(this.gl.TEXTURE_2D, null)

    return texture
  }

  private calculateAlignedX(x: number, width: number, align: TextAlign): number {
    switch (align) {
      case 'center':
        return x - width / 2
      case 'right':
        return x - width
      default:
        return x
    }
  }

  private calculateAlignedY(
    y: number,
    height: number,
    baseline: TextBaseline,
    fontSize: number
  ): number {
    switch (baseline) {
      case 'top':
        return y
      case 'middle':
        return y - height / 2
      case 'bottom':
        return y - height
      case 'hanging':
        return y - fontSize * 0.1
      case 'alphabetic':
      default:
        return y - fontSize * 0.8
    }
  }

  private createTextRenderable(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: WebGLTexture,
    textureWidth: number,
    textureHeight: number
  ): IRenderable {
    const u1 = 0
    const v1 = 0
    const u2 = width / textureWidth
    const v2 = height / textureHeight

    const vertices = new Float32Array([
      x,
      y,
      1,
      1,
      1,
      1,
      u1,
      v1,
      x + width,
      y,
      1,
      1,
      1,
      1,
      u2,
      v1,
      x + width,
      y + height,
      1,
      1,
      1,
      1,
      u2,
      v2,
      x,
      y + height,
      1,
      1,
      1,
      1,
      u1,
      v2,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getTexture: () => texture,
      getShader: () => 'texture',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  private addToCache(key: string, entry: TextCacheEntry): void {
    const now = performance.now()
    if (now - this.lastCleanupTime > this.cacheCleanupInterval) {
      this.cleanupCache()
      this.lastCleanupTime = now
    }

    if (this.textCache.size >= this.maxCacheSize) {
      this.evictOldestEntry()
    }

    this.textCache.set(key, entry)
  }

  private cleanupCache(): void {
    const now = performance.now()
    const maxAge = 30000

    const keysToDelete: string[] = []
    for (const [key, entry] of this.textCache.entries()) {
      if (now - entry.lastUsed > maxAge) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      const entry = this.textCache.get(key)
      if (entry) {
        this.gl.deleteTexture(entry.texture)
        this.textCache.delete(key)
      }
    }
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.textCache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.textCache.get(oldestKey)
      if (entry) {
        this.gl.deleteTexture(entry.texture)
        this.textCache.delete(oldestKey)
      }
    }
  }

  private nextPowerOfTwo(value: number): number {
    let power = 1
    while (power < value) {
      power *= 2
    }
    return power
  }
}
