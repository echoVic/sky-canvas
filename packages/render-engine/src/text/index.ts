/**
 * 文本渲染模块导出
 * 提供完整的字体管理和文本渲染功能
 */

// 字体加载器
export { createFontLoader, FontLoader, FontLoadingUtils } from './FontLoader'
// 字体管理器
export { createFontManager, FontManager, globalFontManager } from './FontManager'
// 富文本解析器
export { createRichTextParser, RichTextParser } from './RichTextParser'
// 富文本渲染器
export { createRichTextRenderer, RichTextRenderer } from './RichTextRenderer'
// 字体类型定义
export * from './types/FontTypes'
// 国际化文本类型定义
export type {
  CharacterMetrics as I18nCharacterMetrics,
  TextDirection,
} from './types/I18nTextTypes'
// 富文本类型定义
export type {
  FontStyle,
  FontWeight,
  TextAlign,
  TextDecoration,
  TextLine,
  TextStyle,
  TextTransform,
} from './types/RichTextTypes'

// 国际化文本系统
// TODO: 修复国际化模块的语法错误后启用
// export { BidiProcessor } from './i18n/BidiProcessor';
// export { LanguageDetector } from './i18n/LanguageDetector';
// export { I18nTextLayout } from './i18n/I18nTextLayout';
// export { I18nTextRenderer } from './i18n/I18nTextRenderer';
// export { I18nTextManager, createI18nTextManager } from './I18nTextManager';
