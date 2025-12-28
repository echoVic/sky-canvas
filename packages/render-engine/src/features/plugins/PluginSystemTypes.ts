/**
 * 插件系统类型定义
 */

import { IEventBus } from '../events/EventBus';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  license: string;
  keywords: string[];
  category: PluginCategory;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  engineVersion: string;
  platform: string[];
  permissions: PluginPermission[];
}

export type PluginCategory =
  | 'renderer'
  | 'effect'
  | 'tool'
  | 'filter'
  | 'animation'
  | 'physics'
  | 'ui'
  | 'integration'
  | 'utility';

export type PluginPermission =
  | 'file-system'
  | 'network'
  | 'clipboard'
  | 'storage'
  | 'camera'
  | 'microphone'
  | 'location'
  | 'notifications';

export type PluginState =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'active'
  | 'inactive'
  | 'error';

export interface PluginContext {
  renderEngine: unknown;
  eventBus: IEventBus;
  pluginId: string;
  pluginPath: string;
  config: unknown;
  resources: PluginResourceManager;
  logger: PluginLogger;
  storage: PluginStorage;
  ui: PluginUIManager;
}

export interface PluginResourceManager {
  loadTexture(path: string): Promise<HTMLImageElement>;
  loadShader(path: string): Promise<string>;
  loadAudio(path: string): Promise<AudioBuffer>;
  loadJSON(path: string): Promise<unknown>;
  getAssetUrl(path: string): string;
  dispose(): void;
}

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface PluginStorage {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
}

export interface PluginUIManager {
  addMenuItem(item: MenuItemConfig): void;
  addToolbarButton(button: ToolbarButtonConfig): void;
  addPanel(panel: PanelConfig): void;
  showDialog(config: DialogConfig): Promise<unknown>;
  showNotification(config: NotificationConfig): void;
}

export interface MenuItemConfig {
  id: string;
  label: string;
  icon?: string;
  accelerator?: string;
  submenu?: MenuItemConfig[];
  click?: () => void;
}

export interface ToolbarButtonConfig {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  click: () => void;
}

export interface PanelConfig {
  id: string;
  title: string;
  icon?: string;
  component: string | (() => HTMLElement);
  position: 'left' | 'right' | 'bottom' | 'floating';
}

export interface DialogConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'confirm';
  buttons: string[];
  defaultButton?: number;
}

export interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  actions?: Array<{ label: string; action: () => void }>;
}

export interface Plugin {
  metadata: PluginMetadata;
  onLoad?(context: PluginContext): Promise<void> | void;
  onActivate?(context: PluginContext): Promise<void> | void;
  onDeactivate?(context: PluginContext): Promise<void> | void;
  onUnload?(context: PluginContext): Promise<void> | void;
  onConfigChange?(config: unknown, context: PluginContext): void;
  contributes?: PluginContributions;
}

export interface PluginContributions {
  commands?: Array<{
    id: string;
    title: string;
    category?: string;
    handler: (context: PluginContext, ...args: unknown[]) => unknown;
  }>;
  menus?: Record<string, MenuItemConfig[]>;
  tools?: Array<{
    id: string;
    name: string;
    icon: string;
    handler: (context: PluginContext) => unknown;
  }>;
  renderers?: Array<{
    id: string;
    name: string;
    supportedFormats: string[];
    renderer: (context: PluginContext) => unknown;
  }>;
  filters?: Array<{
    id: string;
    name: string;
    category: string;
    parameters: FilterParameterDef[];
    filter: (context: PluginContext, params: unknown) => unknown;
  }>;
  animations?: Array<{
    id: string;
    name: string;
    type: 'transition' | 'effect' | 'interpolator';
    animator: (context: PluginContext) => unknown;
  }>;
  importers?: Array<{
    id: string;
    name: string;
    extensions: string[];
    importer: (context: PluginContext, file: File) => Promise<unknown>;
  }>;
  exporters?: Array<{
    id: string;
    name: string;
    extension: string;
    exporter: (context: PluginContext, data: unknown) => Promise<Blob>;
  }>;
  configurationSchema?: unknown;
}

export interface FilterParameterDef {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  label: string;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: unknown; label: string }>;
}

export interface PluginSystemEvents {
  'plugin-loaded': { plugin: Plugin; metadata: PluginMetadata };
  'plugin-activated': { pluginId: string };
  'plugin-deactivated': { pluginId: string };
  'plugin-unloaded': { pluginId: string };
  'plugin-error': { pluginId: string; error: Error };
  'plugin-registered': { pluginId: string; contributions: PluginContributions };
  'plugins-scanned': { pluginCount: number };
}
