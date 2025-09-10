/**
 * 基础设施服务统一导出
 * 所有服务都符合 DI 架构，可注入使用
 */

// 事件总线服务
export {
  EventBusService, IEventBusService, type IEventBusService as EventBusServiceInterface
} from './eventBus/eventBusService';

// 渲染服务
export {
  CanvasRenderingService, ICanvasRenderingService, type ICanvasRenderingService as CanvasRenderingServiceInterface
} from './rendering/renderingService';

// 配置服务
export {
  ConfigurationService, IConfigurationService, type IConfigurationService as ConfigurationServiceInterface
} from './configuration/configurationService';

// 日志服务
export {
  ILogService,
  LogService, type LogLevel, type ILogService as LogServiceInterface
} from './logging/logService';

// 历史服务
export {
  HistoryService, IHistoryService, type IHistoryService as HistoryServiceInterface,
  type ICommand
} from './history/historyService';

// 历史命令
export {
  PropertyChangeCommand,
  MultiPropertyChangeCommand,
  CollectionAddCommand,
  CollectionRemoveCommand,
  CollectionMoveCommand,
  FunctionCommand,
  AsyncCommandWrapper,
  CompositeCommand,
  CommandBuilder
} from './history/commands';

// 交互服务
export {
  IInteractionService,
  InteractionService,
  type IInteractionService as InteractionServiceInterface,
  type ITool
} from './interaction/interactionService';

// 选择服务
export {
  ISelectionService,
  SelectionService, type SelectionMode, type ISelectionService as SelectionServiceInterface
} from './selection/selectionService';

// 剪贴板服务
export {
  ClipboardOperation, ClipboardService, IClipboardService, type IClipboardService as ClipboardServiceInterface,
  type IClipboardData
} from './clipboard/clipboardService';

// 缩放服务
export {
  IZoomService,
  ZoomService, type IZoomConfig,
  type IZoomEventData, type IZoomService as ZoomServiceInterface
} from './zoom/zoomService';

// 主题服务
export {
  IThemeService,
  ThemeService, ThemeType, type IThemeColors, type IThemeConfig, type IThemeService as ThemeServiceInterface
} from './theme/themeService';

// 快捷键服务
export {
  IShortcutService,
  ShortcutService, type IShortcutConfig,
  type ShortcutHandler, type IShortcutService as ShortcutServiceInterface
} from './shortcut/shortcutService';

// 形状服务
export {
  ShapeService
} from './shape/shapeService';
export type { IShapeService, IShapeService as ShapeServiceInterface } from './shape/shapeService';

// 导出服务
export {
  ExportService
} from './export/exportService';
export type { IExportService, IExportService as ExportServiceInterface, IExportOptions } from './export/exportService';

// 导入服务
export {
  ImportService,
  SupportedFormat
} from './import/importService';
export type { IImportService, IImportResult, IImportService as ImportServiceInterface } from './import/importService';

