/**
 * Unicode双向文本算法(UAX #9)实现
 * 处理混合LTR/RTL文本的正确显示顺序
 */

import {
  type BidiConfig,
  BidiStackEntry,
  BidiState,
  CharacterClass,
  type DirectionDetectionResult,
  TextDirection,
  type TextRun,
} from '../types/I18nTextTypes'

// Unicode双向字符分类映射表（部分主要字符）
const BIDI_CHARACTER_MAP = new Map<number, CharacterClass>([
  // 拉丁字母 (A-Z, a-z)
  ...[...Array(26)].map(
    (_, i) => [0x0041 + i, CharacterClass.LEFT_TO_RIGHT] as [number, CharacterClass]
  ),
  ...[...Array(26)].map(
    (_, i) => [0x0061 + i, CharacterClass.LEFT_TO_RIGHT] as [number, CharacterClass]
  ),

  // 阿拉伯字母范围 (U+0600-U+06FF)
  ...[...Array(256)].map(
    (_, i) => [0x0600 + i, CharacterClass.ARABIC_LETTER] as [number, CharacterClass]
  ),

  // 希伯来字母 (U+05D0-U+05EA)
  ...[...Array(27)].map(
    (_, i) => [0x05d0 + i, CharacterClass.RIGHT_TO_LEFT] as [number, CharacterClass]
  ),

  // 欧洲数字 (0-9)
  ...[...Array(10)].map(
    (_, i) => [0x0030 + i, CharacterClass.EUROPEAN_NUMBER] as [number, CharacterClass]
  ),

  // 阿拉伯-印度数字 (U+0660-U+0669)
  ...[...Array(10)].map(
    (_, i) => [0x0660 + i, CharacterClass.ARABIC_NUMBER] as [number, CharacterClass]
  ),

  // 常见中性字符
  [0x0020, CharacterClass.WHITESPACE], // 空格
  [0x0009, CharacterClass.SEGMENT_SEPARATOR], // 制表符
  [0x000a, CharacterClass.PARAGRAPH_SEPARATOR], // 换行符
  [0x000d, CharacterClass.PARAGRAPH_SEPARATOR], // 回车符
  [0x002c, CharacterClass.COMMON_SEPARATOR], // 逗号
  [0x002e, CharacterClass.COMMON_SEPARATOR], // 句号
  [0x003a, CharacterClass.COMMON_SEPARATOR], // 冒号
  [0x003b, CharacterClass.COMMON_SEPARATOR], // 分号
])

// 强方向性字符范围
const STRONG_LTR_RANGES = [
  [0x0041, 0x005a], // A-Z
  [0x0061, 0x007a], // a-z
  [0x00c0, 0x00d6], // 带重音的拉丁字母
  [0x00d8, 0x00f6], // 带重音的拉丁字母
  [0x00f8, 0x02b8], // 扩展拉丁字母
]

const STRONG_RTL_RANGES = [
  [0x05d0, 0x05ea], // 希伯来字母
  [0x05f0, 0x05f4], // 希伯来字母补充
  [0x0600, 0x06ff], // 阿拉伯文
  [0x0750, 0x077f], // 阿拉伯文补充
  [0xfb50, 0xfdff], // 阿拉伯表现形式-A
  [0xfe70, 0xfeff], // 阿拉伯表现形式-B
]

export class BidiProcessor {
  private characterClassCache = new Map<number, CharacterClass>()

  /**
   * 获取字符的双向类型
   */
  getCharacterClass(codePoint: number): CharacterClass {
    if (this.characterClassCache.has(codePoint)) {
      return this.characterClassCache.get(codePoint)!
    }

    let charClass: CharacterClass

    // 检查映射表
    if (BIDI_CHARACTER_MAP.has(codePoint)) {
      charClass = BIDI_CHARACTER_MAP.get(codePoint)!
    } else {
      // 根据Unicode范围判断
      charClass = this.classifyByRange(codePoint)
    }

    this.characterClassCache.set(codePoint, charClass)
    return charClass
  }

  /**
   * 根据Unicode范围分类字符
   */
  private classifyByRange(codePoint: number): CharacterClass {
    // 检查强LTR字符
    for (const [start, end] of STRONG_LTR_RANGES) {
      if (codePoint >= start && codePoint <= end) {
        return CharacterClass.LEFT_TO_RIGHT
      }
    }

    // 检查强RTL字符
    for (const [start, end] of STRONG_RTL_RANGES) {
      if (codePoint >= start && codePoint <= end) {
        return CharacterClass.RIGHT_TO_LEFT
      }
    }

    // 检查数字
    if (
      (codePoint >= 0x0030 && codePoint <= 0x0039) || // 0-9
      (codePoint >= 0xff10 && codePoint <= 0xff19)
    ) {
      // 全角数字
      return CharacterClass.EUROPEAN_NUMBER
    }

    // 检查阿拉伯数字
    if (codePoint >= 0x0660 && codePoint <= 0x0669) {
      return CharacterClass.ARABIC_NUMBER
    }

    // 检查空白字符
    if (
      codePoint === 0x0020 ||
      codePoint === 0x00a0 ||
      codePoint === 0x1680 ||
      (codePoint >= 0x2000 && codePoint <= 0x200a) ||
      codePoint === 0x202f ||
      codePoint === 0x205f ||
      codePoint === 0x3000
    ) {
      return CharacterClass.WHITESPACE
    }

    // 检查段落分隔符
    if (codePoint === 0x000a || codePoint === 0x000d || codePoint === 0x2029) {
      return CharacterClass.PARAGRAPH_SEPARATOR
    }

    // 默认为中性字符
    return CharacterClass.NEUTRAL
  }

  /**
   * 检测文本的基础方向
   */
  detectBaseDirection(text: string): DirectionDetectionResult {
    let ltrCount = 0
    let rtlCount = 0
    const length = text.length

    for (let i = 0; i < length; i++) {
      const codePoint = text.codePointAt(i) || 0
      const charClass = this.getCharacterClass(codePoint)

      if (charClass === CharacterClass.LEFT_TO_RIGHT) {
        ltrCount++
      } else if (
        charClass === CharacterClass.RIGHT_TO_LEFT ||
        charClass === CharacterClass.ARABIC_LETTER
      ) {
        rtlCount++
      }

      // 如果是代理对，跳过下一个字符
      if (codePoint > 0xffff) {
        i++
      }
    }

    const totalStrong = ltrCount + rtlCount
    let direction: TextDirection
    let confidence: number

    if (totalStrong === 0) {
      direction = TextDirection.LTR // 默认LTR
      confidence = 0.5
    } else {
      const ltrRatio = ltrCount / totalStrong
      if (ltrRatio > 0.5) {
        direction = TextDirection.LTR
        confidence = ltrRatio
      } else {
        direction = TextDirection.RTL
        confidence = 1 - ltrRatio
      }
    }

    return {
      direction,
      confidence,
      strongCharacters: { ltr: ltrCount, rtl: rtlCount },
      method: 'unicode',
    }
  }

  /**
   * 实现Unicode双向算法
   */
  processBidiText(text: string, config: BidiConfig): TextRun[] {
    const runs: TextRun[] = []
    const length = text.length

    if (length === 0) {
      return runs
    }

    // P1: 分割成段落
    const paragraphs = this.splitIntoParagraphs(text)
    let globalIndex = 0

    for (const paragraph of paragraphs) {
      // P2: 确定段落的嵌入级别
      const paragraphLevel = this.determineParagraphLevel(paragraph, config.baseDirection)

      // P3: 解析每个字符的双向类型
      const characters = this.analyzeCharacters(paragraph)

      // W1-W7: 解析弱类型
      this.resolveWeakTypes(characters)

      // N1-N2: 解析中性类型
      this.resolveNeutralTypes(characters, paragraphLevel)

      // I1-I2: 解析隐式级别
      this.resolveImplicitLevels(characters, paragraphLevel)

      // L1-L4: 重新排序
      const paragraphRuns = this.reorderRuns(paragraph, characters, globalIndex)

      runs.push(...paragraphRuns)
      globalIndex += paragraph.length
    }

    return runs
  }

  /**
   * 分割文本为段落
   */
  private splitIntoParagraphs(text: string): string[] {
    const paragraphs: string[] = []
    let start = 0

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i) || 0
      const charClass = this.getCharacterClass(codePoint)

      if (charClass === CharacterClass.PARAGRAPH_SEPARATOR) {
        if (i > start) {
          paragraphs.push(text.substring(start, i))
        }
        start = i + 1
      }

      // 处理代理对
      if (codePoint > 0xffff) {
        i++
      }
    }

    // 添加最后一段
    if (start < text.length) {
      paragraphs.push(text.substring(start))
    }

    return paragraphs.length > 0 ? paragraphs : ['']
  }

  /**
   * 确定段落的嵌入级别
   */
  private determineParagraphLevel(paragraph: string, baseDirection: TextDirection): number {
    if (baseDirection !== TextDirection.AUTO) {
      return baseDirection === TextDirection.LTR ? 0 : 1
    }

    // 自动检测
    const detection = this.detectBaseDirection(paragraph)
    return detection.direction === TextDirection.LTR ? 0 : 1
  }

  /**
   * 分析每个字符的双向类型
   */
  private analyzeCharacters(
    text: string
  ): Array<{ char: string; class: CharacterClass; level: number }> {
    const characters: Array<{ char: string; class: CharacterClass; level: number }> = []

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i) || 0
      const char = String.fromCodePoint(codePoint)
      const charClass = this.getCharacterClass(codePoint)

      characters.push({
        char,
        class: charClass,
        level: 0, // 初始级别，后面会计算
      })

      // 处理代理对
      if (codePoint > 0xffff) {
        i++
      }
    }

    return characters
  }

  /**
   * 解析弱类型 (W1-W7)
   */
  private resolveWeakTypes(
    characters: Array<{ char: string; class: CharacterClass; level: number }>
  ): void {
    // 这是简化版本，完整实现需要处理更多规则
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]

      // W1: 检查非间距标记
      if (char.class === CharacterClass.NEUTRAL && i > 0) {
        char.class = characters[i - 1].class
      }
    }
  }

  /**
   * 解析中性类型 (N1-N2)
   */
  private resolveNeutralTypes(
    characters: Array<{ char: string; class: CharacterClass; level: number }>,
    paragraphLevel: number
  ): void {
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]

      if (char.class === CharacterClass.NEUTRAL || char.class === CharacterClass.OTHER_NEUTRAL) {
        // 简化处理：使用段落级别
        char.class =
          paragraphLevel === 0 ? CharacterClass.LEFT_TO_RIGHT : CharacterClass.RIGHT_TO_LEFT
      }
    }
  }

  /**
   * 解析隐式级别 (I1-I2)
   */
  private resolveImplicitLevels(
    characters: Array<{ char: string; class: CharacterClass; level: number }>,
    paragraphLevel: number
  ): void {
    for (const char of characters) {
      if (char.class === CharacterClass.LEFT_TO_RIGHT) {
        char.level = paragraphLevel % 2 === 0 ? paragraphLevel : paragraphLevel + 1
      } else if (
        char.class === CharacterClass.RIGHT_TO_LEFT ||
        char.class === CharacterClass.ARABIC_LETTER
      ) {
        char.level = paragraphLevel % 2 === 0 ? paragraphLevel + 1 : paragraphLevel
      } else {
        char.level = paragraphLevel
      }
    }
  }

  /**
   * 重新排序并生成文本段
   */
  private reorderRuns(
    originalText: string,
    characters: Array<{ char: string; class: CharacterClass; level: number }>,
    globalOffset: number
  ): TextRun[] {
    const runs: TextRun[] = []
    let currentRun: TextRun | null = null
    let charIndex = 0

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]
      const direction = char.level % 2 === 0 ? TextDirection.LTR : TextDirection.RTL

      // 如果方向改变或者是第一个字符，开始新的run
      if (!currentRun || currentRun.direction !== direction || currentRun.level !== char.level) {
        if (currentRun) {
          runs.push(currentRun)
        }

        currentRun = {
          text: char.char,
          startIndex: globalOffset + charIndex,
          endIndex: globalOffset + charIndex + char.char.length,
          direction,
          characterClass: char.class,
          level: char.level,
        }
      } else {
        // 添加到当前run
        currentRun.text += char.char
        currentRun.endIndex = globalOffset + charIndex + char.char.length
      }

      charIndex += char.char.length
    }

    if (currentRun) {
      runs.push(currentRun)
    }

    return runs
  }

  /**
   * 获取显示顺序的文本
   */
  getDisplayText(originalText: string, runs: TextRun[]): string {
    // 按照level排序来确定显示顺序
    const sortedRuns = [...runs].sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level
      }
      return a.startIndex - b.startIndex
    })

    // 对于同一级别的RTL runs，需要反向排序
    const groupsByLevel = new Map<number, TextRun[]>()
    for (const run of sortedRuns) {
      if (!groupsByLevel.has(run.level)) {
        groupsByLevel.set(run.level, [])
      }
      groupsByLevel.get(run.level)!.push(run)
    }

    let displayText = ''
    const levels = Array.from(groupsByLevel.keys()).sort((a, b) => a - b)

    for (const level of levels) {
      const runsAtLevel = groupsByLevel.get(level)!

      if (level % 2 === 1) {
        // RTL级别，反向处理
        runsAtLevel.reverse()
      }

      for (const run of runsAtLevel) {
        displayText += run.text
      }
    }

    return displayText
  }
}
