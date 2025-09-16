/**
 * 插件管理器
 * 提供插件的安装、更新、删除和配置管理功能
 */

import { PluginSystem, Plugin, PluginMetadata, PluginState } from './PluginSystem';
import EventEmitter3 from 'eventemitter3';

export interface PluginPackage {
  metadata: PluginMetadata;
  source: PluginSource;
  installPath?: string;
  installedVersion?: string;
  availableVersion?: string;
  size: number;
  downloadUrl?: string;
  checksums?: Record<string, string>;
}

export interface PluginSource {
  type: 'registry' | 'file' | 'url' | 'git';
  location: string;
  branch?: string;
  tag?: string;
}

export interface PluginRegistry {
  name: string;
  url: string;
  enabled: boolean;
  trusted: boolean;
}

export interface InstallOptions {
  force: boolean;
  skipDependencies: boolean;
  version?: string;
  registry?: string;
}

export interface UpdateOptions {
  force: boolean;
  skipDependencies: boolean;
  preRelease: boolean;
}

export interface PluginSearchResult {
  packages: PluginPackage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PluginManagerEvents {
  'registry-added': { registry: PluginRegistry };
  'registry-removed': { registryName: string };
  'plugin-installing': { packageId: string; progress: number };
  'plugin-installed': { packageId: string; version: string };
  'plugin-install-failed': { packageId: string; error: Error };
  'plugin-updating': { packageId: string; fromVersion: string; toVersion: string; progress: number };
  'plugin-updated': { packageId: string; fromVersion: string; toVersion: string };
  'plugin-update-failed': { packageId: string; error: Error };
  'plugin-uninstalling': { packageId: string };
  'plugin-uninstalled': { packageId: string };
  'plugin-uninstall-failed': { packageId: string; error: Error };
  'dependency-resolved': { packageId: string; dependencies: string[] };
  'dependency-conflict': { packageId: string; conflicts: Array<{ package: string; required: string; installed: string }> };
}

/**
 * 插件管理器实现
 */
export class PluginManager {
  private pluginSystem: PluginSystem;
  private eventBus?: EventEmitter3;
  
  // 注册源管理
  private registries: Map<string, PluginRegistry> = new Map();
  
  // 已安装的包信息
  private installedPackages: Map<string, PluginPackage> = new Map();
  
  // 缓存的包信息
  private packageCache: Map<string, PluginPackage> = new Map();
  
  // 下载和安装状态
  private installationStatus: Map<string, { status: 'installing' | 'updating' | 'uninstalling'; progress: number }> = new Map();

  constructor(pluginSystem: PluginSystem) {
    this.pluginSystem = pluginSystem;
    
    // 添加默认注册源
    this.addRegistry({
      name: 'official',
      url: 'https://plugins.sky-canvas.dev/registry',
      enabled: true,
      trusted: true
    });
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: EventEmitter3): void {
    this.eventBus = eventBus;
  }

  /**
   * 添加插件注册源
   */
  addRegistry(registry: PluginRegistry): void {
    this.registries.set(registry.name, registry);
    this.eventBus?.emit('registry-added', { registry });
  }

  /**
   * 移除插件注册源
   */
  removeRegistry(registryName: string): boolean {
    const removed = this.registries.delete(registryName);
    if (removed) {
      this.eventBus?.emit('registry-removed', { registryName });
    }
    return removed;
  }

  /**
   * 获取所有注册源
   */
  getRegistries(): PluginRegistry[] {
    return Array.from(this.registries.values());
  }

  /**
   * 搜索插件
   */
  async searchPlugins(
    query: string,
    options: {
      category?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PluginSearchResult> {
    const { page = 1, pageSize = 20 } = options;
    const results: PluginPackage[] = [];

    // 在所有启用的注册源中搜索
    for (const registry of this.registries.values()) {
      if (!registry.enabled) continue;

      try {
        const registryResults = await this.searchInRegistry(registry, query, options);
        results.push(...registryResults);
      } catch (error) {
        console.warn(`Failed to search in registry ${registry.name}:`, error);
      }
    }

    // 去重和排序
    const uniqueResults = this.deduplicatePackages(results);
    const sortedResults = this.sortPackages(uniqueResults, options.sortBy, options.sortOrder);

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageResults = sortedResults.slice(startIndex, endIndex);

    return {
      packages: pageResults,
      total: sortedResults.length,
      page,
      pageSize
    };
  }

  /**
   * 在特定注册源中搜索
   */
  private async searchInRegistry(
    registry: PluginRegistry,
    query: string,
    options: any
  ): Promise<PluginPackage[]> {
    // 模拟API调用
    const url = new URL('/search', registry.url);
    url.searchParams.set('q', query);
    
    if (options.category) {
      url.searchParams.set('category', options.category);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.packages || [];
  }

  /**
   * 获取插件详情
   */
  async getPluginInfo(packageId: string, version?: string): Promise<PluginPackage | null> {
    // 首先检查缓存
    const cacheKey = `${packageId}@${version || 'latest'}`;
    if (this.packageCache.has(cacheKey)) {
      return this.packageCache.get(cacheKey)!;
    }

    // 从注册源获取
    for (const registry of this.registries.values()) {
      if (!registry.enabled) continue;

      try {
        const packageInfo = await this.getPackageFromRegistry(registry, packageId, version);
        if (packageInfo) {
          this.packageCache.set(cacheKey, packageInfo);
          return packageInfo;
        }
      } catch (error) {
        console.warn(`Failed to get package from registry ${registry.name}:`, error);
      }
    }

    return null;
  }

  /**
   * 从注册源获取包信息
   */
  private async getPackageFromRegistry(
    registry: PluginRegistry,
    packageId: string,
    version?: string
  ): Promise<PluginPackage | null> {
    const url = new URL(`/package/${packageId}`, registry.url);
    if (version) {
      url.searchParams.set('version', version);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get package: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 安装插件
   */
  async installPlugin(
    packageId: string,
    options: Partial<InstallOptions> = {}
  ): Promise<void> {
    const opts: InstallOptions = {
      force: false,
      skipDependencies: false,
      ...options
    };

    // 检查是否已在安装中
    if (this.installationStatus.has(packageId)) {
      throw new Error(`Package ${packageId} is already being processed`);
    }

    // 检查是否已安装
    if (this.installedPackages.has(packageId) && !opts.force) {
      throw new Error(`Package ${packageId} is already installed. Use force option to reinstall.`);
    }

    try {
      this.installationStatus.set(packageId, { status: 'installing', progress: 0 });
      this.eventBus?.emit('plugin-installing', { packageId, progress: 0 });

      // 获取包信息
      const packageInfo = await this.getPluginInfo(packageId, opts.version);
      if (!packageInfo) {
        throw new Error(`Package ${packageId} not found`);
      }

      // 解析依赖
      const dependencies = await this.resolveDependencies(packageInfo, opts);
      this.eventBus?.emit('dependency-resolved', { packageId, dependencies });

      // 安装依赖
      if (!opts.skipDependencies) {
        for (const depId of dependencies) {
          if (!this.installedPackages.has(depId)) {
            await this.installPlugin(depId, { ...opts, force: false });
          }
        }
      }

      // 更新进度
      this.updateInstallProgress(packageId, 50);

      // 下载插件
      const pluginCode = await this.downloadPlugin(packageInfo);

      // 更新进度
      this.updateInstallProgress(packageId, 80);

      // 创建插件实例
      const plugin = await this.createPluginFromCode(pluginCode, packageInfo.metadata);

      // 注册插件
      this.pluginSystem.registerPlugin(plugin);

      // 记录安装信息
      this.installedPackages.set(packageId, packageInfo);

      // 更新进度
      this.updateInstallProgress(packageId, 100);

      this.eventBus?.emit('plugin-installed', { 
        packageId, 
        version: packageInfo.metadata.version 
      });

    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-install-failed', { packageId, error: pluginError });
      throw error;
    } finally {
      this.installationStatus.delete(packageId);
    }
  }

  /**
   * 更新插件
   */
  async updatePlugin(
    packageId: string,
    options: Partial<UpdateOptions> = {}
  ): Promise<void> {
    const opts: UpdateOptions = {
      force: false,
      skipDependencies: false,
      preRelease: false,
      ...options
    };

    const installedPackage = this.installedPackages.get(packageId);
    if (!installedPackage) {
      throw new Error(`Package ${packageId} is not installed`);
    }

    try {
      this.installationStatus.set(packageId, { status: 'updating', progress: 0 });

      // 获取最新版本信息
      const latestPackage = await this.getPluginInfo(packageId);
      if (!latestPackage) {
        throw new Error(`Package ${packageId} not found in any registry`);
      }

      // 检查是否需要更新
      if (!opts.force && !this.shouldUpdate(installedPackage.metadata.version, latestPackage.metadata.version)) {
        return; // 已是最新版本
      }

      const fromVersion = installedPackage.metadata.version;
      const toVersion = latestPackage.metadata.version;

      this.eventBus?.emit('plugin-updating', { 
        packageId, 
        fromVersion, 
        toVersion, 
        progress: 0 
      });

      // 先卸载旧版本
      await this.pluginSystem.unloadPlugin(packageId);

      // 安装新版本
      await this.installPlugin(packageId, { force: true, skipDependencies: opts.skipDependencies });

      this.eventBus?.emit('plugin-updated', { packageId, fromVersion, toVersion });

    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-update-failed', { packageId, error: pluginError });
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(packageId: string): Promise<void> {
    const installedPackage = this.installedPackages.get(packageId);
    if (!installedPackage) {
      return; // 未安装
    }

    try {
      this.installationStatus.set(packageId, { status: 'uninstalling', progress: 0 });
      this.eventBus?.emit('plugin-uninstalling', { packageId });

      // 检查依赖关系
      const dependents = this.findDependentPackages(packageId);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall ${packageId}: required by ${dependents.join(', ')}`);
      }

      // 卸载插件
      await this.pluginSystem.unloadPlugin(packageId);

      // 移除安装记录
      this.installedPackages.delete(packageId);

      this.eventBus?.emit('plugin-uninstalled', { packageId });

    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-uninstall-failed', { packageId, error: pluginError });
      throw error;
    } finally {
      this.installationStatus.delete(packageId);
    }
  }

  /**
   * 获取已安装的插件列表
   */
  getInstalledPlugins(): Array<{
    package: PluginPackage;
    plugin: Plugin;
    state: PluginState;
    hasUpdates: boolean;
  }> {
    const result = [];
    
    for (const [packageId, packageInfo] of this.installedPackages) {
      const plugin = this.pluginSystem.getPlugin(packageId);
      const state = this.pluginSystem.getPluginState(packageId);
      
      if (plugin && state) {
        result.push({
          package: packageInfo,
          plugin,
          state,
          hasUpdates: false // TODO: 检查更新
        });
      }
    }
    
    return result;
  }

  /**
   * 检查所有插件的更新
   */
  async checkForUpdates(): Promise<Array<{ packageId: string; currentVersion: string; availableVersion: string }>> {
    const updates = [];
    
    for (const [packageId, installedPackage] of this.installedPackages) {
      try {
        const latestPackage = await this.getPluginInfo(packageId);
        if (latestPackage && this.shouldUpdate(installedPackage.metadata.version, latestPackage.metadata.version)) {
          updates.push({
            packageId,
            currentVersion: installedPackage.metadata.version,
            availableVersion: latestPackage.metadata.version
          });
        }
      } catch (error) {
        console.warn(`Failed to check updates for ${packageId}:`, error);
      }
    }
    
    return updates;
  }

  /**
   * 批量更新所有插件
   */
  async updateAllPlugins(options: Partial<UpdateOptions> = {}): Promise<void> {
    const updates = await this.checkForUpdates();
    
    for (const update of updates) {
      try {
        await this.updatePlugin(update.packageId, options);
      } catch (error) {
        console.error(`Failed to update ${update.packageId}:`, error);
      }
    }
  }

  /**
   * 解析插件依赖
   */
  private async resolveDependencies(
    packageInfo: PluginPackage,
    options: InstallOptions
  ): Promise<string[]> {
    const dependencies: string[] = [];
    const conflicts: Array<{ package: string; required: string; installed: string }> = [];

    // 检查直接依赖
    for (const [depId, depVersion] of Object.entries(packageInfo.metadata.dependencies || {})) {
      const installedPackage = this.installedPackages.get(depId);
      
      if (installedPackage) {
        // 检查版本兼容性
        if (!this.isVersionCompatible(installedPackage.metadata.version, depVersion)) {
          conflicts.push({
            package: depId,
            required: depVersion,
            installed: installedPackage.metadata.version
          });
        }
      } else {
        dependencies.push(depId);
      }
    }

    // 检查对等依赖
    for (const [depId, depVersion] of Object.entries(packageInfo.metadata.peerDependencies || {})) {
      const installedPackage = this.installedPackages.get(depId);
      
      if (installedPackage && !this.isVersionCompatible(installedPackage.metadata.version, depVersion)) {
        conflicts.push({
          package: depId,
          required: depVersion,
          installed: installedPackage.metadata.version
        });
      }
    }

    if (conflicts.length > 0) {
      this.eventBus?.emit('dependency-conflict', { 
        packageId: packageInfo.metadata.id, 
        conflicts 
      });
      
      if (!options.force) {
        throw new Error(`Dependency conflicts found: ${conflicts.map(c => `${c.package}@${c.required} (installed: ${c.installed})`).join(', ')}`);
      }
    }

    return dependencies;
  }

  /**
   * 下载插件
   */
  private async downloadPlugin(packageInfo: PluginPackage): Promise<string> {
    if (!packageInfo.downloadUrl) {
      throw new Error('No download URL available');
    }

    const response = await fetch(packageInfo.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * 从代码创建插件实例
   */
  private async createPluginFromCode(code: string, metadata: PluginMetadata): Promise<Plugin> {
    // 在安全的上下文中执行插件代码
    const pluginFactory = new Function('metadata', `
      ${code}
      return typeof plugin !== 'undefined' ? plugin : null;
    `);

    const plugin = pluginFactory(metadata);
    
    if (!plugin) {
      throw new Error('Plugin code did not export a plugin object');
    }

    // 设置元数据
    plugin.metadata = metadata;

    return plugin;
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(installedVersion: string, requiredVersion: string): boolean {
    // 简化的语义版本检查
    // 实际实现应该使用完整的semver库
    
    const parseVersion = (version: string) => {
      const parts = version.replace(/[^\d.]/g, '').split('.').map(Number);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const installed = parseVersion(installedVersion);
    
    if (requiredVersion.startsWith('^')) {
      const required = parseVersion(requiredVersion);
      return installed.major === required.major && 
             (installed.minor > required.minor || 
              (installed.minor === required.minor && installed.patch >= required.patch));
    } else if (requiredVersion.startsWith('~')) {
      const required = parseVersion(requiredVersion);
      return installed.major === required.major && 
             installed.minor === required.minor && 
             installed.patch >= required.patch;
    } else {
      return installedVersion === requiredVersion;
    }
  }

  /**
   * 判断是否需要更新
   */
  private shouldUpdate(currentVersion: string, latestVersion: string): boolean {
    const parseVersion = (version: string) => {
      const parts = version.replace(/[^\d.]/g, '').split('.').map(Number);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);

    return latest.major > current.major ||
           (latest.major === current.major && latest.minor > current.minor) ||
           (latest.major === current.major && latest.minor === current.minor && latest.patch > current.patch);
  }

  /**
   * 查找依赖特定包的其他包
   */
  private findDependentPackages(packageId: string): string[] {
    const dependents = [];
    
    for (const [id, packageInfo] of this.installedPackages) {
      if (id === packageId) continue;
      
      const dependencies = packageInfo.metadata.dependencies || {};
      const peerDependencies = packageInfo.metadata.peerDependencies || {};
      
      if (dependencies[packageId] || peerDependencies[packageId]) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  /**
   * 去重包列表
   */
  private deduplicatePackages(packages: PluginPackage[]): PluginPackage[] {
    const seen = new Set<string>();
    const unique: PluginPackage[] = [];
    
    for (const pkg of packages) {
      const key = `${pkg.metadata.id}@${pkg.metadata.version}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(pkg);
      }
    }
    
    return unique;
  }

  /**
   * 排序包列表
   */
  private sortPackages(
    packages: PluginPackage[],
    sortBy: string = 'relevance',
    sortOrder: string = 'desc'
  ): PluginPackage[] {
    const sorted = [...packages];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          // 简单的相关性排序（可以根据搜索词匹配度等实现）
          comparison = a.metadata.name.localeCompare(b.metadata.name);
          break;
        case 'downloads':
          // 假设有下载量数据
          comparison = (a as any).downloads - (b as any).downloads;
          break;
        case 'rating':
          // 假设有评分数据
          comparison = (a as any).rating - (b as any).rating;
          break;
        case 'updated':
          // 按更新时间排序
          comparison = new Date(a.metadata.version).getTime() - new Date(b.metadata.version).getTime();
          break;
        default:
          comparison = a.metadata.name.localeCompare(b.metadata.name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }

  /**
   * 更新安装进度
   */
  private updateInstallProgress(packageId: string, progress: number): void {
    const status = this.installationStatus.get(packageId);
    if (status) {
      status.progress = progress;
      this.eventBus?.emit('plugin-installing', { packageId, progress });
    }
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(packageId: string): { status: string; progress?: number } | null {
    const installStatus = this.installationStatus.get(packageId);
    if (installStatus) {
      return installStatus;
    }

    const pluginState = this.pluginSystem.getPluginState(packageId);
    if (pluginState) {
      return { status: pluginState };
    }

    return null;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.packageCache.clear();
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clearCache();
    this.installedPackages.clear();
    this.installationStatus.clear();
    this.registries.clear();
  }
}