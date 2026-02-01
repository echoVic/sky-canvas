/**
 * 服务统一导出 - VSCode DI 标准模式
 * 利用 TypeScript 上下文敏感类型推断，无需手动区分接口和服务标识符
 */

// 业务服务
export { ClipboardService, IClipboardService } from './clipboard/clipboardService'
// 核心服务
export { ConfigurationService, IConfigurationService } from './configuration/configurationService'
// 工具服务
export { ExportService } from './export/exportService'
export { HistoryService, IHistoryService } from './history/historyService'
export { ImportService } from './import/importService'
// 交互服务
export { IInteractionService, InteractionService } from './interaction/interactionService'
export type { LogLevel } from './logging/logService'
export { ILogService, LogService } from './logging/logService'
export { CanvasRenderingService, ICanvasRenderingService } from './rendering/renderingService'
export { ISelectionService, SelectionService } from './selection/selectionService'
export { IShapeService, ShapeService } from './shape/shapeService'
// 扩展服务
export { IShortcutService, ShortcutService } from './shortcut/shortcutService'
export { IThemeService, ThemeService } from './theme/themeService'
export type { IZIndexChangeEvent, ZIndexOperation } from './zIndex/zIndexService'
export { IZIndexService, ZIndexService } from './zIndex/zIndexService'
export { IZoomService, ZoomService } from './zoom/zoomService'
