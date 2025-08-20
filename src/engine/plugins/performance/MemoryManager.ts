/**
 * 插件系统内存管理器 - 重构后的主入口
 */

import { ResourceTracker } from './core/ResourceTracker';
import { MemoryAnalyzer } from './core/MemoryAnalyzer';
import { GarbageCollector } from './core/GarbageCollector';
import { 
  ResourceInfo, 
  MemoryLeakReport, 
  MemoryStats, 
  GarbageCollectionResult,
  PluginMemoryUsage 
} from './types/MemoryTypes';

export class MemoryManager {
  private resourceTracker: ResourceTracker;
  private memoryAnalyzer: MemoryAnalyzer;
  private garbageCollector: GarbageCollector;

  constructor() {
    this.resourceTracker = new ResourceTracker();
    this.memoryAnalyzer = new MemoryAnalyzer();
    this.garbageCollector = new GarbageCollector(this.memoryAnalyzer);
    
    this.startMemoryTracking();
    this.setupGarbageCollection();
  }

  /**
   * 注册资源
   */
  registerResource(pluginId: string, resource: Omit<ResourceInfo, 'pluginId' | 'created' | 'lastAccessed'>): string {
    return this.resourceTracker.registerResource(pluginId, resource);
  }

  /**
   * 访问资源（更新最后访问时间）
   */
  accessResource(resourceId: string): void {
    this.resourceTracker.accessResource(resourceId);
  }

  /**
   * 释放资源
   */
  releaseResource(resourceId: string): boolean {
    return this.resourceTracker.releaseResource(resourceId);
  }

  /**
   * 释放插件的所有资源
   */
  releasePluginResources(pluginId: string): number {
    return this.resourceTracker.releasePluginResources(pluginId);
  }

  /**
   * 注册清理回调
   */
  onCleanup(pluginId: string, callback: () => void): void {
    this.resourceTracker.onCleanup(pluginId, callback);
  }

  /**
   * 获取插件内存使用情况
   */
  getPluginMemoryUsage(pluginId: string): PluginMemoryUsage {
    const resources = this.resourceTracker.getAllResources();
    return this.memoryAnalyzer.getPluginMemoryUsage(resources, pluginId);
  }

  /**
   * 获取系统总内存使用情况
   */
  getSystemMemoryUsage(): MemoryStats {
    const resources = this.resourceTracker.getAllResources();
    return this.memoryAnalyzer.getSystemMemoryUsage(resources);
  }

  /**
   * 检查内存泄漏
   */
  checkMemoryLeaks(): MemoryLeakReport {
    const resources = this.resourceTracker.getAllResources();
    return this.memoryAnalyzer.checkMemoryLeaks(resources);
  }

  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(): GarbageCollectionResult {
    const resources = this.resourceTracker.getAllResources();
    return this.garbageCollector.forceGarbageCollection(
      resources,
      (resourceId: string) => this.resourceTracker.releaseResource(resourceId)
    );
  }

  /**
   * 设置内存阈值
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryAnalyzer.setMemoryThreshold(threshold);
  }

  /**
   * 获取内存历史记录
   */
  getMemoryHistory() {
    return this.garbageCollector.getMemoryHistory();
  }

  /**
   * 启动内存跟踪
   */
  private startMemoryTracking(): void {
    this.garbageCollector.startAutoCollection();
  }

  /**
   * 设置垃圾回收
   */
  private setupGarbageCollection(): void {
    // 垃圾回收已在构造函数中设置
  }

  /**
   * 销毁内存管理器
   */
  destroy(): void {
    this.garbageCollector.destroy();
  }
}

// 导出类型以保持向后兼容
export type { 
  ResourceInfo, 
  MemoryLeakReport, 
  MemoryStats, 
  GarbageCollectionResult,
  PluginMemoryUsage 
} from './types/MemoryTypes';
