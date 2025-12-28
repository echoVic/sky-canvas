/**
 * 插件管理器
 * 提供插件的安装、更新、删除和配置管理功能
 */

import { PluginSystem, Plugin, PluginMetadata, PluginState } from './PluginSystem';
import { IEventBus } from '../events/EventBus';
import {
  PluginPackage,
  PluginRegistry,
  InstallOptions,
  UpdateOptions,
  PluginSearchResult,
  PluginSearchOptions,
  InstallationStatus,
  DependencyConflict
} from './manager';
import { isVersionCompatible, shouldUpdate } from './manager/VersionUtils';
import { deduplicatePackages, sortPackages, findDependentPackages } from './manager/PackageUtils';

// 重新导出类型
export type {
  PluginPackage,
  PluginRegistry,
  InstallOptions,
  UpdateOptions,
  PluginSearchResult,
  PluginSearchOptions,
  PluginManagerEvents,
  PluginSource
} from './manager';

/**
 * 插件管理器实现
 */
export class PluginManager {
  private pluginSystem: PluginSystem;
  private eventBus?: IEventBus;
  private registries: Map<string, PluginRegistry> = new Map();
  private installedPackages: Map<string, PluginPackage> = new Map();
  private packageCache: Map<string, PluginPackage> = new Map();
  private installationStatus: Map<string, InstallationStatus> = new Map();

  constructor(pluginSystem: PluginSystem) {
    this.pluginSystem = pluginSystem;
    this.addRegistry({
      name: 'official',
      url: 'https://plugins.sky-canvas.dev/registry',
      enabled: true,
      trusted: true
    });
  }

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  addRegistry(registry: PluginRegistry): void {
    this.registries.set(registry.name, registry);
    this.eventBus?.emit('registry-added', { registry });
  }

  removeRegistry(registryName: string): boolean {
    const removed = this.registries.delete(registryName);
    if (removed) {
      this.eventBus?.emit('registry-removed', { registryName });
    }
    return removed;
  }

  getRegistries(): PluginRegistry[] {
    return Array.from(this.registries.values());
  }

  async searchPlugins(query: string, options: PluginSearchOptions = {}): Promise<PluginSearchResult> {
    const { page = 1, pageSize = 20 } = options;
    const results: PluginPackage[] = [];

    for (const registry of this.registries.values()) {
      if (!registry.enabled) continue;
      try {
        const registryResults = await this.searchInRegistry(registry, query, options);
        results.push(...registryResults);
      } catch (error) {
        console.warn(`Failed to search in registry ${registry.name}:`, error);
      }
    }

    const uniqueResults = deduplicatePackages(results);
    const sortedResults = sortPackages(uniqueResults, options.sortBy, options.sortOrder);
    const startIndex = (page - 1) * pageSize;
    const pageResults = sortedResults.slice(startIndex, startIndex + pageSize);

    return { packages: pageResults, total: sortedResults.length, page, pageSize };
  }

  private async searchInRegistry(
    registry: PluginRegistry,
    query: string,
    options: PluginSearchOptions
  ): Promise<PluginPackage[]> {
    const url = new URL('/search', registry.url);
    url.searchParams.set('q', query);
    if (options.category) url.searchParams.set('category', options.category);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    const data = await response.json();
    return data.packages || [];
  }

  async getPluginInfo(packageId: string, version?: string): Promise<PluginPackage | null> {
    const cacheKey = `${packageId}@${version || 'latest'}`;
    if (this.packageCache.has(cacheKey)) return this.packageCache.get(cacheKey)!;

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

  private async getPackageFromRegistry(
    registry: PluginRegistry,
    packageId: string,
    version?: string
  ): Promise<PluginPackage | null> {
    const url = new URL(`/package/${packageId}`, registry.url);
    if (version) url.searchParams.set('version', version);

    const response = await fetch(url.toString());
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get package: ${response.statusText}`);
    }
    return response.json();
  }

  async installPlugin(packageId: string, options: Partial<InstallOptions> = {}): Promise<void> {
    const opts: InstallOptions = { force: false, skipDependencies: false, ...options };

    if (this.installationStatus.has(packageId)) {
      throw new Error(`Package ${packageId} is already being processed`);
    }
    if (this.installedPackages.has(packageId) && !opts.force) {
      throw new Error(`Package ${packageId} is already installed. Use force option to reinstall.`);
    }

    try {
      this.installationStatus.set(packageId, { status: 'installing', progress: 0 });
      this.eventBus?.emit('plugin-installing', { packageId, progress: 0 });

      const packageInfo = await this.getPluginInfo(packageId, opts.version);
      if (!packageInfo) throw new Error(`Package ${packageId} not found`);

      const dependencies = await this.resolveDependencies(packageInfo, opts);
      this.eventBus?.emit('dependency-resolved', { packageId, dependencies });

      if (!opts.skipDependencies) {
        for (const depId of dependencies) {
          if (!this.installedPackages.has(depId)) {
            await this.installPlugin(depId, { ...opts, force: false });
          }
        }
      }

      this.updateInstallProgress(packageId, 50);
      const pluginCode = await this.downloadPlugin(packageInfo);
      this.updateInstallProgress(packageId, 80);

      const plugin = await this.createPluginFromCode(pluginCode, packageInfo.metadata);
      this.pluginSystem.registerPlugin(plugin);
      this.installedPackages.set(packageId, packageInfo);
      this.updateInstallProgress(packageId, 100);

      this.eventBus?.emit('plugin-installed', { packageId, version: packageInfo.metadata.version });
    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-install-failed', { packageId, error: pluginError });
      throw error;
    } finally {
      this.installationStatus.delete(packageId);
    }
  }

  async updatePlugin(packageId: string, options: Partial<UpdateOptions> = {}): Promise<void> {
    const opts: UpdateOptions = { force: false, skipDependencies: false, preRelease: false, ...options };
    const installedPackage = this.installedPackages.get(packageId);
    if (!installedPackage) throw new Error(`Package ${packageId} is not installed`);

    try {
      this.installationStatus.set(packageId, { status: 'updating', progress: 0 });

      const latestPackage = await this.getPluginInfo(packageId);
      if (!latestPackage) throw new Error(`Package ${packageId} not found in any registry`);

      if (!opts.force && !shouldUpdate(installedPackage.metadata.version, latestPackage.metadata.version)) {
        return;
      }

      const fromVersion = installedPackage.metadata.version;
      const toVersion = latestPackage.metadata.version;
      this.eventBus?.emit('plugin-updating', { packageId, fromVersion, toVersion, progress: 0 });

      await this.pluginSystem.unloadPlugin(packageId);
      await this.installPlugin(packageId, { force: true, skipDependencies: opts.skipDependencies });

      this.eventBus?.emit('plugin-updated', { packageId, fromVersion, toVersion });
    } catch (error) {
      const pluginError = error instanceof Error ? error : new Error(String(error));
      this.eventBus?.emit('plugin-update-failed', { packageId, error: pluginError });
      throw error;
    }
  }

  async uninstallPlugin(packageId: string): Promise<void> {
    const installedPackage = this.installedPackages.get(packageId);
    if (!installedPackage) return;

    try {
      this.installationStatus.set(packageId, { status: 'uninstalling', progress: 0 });
      this.eventBus?.emit('plugin-uninstalling', { packageId });

      const dependents = findDependentPackages(packageId, this.installedPackages);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall ${packageId}: required by ${dependents.join(', ')}`);
      }

      await this.pluginSystem.unloadPlugin(packageId);
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
        result.push({ package: packageInfo, plugin, state, hasUpdates: false });
      }
    }
    return result;
  }

  async checkForUpdates(): Promise<Array<{ packageId: string; currentVersion: string; availableVersion: string }>> {
    const updates = [];
    for (const [packageId, installedPackage] of this.installedPackages) {
      try {
        const latestPackage = await this.getPluginInfo(packageId);
        if (latestPackage && shouldUpdate(installedPackage.metadata.version, latestPackage.metadata.version)) {
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

  private async resolveDependencies(packageInfo: PluginPackage, options: InstallOptions): Promise<string[]> {
    const dependencies: string[] = [];
    const conflicts: DependencyConflict[] = [];

    for (const [depId, depVersion] of Object.entries(packageInfo.metadata.dependencies || {})) {
      const installedPackage = this.installedPackages.get(depId);
      if (installedPackage) {
        if (!isVersionCompatible(installedPackage.metadata.version, depVersion)) {
          conflicts.push({ package: depId, required: depVersion, installed: installedPackage.metadata.version });
        }
      } else {
        dependencies.push(depId);
      }
    }

    for (const [depId, depVersion] of Object.entries(packageInfo.metadata.peerDependencies || {})) {
      const installedPackage = this.installedPackages.get(depId);
      if (installedPackage && !isVersionCompatible(installedPackage.metadata.version, depVersion)) {
        conflicts.push({ package: depId, required: depVersion, installed: installedPackage.metadata.version });
      }
    }

    if (conflicts.length > 0) {
      this.eventBus?.emit('dependency-conflict', { packageId: packageInfo.metadata.id, conflicts });
      if (!options.force) {
        throw new Error(
          `Dependency conflicts: ${conflicts.map(c => `${c.package}@${c.required} (installed: ${c.installed})`).join(', ')}`
        );
      }
    }

    return dependencies;
  }

  private async downloadPlugin(packageInfo: PluginPackage): Promise<string> {
    if (!packageInfo.downloadUrl) throw new Error('No download URL available');
    const response = await fetch(packageInfo.downloadUrl);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    return response.text();
  }

  private async createPluginFromCode(code: string, metadata: PluginMetadata): Promise<Plugin> {
    const pluginFactory = new Function('metadata', `${code}\nreturn typeof plugin !== 'undefined' ? plugin : null;`);
    const plugin = pluginFactory(metadata);
    if (!plugin) throw new Error('Plugin code did not export a plugin object');
    plugin.metadata = metadata;
    return plugin;
  }

  private updateInstallProgress(packageId: string, progress: number): void {
    const status = this.installationStatus.get(packageId);
    if (status) {
      status.progress = progress;
      this.eventBus?.emit('plugin-installing', { packageId, progress });
    }
  }

  getPluginStatus(packageId: string): { status: string; progress?: number } | null {
    const installStatus = this.installationStatus.get(packageId);
    if (installStatus) return installStatus;
    const pluginState = this.pluginSystem.getPluginState(packageId);
    if (pluginState) return { status: pluginState };
    return null;
  }

  clearCache(): void {
    this.packageCache.clear();
  }

  dispose(): void {
    this.clearCache();
    this.installedPackages.clear();
    this.installationStatus.clear();
    this.registries.clear();
  }
}
