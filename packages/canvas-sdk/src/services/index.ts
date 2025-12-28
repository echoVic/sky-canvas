/**
 * 服务统一导出 - VSCode DI 标准模式
 * 利用 TypeScript 上下文敏感类型推断，无需手动区分接口和服务标识符
 */

// 核心服务
export { ConfigurationService, IConfigurationService } from './configuration/configurationService';
export { EventBusService, IEventBusService } from './eventBus/eventBusService';
export { ILogService, LogService } from './logging/logService';
export type { LogLevel } from './logging/logService';

// 业务服务
export { ClipboardService, IClipboardService } from './clipboard/clipboardService';
export { HistoryService, IHistoryService } from './history/historyService';
export { ISelectionService, SelectionService } from './selection/selectionService';
export { IShapeService, ShapeService } from './shape/shapeService';

// 交互服务
export { IInteractionService, InteractionService } from './interaction/interactionService';
export { CanvasRenderingService, ICanvasRenderingService } from './rendering/renderingService';

// 扩展服务
export { IShortcutService, ShortcutService } from './shortcut/shortcutService';
export { IThemeService, ThemeService } from './theme/themeService';
export { IZIndexService, ZIndexService } from './zIndex/zIndexService';
export type { IZIndexChangeEvent, ZIndexOperation } from './zIndex/zIndexService';
export { IZoomService, ZoomService } from './zoom/zoomService';

// 工具服务
export { ExportService } from './export/exportService';
export { ImportService } from './import/importService';

