/**
 * Sky Canvas SDK - Public API
 *
 * @packageDocumentation
 */

export { createCanvasSDK } from './main';

export { CanvasSDK } from './CanvasSDK';

export type { ICanvasSDKConfig } from './CanvasSDK';
export type { SDKConfig } from './main';

export type {
  ICircleEntity,
  IPathEntity,
  IRectangleEntity,
  IShapeEntity,
  ITextEntity,
  ShapeEntity
} from './models/entities/Shape';

export {
  ICanvasRenderingService, IClipboardService, IConfigurationService, IHistoryService, IInteractionService, ILogService, ISelectionService,
  IShapeService, IShortcutService,
  IThemeService,
  IZIndexService,
  IZoomService
} from './services';

export type {
  IZIndexChangeEvent, LogLevel, ZIndexOperation
} from './services';

export { ICanvasManager } from './managers';

export type {
  CanvasStats,
  ILayerInfo, ISceneManager, ISceneManagerState, IToolManager, ITransactionManager
} from './managers';

export {
  createDecorator, IInstantiationService, InstantiationType, registerSingleton, ServiceCollection,
  SyncDescriptor
} from './di';

export type {
  BrandedService, ServiceIdentifier,
  ServicesAccessor
} from './di';

export {
  ExtensionManager, PermissionManager, PluginContextImpl as PluginContext, PluginManager
} from './plugins';

export type {
  ExtensionPoint,
  ExtensionProvider, PluginManifest, PluginPermission, PluginStatus
} from './plugins';

export type {
  ICanvasMouseEvent, IToolViewModel
} from './viewmodels/interfaces/IViewModel';

export type {
  IInteractionTool, IMouseEvent, InteractionMode
} from './models/types/ToolTypes';

