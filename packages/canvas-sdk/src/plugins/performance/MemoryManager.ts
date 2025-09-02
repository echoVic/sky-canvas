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
  private pluginMemoryLimits = new Map<string, number>();
  private globalMemoryLimit = 0;
  private registeredResources = new Map<string, Map<string, any>>();
  private memoryMonitoringCallback: ((stats: any) => void) | null = null;
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private memoryTrends = new Map<string, Array<{ timestamp: number; memoryUsage: number }>>();

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
  registerResource(pluginId: string, resourceId: string, resource: any, size: number): string {
    // 检查是否已注册
    if (!this.registeredResources.has(pluginId)) {
      this.registeredResources.set(pluginId, new Map());
    }
    const pluginResources = this.registeredResources.get(pluginId)!;
    if (pluginResources.has(resourceId)) {
      throw new Error(`Resource ${resourceId} already registered for plugin ${pluginId}`);
    }

    // 检查插件内存限制
    const pluginLimit = this.pluginMemoryLimits.get(pluginId);
    if (pluginLimit) {
      const currentUsage = this.getPluginMemoryUsage(pluginId).totalSize;
      if (currentUsage + size > pluginLimit) {
        throw new Error(`Plugin memory limit exceeded for ${pluginId}`);
      }
    }

    // 检查全局内存限制
    if (this.globalMemoryLimit > 0) {
      const systemUsage = this.getSystemMemoryUsage().totalSize;
      if (systemUsage + size > this.globalMemoryLimit) {
        throw new Error('Global memory limit exceeded');
      }
    }

    // 存储资源
    pluginResources.set(resourceId, resource);

    const resourceInfo: Omit<ResourceInfo, 'pluginId' | 'created' | 'lastAccessed'> = {
      id: resourceId,
      type: 'data',
      size: size
    };
    return this.resourceTracker.registerResource(pluginId, resourceInfo);
  }

  /**
   * 获取资源
   */
  getResource(pluginId: string, resourceId: string): any {
    const pluginResources = this.registeredResources.get(pluginId);
    return pluginResources?.get(resourceId)?.resource;
  }

  /**
   * 检查资源是否存在
   */
  hasResource(pluginId: string, resourceId: string): boolean {
    const pluginResources = this.registeredResources.get(pluginId);
    return pluginResources?.has(resourceId) ?? false;
  }

  /**
   * 获取插件的所有资源
   */
  getPluginResources(pluginId: string): Array<{ id: string; resource: any; size: number }> {
    const pluginResources = this.registeredResources.get(pluginId);
    if (!pluginResources) {
      return [];
    }
    
    const resources: Array<{ id: string; resource: any; size: number }> = [];
    for (const [resourceId, resourceInfo] of pluginResources) {
      resources.push({
        id: resourceId,
        resource: resourceInfo.resource,
        size: resourceInfo.size
      });
    }
    
    return resources;
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
  releaseResource(pluginId: string, resourceId?: string): boolean {
    if (resourceId) {
      // 释放特定资源
      const pluginResources = this.registeredResources.get(pluginId);
      if (pluginResources && pluginResources.has(resourceId)) {
        pluginResources.delete(resourceId);
        return this.resourceTracker.releaseResource(resourceId);
      }
      return false;
    } else {
      // 如果没有指定resourceId，则pluginId实际上是resourceId
      return this.resourceTracker.releaseResource(pluginId);
    }
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
   * 设置插件内存限制
   */
  setPluginMemoryLimit(pluginId: string, limit: number): void {
    this.pluginMemoryLimits.set(pluginId, limit);
  }

  /**
   * 设置全局内存限制
   */
  setGlobalMemoryLimit(limit: number): void {
    this.globalMemoryLimit = limit;
  }

  /**
   * 获取内存限制信息
   */
  getMemoryLimits(): { global: number; plugins: Record<string, number> } {
    const plugins: Record<string, number> = {};
    for (const [pluginId, limit] of this.pluginMemoryLimits) {
      plugins[pluginId] = limit;
    }
    return {
      global: this.globalMemoryLimit,
      plugins
    };
  }

  /**
   * 销毁内存管理器
   */
  dispose(): void {
    this.registeredResources.clear();
    this.pluginMemoryLimits.clear();
    this.garbageCollector.destroy();
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const systemStats = this.getSystemMemoryUsage();
    
    // 检查大内存使用的插件
    for (const [pluginId, size] of systemStats.byPlugin) {
      if (size > 10 * 1024 * 1024) { // 10MB
        suggestions.push(`Plugin ${pluginId} is using ${Math.round(size / 1024 / 1024)}MB of memory`);
      }
    }
    
    // 检查资源数量
    if (systemStats.resourceCount > 100) {
      suggestions.push('Consider using resource pooling to reduce memory fragmentation');
    }
    
    return suggestions;
  }

  /**
   * 清理插件数据
   */
  clearPluginData(pluginId: string): void {
    this.registeredResources.delete(pluginId);
    this.releasePluginResources(pluginId);
  }

  /**
   * 清理所有数据
   */
  clearAllData(): void {
    this.registeredResources.clear();
    // 清理所有资源跟踪数据
    for (const pluginId of Array.from(this.registeredResources.keys())) {
      this.releasePluginResources(pluginId);
    }
  }

  /**
   * 获取内存统计信息
   */
  getMemoryStats(): {
    totalPlugins: number;
    totalResources: number;
    totalMemoryUsage: number;
    averageMemoryPerPlugin: number;
    largestPlugin: string;
    largestPluginSize: number;
    plugins: Array<{ pluginId: string; memoryUsage: number; resourceCount: number; totalSize: number }>;
  } {
    const systemStats = this.getSystemMemoryUsage();
    const plugins: Array<{ pluginId: string; memoryUsage: number; resourceCount: number; totalSize: number }> = [];
    
    let largestPlugin = '';
    let largestPluginSize = 0;
    
    for (const [pluginId, size] of systemStats.byPlugin) {
      const usage = this.getPluginMemoryUsage(pluginId);
      plugins.push({
        pluginId,
        memoryUsage: size,
        resourceCount: usage.resourceCount,
        totalSize: size
      });
      
      if (size > largestPluginSize) {
        largestPluginSize = size;
        largestPlugin = pluginId;
      }
    }
    
    return {
      totalPlugins: systemStats.byPlugin.size,
      totalResources: systemStats.resourceCount,
      totalMemoryUsage: systemStats.totalSize,
      averageMemoryPerPlugin: systemStats.byPlugin.size > 0 ? systemStats.totalSize / systemStats.byPlugin.size : 0,
      largestPlugin,
      largestPluginSize,
      plugins
    };
  }

  /**
   * 开始内存监控
   */
  startMemoryMonitoring(callback: (stats: any) => void, interval: number = 1000): void {
    this.memoryMonitoringCallback = callback;
    this.memoryMonitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      callback(stats);
    }, interval);
  }

  /**
   * 停止内存监控
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }
    this.memoryMonitoringCallback = null;
  }

  /**
   * 获取内存趋势
   */
  getMemoryTrend(pluginId: string): Array<{ timestamp: number; memoryUsage: number }> {
    if (!this.memoryTrends.has(pluginId)) {
      this.memoryTrends.set(pluginId, []);
    }
    return this.memoryTrends.get(pluginId)!;
  }

  /**
   * 分析内存趋势
   */
  analyzeMemoryTrend(pluginId: string): {
    isGrowing: boolean;
    isStable: boolean;
    growthRate: number;
    averageUsage: number;
    peakUsage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const trend = this.getMemoryTrend(pluginId);
    
    if (trend.length < 2) {
      return {
        isGrowing: false,
        isStable: true,
        growthRate: 0,
        averageUsage: 0,
        peakUsage: 0,
        trend: 'stable'
      };
    }

    const first = trend[0];
    const last = trend[trend.length - 1];
    const totalUsage = trend.reduce((sum, point) => sum + point.memoryUsage, 0);
    const averageUsage = totalUsage / trend.length;
    const peakUsage = Math.max(...trend.map(point => point.memoryUsage));
    
    const timeDiff = last.timestamp - first.timestamp;
    const memoryDiff = last.memoryUsage - first.memoryUsage;
    const growthRate = timeDiff > 0 ? (memoryDiff / timeDiff) * 1000 : 0; // per second
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const isStable = Math.abs(growthRate) <= 0.1;
    if (!isStable) {
      trendDirection = growthRate > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      isGrowing: growthRate > 0,
      isStable,
      growthRate,
      averageUsage,
      peakUsage,
      trend: trendDirection
    };
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks(): Array<{ pluginId: string; suspiciousResources: string[]; memoryGrowth: number; resourceCount: number; totalSize: number }> {
    const leaks: Array<{ pluginId: string; suspiciousResources: string[]; memoryGrowth: number; resourceCount: number; totalSize: number }> = [];
    
    for (const [pluginId] of this.registeredResources) {
      const trend = this.getMemoryTrend(pluginId);
      const analysis = this.analyzeMemoryTrend(pluginId);
      
      // 如果内存持续增长且增长率超过阈值，认为可能存在内存泄漏
      if (analysis.isGrowing && analysis.growthRate > 1.0) { // 1MB/s
        const pluginResources = this.registeredResources.get(pluginId);
        const suspiciousResources = pluginResources ? Array.from(pluginResources.keys()) : [];
        const resourceCount = suspiciousResources.length;
        
        // 计算总大小
        let totalSize = 0;
        if (pluginResources) {
          for (const resource of pluginResources.values()) {
            totalSize += resource.size || 0;
          }
        }
        
        leaks.push({
          pluginId,
          suspiciousResources,
          memoryGrowth: analysis.growthRate,
          resourceCount,
          totalSize
        });
      }
    }
    
    return leaks;
  }

  /**
   * 记录内存趋势数据点
   */
  private recordMemoryTrendPoint(pluginId: string, memoryUsage: number): void {
    if (!this.memoryTrends.has(pluginId)) {
      this.memoryTrends.set(pluginId, []);
    }
    
    const trend = this.memoryTrends.get(pluginId)!;
    trend.push({
      timestamp: Date.now(),
      memoryUsage
    });
    
    // 保持最近100个数据点
    if (trend.length > 100) {
      trend.shift();
    }
  }

  /**
   * 销毁内存管理器（别名）
   */
  destroy(): void {
    this.dispose();
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
