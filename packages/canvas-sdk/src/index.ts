/**
 * Sky Canvas SDK - Public API
 *
 * @packageDocumentation
 */

export type { ICanvasSDKConfig } from './CanvasSDK'

export { CanvasSDK } from './CanvasSDK'
export type {
  BrandedService,
  ServiceIdentifier,
  ServicesAccessor,
} from './di'
export {
  createDecorator,
  IInstantiationService,
  InstantiationType,
  registerSingleton,
  ServiceCollection,
  SyncDescriptor,
} from './di'
export type { SDKConfig } from './main'
export { createCanvasSDK } from './main'
export type {
  CanvasStats,
  ILayerInfo,
  ISceneManager,
  ISceneManagerState,
  IToolManager,
  ITransactionManager,
} from './managers'

export { ICanvasManager } from './managers'
export type {
  ICircleEntity,
  IEllipseEntity,
  IGroupEntity,
  IImageDataLike,
  IImageEntity,
  IPathEntity,
  IPolygonEntity,
  IRectangleEntity,
  IShapeEntity,
  IStarEntity,
  ITextEntity,
  ShapeEntity,
} from './models/entities/Shape'
export type {
  IInteractionTool,
  IMouseEvent,
  InteractionMode,
} from './models/types/ToolTypes'
export type {
  ExtensionPoint,
  ExtensionProvider,
  PluginManifest,
  PluginPermission,
  PluginStatus,
} from './plugins'

export {
  ExtensionManager,
  PermissionManager,
  PluginContextImpl as PluginContext,
  PluginManager,
} from './plugins'
export type {
  IZIndexChangeEvent,
  LogLevel,
  ZIndexOperation,
} from './services'
export {
  ICanvasRenderingService,
  IClipboardService,
  IConfigurationService,
  IHistoryService,
  IInteractionService,
  ILogService,
  ISelectionService,
  IShapeService,
  IShortcutService,
  IThemeService,
  IZIndexService,
  IZoomService,
} from './services'
export type {
  ICanvasMouseEvent,
  IToolViewModel,
} from './viewmodels/interfaces/IViewModel'
