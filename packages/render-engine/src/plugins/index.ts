/**
 * 插件系统模块导出
 * 提供完整的插件管理和扩展功能
 */

export type {
  InstallOptions,
  PluginManagerEvents,
  PluginPackage,
  PluginRegistry,
  PluginSearchResult,
  PluginSource,
  UpdateOptions,
} from './PluginManager'
export { PluginManager } from './PluginManager'

export type {
  DialogConfig,
  FilterParameterDef,
  MenuItemConfig,
  NotificationConfig,
  PanelConfig,
  Plugin,
  PluginCategory,
  PluginContext,
  PluginContributions,
  PluginLogger,
  PluginMetadata,
  PluginPermission,
  PluginResourceManager,
  PluginState,
  PluginStorage,
  PluginSystemEvents,
  PluginUIManager,
  ToolbarButtonConfig,
} from './PluginSystem'
export { PluginSystem } from './PluginSystem'
