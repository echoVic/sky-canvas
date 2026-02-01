/**
 * 语言检测器
 * 基于Unicode脚本识别和统计方法检测文本语言
 */

import {
  type LanguageDetectionResult,
  type LanguageTag,
  type TextAnalysisResult,
  TextDirection,
} from '../types/I18nTextTypes'

// Unicode脚本代码到语言的映射
const SCRIPT_TO_LANGUAGES = new Map<string, LanguageTag[]>([
  // 拉丁文系统
  [
    'Latn',
    [
      { language: 'en' }, // 英语
      { language: 'es' }, // 西班牙语
      { language: 'fr' }, // 法语
      { language: 'de' }, // 德语
      { language: 'it' }, // 意大利语
      { language: 'pt' }, // 葡萄牙语
      { language: 'pl' }, // 波兰语
      { language: 'nl' }, // 荷兰语
      { language: 'sv' }, // 瑞典语
    ],
  ],

  // 中文系统
  [
    'Hans',
    [
      { language: 'zh', script: 'Hans', region: 'CN' }, // 简体中文
    ],
  ],
  [
    'Hant',
    [
      { language: 'zh', script: 'Hant', region: 'TW' }, // 繁体中文（台湾）
      { language: 'zh', script: 'Hant', region: 'HK' }, // 繁体中文（香港）
    ],
  ],

  // 阿拉伯文系统
  [
    'Arab',
    [
      { language: 'ar' }, // 阿拉伯语
      { language: 'fa' }, // 波斯语
      { language: 'ur' }, // 乌尔都语
    ],
  ],

  // 希伯来文系统
  [
    'Hebr',
    [
      { language: 'he' }, // 希伯来语
    ],
  ],

  // 日文系统
  [
    'Jpan',
    [
      { language: 'ja' }, // 日语
    ],
  ],

  // 韩文系统
  [
    'Kore',
    [
      { language: 'ko' }, // 韩语
    ],
  ],

  // 西里尔文系统
  [
    'Cyrl',
    [
      { language: 'ru' }, // 俄语
      { language: 'uk' }, // 乌克兰语
      { language: 'bg' }, // 保加利亚语
      { language: 'sr' }, // 塞尔维亚语
    ],
  ],

  // 天城文系统
  [
    'Deva',
    [
      { language: 'hi' }, // 印地语
      { language: 'ne' }, // 尼泊尔语
      { language: 'mr' }, // 马拉地语
    ],
  ],

  // 泰文系统
  [
    'Thai',
    [
      { language: 'th' }, // 泰语
    ],
  ],
])

// Unicode脚本范围定义
const SCRIPT_RANGES = new Map<string, [number, number][]>([
  [
    'Latn',
    [
      [0x0041, 0x005a], // 基本拉丁字母大写
      [0x0061, 0x007a], // 基本拉丁字母小写
      [0x00c0, 0x00d6], // 扩展拉丁字母A
      [0x00d8, 0x00f6],
      [0x00f8, 0x00ff],
      [0x0100, 0x017f], // 扩展拉丁字母B
      [0x0180, 0x024f], // 扩展拉丁字母B
      [0x1e00, 0x1eff], // 拉丁文扩展附加
    ],
  ],

  [
    'Hans',
    [
      [0x4e00, 0x9fff], // CJK统一汉字
      [0x3400, 0x4dbf], // CJK扩展A
      [0x20000, 0x2a6df], // CJK扩展B
    ],
  ],

  [
    'Hant',
    [
      [0x4e00, 0x9fff], // CJK统一汉字（与简体重叠，需要额外判断）
      [0xf900, 0xfaff], // CJK兼容汉字
    ],
  ],

  [
    'Arab',
    [
      [0x0600, 0x06ff], // 阿拉伯文
      [0x0750, 0x077f], // 阿拉伯文补充
      [0x08a0, 0x08ff], // 阿拉伯文扩展A
      [0xfb50, 0xfdff], // 阿拉伯表现形式A
      [0xfe70, 0xfeff], // 阿拉伯表现形式B
    ],
  ],

  [
    'Hebr',
    [
      [0x0590, 0x05ff], // 希伯来文
      [0xfb1d, 0xfb4f], // 希伯来表现形式
    ],
  ],

  [
    'Jpan',
    [
      [0x3040, 0x309f], // 平假名
      [0x30a0, 0x30ff], // 片假名
      [0x31f0, 0x31ff], // 片假名拼音扩展
      [0x4e00, 0x9fff], // 汉字（在日语中使用）
    ],
  ],

  [
    'Kore',
    [
      [0x1100, 0x11ff], // 韩文字母
      [0x3130, 0x318f], // 韩文兼容字母
      [0xa960, 0xa97f], // 韩文字母扩展A
      [0xac00, 0xd7af], // 韩文音节
      [0xd7b0, 0xd7ff], // 韩文字母扩展B
    ],
  ],

  [
    'Cyrl',
    [
      [0x0400, 0x04ff], // 西里尔文
      [0x0500, 0x052f], // 西里尔文补充
      [0x2de0, 0x2dff], // 西里尔文扩展A
      [0xa640, 0xa69f], // 西里尔文扩展B
    ],
  ],

  [
    'Deva',
    [
      [0x0900, 0x097f], // 天城文
      [0xa8e0, 0xa8ff], // 天城文扩展
    ],
  ],

  [
    'Thai',
    [
      [0x0e00, 0x0e7f], // 泰文
    ],
  ],
])

// 常见的语言特定字符频率模式
const LANGUAGE_PATTERNS = new Map<string, Map<string, number>>([
  [
    'en',
    new Map([
      ['e', 12.7],
      ['t', 9.06],
      ['a', 8.17],
      ['o', 7.51],
      ['i', 6.97],
      ['n', 6.75],
      ['s', 6.33],
      ['h', 6.09],
      ['r', 5.99],
      ['d', 4.25],
    ]),
  ],

  [
    'es',
    new Map([
      ['e', 13.68],
      ['a', 12.53],
      ['o', 8.68],
      ['s', 7.98],
      ['r', 6.87],
      ['n', 6.71],
      ['i', 6.25],
      ['d', 5.86],
      ['l', 4.97],
      ['c', 4.68],
    ]),
  ],

  [
    'fr',
    new Map([
      ['e', 17.26],
      ['s', 7.9],
      ['a', 7.64],
      ['r', 6.65],
      ['i', 7.24],
      ['t', 7.24],
      ['n', 7.15],
      ['u', 6.31],
      ['l', 5.46],
      ['o', 5.38],
    ]),
  ],

  [
    'de',
    new Map([
      ['e', 17.4],
      ['n', 9.78],
      ['s', 7.27],
      ['r', 7.0],
      ['i', 7.55],
      ['t', 6.15],
      ['u', 4.35],
      ['a', 6.51],
      ['d', 5.08],
      ['h', 4.76],
    ]),
  ],

  [
    'zh',
    new Map([
      // 中文使用字符频率
      ['的', 5.9],
      ['是', 2.44],
      ['在', 2.17],
      ['有', 1.67],
      ['我', 1.59],
      ['你', 1.45],
      ['了', 1.37],
      ['他', 1.25],
      ['这', 1.14],
      ['上', 1.02],
    ]),
  ],
])

export class LanguageDetector {
  private scriptCache = new Map<number, string>()

  /**
   * 检测字符所属的Unicode脚本
   */
  detectScript(codePoint: number): string {
    if (this.scriptCache.has(codePoint)) {
      return this.scriptCache.get(codePoint)!
    }

    let script = 'Unknown'

    for (const [scriptName, ranges] of SCRIPT_RANGES) {
      for (const [start, end] of ranges) {
        if (codePoint >= start && codePoint <= end) {
          script = scriptName
          break
        }
      }
      if (script !== 'Unknown') break
    }

    this.scriptCache.set(codePoint, script)
    return script
  }

  /**
   * 统计文本中各种脚本的使用情况
   */
  analyzeScripts(text: string): Map<string, number> {
    const scriptCounts = new Map<string, number>()

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i) || 0
      const script = this.detectScript(codePoint)

      scriptCounts.set(script, (scriptCounts.get(script) || 0) + 1)

      // 处理代理对
      if (codePoint > 0xffff) {
        i++
      }
    }

    return scriptCounts
  }

  /**
   * 基于脚本检测最可能的语言
   */
  detectByScript(text: string): LanguageDetectionResult | null {
    const scriptCounts = this.analyzeScripts(text)
    const totalChars = Array.from(scriptCounts.values()).reduce((sum, count) => sum + count, 0)

    if (totalChars === 0) {
      return null
    }

    // 找到使用最多的脚本
    let maxScript = ''
    let maxCount = 0

    for (const [script, count] of scriptCounts) {
      if (count > maxCount && script !== 'Unknown') {
        maxScript = script
        maxCount = count
      }
    }

    if (!maxScript || !SCRIPT_TO_LANGUAGES.has(maxScript)) {
      return null
    }

    const possibleLanguages = SCRIPT_TO_LANGUAGES.get(maxScript)!
    const confidence = maxCount / totalChars

    // 如果只有一种可能的语言，直接返回
    if (possibleLanguages.length === 1) {
      return {
        language: possibleLanguages[0],
        confidence,
        script: maxScript,
      }
    }

    // 如果有多种可能，使用其他方法进一步区分
    return this.disambiguateLanguages(text, possibleLanguages, maxScript, confidence)
  }

  /**
   * 区分相同脚本的不同语言
   */
  private disambiguateLanguages(
    text: string,
    candidates: LanguageTag[],
    script: string,
    baseConfidence: number
  ): LanguageDetectionResult {
    // 对于中文，尝试区分简体和繁体
    if (script === 'Hans' || script === 'Hant') {
      return this.detectChineseVariant(text, candidates, baseConfidence)
    }

    // 对于其他语言，使用统计方法
    let bestMatch = candidates[0]
    let bestScore = 0

    for (const candidate of candidates) {
      const score = this.calculateLanguageScore(text, candidate.language)
      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
      }
    }

    return {
      language: bestMatch,
      confidence: Math.min(baseConfidence, bestScore),
      script,
    }
  }

  /**
   * 区分简体中文和繁体中文
   */
  private detectChineseVariant(
    text: string,
    candidates: LanguageTag[],
    baseConfidence: number
  ): LanguageDetectionResult {
    // 简体中文特有字符（经过简化的）
    const simplifiedChars = new Set([
      '个',
      '中',
      '国',
      '人',
      '民',
      '年',
      '会',
      '能',
      '现',
      '过',
      '说',
      '时',
      '来',
      '开',
      '门',
      '还',
      '发',
      '车',
      '问',
      '长',
    ])

    // 繁体中文特有字符
    const traditionalChars = new Set([
      '個',
      '國',
      '會',
      '現',
      '過',
      '說',
      '時',
      '來',
      '開',
      '門',
      '還',
      '發',
      '車',
      '問',
      '長',
      '學',
      '見',
      '聽',
      '講',
      '買',
    ])

    let simplifiedCount = 0
    let traditionalCount = 0

    for (const char of text) {
      if (simplifiedChars.has(char)) {
        simplifiedCount++
      } else if (traditionalChars.has(char)) {
        traditionalCount++
      }
    }

    const totalSpecific = simplifiedCount + traditionalCount
    if (totalSpecific === 0) {
      // 无法区分，返回默认简体
      return {
        language: { language: 'zh', script: 'Hans' },
        confidence: baseConfidence * 0.7,
        script: 'Hans',
      }
    }

    if (simplifiedCount > traditionalCount) {
      return {
        language: { language: 'zh', script: 'Hans', region: 'CN' },
        confidence: baseConfidence * (simplifiedCount / totalSpecific),
        script: 'Hans',
      }
    } else {
      return {
        language: { language: 'zh', script: 'Hant', region: 'TW' },
        confidence: baseConfidence * (traditionalCount / totalSpecific),
        script: 'Hant',
      }
    }
  }

  /**
   * 计算文本与特定语言的匹配分数
   */
  private calculateLanguageScore(text: string, languageCode: string): number {
    const patterns = LANGUAGE_PATTERNS.get(languageCode)
    if (!patterns) {
      return 0.5 // 默认分数
    }

    const textLower = text.toLowerCase()
    const charFreq = new Map<string, number>()

    // 统计字符频率
    for (const char of textLower) {
      if (char.match(/[a-z\u4e00-\u9fff]/)) {
        // 只统计字母和汉字
        charFreq.set(char, (charFreq.get(char) || 0) + 1)
      }
    }

    const totalChars = Array.from(charFreq.values()).reduce((sum, count) => sum + count, 0)
    if (totalChars === 0) {
      return 0
    }

    // 计算与期望频率的匹配度
    let score = 0
    let comparisons = 0

    for (const [char, expectedFreq] of patterns) {
      const actualFreq = ((charFreq.get(char) || 0) / totalChars) * 100
      const diff = Math.abs(actualFreq - expectedFreq)
      score += Math.max(0, 1 - diff / expectedFreq) // 归一化差异
      comparisons++
    }

    return comparisons > 0 ? score / comparisons : 0
  }

  /**
   * 综合检测文本语言
   */
  detectLanguage(text: string): LanguageDetectionResult | null {
    if (!text || text.trim().length === 0) {
      return null
    }

    // 首先基于脚本检测
    const scriptResult = this.detectByScript(text)

    if (!scriptResult) {
      // 如果脚本检测失败，尝试统计方法
      return this.detectByStatistics(text)
    }

    return scriptResult
  }

  /**
   * 基于统计方法检测语言（备用方法）
   */
  private detectByStatistics(text: string): LanguageDetectionResult | null {
    let bestLanguage: LanguageTag | null = null
    let bestScore = 0
    let bestScript = 'Latn'

    // 测试几种主要语言
    const testLanguages = ['en', 'es', 'fr', 'de', 'zh']

    for (const langCode of testLanguages) {
      const score = this.calculateLanguageScore(text, langCode)
      if (score > bestScore) {
        bestScore = score
        bestLanguage = { language: langCode }
        if (langCode === 'zh') {
          bestScript = 'Hans'
        }
      }
    }

    if (!bestLanguage || bestScore < 0.3) {
      return null
    }

    return {
      language: bestLanguage,
      confidence: bestScore,
      script: bestScript,
    }
  }

  /**
   * 分析文本的复杂性
   */
  analyzeTextComplexity(text: string): TextAnalysisResult {
    const detectedLanguage = this.detectLanguage(text)
    const scriptCounts = this.analyzeScripts(text)

    // 检测基础方向
    let baseDirection = TextDirection.LTR
    if (detectedLanguage?.script === 'Arab' || detectedLanguage?.script === 'Hebr') {
      baseDirection = TextDirection.RTL
    }

    // 判断复杂度
    const uniqueScripts = Array.from(scriptCounts.keys()).filter((s) => s !== 'Unknown').length
    const complexity =
      uniqueScripts > 1 || baseDirection === TextDirection.RTL ? 'complex' : 'simple'

    // 判断是否需要文本塑形
    const requiresShaping =
      detectedLanguage?.script === 'Arab' ||
      detectedLanguage?.script === 'Deva' ||
      detectedLanguage?.script === 'Thai'

    return {
      originalText: text,
      detectedLanguages: detectedLanguage ? [detectedLanguage.language] : [],
      baseDirection,
      runs: [], // 这里会由BidiProcessor填充
      complexity,
      requiresShaping,
    }
  }
}
