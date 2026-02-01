/**
 * 国际化文本渲染器
 * 负责渲染多语言、多方向的文本到Canvas
 */

import {
  type ComplexTextLayout,
  type GlyphInfo,
  type I18nTextOptions,
  TextAlign,
  TextDirection,
  type TextRun,
  WritingMode,
} from '../types/I18nTextTypes'
import {
  type Color,
  type FillStyle,
  type LinearGradient,
  type RadialGradient,
  TextAlign as RichTextAlign,
  ShadowStyle,
  StrokeStyle,
  type TextStyle,
} from '../types/RichTextTypes'
import { I18nTextLayout } from './I18nTextLayout'

export interface I18nRenderOptions {
  x: number // 渲染起始X坐标
  y: number // 渲染起始Y坐标
  maxWidth?: number // 最大宽度
  maxHeight?: number // 最大高度
  clipToBounds?: boolean // 是否裁剪到边界
  debug?: boolean // 是否显示调试信息
}

export class I18nTextRenderer {
  private layoutManager = new I18nTextLayout()

  /**
   * 转换I18n TextAlign到RichText TextAlign
   */
  private convertTextAlign(i18nAlign: TextAlign): RichTextAlign {
    switch (i18nAlign) {
      case TextAlign.START:
      case TextAlign.LEFT:
        return RichTextAlign.LEFT
      case TextAlign.END:
      case TextAlign.RIGHT:
        return RichTextAlign.RIGHT
      case TextAlign.CENTER:
        return RichTextAlign.CENTER
      case TextAlign.JUSTIFY:
        return RichTextAlign.JUSTIFY
      default:
        return RichTextAlign.LEFT
    }
  }

  /**
   * 渲染国际化文本
   */
  renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    style: TextStyle,
    i18nOptions: I18nTextOptions,
    renderOptions: I18nRenderOptions
  ): ComplexTextLayout {
    // 1. 布局文本
    const layout = this.layoutManager.layoutText(
      text,
      style,
      renderOptions.maxWidth || 1000,
      i18nOptions
    )

    // 2. 应用对齐
    if (renderOptions.maxWidth && i18nOptions.textAlign) {
      this.layoutManager.applyTextAlignment(
        layout,
        this.convertTextAlign(i18nOptions.textAlign),
        renderOptions.maxWidth
      )
    }

    // 3. 设置裁剪区域
    if (renderOptions.clipToBounds && renderOptions.maxWidth && renderOptions.maxHeight) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(renderOptions.x, renderOptions.y, renderOptions.maxWidth, renderOptions.maxHeight)
      ctx.clip()
    }

    // 4. 根据书写模式进行坐标变换
    this.applyWritingModeTransform(ctx, i18nOptions.writingMode, renderOptions)

    // 5. 渲染字形
    this.renderGlyphs(ctx, layout, style, renderOptions)

    // 6. 渲染调试信息
    if (renderOptions.debug) {
      this.renderDebugInfo(ctx, layout, renderOptions)
    }

    // 7. 恢复状态
    if (renderOptions.clipToBounds && renderOptions.maxWidth && renderOptions.maxHeight) {
      ctx.restore()
    }

    return layout
  }

  /**
   * 应用书写模式变换
   */
  private applyWritingModeTransform(
    ctx: CanvasRenderingContext2D,
    writingMode: WritingMode,
    renderOptions: I18nRenderOptions
  ): void {
    const { x, y } = renderOptions

    switch (writingMode) {
      case WritingMode.VERTICAL_RL:
        // 垂直书写，从右到左
        ctx.translate(x, y)
        ctx.rotate(Math.PI / 2)
        ctx.scale(-1, 1)
        break

      case WritingMode.VERTICAL_LR:
        // 垂直书写，从左到右
        ctx.translate(x, y)
        ctx.rotate(Math.PI / 2)
        break

      case WritingMode.HORIZONTAL_TB:
      default:
        // 水平书写，从上到下（默认）
        ctx.translate(x, y)
        break
    }
  }

  /**
   * 渲染字形
   */
  private renderGlyphs(
    ctx: CanvasRenderingContext2D,
    layout: ComplexTextLayout,
    style: TextStyle,
    renderOptions: I18nRenderOptions
  ): void {
    // 按运行分组渲染
    const runGlyphs = this.groupGlyphsByRuns(layout.glyphs, layout.runs)

    for (let i = 0; i < layout.runs.length; i++) {
      const run = layout.runs[i]
      const glyphs = runGlyphs[i] || []

      this.renderRun(ctx, run, glyphs, style, renderOptions)
    }
  }

  /**
   * 将字形按运行分组
   */
  private groupGlyphsByRuns(glyphs: GlyphInfo[], runs: TextRun[]): GlyphInfo[][] {
    const runGlyphs: GlyphInfo[][] = []
    let currentRunIndex = 0
    let currentRunGlyphs: GlyphInfo[] = []

    for (const glyph of glyphs) {
      // 检查当前字形是否属于当前运行
      while (currentRunIndex < runs.length && glyph.cluster >= runs[currentRunIndex].endIndex) {
        runGlyphs.push(currentRunGlyphs)
        currentRunGlyphs = []
        currentRunIndex++
      }

      if (
        currentRunIndex < runs.length &&
        glyph.cluster >= runs[currentRunIndex].startIndex &&
        glyph.cluster < runs[currentRunIndex].endIndex
      ) {
        currentRunGlyphs.push(glyph)
      }
    }

    if (currentRunGlyphs.length > 0) {
      runGlyphs.push(currentRunGlyphs)
    }

    return runGlyphs
  }

  /**
   * 渲染单个文本运行
   */
  private renderRun(
    ctx: CanvasRenderingContext2D,
    run: TextRun,
    glyphs: GlyphInfo[],
    style: TextStyle,
    renderOptions: I18nRenderOptions
  ): void {
    if (glyphs.length === 0) return

    ctx.save()

    // 设置字体样式
    this.applyTextStyle(ctx, style)

    // 如果是RTL文本，可能需要特殊处理
    if (run.direction === TextDirection.RTL) {
      this.renderRTLRun(ctx, run, glyphs, style)
    } else {
      this.renderLTRRun(ctx, run, glyphs, style)
    }

    ctx.restore()
  }

  /**
   * 渲染LTR文本运行
   */
  private renderLTRRun(
    ctx: CanvasRenderingContext2D,
    run: TextRun,
    glyphs: GlyphInfo[],
    style: TextStyle
  ): void {
    for (const glyph of glyphs) {
      const char = String.fromCodePoint(...glyph.codePoints)

      // 渲染文本阴影
      if (style.shadow) {
        this.renderTextShadow(ctx, char, glyph.position.x, glyph.position.y, style)
      }

      // 渲染主文本
      this.renderCharacter(ctx, char, glyph.position.x, glyph.position.y, style)
    }
  }

  /**
   * 渲染RTL文本运行
   */
  private renderRTLRun(
    ctx: CanvasRenderingContext2D,
    run: TextRun,
    glyphs: GlyphInfo[],
    style: TextStyle
  ): void {
    // RTL文本需要按照正确的视觉顺序渲染
    // 字形已经按照显示顺序排列，直接渲染即可
    for (const glyph of glyphs) {
      const char = String.fromCodePoint(...glyph.codePoints)

      // 渲染文本阴影
      if (style.shadow) {
        this.renderTextShadow(ctx, char, glyph.position.x, glyph.position.y, style)
      }

      // 渲染主文本
      this.renderCharacter(ctx, char, glyph.position.x, glyph.position.y, style)
    }
  }

  /**
   * 应用文本样式
   */
  private applyTextStyle(ctx: CanvasRenderingContext2D, style: TextStyle): void {
    // 设置字体
    const fontSize = style.fontSize || 16
    const fontFamily = style.fontFamily || 'Arial'
    const fontWeight = style.fontWeight || 'normal'
    const fontStyle = style.fontStyle || 'normal'

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    // 设置文本基线
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    // 设置颜色和填充样式
    if (style.fillStyle) {
      this.applyFillStyle(ctx, style.fillStyle, style.color)
    } else if (style.color) {
      ctx.fillStyle = this.colorToString(style.color)
    } else {
      ctx.fillStyle = '#000000'
    }
  }

  /**
   * 应用填充样式
   */
  private applyFillStyle(
    ctx: CanvasRenderingContext2D,
    fillStyle: FillStyle,
    fallbackColor?: Color
  ): void {
    if ('r' in fillStyle) {
      // 是 Color 类型
      ctx.fillStyle = this.colorToString(fillStyle)
    } else if ('type' in fillStyle) {
      // 是渐变类型
      const gradient = this.createGradient(ctx, fillStyle)
      if (gradient) {
        ctx.fillStyle = gradient
      } else if (fallbackColor) {
        ctx.fillStyle = this.colorToString(fallbackColor)
      }
    }
  }

  /**
   * 创建渐变
   */
  private createGradient(
    ctx: CanvasRenderingContext2D,
    gradient: LinearGradient | RadialGradient
  ): CanvasGradient | null {
    try {
      let canvasGradient: CanvasGradient

      if (gradient.type === 'linear') {
        canvasGradient = ctx.createLinearGradient(
          gradient.x0,
          gradient.y0,
          gradient.x1,
          gradient.y1
        )
      } else if (gradient.type === 'radial') {
        canvasGradient = ctx.createRadialGradient(
          gradient.x0,
          gradient.y0,
          gradient.r0,
          gradient.x1,
          gradient.y1,
          gradient.r1
        )
      } else {
        return null
      }

      // 添加颜色停止点
      for (const stop of gradient.stops) {
        canvasGradient.addColorStop(stop.offset, this.colorToString(stop.color))
      }

      return canvasGradient
    } catch (error) {
      return null
    }
  }

  /**
   * 将颜色转换为字符串
   */
  private colorToString(color: Color): string {
    if (typeof color === 'string') {
      return color
    }

    if ('r' in color) {
      const alpha = 'a' in color ? color.a : 1
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
    }

    return '#000000'
  }

  /**
   * 渲染文字阴影
   */
  private renderTextShadow(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    style: TextStyle
  ): void {
    if (!style.shadow) return

    const shadow = style.shadow
    ctx.save()

    ctx.fillStyle = this.colorToString(shadow.color)
    ctx.shadowColor = 'transparent' // 避免阴影的阴影

    ctx.fillText(char, x + shadow.offsetX, y + shadow.offsetY)

    ctx.restore()
  }

  /**
   * 渲染单个字符
   */
  private renderCharacter(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    style: TextStyle
  ): void {
    // 渲染填充文本
    ctx.fillText(char, x, y)

    // 渲染描边文本
    if (style.strokeStyle && style.strokeStyle.width && style.strokeStyle.width > 0) {
      ctx.save()
      ctx.strokeStyle = this.colorToString(style.strokeStyle.color)
      ctx.lineWidth = style.strokeStyle.width
      ctx.strokeText(char, x, y)
      ctx.restore()
    }

    // 渲染文本装饰（下划线、删除线等）
    if (style.textDecoration) {
      this.renderTextDecoration(ctx, char, x, y, style)
    }
  }

  /**
   * 渲染文本装饰
   */
  private renderTextDecoration(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    style: TextStyle
  ): void {
    if (!style.textDecoration || style.textDecoration === 'none') return

    const metrics = ctx.measureText(char)
    const width = metrics.width
    const fontSize = style.fontSize || 16

    ctx.save()
    ctx.strokeStyle = ctx.fillStyle // 使用文本颜色
    ctx.lineWidth = Math.max(1, fontSize / 16)

    switch (style.textDecoration) {
      case 'underline':
        ctx.beginPath()
        ctx.moveTo(x, y + fontSize + 2)
        ctx.lineTo(x + width, y + fontSize + 2)
        ctx.stroke()
        break

      case 'line-through':
        ctx.beginPath()
        ctx.moveTo(x, y + fontSize / 2)
        ctx.lineTo(x + width, y + fontSize / 2)
        ctx.stroke()
        break

      case 'overline':
        ctx.beginPath()
        ctx.moveTo(x, y - 2)
        ctx.lineTo(x + width, y - 2)
        ctx.stroke()
        break
    }

    ctx.restore()
  }

  /**
   * 渲染调试信息
   */
  private renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    layout: ComplexTextLayout,
    renderOptions: I18nRenderOptions
  ): void {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
    ctx.lineWidth = 1
    ctx.font = '10px monospace'

    // 渲染文本运行边界
    for (const run of layout.runs) {
      const runGlyphs = layout.glyphs.filter(
        (g) => g.cluster >= run.startIndex && g.cluster < run.endIndex
      )

      if (runGlyphs.length > 0) {
        const firstGlyph = runGlyphs[0]
        const lastGlyph = runGlyphs[runGlyphs.length - 1]
        const width = lastGlyph.position.x + lastGlyph.advance.x - firstGlyph.position.x
        const height = 20 // 简化处理

        ctx.strokeRect(firstGlyph.position.x, firstGlyph.position.y, width, height)

        // 显示运行信息
        ctx.fillStyle = 'red'
        ctx.fillText(
          `${run.direction} L${run.level}`,
          firstGlyph.position.x,
          firstGlyph.position.y - 12
        )
      }
    }

    // 渲染换行位置
    ctx.strokeStyle = 'blue'
    for (const lineBreak of layout.lineBreaks) {
      const glyph = layout.glyphs.find((g) => g.cluster === lineBreak.position)
      if (glyph) {
        ctx.beginPath()
        ctx.moveTo(glyph.position.x, glyph.position.y)
        ctx.lineTo(glyph.position.x, glyph.position.y + 20)
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  /**
   * 测量国际化文本尺寸
   */
  measureText(
    text: string,
    style: TextStyle,
    i18nOptions: I18nTextOptions,
    maxWidth?: number
  ): { width: number; height: number; layout: ComplexTextLayout } {
    const layout = this.layoutManager.layoutText(text, style, maxWidth || 1000, i18nOptions)

    return {
      width: layout.totalWidth,
      height: layout.totalHeight,
      layout,
    }
  }

  /**
   * 获取字符位置信息
   */
  getCharacterPosition(
    layout: ComplexTextLayout,
    charIndex: number
  ): { x: number; y: number } | null {
    const glyph = layout.glyphs.find((g) => g.cluster === charIndex)
    return glyph ? { x: glyph.position.x, y: glyph.position.y } : null
  }

  /**
   * 根据坐标获取字符索引
   */
  getCharacterFromPosition(layout: ComplexTextLayout, x: number, y: number): number {
    let closestIndex = 0
    let closestDistance = Infinity

    for (const glyph of layout.glyphs) {
      const distance = Math.sqrt((x - glyph.position.x) ** 2 + (y - glyph.position.y) ** 2)

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = glyph.cluster
      }
    }

    return closestIndex
  }
}
