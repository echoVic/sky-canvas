/**
 * 插件管理器类型定义
 */

import { PluginMetadata } from '../PluginSystem';

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

export interface PluginSearchOptions {
  category?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
  sortOrder?: 'asc' | 'desc';
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
  'dependency-conflict': {
    packageId: string;
    conflicts: Array<{ package: string; required: string; installed: string }>;
  };
}

export interface InstallationStatus {
  status: 'installing' | 'updating' | 'uninstalling';
  progress: number;
}

export interface DependencyConflict {
  package: string;
  required: string;
  installed: string;
}
