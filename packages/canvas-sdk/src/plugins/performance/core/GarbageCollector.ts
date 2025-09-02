/**
 * 垃圾回收器 - 负责自动内存清理和垃圾回收
 */

import { ResourceInfo, GarbageCollectionResult, MemoryUsage } from '../types/MemoryTypes';
import { MemoryAnalyzer } from './MemoryAnalyzer';

export class GarbageCollector {
  private gcInterval?: number;
  private memoryHistory: MemoryUsage[] = [];
  private maxHistorySize = 100;
  private analyzer: MemoryAnalyzer;

  constructor(analyzer: MemoryAnalyzer) {
    this.analyzer = analyzer;
  }

  /**
   * 启动自动垃圾回收
   */
  startAutoCollection(intervalMs: number = 30000): void {
    this.stopAutoCollection();
    
    this.gcInterval = window.setInterval(() => {
      this.performAutoCollection();
    }, intervalMs);
  }

  /**
   * 停止自动垃圾回收
   */
  stopAutoCollection(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }
  }

  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(
    resources: Map<string, ResourceInfo>,
    releaseResourceFn: (resourceId: string) => boolean
  ): GarbageCollectionResult {
    const beforeSize = this.analyzer.getSystemMemoryUsage(resources).totalSize;
    const leaks = this.analyzer.checkMemoryLeaks(resources);
    
    let releasedCount = 0;

    // 清理未使用的资源
    for (const resource of leaks.unusedResources) {
      const resourceId = `${resource.pluginId}:${resource.id}`;
      if (releaseResourceFn(resourceId)) {
        releasedCount++;
      }
    }

    // 触发浏览器垃圾回收（如果可用）
    this.triggerBrowserGC();

    const afterSize = this.analyzer.getSystemMemoryUsage(resources).totalSize;
    const freedMemory = beforeSize - afterSize;

    return {
      releasedResources: releasedCount,
      freedMemory
    };
  }

  /**
   * 执行自动回收
   */
  private performAutoCollection(): void {
    // 记录内存使用情况
    this.recordMemoryUsage();
    
    // 检查是否需要执行垃圾回收
    if (this.shouldPerformGC()) {
      console.log('执行自动垃圾回收...');
      // 这里需要外部提供资源访问接口
      // 实际实现中会通过回调或事件通知主管理器
    }
  }

  /**
   * 记录内存使用情况
   */
  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage: MemoryUsage = {
        pluginId: 'system',
        heapUsed: memory.usedJSHeapSize || 0,
        heapTotal: memory.totalJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now()
      };

      this.memoryHistory.push(usage);
      
      // 限制历史记录大小
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }
    }
  }

  /**
   * 判断是否应该执行垃圾回收
   */
  private shouldPerformGC(): boolean {
    if (this.memoryHistory.length < 2) {
      return false;
    }

    const latest = this.memoryHistory[this.memoryHistory.length - 1];
    const threshold = this.analyzer.getMemoryThreshold();
    
    // 如果内存使用超过阈值，执行GC
    return latest.heapUsed > threshold;
  }

  /**
   * 触发浏览器垃圾回收
   */
  private triggerBrowserGC(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (error) {
        console.warn('无法触发浏览器垃圾回收:', error);
      }
    }
  }

  /**
   * 获取内存历史记录
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * 清空内存历史记录
   */
  clearMemoryHistory(): void {
    this.memoryHistory = [];
  }

  /**
   * 设置历史记录最大大小
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // 如果当前历史记录超过新的限制，进行裁剪
    if (this.memoryHistory.length > size) {
      this.memoryHistory = this.memoryHistory.slice(-size);
    }
  }

  /**
   * 销毁垃圾回收器
   */
  destroy(): void {
    this.stopAutoCollection();
    this.clearMemoryHistory();
  }
}
