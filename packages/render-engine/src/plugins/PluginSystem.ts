/**
 * 插件系统核心
 * 提供可扩展的插件加载、管理和执行框架
 */

import { IEventBus } from '../events/EventBus';
import { createLogger } from '../utils/Logger';

const logger = createLogger('PluginSystem');
import { PluginContextFactory } from './PluginContextFactory';
import {
  Plugin,
  PluginState,
  PluginContext,
  PluginMetadata,
  PluginContributions,
  FilterParameterDef
} from './PluginSystemTypes';

// 重新导出类型
export * from './PluginSystemTypes';
export { PluginContextFactory } from './PluginContextFactory';

/**
 * 插件系统核心类
 */
export class PluginSystem {
  private plugins = new Map<string, Plugin>();
  private pluginStates = new Map<string, PluginState>();
  private pluginContexts = new Map<string, PluginContext>();
  private pluginConfigs = new Map<string, unknown>();

  private eventBus?: IEventBus;
  private contextFactory?: PluginContextFactory;
  private pluginPaths: string[] = [];

  // 扩展注册表
  private commands = new Map<string, { plugin: string; handler: Function }>();
  private tools = new Map<string, { plugin: string; handler: Function }>();
  private renderers = new Map<string, { plugin: string; renderer: Function }>();
  private filters = new Map<string, { plugin: string; filter: Function; parameters: FilterParameterDef[] }>();
  private animations = new Map<string, { plugin: string; animator: Function }>();
  private importers = new Map<string, { plugin: string; importer: Function; extensions: string[] }>();
  private exporters = new Map<string, { plugin: string; exporter: Function; extension: string }>();

  constructor() {}

  /** 设置事件总线 */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
    this.contextFactory = new PluginContextFactory(eventBus);
  }

  /** 添加插件搜索路径 */
  addPluginPath(path: string): void {
    if (!this.pluginPaths.includes(path)) {
      this.pluginPaths.push(path);
    }
  }

  /** 扫描插件 */
  async scanPlugins(): Promise<PluginMetadata[]> {
    const discoveredPlugins: PluginMetadata[] = [];
    this.eventBus?.emit('plugins-scanned', { pluginCount: discoveredPlugins.length });
    return discoveredPlugins;
  }

  /** 手动注册插件 */
  registerPlugin(plugin: Plugin): void {
    const { id } = plugin.metadata;
    this.validatePlugin(plugin);
    this.plugins.set(id, plugin);
    this.pluginStates.set(id, 'unloaded');

    this.eventBus?.emit('plugin-registered', {
      pluginId: id,
      contributions: plugin.contributes || {}
    });
  }

  /** 加载插件 */
  async loadPlugin(pluginId: string, config: unknown = {}): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (this.pluginStates.get(pluginId) !== 'unloaded') {
      return;
    }

    try {
      this.pluginStates.set(pluginId, 'loading');

      const context = this.contextFactory!.createContext(pluginId, config);
      this.pluginContexts.set(pluginId, context);
      this.pluginConfigs.set(pluginId, config);

      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

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

  /** 激活插件 */
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

  /** 停用插件 */
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

  /** 卸载插件 */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      await this.deactivatePlugin(pluginId);
      const context = this.pluginContexts.get(pluginId)!;

      if (plugin.onUnload) {
        await plugin.onUnload(context);
      }

      this.unregisterPluginContributions(pluginId);
      context.resources.dispose();

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

  /** 更新插件配置 */
  updatePluginConfig(pluginId: string, config: unknown): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const context = this.pluginContexts.get(pluginId);
    if (!context) return;

    const newConfig = { ...(this.pluginConfigs.get(pluginId) as object), ...(config as object) };
    this.pluginConfigs.set(pluginId, newConfig);
    (context as { config: unknown }).config = newConfig;

    if (plugin.onConfigChange) {
      plugin.onConfigChange(newConfig, context);
    }
  }

  /** 获取插件信息 */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** 获取插件状态 */
  getPluginState(pluginId: string): PluginState | undefined {
    return this.pluginStates.get(pluginId);
  }

  /** 获取所有插件 */
  getAllPlugins(): Array<{ plugin: Plugin; state: PluginState }> {
    const result = [];
    for (const [id, plugin] of this.plugins) {
      const state = this.pluginStates.get(id) || 'unloaded';
      result.push({ plugin, state });
    }
    return result;
  }

  /** 执行命令 */
  executeCommand(commandId: string, ...args: unknown[]): unknown {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }
    const context = this.pluginContexts.get(command.plugin)!;
    return command.handler(context, ...args);
  }

  /** 获取可用的工具 */
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

  /** 获取可用的滤镜 */
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

  /** 应用滤镜 */
  applyFilter(filterId: string, params: unknown): unknown {
    const filter = this.filters.get(filterId);
    if (!filter) {
      throw new Error(`Filter '${filterId}' not found`);
    }
    const context = this.pluginContexts.get(filter.plugin)!;
    return filter.filter(context, params);
  }

  /** 验证插件 */
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
  }

  /** 注册插件扩展 */
  private registerPluginContributions(pluginId: string, contributions?: PluginContributions): void {
    if (!contributions) return;

    if (contributions.commands) {
      for (const command of contributions.commands) {
        this.commands.set(command.id, { plugin: pluginId, handler: command.handler });
      }
    }

    if (contributions.tools) {
      for (const tool of contributions.tools) {
        this.tools.set(tool.id, { plugin: pluginId, handler: tool.handler });
      }
    }

    if (contributions.renderers) {
      for (const renderer of contributions.renderers) {
        this.renderers.set(renderer.id, { plugin: pluginId, renderer: renderer.renderer });
      }
    }

    if (contributions.filters) {
      for (const filter of contributions.filters) {
        this.filters.set(filter.id, {
          plugin: pluginId,
          filter: filter.filter,
          parameters: filter.parameters
        });
      }
    }

    if (contributions.animations) {
      for (const animation of contributions.animations) {
        this.animations.set(animation.id, { plugin: pluginId, animator: animation.animator });
      }
    }

    if (contributions.importers) {
      for (const importer of contributions.importers) {
        this.importers.set(importer.id, {
          plugin: pluginId,
          importer: importer.importer,
          extensions: importer.extensions
        });
      }
    }

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

  /** 注销插件扩展 */
  private unregisterPluginContributions(pluginId: string): void {
    const removeFromMap = <T extends { plugin: string }>(map: Map<string, T>) => {
      for (const [id, item] of map) {
        if (item.plugin === pluginId) {
          map.delete(id);
        }
      }
    };

    removeFromMap(this.commands);
    removeFromMap(this.tools);
    removeFromMap(this.renderers);
    removeFromMap(this.filters);
    removeFromMap(this.animations);
    removeFromMap(this.importers);
    removeFromMap(this.exporters);
  }

  /** 销毁插件系统 */
  async dispose(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        logger.error(`Failed to unload plugin ${pluginId}:`, error);
      }
    }

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
