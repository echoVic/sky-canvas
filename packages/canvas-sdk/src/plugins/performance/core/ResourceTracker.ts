/**
 * 资源跟踪器 - 负责资源的注册、访问和释放
 */

import { ResourceInfo } from '../types/MemoryTypes';

export class ResourceTracker {
  private resources = new Map<string, ResourceInfo>();
  private cleanupCallbacks = new Map<string, Set<() => void>>();

  /**
   * 注册资源
   */
  registerResource(pluginId: string, resource: Omit<ResourceInfo, 'pluginId' | 'created' | 'lastAccessed'>): string {
    const resourceId = `${pluginId}:${resource.id}`;
    
    this.resources.set(resourceId, {
      ...resource,
      pluginId,
      created: Date.now(),
      lastAccessed: Date.now()
    });

    return resourceId;
  }

  /**
   * 访问资源（更新最后访问时间）
   */
  accessResource(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.lastAccessed = Date.now();
    }
  }

  /**
   * 释放资源
   */
  releaseResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (resource) {
      this.resources.delete(resourceId);
      this.executeCleanupCallbacks(resource.pluginId, resourceId);
      return true;
    }
    return false;
  }

  /**
   * 释放插件的所有资源
   */
  releasePluginResources(pluginId: string): number {
    let releasedCount = 0;
    const toRelease: string[] = [];

    for (const [resourceId, resource] of this.resources) {
      if (resource.pluginId === pluginId) {
        toRelease.push(resourceId);
      }
    }

    for (const resourceId of toRelease) {
      if (this.releaseResource(resourceId)) {
        releasedCount++;
      }
    }

    // 清理插件的清理回调
    this.cleanupCallbacks.delete(pluginId);

    return releasedCount;
  }

  /**
   * 注册清理回调
   */
  onCleanup(pluginId: string, callback: () => void): void {
    if (!this.cleanupCallbacks.has(pluginId)) {
      this.cleanupCallbacks.set(pluginId, new Set());
    }
    this.cleanupCallbacks.get(pluginId)!.add(callback);
  }

  /**
   * 获取所有资源
   */
  getAllResources(): Map<string, ResourceInfo> {
    return new Map(this.resources);
  }

  /**
   * 获取插件资源
   */
  getPluginResources(pluginId: string): ResourceInfo[] {
    return Array.from(this.resources.values())
      .filter(resource => resource.pluginId === pluginId);
  }

  /**
   * 执行清理回调
   */
  private executeCleanupCallbacks(pluginId: string, resourceId: string): void {
    const callbacks = this.cleanupCallbacks.get(pluginId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback();
        } catch {
        }
      }
    }
  }
}
