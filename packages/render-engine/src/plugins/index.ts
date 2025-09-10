/**
 * 插件系统模块导出
 * 提供完整的插件管理和扩展功能
 */

export { PluginSystem } from './PluginSystem';
export { PluginManager } from './PluginManager';

export type {
  PluginMetadata,
  PluginCategory,
  PluginPermission,
  PluginState,
  PluginContext,
  PluginResourceManager,
  PluginLogger,
  PluginStorage,
  PluginUIManager,
  MenuItemConfig,
  ToolbarButtonConfig,
  PanelConfig,
  DialogConfig,
  NotificationConfig,
  Plugin,
  PluginContributions,
  FilterParameterDef,
  PluginSystemEvents
} from './PluginSystem';

export type {
  PluginPackage,
  PluginSource,
  PluginRegistry,
  InstallOptions,
  UpdateOptions,
  PluginSearchResult,
  PluginManagerEvents
} from './PluginManager';