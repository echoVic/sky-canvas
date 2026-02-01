/**
 * 文本测量工具
 */

import type { FontWeight, TextFragment, TextStyle } from './types/RichTextTypes'

/**
 * 文本测量缓存
 */
export interface MeasurementCache {
  key: string
  width: number
  height: number
}

/**
 * 文本测量器
 */
export class TextMeasurement {
  private measurementCache: Map<string, MeasurementCache> = new Map()
  private tempContext: CanvasRenderingContext2D

  constructor(tempContext: CanvasRenderingContext2D) {
    this.tempContext = tempContext
  }

  /**
   * 测量文本片段宽度
   */
  measureFragmentWidth(fragment: TextFragment): number {
    const cacheKey = this.getFragmentCacheKey(fragment, 'width')
    const cached = this.measurementCache.get(cacheKey)

    if (cached) {
      return cached.width || 0
    }

    const width = this.measureTextWidth(fragment.text, fragment.style) || 0

    this.measurementCache.set(cacheKey, { key: cacheKey, width, height: 0 })
    return width
  }

  /**
   * 获取文本片段高度
   */
  getFragmentHeight(fragment: TextFragment): number {
    const fontSize = fragment.style.fontSize || 16
    const lineHeight = fragment.style.lineHeight || 1.2

    if (typeof lineHeight === 'number' && lineHeight > 2) {
      return lineHeight
    } else {
      return fontSize * lineHeight
    }
  }

  /**
   * 测量文本宽度
   */
  measureTextWidth(text: string, style: TextStyle | undefined): number {
    if (!text) return 0

    this.setFont(style)
    const metrics = this.tempContext.measureText(text)
    return metrics.width || 0
  }

  /**
   * 获取文本片段度量
   */
  getFragmentMetrics(fragment: TextFragment): { ascent: number; descent: number } {
    const fontSize = fragment.style.fontSize || 16

    return {
      ascent: fontSize * 0.8,
      descent: fontSize * 0.2,
    }
  }

  /**
   * 测量片段
   */
  measureFragment(fragment: TextFragment): TextMetrics {
    this.setFont(fragment.style)
    return this.tempContext.measureText(fragment.text)
  }

  /**
   * 在片段中查找字符
   */
  getCharacterInFragment(fragment: TextFragment, relativeX: number, baseIndex: number): number {
    const text = fragment.text
    let currentWidth = 0

    for (let i = 0; i < text.length; i++) {
      const charWidth = this.measureTextWidth(text.charAt(i), fragment.style)

      if (relativeX < currentWidth + charWidth / 2) {
        return baseIndex + i
      }

      currentWidth += charWidth
    }

    return baseIndex + text.length
  }

  /**
   * 规范化字体权重
   */
  normalizeFontWeight(fontWeight: FontWeight | string | undefined): string {
    if (typeof fontWeight === 'number') {
      if (fontWeight >= 700) return 'bold'
      if (fontWeight <= 300) return 'lighter'
      return 'normal'
    }

    switch (fontWeight) {
      case 'bold':
      case 'bolder':
        return 'bold'
      case 'light':
      case 'lighter':
        return 'lighter'
      case 'normal':
      default:
        return 'normal'
    }
  }

  /**
   * 设置字体样式
   */
  setFont(style: TextStyle | undefined): void {
    if (!style) {
      style = {}
    }

    const fontSize = style.fontSize || 16
    const fontWeight = this.normalizeFontWeight(style.fontWeight || 'normal')
    const fontStyle = style.fontStyle || 'normal'
    const fontFamily = style.fontFamily || 'Arial, sans-serif'

    this.tempContext.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  }

  /**
   * 生成片段缓存键
   */
  private getFragmentCacheKey(fragment: TextFragment, type: string): string {
    const style = fragment.style
    return [
      type,
      fragment.text,
      style.fontFamily,
      style.fontSize,
      style.fontWeight,
      style.fontStyle,
      style.letterSpacing,
      style.wordSpacing,
    ].join('|')
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.measurementCache.clear()
  }
}
