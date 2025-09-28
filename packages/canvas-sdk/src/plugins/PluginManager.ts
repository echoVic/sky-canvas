/**
 * 插件管理器实现
 * 负责插件的注册、激活、停用等生命周期管理
 */

import {
  Plugin,
  PluginManager,
  PluginContext,
  PluginConfig,
  ExtensionRegistry,
  PluginContribution,
  ExtensionPoint
} from './types';
import { Action } from '../actions/types';
import { ICanvasModel } from '../models/CanvasModel';
import { ICommandRegistry } from '../commands/services';

/**
 * 扩展点注册器实现
 */
class ExtensionRegistryImpl implements ExtensionRegistry {
  private extensions = new Map<ExtensionPoint, PluginContribution[]>();

  register<T extends PluginContribution>(contribution: T): void {
    const point = contribution.point;
    if (!this.extensions.has(point)) {
      this.extensions.set(point, []);
    }

    const pointExtensions = this.extensions.get(point)!;
    pointExtensions.push(contribution);

    // 按优先级排序
    pointExtensions.sort((a, b) => {
      const priorityA = (a.content as any).priority || 0;
      const priorityB = (b.content as any).priority || 0;
      return priorityB - priorityA; // 高优先级在前
    });
  }

  unregister(pluginId: string, contributionPoint: ExtensionPoint): void {
    const pointExtensions = this.extensions.get(contributionPoint);
    if (!pointExtensions) return;

    const filtered = pointExtensions.filter(ext =>
      (ext as any).pluginId !== pluginId
    );
    this.extensions.set(contributionPoint, filtered);
  }

  get<T extends PluginContribution>(point: ExtensionPoint): T[] {
    return (this.extensions.get(point) as T[]) || [];
  }

  getByType<T extends PluginContribution>(point: ExtensionPoint, type: string): T[] {
    const pointExtensions = this.get<T>(point);
    return pointExtensions.filter(ext =>
      (ext.content as any).type === type ||
      (ext.content as any).actionType === type
    );
  }

  clear(pluginId: string): void {
    for (const [point] of this.extensions) {
      this.unregister(pluginId, point);
    }
  }
}

/**
 * 插件管理器实现
 */
export class PluginManagerImpl implements PluginManager {
  private plugins = new Map<string, Plugin>();
  private activePlugins = new Set<string>();
  private extensionRegistry = new ExtensionRegistryImpl();
  private model: ICanvasModel;
  private dispatch: (action: Action) => Promise<void>;
  private config: PluginConfig;
  private commandRegistry: ICommandRegistry;

  constructor(
    model: ICanvasModel,
    dispatch: (action: Action) => Promise<void>,
    commandRegistry: ICommandRegistry,
    config: PluginConfig = {}
  ) {
    this.model = model;
    this.dispatch = dispatch;
    this.commandRegistry = commandRegistry;
    this.config = {
      enabled: true,
      autoActivate: [],
      whitelist: [],
      blacklist: [],
      devMode: false,
      ...config
    };
  }

  async register(plugin: Plugin): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Plugin system is disabled');
    }

    // 检查黑名单
    if (this.config.blacklist?.includes(plugin.metadata.id)) {
      throw new Error(`Plugin ${plugin.metadata.id} is blacklisted`);
    }

    // 检查白名单
    if (this.config.whitelist && this.config.whitelist.length > 0) {
      if (!this.config.whitelist.includes(plugin.metadata.id)) {
        throw new Error(`Plugin ${plugin.metadata.id} is not whitelisted`);
      }
    }

    // 检查是否已注册
    if (this.plugins.has(plugin.metadata.id)) {
      throw new Error(`Plugin ${plugin.metadata.id} is already registered`);
    }

    // 验证插件依赖
    await this.validateDependencies(plugin);

    // 注册插件
    this.plugins.set(plugin.metadata.id, plugin);

    // 注册扩展贡献
    if (plugin.contributions) {
      for (const contribution of plugin.contributions) {
        // 添加插件ID标记
        (contribution as any).pluginId = plugin.metadata.id;
        this.extensionRegistry.register(contribution);
      }
    }

    // 注册Command扩展到命令注册表
    this.registerCommandExtensions(plugin);

    console.log(`Plugin ${plugin.metadata.name} (${plugin.metadata.id}) registered`);

    // 自动激活
    if (this.config.autoActivate?.includes(plugin.metadata.id)) {
      await this.activate(plugin.metadata.id);
    }
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // 先停用插件
    if (this.isActive(pluginId)) {
      await this.deactivate(pluginId);
    }

    // 清理扩展注册
    this.extensionRegistry.clear(pluginId);

    // 清理命令扩展
    this.unregisterCommandExtensions(plugin);

    // 移除插件
    this.plugins.delete(pluginId);

    console.log(`Plugin ${plugin.metadata.name} (${pluginId}) unregistered`);
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.isActive(pluginId)) {
      return; // 已经激活
    }

    // 激活依赖
    if (plugin.metadata.dependencies) {
      for (const depId of plugin.metadata.dependencies) {
        if (!this.isActive(depId)) {
          await this.activate(depId);
        }
      }
    }

    // 创建插件上下文
    const context: PluginContext = {
      model: this.model,
      dispatch: this.dispatch,
      extensionRegistry: this.extensionRegistry,
      config: {}, // 可以从配置文件加载插件特定配置
      logger: {
        info: (message, ...args) => console.log(`[${plugin.metadata.id}] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[${plugin.metadata.id}] ${message}`, ...args),
        error: (message, ...args) => console.error(`[${plugin.metadata.id}] ${message}`, ...args)
      }
    };

    try {
      // 调用插件激活方法
      if (plugin.activate) {
        await plugin.activate(context);
      }

      this.activePlugins.add(pluginId);
      console.log(`Plugin ${plugin.metadata.name} (${pluginId}) activated`);

    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!this.isActive(pluginId)) {
      return; // 已经停用
    }

    // 检查是否有其他插件依赖这个插件
    const dependentPlugins = this.findDependentPlugins(pluginId);
    if (dependentPlugins.length > 0) {
      // 先停用依赖插件
      for (const depPluginId of dependentPlugins) {
        if (this.isActive(depPluginId)) {
          await this.deactivate(depPluginId);
        }
      }
    }

    try {
      // 调用插件停用方法
      if (plugin.deactivate) {
        const context: PluginContext = {
          model: this.model,
          dispatch: this.dispatch,
          extensionRegistry: this.extensionRegistry
        };
        await plugin.deactivate(context);
      }

      this.activePlugins.delete(pluginId);
      console.log(`Plugin ${plugin.metadata.name} (${pluginId}) deactivated`);

    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins).map(id => this.plugins.get(id)!);
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  /**
   * 获取扩展注册器
   */
  getExtensionRegistry(): ExtensionRegistry {
    return this.extensionRegistry;
  }

  /**
   * 验证插件依赖
   */
  private async validateDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.metadata.dependencies) return;

    for (const depId of plugin.metadata.dependencies) {
      if (!this.plugins.has(depId)) {
        throw new Error(`Plugin ${plugin.metadata.id} depends on ${depId}, but it's not registered`);
      }
    }
  }

  /**
   * 查找依赖指定插件的插件列表
   */
  private findDependentPlugins(pluginId: string): string[] {
    const dependents: string[] = [];

    for (const [id, plugin] of this.plugins) {
      if (plugin.metadata.dependencies?.includes(pluginId)) {
        dependents.push(id);
      }
    }

    return dependents;
  }

  /**
   * 注册Command扩展到命令注册表
   */
  private registerCommandExtensions(plugin: Plugin): void {
    if (!plugin.contributions) return;

    const commandContributions = plugin.contributions.filter(c => c.point === 'command');

    for (const contribution of commandContributions) {
      const { actionType, creator } = contribution.content;
      this.commandRegistry.register(actionType, { factory: creator });
    }
  }

  /**
   * 取消注册Command扩展
   */
  private unregisterCommandExtensions(plugin: Plugin): void {
    if (!plugin.contributions) return;

    const commandContributions = plugin.contributions.filter(c => c.point === 'command');

    for (const contribution of commandContributions) {
      const { actionType } = contribution.content;
      this.commandRegistry.unregister(actionType);
    }
  }

  /**
   * 创建简单的插件工厂函数
   */
  static createSimplePlugin(
    metadata: Plugin['metadata'],
    activate?: (context: PluginContext) => void | Promise<void>,
    deactivate?: (context: PluginContext) => void | Promise<void>,
    contributions?: PluginContribution[]
  ): Plugin {
    return {
      metadata,
      activate,
      deactivate,
      contributions
    };
  }

  /**
   * 从URL加载插件（适用于开发模式）
   */
  async loadPluginFromUrl(url: string): Promise<Plugin> {
    if (!this.config.devMode) {
      throw new Error('Plugin loading from URL is only available in development mode');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin from ${url}: ${response.statusText}`);
      }

      const pluginCode = await response.text();

      // 简单的插件代码执行（生产环境需要更安全的方式）
      const pluginModule = new Function('return ' + pluginCode)();

      if (!pluginModule.default || typeof pluginModule.default !== 'object') {
        throw new Error('Invalid plugin format: must export a default plugin object');
      }

      return pluginModule.default as Plugin;

    } catch (error) {
      throw new Error(`Failed to load plugin from ${url}: ${error}`);
    }
  }
}