/**
 * 插件管理器 - 负责插件的生命周期管理
 */

import {
  Plugin,
  PluginContext,
  PluginInstance,
  PluginManagerEvents,
  PluginManifest,
  PluginStatus
} from '../types/PluginTypes';
import { ExtensionManager } from './ExtensionManager';
import { PermissionManager } from './PermissionManager';
import { PluginContextImpl } from './PluginContext';

export class PluginManager {
  private plugins = new Map<string, PluginInstance>();
  private extensionManager: ExtensionManager;
  private permissionManager: PermissionManager;
  private listeners = new Map<string, Set<Function>>();
  private loadingPromises = new Map<string, Promise<void>>();

  constructor() {
    this.extensionManager = new ExtensionManager();
    this.permissionManager = new PermissionManager();
  }

  /**
   * 获取扩展管理器
   */
  getExtensionManager(): ExtensionManager {
    return this.extensionManager;
  }

  /**
   * 获取权限管理器
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  /**
   * 加载插件
   */
  async loadPlugin(manifest: PluginManifest, pluginModule: any): Promise<void> {
    const pluginId = manifest.id;

    // 检查是否已经在加载中
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId)!;
    }

    // 检查是否已经加载
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin '${pluginId}' is already loaded`);
    }

    const loadPromise = this._loadPluginInternal(manifest, pluginModule);
    this.loadingPromises.set(pluginId, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(pluginId);
    }
  }

  /**
   * 内部加载插件实现
   */
  private async _loadPluginInternal(manifest: PluginManifest, pluginModule: any): Promise<void> {
    const pluginId = manifest.id;
    const startTime = performance.now();

    try {
      this.emit('plugin:loading', pluginId);

      // 验证插件清单
      this.validateManifest(manifest);

      // 检查权限
      await this.permissionManager.checkPermissions(manifest.permissions);

      // 创建插件实例
      const plugin: Plugin = new pluginModule.default();
      if (!plugin.activate || typeof plugin.activate !== 'function') {
        throw new Error(`Plugin '${pluginId}' must implement activate method`);
      }

      // 创建插件上下文
      const context = new PluginContextImpl(manifest, this);

      // 创建插件实例信息
      const instance: PluginInstance = {
        manifest,
        plugin,
        context,
        status: PluginStatus.LOADED,
        loadTime: performance.now() - startTime
      };

      this.plugins.set(pluginId, instance);

      // 调用安装钩子
      if (plugin.onInstall) {
        await plugin.onInstall();
      }

      this.emit('plugin:loaded', pluginId, instance);

    } catch (error) {
      const instance: PluginInstance = {
        manifest,
        plugin: {} as Plugin,
        context: {} as PluginContext,
        status: PluginStatus.ERROR,
        error: error as Error,
        loadTime: performance.now() - startTime
      };

      this.plugins.set(pluginId, instance);
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  /**
   * 激活插件
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (instance.status === PluginStatus.ACTIVE) {
      return; // 已经激活
    }

    if (instance.status !== PluginStatus.LOADED && instance.status !== PluginStatus.INACTIVE) {
      throw new Error(`Plugin '${pluginId}' cannot be activated (status: ${instance.status})`);
    }

    try {
      const startTime = performance.now();
      
      // 激活插件
      await instance.plugin.activate(instance.context);
      
      instance.status = PluginStatus.ACTIVE;
      instance.activateTime = performance.now() - startTime;
      
      this.emit('plugin:activated', pluginId);

    } catch (error) {
      instance.status = PluginStatus.ERROR;
      instance.error = error as Error;
      
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (instance.status !== PluginStatus.ACTIVE) {
      return; // 已经停用
    }

    try {
      // 停用插件
      await instance.plugin.deactivate();
      
      // 注销扩展提供者
      this.extensionManager.unregisterPluginProviders(pluginId);
      
      instance.status = PluginStatus.INACTIVE;
      
      this.emit('plugin:deactivated', pluginId);

    } catch (error) {
      instance.status = PluginStatus.ERROR;
      instance.error = error as Error;
      
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return; // 插件不存在
    }

    try {
      // 先停用插件
      if (instance.status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(pluginId);
      }

      // 调用卸载钩子
      if (instance.plugin.onUninstall) {
        await instance.plugin.onUninstall();
      }

      // 清理资源
      if (instance.context.resources) {
        instance.context.resources.cleanup();
      }

      // 移除插件
      this.plugins.delete(pluginId);

    } catch (error) {
      instance.status = PluginStatus.ERROR;
      instance.error = error as Error;
      
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  /**
   * 更新插件
   */
  async updatePlugin(pluginId: string, newManifest: PluginManifest, newPluginModule: any): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    const oldVersion = instance.manifest.version;
    const newVersion = newManifest.version;

    try {
      // 停用旧插件
      const wasActive = instance.status === PluginStatus.ACTIVE;
      if (wasActive) {
        await this.deactivatePlugin(pluginId);
      }

      // 卸载旧插件
      await this.unloadPlugin(pluginId);

      // 加载新插件
      await this.loadPlugin(newManifest, newPluginModule);

      // 如果之前是激活状态，重新激活
      if (wasActive) {
        await this.activatePlugin(pluginId);
      }

      // 调用更新钩子
      const newInstance = this.plugins.get(pluginId)!;
      if (newInstance.plugin.onUpdate) {
        await newInstance.plugin.onUpdate(oldVersion, newVersion);
      }

    } catch (error) {
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (instance.status === PluginStatus.DISABLED) {
      instance.status = PluginStatus.INACTIVE;
    }

    await this.activatePlugin(pluginId);
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    if (instance.status === PluginStatus.ACTIVE) {
      await this.deactivatePlugin(pluginId);
    }

    instance.status = PluginStatus.DISABLED;
  }

  /**
   * 获取插件实例
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取激活的插件
   */
  getActivePlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
      .filter(instance => instance.status === PluginStatus.ACTIVE);
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(pluginId: string): PluginStatus | undefined {
    const instance = this.plugins.get(pluginId);
    return instance?.status;
  }

  /**
   * 检查插件是否存在
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 检查插件是否激活
   */
  isPluginActive(pluginId: string): boolean {
    const instance = this.plugins.get(pluginId);
    return instance?.status === PluginStatus.ACTIVE;
  }

  /**
   * 验证插件清单
   */
  private validateManifest(manifest: PluginManifest): void {
    const required = ['id', 'name', 'version', 'description', 'author', 'license', 'main'];
    
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Plugin manifest missing required field: ${field}`);
      }
    }

    // 验证版本格式
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`);
    }

    // 验证插件ID格式
    if (!/^[a-z0-9-_.]+$/.test(manifest.id)) {
      throw new Error(`Invalid plugin ID format: ${manifest.id}`);
    }
  }

  /**
   * 事件监听
   */
  on<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}'`, error);
        }
      }
    }
  }

  /**
   * 获取插件统计信息
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    disabled: number;
    error: number;
    loading: number;
  } {
    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      disabled: 0,
      error: 0,
      loading: 0
    };

    for (const instance of this.plugins.values()) {
      stats.total++;
      
      switch (instance.status) {
        case PluginStatus.ACTIVE:
          stats.active++;
          break;
        case PluginStatus.INACTIVE:
          stats.inactive++;
          break;
        case PluginStatus.DISABLED:
          stats.disabled++;
          break;
        case PluginStatus.ERROR:
          stats.error++;
          break;
        case PluginStatus.LOADING:
          stats.loading++;
          break;
      }
    }

    return stats;
  }

  /**
   * 清理所有插件
   */
  async dispose(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    
    for (const pluginId of pluginIds) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        console.error(`Error unloading plugin '${pluginId}'`, error);
      }
    }

    this.plugins.clear();
    this.listeners.clear();
    this.loadingPromises.clear();
    this.extensionManager.clear();
  }
}
