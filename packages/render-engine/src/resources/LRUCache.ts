/**
 * LRU 缓存策略实现
 * 支持内存监控、智能资源清理和自动垃圾收集
 */

import { EventEmitter } from 'events';

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  key: string;
  value: T;
  size: number; // 字节大小
  accessTime: number;
  createTime: number;
  accessCount: number;
  ttl?: number; // 生存时间（毫秒）
}

/**
 * 内存使用统计
 */
export interface MemoryStats {
  used: number; // 当前使用内存（字节）
  limit: number; // 内存限制（字节）
  utilization: number; // 使用率（0-1）
  itemCount: number; // 缓存项数量
  hitRate: number; // 命中率（0-1）
  evictedCount: number; // 被驱逐的项目数
}

/**
 * 缓存事件
 */
export interface CacheEvents<T> {
  'hit': (key: string, item: CacheItem<T>) => void;
  'miss': (key: string) => void;
  'set': (key: string, item: CacheItem<T>) => void;
  'evict': (key: string, item: CacheItem<T>, reason: 'lru' | 'memory' | 'ttl') => void;
  'clear': () => void;
  'memoryWarning': (stats: MemoryStats) => void;
  'gc': (freedMemory: number, itemsRemoved: number) => void;
}

/**
 * 双向链表节点
 */
class ListNode<T> {
  key: string;
  item: CacheItem<T>;
  prev: ListNode<T> | null = null;
  next: ListNode<T> | null = null;

  constructor(key: string, item: CacheItem<T>) {
    this.key = key;
    this.item = item;
  }
}

/**
 * LRU 缓存实现
 */
export class LRUCache<T> extends EventEmitter {
  private cache = new Map<string, ListNode<T>>();
  private head: ListNode<T>;
  private tail: ListNode<T>;
  private currentSize = 0; // 当前内存使用量（字节）
  
  // 配置参数
  private readonly maxMemory: number; // 最大内存使用（字节）
  private readonly maxItems: number; // 最大缓存项数
  private readonly memoryWarningThreshold: number; // 内存警告阈值（0-1）
  private readonly gcInterval: number; // 垃圾收集间隔（毫秒）
  private readonly defaultTTL: number; // 默认TTL（毫秒）
  
  // 统计数据
  private hitCount = 0;
  private missCount = 0;
  private evictedCount = 0;
  
  // 垃圾收集定时器
  private gcTimer: NodeJS.Timeout | null = null;
  private lastGcTime = Date.now();

  constructor(options: {
    maxMemory?: number; // 字节，默认100MB
    maxItems?: number; // 最大项目数，默认1000
    memoryWarningThreshold?: number; // 默认0.8 (80%)
    gcInterval?: number; // 垃圾收集间隔，默认30秒
    defaultTTL?: number; // 默认TTL，默认5分钟
  } = {}) {
    super();
    
    this.maxMemory = options.maxMemory ?? 100 * 1024 * 1024; // 100MB
    this.maxItems = options.maxItems ?? 1000;
    this.memoryWarningThreshold = options.memoryWarningThreshold ?? 0.8;
    this.gcInterval = options.gcInterval ?? 30 * 1000; // 30秒
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000; // 5分钟
    
    // 初始化双向链表哨兵节点
    this.head = new ListNode<T>('', {} as CacheItem<T>);
    this.tail = new ListNode<T>('', {} as CacheItem<T>);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    
    this.startGarbageCollection();
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const node = this.cache.get(key);
    
    if (!node) {
      this.missCount++;
      this.emit('miss', key);
      return null;
    }

    // 检查TTL
    const now = Date.now();
    if (node.item.ttl && (now - node.item.createTime) > node.item.ttl) {
      this.delete(key);
      this.missCount++;
      this.emit('miss', key);
      return null;
    }

    // 更新访问信息
    node.item.accessTime = now;
    node.item.accessCount++;
    
    // 移动到链表头部（最近使用）
    this.moveToHead(node);
    
    this.hitCount++;
    this.emit('hit', key, node.item);
    
    return node.item.value;
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, size?: number, ttl?: number): void {
    const itemSize = size ?? this.estimateSize(value);
    const now = Date.now();
    
    const item: CacheItem<T> = {
      key,
      value,
      size: itemSize,
      accessTime: now,
      createTime: now,
      accessCount: 1,
      ttl: ttl ?? this.defaultTTL
    };

    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // 更新现有项
      this.currentSize = this.currentSize - existingNode.item.size + itemSize;
      existingNode.item = item;
      this.moveToHead(existingNode);
    } else {
      // 添加新项
      const newNode = new ListNode(key, item);
      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.currentSize += itemSize;
      
      // 检查是否需要驱逐
      this.enforceConstraints();
    }

    this.emit('set', key, item);
    this.checkMemoryWarning();
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.cache.delete(key);
    this.removeFromList(node);
    this.currentSize -= node.item.size;

    return true;
  }

  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    // 检查TTL
    const now = Date.now();
    if (node.item.ttl && (now - node.item.createTime) > node.item.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 更新TTL
   */
  updateTTL(key: string, ttl: number): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    node.item.ttl = ttl;
    node.item.createTime = Date.now(); // 重置创建时间
    return true;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有值
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(node => node.item.value);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.currentSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictedCount = 0;
    this.emit('clear');
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取内存统计
   */
  getMemoryStats(): MemoryStats {
    const hitRate = this.hitCount + this.missCount > 0 
      ? this.hitCount / (this.hitCount + this.missCount) 
      : 0;

    return {
      used: this.currentSize,
      limit: this.maxMemory,
      utilization: this.currentSize / this.maxMemory,
      itemCount: this.cache.size,
      hitRate,
      evictedCount: this.evictedCount
    };
  }

  /**
   * 强制垃圾收集
   */
  forceGC(): { freedMemory: number; itemsRemoved: number } {
    const beforeSize = this.currentSize;
    const beforeCount = this.cache.size;
    
    const now = Date.now();
    const toRemove: string[] = [];

    // 找出过期项
    for (const [key, node] of this.cache) {
      if (node.item.ttl && (now - node.item.createTime) > node.item.ttl) {
        toRemove.push(key);
      }
    }

    // 移除过期项
    for (const key of toRemove) {
      const node = this.cache.get(key);
      if (node) {
        this.emit('evict', key, node.item, 'ttl');
        this.delete(key);
        this.evictedCount++;
      }
    }

    const freedMemory = beforeSize - this.currentSize;
    const itemsRemoved = beforeCount - this.cache.size;

    if (itemsRemoved > 0) {
      this.emit('gc', freedMemory, itemsRemoved);
    }

    this.lastGcTime = now;
    return { freedMemory, itemsRemoved };
  }

  /**
   * 优化缓存（清理最少使用的项）
   */
  optimize(targetUtilization: number = 0.7): void {
    const stats = this.getMemoryStats();
    if (stats.utilization <= targetUtilization) return;

    const targetSize = this.maxMemory * targetUtilization;
    const toFree = this.currentSize - targetSize;
    
    let freedSize = 0;
    const candidates: { key: string; node: ListNode<T>; score: number }[] = [];

    // 计算每项的移除优先级分数（越低越优先移除）
    for (const [key, node] of this.cache) {
      const ageScore = Date.now() - node.item.accessTime; // 越老分数越高
      const sizeScore = node.item.size; // 越大分数越高
      const accessScore = 1 / (node.item.accessCount + 1); // 访问越少分数越高
      
      candidates.push({
        key,
        node,
        score: ageScore * accessScore + sizeScore * 0.1
      });
    }

    // 按分数排序，优先移除分数高的
    candidates.sort((a, b) => b.score - a.score);

    for (const candidate of candidates) {
      if (freedSize >= toFree) break;

      this.emit('evict', candidate.key, candidate.node.item, 'memory');
      freedSize += candidate.node.item.size;
      this.delete(candidate.key);
      this.evictedCount++;
    }
  }

  /**
   * 销毁缓存
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    this.clear();
    this.removeAllListeners();
  }

  /**
   * 强制约束检查
   */
  private enforceConstraints(): void {
    // 检查项目数量限制
    while (this.cache.size > this.maxItems) {
      this.evictLRU('lru');
    }

    // 检查内存限制
    while (this.currentSize > this.maxMemory) {
      this.evictLRU('memory');
    }
  }

  /**
   * 驱逐最少使用项
   */
  private evictLRU(reason: 'lru' | 'memory' | 'ttl'): void {
    const lru = this.tail.prev;
    if (lru && lru !== this.head) {
      this.emit('evict', lru.key, lru.item, reason);
      this.delete(lru.key);
      this.evictedCount++;
    }
  }

  /**
   * 添加到链表头部
   */
  private addToHead(node: ListNode<T>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  /**
   * 从链表中移除节点
   */
  private removeFromList(node: ListNode<T>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  /**
   * 移动节点到链表头部
   */
  private moveToHead(node: ListNode<T>): void {
    this.removeFromList(node);
    this.addToHead(node);
  }

  /**
   * 估算对象大小（简单实现）
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // 简单估算，每字符2字节
    } catch {
      return 1024; // 默认1KB
    }
  }

  /**
   * 检查内存警告
   */
  private checkMemoryWarning(): void {
    const utilization = this.currentSize / this.maxMemory;
    if (utilization >= this.memoryWarningThreshold) {
      this.emit('memoryWarning', this.getMemoryStats());
    }
  }

  /**
   * 开始垃圾收集
   */
  private startGarbageCollection(): void {
    if (typeof setInterval !== 'undefined') {
      this.gcTimer = setInterval(() => {
        this.forceGC();
      }, this.gcInterval);
    }
  }
}

/**
 * 专用于GPU资源的LRU缓存
 */
export class GPUResourceCache<T extends { dispose(): void }> extends LRUCache<T> {
  constructor(options?: {
    maxMemory?: number;
    maxItems?: number;
    memoryWarningThreshold?: number;
    gcInterval?: number;
    defaultTTL?: number;
  }) {
    super({
      maxMemory: 64 * 1024 * 1024, // GPU资源默认64MB限制
      maxItems: 200,
      defaultTTL: 10 * 60 * 1000, // 10分钟
      ...options
    });

    // 监听驱逐事件，自动清理GPU资源
    this.on('evict', (key, item) => {
      if (item.value && typeof item.value.dispose === 'function') {
        try {
          item.value.dispose();
        } catch (error) {
          console.warn(`Error disposing GPU resource ${key}:`, error);
        }
      }
    });

    this.on('clear', () => {
      // 清空时确保所有GPU资源都被释放
      this.values().forEach(value => {
        if (value && typeof value.dispose === 'function') {
          try {
            value.dispose();
          } catch (error) {
            console.warn('Error disposing GPU resource during clear:', error);
          }
        }
      });
    });
  }
}

/**
 * 内存感知的智能缓存
 * 根据系统内存压力自动调整缓存行为
 */
export class MemoryAwareLRUCache<T> extends LRUCache<T> {
  private memoryObserver?: PerformanceObserver;
  private memoryPressure: 'low' | 'medium' | 'high' = 'low';

  constructor(options?: {
    maxMemory?: number;
    maxItems?: number;
    memoryWarningThreshold?: number;
    gcInterval?: number;
    defaultTTL?: number;
  }) {
    super(options);
    this.initMemoryObserver();
  }

  /**
   * 初始化内存监控
   */
  private initMemoryObserver(): void {
    // 检查浏览器是否支持内存监控
    if (typeof PerformanceObserver !== 'undefined' && 'memory' in performance) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.updateMemoryPressure();
          }
        });
        
        this.memoryObserver.observe({ entryTypes: ['memory'] });
      } catch (error) {
        console.warn('Memory observer initialization failed:', error);
      }
    }

    // 定期检查内存状态
    setInterval(() => {
      this.updateMemoryPressure();
    }, 5000);
  }

  /**
   * 更新内存压力状态
   */
  private updateMemoryPressure(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as any).memory;
    if (!memory) return;

    const used = memory.usedJSHeapSize;
    const limit = memory.jsHeapSizeLimit;
    const utilization = used / limit;

    const oldPressure = this.memoryPressure;
    
    if (utilization > 0.9) {
      this.memoryPressure = 'high';
    } else if (utilization > 0.7) {
      this.memoryPressure = 'medium';
    } else {
      this.memoryPressure = 'low';
    }

    // 内存压力变化时调整缓存行为
    if (oldPressure !== this.memoryPressure) {
      this.adaptToPressure();
    }
  }

  /**
   * 根据内存压力调整缓存行为
   */
  private adaptToPressure(): void {
    const stats = this.getMemoryStats();
    
    switch (this.memoryPressure) {
      case 'high':
        // 高压力：积极清理，降低到50%利用率
        this.optimize(0.5);
        break;
      case 'medium':
        // 中压力：适度清理，保持70%利用率
        this.optimize(0.7);
        break;
      case 'low':
        // 低压力：正常运行
        break;
    }
  }

  /**
   * 销毁时清理内存监控
   */
  dispose(): void {
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
    super.dispose();
  }
}

// 导出工厂函数
export function createLRUCache<T>(options?: {
  maxMemory?: number;
  maxItems?: number;
  memoryWarningThreshold?: number;
  gcInterval?: number;
  defaultTTL?: number;
}): LRUCache<T> {
  return new LRUCache<T>(options);
}

export function createGPUResourceCache<T extends { dispose(): void }>(options?: {
  maxMemory?: number;
  maxItems?: number;
  memoryWarningThreshold?: number;
  gcInterval?: number;
  defaultTTL?: number;
}): GPUResourceCache<T> {
  return new GPUResourceCache<T>(options);
}

export function createMemoryAwareLRUCache<T>(options?: {
  maxMemory?: number;
  maxItems?: number;
  memoryWarningThreshold?: number;
  gcInterval?: number;
  defaultTTL?: number;
}): MemoryAwareLRUCache<T> {
  return new MemoryAwareLRUCache<T>(options);
}