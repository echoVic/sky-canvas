/**
 * 文本渲染模块导出
 * 提供完整的字体管理和文本渲染功能
 */

// 字体类型定义
export * from './types/FontTypes';

// 富文本类型定义
export * from './types/RichTextTypes';

// 国际化文本类型定义
export * from './types/I18nTextTypes';

// 字体加载器
export { FontLoader, createFontLoader, FontLoadingUtils } from './FontLoader';

// 字体管理器
export { FontManager, createFontManager, globalFontManager } from './FontManager';

// 富文本解析器
export { RichTextParser, createRichTextParser } from './RichTextParser';

// 富文本渲染器
export { RichTextRenderer, createRichTextRenderer } from './RichTextRenderer';

// 国际化文本系统
// TODO: 修复国际化模块的语法错误后启用
// export { BidiProcessor } from './i18n/BidiProcessor';
// export { LanguageDetector } from './i18n/LanguageDetector';
// export { I18nTextLayout } from './i18n/I18nTextLayout';
// export { I18nTextRenderer } from './i18n/I18nTextRenderer';
// export { I18nTextManager, createI18nTextManager } from './I18nTextManager';