/**
 * 国际化文本管理器
 * 提供统一的多语言文本处理接口
 */

import { BidiProcessor } from './i18n/BidiProcessor'
import { I18nTextLayout } from './i18n/I18nTextLayout'
import { type I18nRenderOptions, I18nTextRenderer } from './i18n/I18nTextRenderer'
import { LanguageDetector } from './i18n/LanguageDetector'
import {
  type ComplexTextLayout,
  type DirectionDetectionResult,
  type I18nTextOptions,
  type LanguageDetectionResult,
  type LanguageTag,
  TextAlign,
  type TextAnalysisResult,
  TextDirection,
  WritingMode,
} from './types/I18nTextTypes'
import type { TextStyle } from './types/RichTextTypes'

export interface I18nTextManagerOptions {
  defaultLanguage?: LanguageTag
  defaultDirection?: TextDirection
  fallbackFonts?: Map<string, string[]> // 脚本到字体列表的映射
  enableShaping?: boolean // 是否启用文本塑形
  cacheSize?: number // 缓存大小
}

export class I18nTextManager {
  private bidiProcessor = new BidiProcessor()
  private languageDetector = new LanguageDetector()
  private layoutManager = new I18nTextLayout()
  private renderer = new I18nTextRenderer()

  private options: Required<I18nTextManagerOptions>
  private analysisCache = new Map<string, TextAnalysisResult>()
  private layoutCache = new Map<string, ComplexTextLayout>()

  constructor(options: I18nTextManagerOptions = {}) {
    this.options = {
      defaultLanguage: { language: 'en' },
      defaultDirection: TextDirection.AUTO,
      fallbackFonts: new Map([
        ['Latn', ['Arial', 'Helvetica', 'sans-serif']],
        ['Hans', ['SimSun', '宋体', 'sans-serif']],
        ['Hant', ['PMingLiU', '新細明體', 'sans-serif']],
        ['Arab', ['Tahoma', 'Arial Unicode MS', 'sans-serif']],
        ['Hebr', ['David', 'Arial Hebrew', 'sans-serif']],
        ['Deva', ['Mangal', 'Noto Sans Devanagari', 'sans-serif']],
        ['Thai', ['Tahoma', 'Noto Sans Thai', 'sans-serif']],
      ]),
      enableShaping: true,
      cacheSize: 100,
      ...options,
    }
  }

  /**
   * 检测文本语言
   */
  detectLanguage(text: string): LanguageDetectionResult | null {
    return this.languageDetector.detectLanguage(text)
  }

  /**
   * 检测文本方向
   */
  detectDirection(text: string): DirectionDetectionResult {
    return this.bidiProcessor.detectBaseDirection(text)
  }

  /**
   * 分析文本复杂性
   */
  analyzeText(text: string): TextAnalysisResult {
    const cacheKey = `analysis_${text}`

    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!
    }

    const analysis = this.languageDetector.analyzeTextComplexity(text)

    // 添加双向文本分析
    if (analysis.complexity === 'complex' || analysis.baseDirection === TextDirection.RTL) {
      analysis.runs = this.bidiProcessor.processBidiText(text, {
        baseDirection: analysis.baseDirection,
      })
    }

    this.cacheAnalysis(cacheKey, analysis)
    return analysis
  }

  /**
   * 创建国际化文本选项
   */
  createI18nOptions(text: string, overrides: Partial<I18nTextOptions> = {}): I18nTextOptions {
    const analysis = this.analyzeText(text)
    const detectedLanguage = analysis.detectedLanguages[0] || this.options.defaultLanguage

    return {
      language: detectedLanguage,
      direction: overrides.direction || analysis.baseDirection,
      writingMode: WritingMode.HORIZONTAL_TB,
      textAlign: TextAlign.START,
      bidiConfig: {
        baseDirection: analysis.baseDirection,
      },
      ...overrides,
    }
  }

  /**
   * 渲染国际化文本
   */
  renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    style: TextStyle,
    renderOptions: I18nRenderOptions,
    i18nOverrides: Partial<I18nTextOptions> = {}
  ): ComplexTextLayout {
    // 创建国际化选项
    const i18nOptions = this.createI18nOptions(text, i18nOverrides)

    // 优化字体选择
    const optimizedStyle = this.optimizeFontForText(style, i18nOptions)

    // 渲染
    return this.renderer.renderText(ctx, text, optimizedStyle, i18nOptions, renderOptions)
  }

  /**
   * 测量国际化文本
   */
  measureText(
    text: string,
    style: TextStyle,
    i18nOverrides: Partial<I18nTextOptions> = {},
    maxWidth?: number
  ): { width: number; height: number; layout: ComplexTextLayout } {
    const i18nOptions = this.createI18nOptions(text, i18nOverrides)
    const optimizedStyle = this.optimizeFontForText(style, i18nOptions)

    return this.renderer.measureText(text, optimizedStyle, i18nOptions, maxWidth)
  }

  /**
   * 布局文本
   */
  layoutText(
    text: string,
    style: TextStyle,
    maxWidth: number,
    i18nOverrides: Partial<I18nTextOptions> = {}
  ): ComplexTextLayout {
    const cacheKey = `layout_${text}_${JSON.stringify(style)}_${maxWidth}_${JSON.stringify(i18nOverrides)}`

    if (this.layoutCache.has(cacheKey)) {
      return this.layoutCache.get(cacheKey)!
    }

    const i18nOptions = this.createI18nOptions(text, i18nOverrides)
    const optimizedStyle = this.optimizeFontForText(style, i18nOptions)

    const layout = this.layoutManager.layoutText(text, optimizedStyle, maxWidth, i18nOptions)

    this.cacheLayout(cacheKey, layout)
    return layout
  }

  /**
   * 根据语言优化字体选择
   */
  private optimizeFontForText(style: TextStyle, i18nOptions: I18nTextOptions): TextStyle {
    const script = i18nOptions.language.script || this.getScriptForLanguage(i18nOptions.language)
    const fallbackFonts = this.options.fallbackFonts.get(script)

    if (!fallbackFonts) {
      return style
    }

    // 如果样式中没有指定字体族，或指定的字体不适合当前脚本，使用回退字体
    let fontFamily = style.fontFamily

    if (!fontFamily || !this.isFontSuitableForScript(fontFamily, script)) {
      fontFamily = fallbackFonts[0]
    }

    // 创建包含回退字体的字体族列表
    const fontFamilyWithFallbacks = [fontFamily, ...fallbackFonts.slice(1)].join(', ')

    return {
      ...style,
      fontFamily: fontFamilyWithFallbacks,
    }
  }

  /**
   * 获取语言对应的脚本
   */
  private getScriptForLanguage(language: LanguageTag): string {
    if (language.script) {
      return language.script
    }

    // 根据语言代码推断脚本
    const scriptMap: Record<string, string> = {
      zh: 'Hans', // 默认简体中文
      ja: 'Jpan',
      ko: 'Kore',
      ar: 'Arab',
      he: 'Hebr',
      hi: 'Deva',
      th: 'Thai',
      ru: 'Cyrl',
      uk: 'Cyrl',
      bg: 'Cyrl',
      sr: 'Cyrl',
    }

    return scriptMap[language.language] || 'Latn'
  }

  /**
   * 检查字体是否适合特定脚本
   */
  private isFontSuitableForScript(fontFamily: string, script: string): boolean {
    // 简单的启发式检查
    const scriptFontPatterns: Record<string, RegExp[]> = {
      Hans: [/SimSun|宋体|微软雅黑|Microsoft YaHei|黑体|SimHei/i],
      Hant: [/PMingLiU|新細明體|標楷體|DFKai-SB/i],
      Arab: [/Tahoma|Arial Unicode MS|Scheherazade|Amiri/i],
      Hebr: [/David|Arial Hebrew|Narkisim/i],
      Deva: [/Mangal|Noto Sans Devanagari|Sanskrit/i],
      Thai: [/Tahoma|Noto Sans Thai|Cordia New/i],
      Cyrl: [/Times New Roman|Arial|Calibri/i],
    }

    const patterns = scriptFontPatterns[script]
    if (!patterns) {
      return true // 未知脚本，假设适合
    }

    return patterns.some((pattern) => pattern.test(fontFamily))
  }

  /**
   * 获取字符在文本中的位置
   */
  getCharacterPosition(
    text: string,
    charIndex: number,
    style: TextStyle,
    maxWidth?: number,
    i18nOverrides: Partial<I18nTextOptions> = {}
  ): { x: number; y: number } | null {
    const layout = this.layoutText(text, style, maxWidth || 1000, i18nOverrides)
    return this.renderer.getCharacterPosition(layout, charIndex)
  }

  /**
   * 根据坐标获取字符索引
   */
  getCharacterFromPosition(
    text: string,
    x: number,
    y: number,
    style: TextStyle,
    maxWidth?: number,
    i18nOverrides: Partial<I18nTextOptions> = {}
  ): number {
    const layout = this.layoutText(text, style, maxWidth || 1000, i18nOverrides)
    return this.renderer.getCharacterFromPosition(layout, x, y)
  }

  /**
   * 获取文本的视觉显示顺序
   */
  getVisualText(text: string, i18nOverrides: Partial<I18nTextOptions> = {}): string {
    const i18nOptions = this.createI18nOptions(text, i18nOverrides)
    const layout = this.layoutManager.layoutText(text, {}, 1000, i18nOptions)
    return this.layoutManager.getVisualOrder(layout)
  }

  /**
   * 检查文本是否需要复杂处理
   */
  isComplexText(text: string): boolean {
    const analysis = this.analyzeText(text)
    return analysis.complexity === 'complex' || analysis.requiresShaping
  }

  /**
   * 缓存分析结果
   */
  private cacheAnalysis(key: string, analysis: TextAnalysisResult): void {
    if (this.analysisCache.size >= this.options.cacheSize) {
      const firstKey = this.analysisCache.keys().next().value
      if (firstKey !== undefined) {
        this.analysisCache.delete(firstKey)
      }
    }
    this.analysisCache.set(key, analysis)
  }

  /**
   * 缓存布局结果
   */
  private cacheLayout(key: string, layout: ComplexTextLayout): void {
    if (this.layoutCache.size >= this.options.cacheSize) {
      const firstKey = this.layoutCache.keys().next().value
      if (firstKey !== undefined) {
        this.layoutCache.delete(firstKey)
      }
    }
    this.layoutCache.set(key, layout)
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.analysisCache.clear()
    this.layoutCache.clear()
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): LanguageTag[] {
    return [
      { language: 'en' },
      { language: 'zh', script: 'Hans' },
      { language: 'zh', script: 'Hant' },
      { language: 'ja' },
      { language: 'ko' },
      { language: 'ar' },
      { language: 'he' },
      { language: 'hi' },
      { language: 'th' },
      { language: 'ru' },
      { language: 'es' },
      { language: 'fr' },
      { language: 'de' },
      { language: 'it' },
      { language: 'pt' },
    ]
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    analysisCache: { size: number; maxSize: number }
    layoutCache: { size: number; maxSize: number }
  } {
    return {
      analysisCache: {
        size: this.analysisCache.size,
        maxSize: this.options.cacheSize,
      },
      layoutCache: {
        size: this.layoutCache.size,
        maxSize: this.options.cacheSize,
      },
    }
  }
}

/**
 * 创建默认的国际化文本管理器
 */
export function createI18nTextManager(options?: I18nTextManagerOptions): I18nTextManager {
  return new I18nTextManager(options)
}
