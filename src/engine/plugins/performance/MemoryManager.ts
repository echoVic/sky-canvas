/**
 * 插件系统内存管理器
 */

export interface MemoryUsage {
  pluginId: string;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

export interface ResourceInfo {
  type: 'texture' | 'buffer' | 'shader' | 'image' | 'audio' | 'data';
  size: number;
  pluginId: string;
  id: string;
  created: number;
  lastAccessed: number;
}

export class MemoryManager {
  private resources = new Map<string, ResourceInfo>();
  private memoryHistory: MemoryUsage[] = [];
  private cleanupCallbacks = new Map<string, Set<() => void>>();
  private gcInterval?: number;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB
  private maxHistorySize = 100;

  constructor() {
    this.startMemoryTracking();
    this.setupGarbageCollection();
  }

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
   * 获取插件内存使用情况
   */
  getPluginMemoryUsage(pluginId: string): {
    totalSize: number;
    resourceCount: number;
    resources: ResourceInfo[];
  } {
    const pluginResources = Array.from(this.resources.values())
      .filter(resource => resource.pluginId === pluginId);

    return {
      totalSize: pluginResources.reduce((sum, resource) => sum + resource.size, 0),
      resourceCount: pluginResources.length,
      resources: pluginResources
    };
  }

  /**
   * 获取系统总内存使用情况
   */
  getSystemMemoryUsage(): {
    totalSize: number;
    resourceCount: number;
    byPlugin: Map<string, number>;
    byType: Map<string, number>;
  } {
    const byPlugin = new Map<string, number>();
    const byType = new Map<string, number>();
    let totalSize = 0;

    for (const resource of this.resources.values()) {
      totalSize += resource.size;
      
      // 按插件统计
      const pluginTotal = byPlugin.get(resource.pluginId) || 0;
      byPlugin.set(resource.pluginId, pluginTotal + resource.size);
      
      // 按类型统计
      const typeTotal = byType.get(resource.type) || 0;
      byType.set(resource.type, typeTotal + resource.size);
    }

    return {
      totalSize,
      resourceCount: this.resources.size,
      byPlugin,
      byType
    };
  }

  /**
   * 检查内存泄漏
   */
  checkMemoryLeaks(): {
    suspiciousPlugins: string[];
    oldResources: ResourceInfo[];
    largeResources: ResourceInfo[];
    unusedResources: ResourceInfo[];
  } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;
    const largeThreshold = 10 * 1024 * 1024; // 10MB

    const pluginSizes = new Map<string, number>();
    const oldResources: ResourceInfo[] = [];
    const largeResources: ResourceInfo[] = [];
    const unusedResources: ResourceInfo[] = [];

    for (const resource of this.resources.values()) {
      // 统计插件大小
      const currentSize = pluginSizes.get(resource.pluginId) || 0;
      pluginSizes.set(resource.pluginId, currentSize + resource.size);

      // 检查老旧资源
      if (now - resource.created > oneHour) {
        oldResources.push(resource);
      }

      // 检查大型资源
      if (resource.size > largeThreshold) {
        largeResources.push(resource);
      }

      // 检查未使用资源
      if (now - resource.lastAccessed > thirtyMinutes) {
        unusedResources.push(resource);
      }
    }

    // 找出可疑插件（内存使用超过阈值）
    const suspiciousPlugins = Array.from(pluginSizes.entries())
      .filter(([, size]) => size > this.memoryThreshold)
      .map(([pluginId]) => pluginId);

    return {
      suspiciousPlugins,
      oldResources,
      largeResources,
      unusedResources
    };
  }

  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(): {
    releasedResources: number;
    freedMemory: number;
  } {
    const beforeSize = this.getSystemMemoryUsage().totalSize;
    const leaks = this.checkMemoryLeaks();
    
    let releasedCount = 0;

    // 清理未使用的资源
    for (const resource of leaks.unusedResources) {
      const resourceId = `${resource.pluginId}:${resource.id}`;
      if (this.releaseResource(resourceId)) {
        releasedCount++;
      }
    }

    // 触发浏览器垃圾回收（如果可用）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    const afterSize = this.getSystemMemoryUsage().totalSize;
    const freedMemory = beforeSize - afterSize;

    return {
      releasedResources: releasedCount,
      freedMemory
    };
  }

  /**
   * 设置内存阈值
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = threshold;
  }

  /**
   * 获取内存历史
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * 获取内存趋势分析
   */
  getMemoryTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    averageGrowth: number;
    peakUsage: number;
    currentUsage: number;
  } {
    if (this.memoryHistory.length < 2) {
      return {
        trend: 'stable',
        averageGrowth: 0,
        peakUsage: 0,
        currentUsage: 0
      };
    }

    const recent = this.memoryHistory.slice(-10); // 最近10次记录
    const growthRates: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      growthRates.push(growth);
    }

    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const peakUsage = Math.max(...this.memoryHistory.map(h => h.heapUsed));
    const currentUsage = this.memoryHistory[this.memoryHistory.length - 1]?.heapUsed || 0;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (averageGrowth > 1024 * 1024) { // 1MB增长
      trend = 'increasing';
    } else if (averageGrowth < -1024 * 1024) { // 1MB减少
      trend = 'decreasing';
    }

    return {
      trend,
      averageGrowth,
      peakUsage,
      currentUsage
    };
  }

  /**
   * 创建内存快照
   */
  createMemorySnapshot(): {
    timestamp: number;
    systemUsage: ReturnType<typeof this.getSystemMemoryUsage>;
    memoryLeaks: ReturnType<typeof this.checkMemoryLeaks>;
    trend: ReturnType<typeof this.getMemoryTrend>;
  } {
    return {
      timestamp: Date.now(),
      systemUsage: this.getSystemMemoryUsage(),
      memoryLeaks: this.checkMemoryLeaks(),
      trend: this.getMemoryTrend()
    };
  }

  /**
   * 销毁内存管理器
   */
  dispose(): void {
    // 停止内存跟踪
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    // 释放所有资源
    const pluginIds = new Set(Array.from(this.resources.values()).map(r => r.pluginId));
    for (const pluginId of pluginIds) {
      this.releasePluginResources(pluginId);
    }

    // 清理数据
    this.resources.clear();
    this.memoryHistory = [];
    this.cleanupCallbacks.clear();
  }

  /**
   * 开始内存跟踪
   */
  private startMemoryTracking(): void {
    const trackMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage: MemoryUsage = {
          pluginId: 'system',
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          external: memory.usedJSHeapSize, // 简化处理
          arrayBuffers: 0, // 浏览器通常不提供此信息
          timestamp: Date.now()
        };

        this.memoryHistory.push(usage);

        // 限制历史记录大小
        if (this.memoryHistory.length > this.maxHistorySize) {
          this.memoryHistory.shift();
        }

        // 检查内存使用是否超过阈值
        if (usage.heapUsed > this.memoryThreshold) {
          this.handleMemoryPressure();
        }
      }
    };

    // 立即执行一次
    trackMemory();

    // 每30秒跟踪一次
    this.gcInterval = window.setInterval(trackMemory, 30000);
  }

  /**
   * 设置垃圾回收
   */
  private setupGarbageCollection(): void {
    // 每5分钟检查一次是否需要清理
    setInterval(() => {
      const leaks = this.checkMemoryLeaks();
      
      // 如果有未使用的资源，自动清理
      if (leaks.unusedResources.length > 10) {
        this.forceGarbageCollection();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 处理内存压力
   */
  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, attempting cleanup...');
    
    const result = this.forceGarbageCollection();
    
    console.log(`Cleanup completed: ${result.releasedResources} resources released, ${result.freedMemory} bytes freed`);
  }

  /**
   * 执行清理回调
   */
  private executeCleanupCallbacks(pluginId: string, resourceId?: string): void {
    const callbacks = this.cleanupCallbacks.get(pluginId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback();
        } catch (error) {
          console.error(`Error in cleanup callback for plugin ${pluginId}:`, error);
        }
      }
    }
  }
}
