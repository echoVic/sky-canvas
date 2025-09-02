/**
 * 插件系统核心类型定义
 */

// 插件状态枚举
export enum PluginStatus {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  DISABLED = 'disabled'
}

// 插件权限级别
export enum PluginPermission {
  READ_ONLY = 'read_only',
  CANVAS_MODIFY = 'canvas_modify',
  UI_MODIFY = 'ui_modify',
  FILE_ACCESS = 'file_access',
  NETWORK_ACCESS = 'network_access',
  SYSTEM_ACCESS = 'system_access'
}

// 扩展点类型
export enum ExtensionPointType {
  TOOL = 'tool',
  RENDERER = 'renderer',
  UI_COMPONENT = 'ui_component',
  MENU_ITEM = 'menu_item',
  TOOLBAR_BUTTON = 'toolbar_button',
  PANEL = 'panel',
  FILTER = 'filter',
  EXPORTER = 'exporter',
  IMPORTER = 'importer'
}

// 插件元数据
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  
  // 依赖信息
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // 权限要求
  permissions: PluginPermission[];
  
  // 扩展点声明
  extensionPoints: ExtensionPointDeclaration[];
  
  // 入口文件
  main: string;
  
  // 资源文件
  assets?: string[];
  
  // 最小引擎版本
  minEngineVersion: string;
  
  // 插件配置架构
  configSchema?: Record<string, any>;
}

// 扩展点声明
export interface ExtensionPointDeclaration {
  id: string;
  type: ExtensionPointType;
  name: string;
  description: string;
  required: boolean;
  config?: Record<string, any>;
}

// 插件上下文
export interface PluginContext {
  // 插件基本信息
  manifest: PluginManifest;
  
  // API访问器
  api: PluginAPI;
  
  // 配置管理
  config: PluginConfig;
  
  // 事件系统
  events: PluginEventEmitter;
  
  // 资源管理
  resources: PluginResourceManager;
  
  // 日志记录
  logger: PluginLogger;
}

// 插件API接口
export interface PluginAPI {
  // 画布操作
  canvas: {
    getRenderer(): any;
    addShape(shape: any): void;
    removeShape(id: string): void;
    updateShape(id: string, updates: any): void;
    getShapes(): any[];
    clear(): void;
    // 兼容方法
    addElement(element: any): void;
    removeElement(id: string): void;
    updateElement(id: string, updates: any): void;
    getElement(id: string): any;
    getAllElements(): any[];
    setTool(tool: string): void;
    getTool(): string;
    undo(): void;
    redo(): void;
    zoom(factor: number): void;
    pan(delta: { x: number; y: number }): void;
    getViewport(): any;
  };
  
  // UI操作
  ui: {
    addMenuItem(item: MenuItem): void;
    removeMenuItem(id: string): void;
    addToolbarButton(button: ToolbarButton): void;
    removeToolbarButton(id: string): void;
    addPanel(panel: Panel): void;
    removePanel(id: string): void;
    showDialog(dialog: Dialog): Promise<any>;
    showNotification(notification: Notification): void;
  };
  
  // 文件操作
  file: {
    open(filters?: FileFilter[]): Promise<File | null>;
    save(data: any, filename?: string): Promise<void>;
    import(data: any): Promise<void>;
    export(format: string): Promise<any>;
  };
  
  // 文件系统操作
  fileSystem: {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    listFiles(path: string): Promise<string[]>;
    createDirectory(path: string): Promise<void>;
  };
  
  // 工具注册
  tools: {
    register(tool: Tool): void;
    unregister(id: string): void;
    getActive(): Tool | null;
    setActive(id: string): void;
  };
  
  // 渲染器扩展
  renderers: {
    register(renderer: CustomRenderer): void;
    unregister(id: string): void;
    getAvailable(): CustomRenderer[];
  };
}

// 插件配置管理
export interface PluginConfig {
  get<T = any>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  getAll(): Record<string, any>;
}

// 插件事件发射器
export interface PluginEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: (...args: any[]) => void): void;
}

// 插件资源管理器
export interface PluginResourceManager {
  loadAsset(path: string): Promise<any>;
  getAssetUrl(path: string): string;
  preloadAssets(paths: string[]): Promise<void>;
  cleanup(): void;
  
  // 资源注册和管理
  register(key: string, resource: any): void;
  get(key: string): any;
  has(key: string): boolean;
  release(key: string): void;
  releaseAll(): void;
}

// 插件日志记录器
export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// UI组件类型定义
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  action: () => void;
  toggle?: boolean;
  group?: string;
}

export interface Panel {
  id: string;
  title: string;
  icon?: string;
  component: React.ComponentType<any>;
  position: 'left' | 'right' | 'bottom';
  defaultSize?: number;
  resizable?: boolean;
}

export interface Dialog {
  title: string;
  content: React.ComponentType<any>;
  width?: number;
  height?: number;
  modal?: boolean;
  buttons?: DialogButton[];
}

export interface DialogButton {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  danger?: boolean;
}

export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// 工具定义
export interface Tool {
  id: string;
  name: string;
  icon: string;
  cursor?: string;
  shortcut?: string;
  onActivate?(): void;
  onDeactivate?(): void;
  onMouseDown?(event: MouseEvent): void;
  onMouseMove?(event: MouseEvent): void;
  onMouseUp?(event: MouseEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  onKeyUp?(event: KeyboardEvent): void;
}

// 自定义渲染器
export interface CustomRenderer {
  id: string;
  name: string;
  description: string;
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(shapes: any[]): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

// 插件生命周期接口
export interface Plugin {
  // 插件激活
  activate(context: PluginContext): Promise<void>;
  
  // 插件停用
  deactivate(): Promise<void>;
  
  // 可选的生命周期方法
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onUpdate?(oldVersion: string, newVersion: string): Promise<void>;
  onConfigChange?(config: Record<string, any>): Promise<void>;
}

// 插件实例信息
export interface PluginInstance {
  manifest: PluginManifest;
  plugin: Plugin;
  context: PluginContext;
  status: PluginStatus;
  error?: Error;
  loadTime?: number;
  activateTime?: number;
}

// 扩展点注册信息
export interface ExtensionPoint {
  id: string;
  type: ExtensionPointType;
  name: string;
  description: string;
  providers: ExtensionProvider[];
}

// 扩展提供者
export interface ExtensionProvider {
  pluginId: string;
  extensionId: string;
  implementation: any;
  config: Record<string, any>;
}

// 插件管理器事件
export interface PluginManagerEvents {
  'plugin:loading': (pluginId: string) => void;
  'plugin:loaded': (pluginId: string, plugin: PluginInstance) => void;
  'plugin:activated': (pluginId: string) => void;
  'plugin:deactivated': (pluginId: string) => void;
  'plugin:error': (pluginId: string, error: Error) => void;
  'extension:registered': (extensionPoint: string, provider: ExtensionProvider) => void;
  'extension:unregistered': (extensionPoint: string, providerId: string) => void;
}
