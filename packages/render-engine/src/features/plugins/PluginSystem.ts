/**
 * 插件系统架构
 * 提供可扩展的插件加载、管理和执行框架
 */

import EventEmitter3 from 'eventemitter3';

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
  
  // 依赖信息
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  
  // 兼容性
  engineVersion: string;
  platform: string[];
  
  // 权限
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
  // 核心API
  renderEngine: any;
  eventBus: EventEmitter3;
  
  // 插件信息
  pluginId: string;
  pluginPath: string;
  config: any;
  
  // 资源管理
  resources: PluginResourceManager;
  
  // 日志
  logger: PluginLogger;
  
  // 存储
  storage: PluginStorage;
  
  // UI扩展点
  ui: PluginUIManager;
}

export interface PluginResourceManager {
  loadTexture(path: string): Promise<HTMLImageElement>;
  loadShader(path: string): Promise<string>;
  loadAudio(path: string): Promise<AudioBuffer>;
  loadJSON(path: string): Promise<any>;
  getAssetUrl(path: string): string;
  dispose(): void;
}

export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface PluginStorage {
  get(key: string): any;
  set(key: string, value: any): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
}

export interface PluginUIManager {
  addMenuItem(item: MenuItemConfig): void;
  addToolbarButton(button: ToolbarButtonConfig): void;
  addPanel(panel: PanelConfig): void;
  showDialog(config: DialogConfig): Promise<any>;
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
  
  // 生命周期钩子
  onLoad?(context: PluginContext): Promise<void> | void;
  onActivate?(context: PluginContext): Promise<void> | void;
  onDeactivate?(context: PluginContext): Promise<void> | void;
  onUnload?(context: PluginContext): Promise<void> | void;
  
  // 配置管理
  onConfigChange?(config: any, context: PluginContext): void;
  
  // 扩展点
  contributes?: PluginContributions;
}

export interface PluginContributions {
  // 命令扩展
  commands?: Array<{
    id: string;
    title: string;
    category?: string;
    handler: (context: PluginContext, ...args: any[]) => any;
  }>;
  
  // 菜单扩展
  menus?: Record<string, MenuItemConfig[]>;
  
  // 工具扩展
  tools?: Array<{
    id: string;
    name: string;
    icon: string;
    handler: (context: PluginContext) => any;
  }>;
  
  // 渲染器扩展
  renderers?: Array<{
    id: string;
    name: string;
    supportedFormats: string[];
    renderer: (context: PluginContext) => any;
  }>;
  
  // 滤镜扩展
  filters?: Array<{
    id: string;
    name: string;
    category: string;
    parameters: FilterParameterDef[];
    filter: (context: PluginContext, params: any) => any;
  }>;
  
  // 动画扩展
  animations?: Array<{
    id: string;
    name: string;
    type: 'transition' | 'effect' | 'interpolator';
    animator: (context: PluginContext) => any;
  }>;
  
  // 导入/导出扩展
  importers?: Array<{
    id: string;
    name: string;
    extensions: string[];
    importer: (context: PluginContext, file: File) => Promise<any>;
  }>;
  
  exporters?: Array<{
    id: string;
    name: string;
    extension: string;
    exporter: (context: PluginContext, data: any) => Promise<Blob>;
  }>;
  
  // 配置模式
  configurationSchema?: any; // JSON Schema
}

export interface FilterParameterDef {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  label: string;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
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

/**
 * 插件系统核心
 */
export class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();
  private pluginStates: Map<string, PluginState> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private pluginConfigs: Map<string, any> = new Map();
  
  private eventBus?: EventEmitter3;
  private pluginPaths: string[] = [];
  
  // 扩展注册表
  private commands: Map<string, { plugin: string; handler: Function }> = new Map();
  private tools: Map<string, { plugin: string; handler: Function }> = new Map();
  private renderers: Map<string, { plugin: string; renderer: Function }> = new Map();
  private filters: Map<string, { plugin: string; filter: Function; parameters: FilterParameterDef[] }> = new Map();
  private animations: Map<string, { plugin: string; animator: Function }> = new Map();
  private importers: Map<string, { plugin: string; importer: Function; extensions: string[] }> = new Map();
  private exporters: Map<string, { plugin: string; exporter: Function; extension: string }> = new Map();

  constructor() {}

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: EventEmitter3): void {
    this.eventBus = eventBus;
  }

  /**
   * 添加插件搜索路径
   */
  addPluginPath(path: string): void {
    if (!this.pluginPaths.includes(path)) {
      this.pluginPaths.push(path);
    }
  }

  /**
   * 扫描插件
   */
  async scanPlugins(): Promise<PluginMetadata[]> {
    const discoveredPlugins: PluginMetadata[] = [];
    
    // 在浏览器环境中，插件通常通过配置或动态导入加载
    // 这里提供扩展点供外部注册插件
    
    this.eventBus?.emit('plugins-scanned', { pluginCount: discoveredPlugins.length });
    
    return discoveredPlugins;
  }

  /**
   * 手动注册插件
   */
  registerPlugin(plugin: Plugin): void {
    const { id } = plugin.metadata;
    
    // 验证插件
    this.validatePlugin(plugin);
    
    // 注册插件
    this.plugins.set(id, plugin);
    this.pluginStates.set(id, 'unloaded');
    
    this.eventBus?.emit('plugin-registered', { 
      pluginId: id, 
      contributions: plugin.contributes || {} 
    });
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginId: string, config: any = {}): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (this.pluginStates.get(pluginId) !== 'unloaded') {
      return; // 已加载
    }

    try {
      this.pluginStates.set(pluginId, 'loading');

      // 创建插件上下文
      const context = this.createPluginContext(pluginId, config);
      this.pluginContexts.set(pluginId, context);
      this.pluginConfigs.set(pluginId, config);

      // 调用插件的onLoad钩子
      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

      // 注册扩展
      this.registerPluginContributions(pluginId, plugin.contributes);

      this.pluginStates.set(pluginId, 'loaded');
      this.eventBus?.emit('plugin-loaded', { plugin, metadata: plugin.metadata });

    } catch (error) {
      this.pluginStates.set(pluginId, 'error');
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-error', { pluginId, error: pluginError });
      throw error;
    }
  }

  /**
   * 激活插件
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    const state = this.pluginStates.get(pluginId);
    if (state !== 'loaded' && state !== 'inactive') {
      throw new Error(`Plugin '${pluginId}' must be loaded first`);
    }

    try {
      const context = this.pluginContexts.get(pluginId)!;
      
      if (plugin.onActivate) {
        await plugin.onActivate(context);
      }

      this.pluginStates.set(pluginId, 'active');
      this.eventBus?.emit('plugin-activated', { pluginId });

    } catch (error) {
      this.pluginStates.set(pluginId, 'error');
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-error', { pluginId, error: pluginError });
      throw error;
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const state = this.pluginStates.get(pluginId);
    if (state !== 'active') return;

    try {
      const context = this.pluginContexts.get(pluginId)!;
      
      if (plugin.onDeactivate) {
        await plugin.onDeactivate(context);
      }

      this.pluginStates.set(pluginId, 'inactive');
      this.eventBus?.emit('plugin-deactivated', { pluginId });

    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-error', { pluginId, error: pluginError });
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // 先停用插件
      await this.deactivatePlugin(pluginId);

      const context = this.pluginContexts.get(pluginId)!;
      
      // 调用插件的onUnload钩子
      if (plugin.onUnload) {
        await plugin.onUnload(context);
      }

      // 清理插件扩展
      this.unregisterPluginContributions(pluginId);

      // 清理资源
      context.resources.dispose();

      // 移除插件状态
      this.pluginStates.set(pluginId, 'unloaded');
      this.pluginContexts.delete(pluginId);
      this.pluginConfigs.delete(pluginId);

      this.eventBus?.emit('plugin-unloaded', { pluginId });

    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-error', { pluginId, error: pluginError });
      throw error;
    }
  }

  /**
   * 更新插件配置
   */
  updatePluginConfig(pluginId: string, config: any): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const context = this.pluginContexts.get(pluginId);
    if (!context) return;

    // 合并配置
    const newConfig = { ...this.pluginConfigs.get(pluginId), ...config };
    this.pluginConfigs.set(pluginId, newConfig);
    context.config = newConfig;

    // 通知插件配置变更
    if (plugin.onConfigChange) {
      plugin.onConfigChange(newConfig, context);
    }
  }

  /**
   * 获取插件信息
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取插件状态
   */
  getPluginState(pluginId: string): PluginState | undefined {
    return this.pluginStates.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Array<{ plugin: Plugin; state: PluginState }> {
    const result = [];
    for (const [id, plugin] of this.plugins) {
      const state = this.pluginStates.get(id) || 'unloaded';
      result.push({ plugin, state });
    }
    return result;
  }

  /**
   * 执行命令
   */
  executeCommand(commandId: string, ...args: any[]): any {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }

    const context = this.pluginContexts.get(command.plugin)!;
    return command.handler(context, ...args);
  }

  /**
   * 获取可用的工具
   */
  getAvailableTools(): Array<{ id: string; name: string; icon: string; plugin: string }> {
    const tools = [];
    for (const [id, tool] of this.tools) {
      const plugin = this.plugins.get(tool.plugin)!;
      const toolDef = plugin.contributes?.tools?.find(t => t.id === id);
      if (toolDef) {
        tools.push({ ...toolDef, plugin: tool.plugin });
      }
    }
    return tools;
  }

  /**
   * 获取可用的滤镜
   */
  getAvailableFilters(): Array<{ id: string; name: string; category: string; parameters: FilterParameterDef[]; plugin: string }> {
    const filters = [];
    for (const [id, filter] of this.filters) {
      const plugin = this.plugins.get(filter.plugin)!;
      const filterDef = plugin.contributes?.filters?.find(f => f.id === id);
      if (filterDef) {
        filters.push({ ...filterDef, plugin: filter.plugin });
      }
    }
    return filters;
  }

  /**
   * 应用滤镜
   */
  applyFilter(filterId: string, params: any): any {
    const filter = this.filters.get(filterId);
    if (!filter) {
      throw new Error(`Filter '${filterId}' not found`);
    }

    const context = this.pluginContexts.get(filter.plugin)!;
    return filter.filter(context, params);
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.metadata) {
      throw new Error('Plugin must have metadata');
    }

    const required = ['id', 'name', 'version', 'author', 'license'];
    for (const field of required) {
      if (!plugin.metadata[field as keyof PluginMetadata]) {
        throw new Error(`Plugin metadata missing required field: ${field}`);
      }
    }

    // 检查版本兼容性
    // TODO: 实现版本兼容性检查
  }

  /**
   * 创建插件上下文
   */
  private createPluginContext(pluginId: string, config: any): PluginContext {
    return {
      renderEngine: null, // TODO: 注入实际的渲染引擎
      eventBus: this.eventBus!,
      pluginId,
      pluginPath: '', // TODO: 实际的插件路径
      config,
      resources: this.createResourceManager(pluginId),
      logger: this.createLogger(pluginId),
      storage: this.createStorage(pluginId),
      ui: this.createUIManager(pluginId)
    };
  }

  /**
   * 创建资源管理器
   */
  private createResourceManager(pluginId: string): PluginResourceManager {
    return {
      async loadTexture(path: string): Promise<HTMLImageElement> {
        const img = new Image();
        img.src = path;
        return new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
      },

      async loadShader(path: string): Promise<string> {
        const response = await fetch(path);
        return response.text();
      },

      async loadAudio(path: string): Promise<AudioBuffer> {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        return audioContext.decodeAudioData(arrayBuffer);
      },

      async loadJSON(path: string): Promise<any> {
        const response = await fetch(path);
        return response.json();
      },

      getAssetUrl(path: string): string {
        return path; // TODO: 实现实际的资源URL解析
      },

      dispose(): void {
        // TODO: 清理资源
      }
    };
  }

  /**
   * 创建日志器
   */
  private createLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      debug: (message: string, ...args: any[]) => console.debug(prefix, message, ...args),
      info: (message: string, ...args: any[]) => console.info(prefix, message, ...args),
      warn: (message: string, ...args: any[]) => console.warn(prefix, message, ...args),
      error: (message: string, ...args: any[]) => console.error(prefix, message, ...args)
    };
  }

  /**
   * 创建存储管理器
   */
  private createStorage(pluginId: string): PluginStorage {
    const prefix = `plugin_${pluginId}_`;
    
    return {
      get(key: string): any {
        const fullKey = prefix + key;
        const value = localStorage.getItem(fullKey);
        return value ? JSON.parse(value) : undefined;
      },

      set(key: string, value: any): void {
        const fullKey = prefix + key;
        localStorage.setItem(fullKey, JSON.stringify(value));
      },

      remove(key: string): void {
        const fullKey = prefix + key;
        localStorage.removeItem(fullKey);
      },

      clear(): void {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
        keys.forEach(key => localStorage.removeItem(key));
      },

      keys(): string[] {
        return Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .map(key => key.substring(prefix.length));
      }
    };
  }

  /**
   * 创建UI管理器
   */
  private createUIManager(pluginId: string): PluginUIManager {
    return {
      addMenuItem: (item: MenuItemConfig) => {
        // TODO: 实现菜单项添加
      },

      addToolbarButton: (button: ToolbarButtonConfig) => {
        // TODO: 实现工具栏按钮添加
      },

      addPanel: (panel: PanelConfig) => {
        // TODO: 实现面板添加
      },

      async showDialog(config: DialogConfig): Promise<any> {
        // TODO: 实现对话框显示
        return new Promise(resolve => {
          if (confirm(config.message)) {
            resolve(0);
          } else {
            resolve(1);
          }
        });
      },

      showNotification: (config: NotificationConfig) => {
        // TODO: 实现通知显示
        console.info(`[Notification] ${config.title}: ${config.message}`);
      }
    };
  }

  /**
   * 注册插件扩展
   */
  private registerPluginContributions(pluginId: string, contributions?: PluginContributions): void {
    if (!contributions) return;

    // 注册命令
    if (contributions.commands) {
      for (const command of contributions.commands) {
        this.commands.set(command.id, { plugin: pluginId, handler: command.handler });
      }
    }

    // 注册工具
    if (contributions.tools) {
      for (const tool of contributions.tools) {
        this.tools.set(tool.id, { plugin: pluginId, handler: tool.handler });
      }
    }

    // 注册渲染器
    if (contributions.renderers) {
      for (const renderer of contributions.renderers) {
        this.renderers.set(renderer.id, { plugin: pluginId, renderer: renderer.renderer });
      }
    }

    // 注册滤镜
    if (contributions.filters) {
      for (const filter of contributions.filters) {
        this.filters.set(filter.id, { 
          plugin: pluginId, 
          filter: filter.filter,
          parameters: filter.parameters
        });
      }
    }

    // 注册动画
    if (contributions.animations) {
      for (const animation of contributions.animations) {
        this.animations.set(animation.id, { plugin: pluginId, animator: animation.animator });
      }
    }

    // 注册导入器
    if (contributions.importers) {
      for (const importer of contributions.importers) {
        this.importers.set(importer.id, { 
          plugin: pluginId, 
          importer: importer.importer,
          extensions: importer.extensions
        });
      }
    }

    // 注册导出器
    if (contributions.exporters) {
      for (const exporter of contributions.exporters) {
        this.exporters.set(exporter.id, { 
          plugin: pluginId, 
          exporter: exporter.exporter,
          extension: exporter.extension
        });
      }
    }
  }

  /**
   * 注销插件扩展
   */
  private unregisterPluginContributions(pluginId: string): void {
    // 移除命令
    for (const [id, command] of this.commands) {
      if (command.plugin === pluginId) {
        this.commands.delete(id);
      }
    }

    // 移除工具
    for (const [id, tool] of this.tools) {
      if (tool.plugin === pluginId) {
        this.tools.delete(id);
      }
    }

    // 移除渲染器
    for (const [id, renderer] of this.renderers) {
      if (renderer.plugin === pluginId) {
        this.renderers.delete(id);
      }
    }

    // 移除滤镜
    for (const [id, filter] of this.filters) {
      if (filter.plugin === pluginId) {
        this.filters.delete(id);
      }
    }

    // 移除动画
    for (const [id, animation] of this.animations) {
      if (animation.plugin === pluginId) {
        this.animations.delete(id);
      }
    }

    // 移除导入器
    for (const [id, importer] of this.importers) {
      if (importer.plugin === pluginId) {
        this.importers.delete(id);
      }
    }

    // 移除导出器
    for (const [id, exporter] of this.exporters) {
      if (exporter.plugin === pluginId) {
        this.exporters.delete(id);
      }
    }
  }

  /**
   * 销毁插件系统
   */
  async dispose(): Promise<void> {
    // 卸载所有插件
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        console.error(`Failed to unload plugin ${pluginId}:`, error);
      }
    }

    // 清理注册表
    this.plugins.clear();
    this.pluginStates.clear();
    this.pluginContexts.clear();
    this.pluginConfigs.clear();
    this.commands.clear();
    this.tools.clear();
    this.renderers.clear();
    this.filters.clear();
    this.animations.clear();
    this.importers.clear();
    this.exporters.clear();
  }
}