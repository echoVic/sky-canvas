/**
 * 国际化文本处理类型定义
 * 支持多语言、双向文本(Bidi)、不同书写系统
 */

// 文本方向枚举
export enum TextDirection {
  LTR = 'ltr',    // 从左到右（Left-to-Right）
  RTL = 'rtl',    // 从右到左（Right-to-Left）
  AUTO = 'auto'   // 自动检测
}

// 书写模式
export enum WritingMode {
  HORIZONTAL_TB = 'horizontal-tb',  // 水平书写，从上到下
  VERTICAL_RL = 'vertical-rl',      // 垂直书写，从右到左
  VERTICAL_LR = 'vertical-lr'       // 垂直书写，从左到右
}

// 文本对齐方式（考虑文本方向）
export enum TextAlign {
  START = 'start',     // 开始对齐（LTR为左，RTL为右）
  END = 'end',         // 结束对齐（LTR为右，RTL为左）
  LEFT = 'left',       // 左对齐
  RIGHT = 'right',     // 右对齐
  CENTER = 'center',   // 居中对齐
  JUSTIFY = 'justify'  // 两端对齐
}

// 语言标识符（基于BCP 47标准）
export interface LanguageTag {
  language: string;     // 主语言代码 (如 'zh', 'ar', 'en')
  script?: string;      // 文字系统 (如 'Hans', 'Arab', 'Latn')
  region?: string;      // 区域代码 (如 'CN', 'SA', 'US')
  variant?: string;     // 变体标识符
  extensions?: string[]; // 扩展标签
}

// 字符分类
export enum CharacterClass {
  NEUTRAL = 'N',        // 中性字符
  LEFT_TO_RIGHT = 'L',  // 从左到右字符
  RIGHT_TO_LEFT = 'R',  // 从右到左字符
  ARABIC_LETTER = 'AL', // 阿拉伯字母
  EUROPEAN_NUMBER = 'EN', // 欧洲数字
  ARABIC_NUMBER = 'AN',  // 阿拉伯数字
  COMMON_SEPARATOR = 'CS', // 通用分隔符
  PARAGRAPH_SEPARATOR = 'B', // 段落分隔符
  SEGMENT_SEPARATOR = 'S',   // 段落分隔符
  WHITESPACE = 'WS',         // 空白字符
  OTHER_NEUTRAL = 'ON'       // 其他中性字符
}

// 双向文本处理配置
export interface BidiConfig {
  baseDirection: TextDirection;  // 基础文本方向
  embedLevels?: number[];       // 嵌入级别
  isolateOverride?: boolean;    // 是否使用隔离覆盖
}

// 文本分段信息
export interface TextRun {
  text: string;                 // 文本内容
  startIndex: number;           // 在原文本中的起始位置
  endIndex: number;             // 在原文本中的结束位置
  direction: TextDirection;     // 文本方向
  characterClass: CharacterClass; // 字符分类
  language?: LanguageTag;       // 语言标识
  level: number;                // Bidi 级别（偶数=LTR，奇数=RTL）
}

// 换行信息
export interface LineBreakInfo {
  position: number;             // 换行位置
  type: 'mandatory' | 'soft';   // 换行类型：强制或软换行
  penalty: number;              // 换行惩罚分数（用于优化）
}

// 字符测量信息
export interface CharacterMetrics {
  width: number;                // 字符宽度
  height: number;               // 字符高度
  advance: number;              // 字符前进距离
  bearing: { x: number; y: number }; // 字符承载点
  ligature?: string;            // 连字信息
}

// 复杂文本布局信息
export interface ComplexTextLayout {
  runs: TextRun[];              // 文本分段
  lineBreaks: LineBreakInfo[];  // 换行信息
  glyphs: GlyphInfo[];          // 字形信息
  totalWidth: number;           // 总宽度
  totalHeight: number;          // 总高度
}

// 字形信息
export interface GlyphInfo {
  glyphId: number;              // 字形ID
  codePoints: number[];         // 对应的Unicode码点
  position: { x: number; y: number }; // 字形位置
  advance: { x: number; y: number };  // 字形前进量
  cluster: number;              // 字符簇索引
}

// 语言特定的排版规则
export interface TypographyRules {
  language: LanguageTag;
  wordBreakRules: WordBreakRules;     // 断词规则
  punctuationRules: PunctuationRules; // 标点规则
  numberFormatRules: NumberFormatRules; // 数字格式规则
}

// 断词规则
export interface WordBreakRules {
  prohibitBreakBefore: Set<string>;   // 禁止在这些字符前断行
  prohibitBreakAfter: Set<string>;    // 禁止在这些字符后断行
  preferBreakAfter: Set<string>;      // 优先在这些字符后断行
  hangingPunctuation: Set<string>;    // 悬挂标点
}

// 标点规则
export interface PunctuationRules {
  openingBrackets: Set<string>;       // 开括号
  closingBrackets: Set<string>;       // 闭括号
  sentenceEnders: Set<string>;        // 句子结束符
  abbreviationMarkers: Set<string>;   // 缩写标记
}

// 数字格式规则
export interface NumberFormatRules {
  decimalSeparator: string;           // 小数点分隔符
  thousandsSeparator: string;         // 千位分隔符
  currencySymbol: string;             // 货币符号
  percentSymbol: string;              // 百分号符号
}

// 文本塑形选项
export interface TextShapingOptions {
  features?: Map<string, boolean>;    // OpenType特性
  language?: LanguageTag;             // 语言标签
  script?: string;                    // 文字系统
  direction?: TextDirection;          // 文本方向
  kerning?: boolean;                  // 字距调整
  ligatures?: boolean;                // 连字
}

// 国际化文本渲染选项
export interface I18nTextOptions {
  language: LanguageTag;              // 主要语言
  direction: TextDirection;           // 文本方向
  writingMode: WritingMode;           // 书写模式
  textAlign: TextAlign;               // 对齐方式
  bidiConfig?: BidiConfig;            // 双向文本配置
  shaping?: TextShapingOptions;       // 文本塑形选项
  typography?: TypographyRules;       // 排版规则
}

// 文本分析结果
export interface TextAnalysisResult {
  originalText: string;               // 原始文本
  detectedLanguages: LanguageTag[];   // 检测到的语言
  baseDirection: TextDirection;       // 基础文本方向
  runs: TextRun[];                    // 分析得到的文本段
  complexity: 'simple' | 'complex';   // 文本复杂度
  requiresShaping: boolean;           // 是否需要文本塑形
}

// Unicode 双向算法状态
export interface BidiState {
  paragraphLevel: number;             // 段落级别
  currentLevel: number;               // 当前级别
  stack: BidiStackEntry[];            // Bidi状态栈
  overrideStatus: 'neutral' | 'left-to-right' | 'right-to-left';
  isolateStatus: 'none' | 'isolate';
}

// Bidi 状态栈条目
export interface BidiStackEntry {
  level: number;                      // 嵌入级别
  override: 'neutral' | 'left-to-right' | 'right-to-left';
  isolate: boolean;                   // 是否为隔离状态
}

// 文本方向检测结果
export interface DirectionDetectionResult {
  direction: TextDirection;           // 检测到的方向
  confidence: number;                 // 检测信心度 (0-1)
  strongCharacters: {                 // 强方向性字符统计
    ltr: number;
    rtl: number;
  };
  method: 'unicode' | 'statistical' | 'explicit'; // 检测方法
}

// 语言检测结果
export interface LanguageDetectionResult {
  language: LanguageTag;              // 检测到的语言
  confidence: number;                 // 检测信心度 (0-1)
  script: string;                     // 文字系统
  region?: string;                    // 可能的区域
}