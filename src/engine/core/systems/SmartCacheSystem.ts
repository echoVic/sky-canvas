import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';

/**
 * 缓存策略类型
 */
export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  ADAPTIVE = 'adaptive'
}

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  key: string;
  value: T;
  size: number;
  accessCount: number;
  lastAccess: number;
  createdAt: number;
  priority: number;
  tags: string[];
}

/**
 * 缓存配置
 */
interface CacheConfig {
  maxSize: number;
  maxItems: number;
  strategy: CacheStrategy;
  ttl: number; // 生存时间（毫秒）
  enableCompression: boolean;
  enablePrefetch: boolean;
  prefetchThreshold: number;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  itemCount: number;
  evictions: number;
  compressionRatio: number;
  prefetchHits: number;
}

/**
 * 访问模式
 */
interface AccessPattern {
  key: string;
  frequency: number;
  lastAccess: number;
  predictedNextAccess: number;
  confidence: number;
}

/**
 * 压缩器接口
 */
interface Compressor {
  compress(data: unknown): Promise<ArrayBuffer>;
  decompress(data: ArrayBuffer): Promise<unknown>;
  getCompressionRatio(original: unknown, compressed: ArrayBuffer): number;
}

/**
 * 简单LZ压缩器实现
 */
class LZCompressor implements Compressor {
  async compress(data: unknown): Promise<ArrayBuffer> {
    const jsonStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonStr);
    
    // 简单的LZ压缩算法
    const compressed = this.lzCompress(bytes);
    return compressed.buffer;
  }
  
  async decompress(data: ArrayBuffer): Promise<unknown> {
    const compressed = new Uint8Array(data);
    const decompressed = this.lzDecompress(compressed);
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decompressed);
    return JSON.parse(jsonStr);
  }
  
  getCompressionRatio(original: unknown, compressed: ArrayBuffer): number {
    const originalSize = JSON.stringify(original).length;
    return compressed.byteLength / originalSize;
  }
  
  private lzCompress(data: Uint8Array): Uint8Array {
    // 简化的LZ压缩实现
    const result: number[] = [];
    const dict = new Map<string, number>();
    let dictSize = 256;
    
    // 初始化字典
    for (let i = 0; i < 256; i++) {
      dict.set(String.fromCharCode(i), i);
    }
    
    let w = '';
    for (let i = 0; i < data.length; i++) {
      const c = String.fromCharCode(data[i]);
      const wc = w + c;
      
      if (dict.has(wc)) {
        w = wc;
      } else {
        result.push(dict.get(w) || 0);
        dict.set(wc, dictSize++);
        w = c;
      }
    }
    
    if (w) {
      result.push(dict.get(w) || 0);
    }
    
    return new Uint8Array(result);
  }
  
  private lzDecompress(data: Uint8Array): Uint8Array {
    // 简化的LZ解压实现
    const dict: string[] = [];
    let dictSize = 256;
    
    // 初始化字典
    for (let i = 0; i < 256; i++) {
      dict[i] = String.fromCharCode(i);
    }
    
    let w = String.fromCharCode(data[0]);
    let result = w;
    
    for (let i = 1; i < data.length; i++) {
      const k = data[i];
      let entry: string;
      
      if (dict[k]) {
        entry = dict[k];
      } else if (k === dictSize) {
        entry = w + w.charAt(0);
      } else {
        throw new Error('Invalid compressed data');
      }
      
      result += entry;
      dict[dictSize++] = w + entry.charAt(0);
      w = entry;
    }
    
    const encoder = new TextEncoder();
    return encoder.encode(result);
  }
}

/**
 * 智能缓存系统
 */
@Extension({
  type: ExtensionType.CoreSystem,
  name: 'smart-cache-system',
  priority: 800
})
export class SmartCacheSystem extends BaseSystem {
  readonly name = 'smart-cache-system';
  readonly priority = 800;
  
  private caches = new Map<string, Map<string, CacheItem<unknown>>>();
  private configs = new Map<string, CacheConfig>();
  private stats = new Map<string, CacheStats>();
  private accessPatterns = new Map<string, AccessPattern>();
  private compressor: Compressor = new LZCompressor();
  
  // 预取队列
  private prefetchQueue = new Set<string>();
  private prefetchWorker: Worker | null = null;
  
  // 自适应策略
  private adaptiveWeights = {
    frequency: 0.4,
    recency: 0.3,
    size: 0.2,
    priority: 0.1
  };
  
  init(): void {
    this.initializePrefetchWorker();
    this.startAdaptiveOptimization();
  }
  
  /**
   * 创建缓存实例
   */
  createCache(name: string, config: Partial<CacheConfig> = {}): void {
    const defaultConfig: CacheConfig = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxItems: 1000,
      strategy: CacheStrategy.ADAPTIVE,
      ttl: 30 * 60 * 1000, // 30分钟
      enableCompression: true,
      enablePrefetch: true,
      prefetchThreshold: 0.7
    };
    
    this.configs.set(name, { ...defaultConfig, ...config });
    this.caches.set(name, new Map());
    this.stats.set(name, {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      compressionRatio: 1,
      prefetchHits: 0
    });
  }
  
  /**
   * 设置缓存项
   */
  async set<T>(
    cacheName: string,
    key: string,
    value: T,
    options: {
      priority?: number;
      tags?: string[];
      ttl?: number;
    } = {}
  ): Promise<void> {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    
    if (!cache || !config) {
      throw new Error(`Cache '${cacheName}' not found`);
    }
    
    const now = Date.now();
    let processedValue = value;
    let size = this.calculateSize(value);
    
    // 压缩处理
    if (config.enableCompression && size > 1024) {
      try {
        const compressed = await this.compressor.compress(value);
        const compressionRatio = this.compressor.getCompressionRatio(value, compressed);
        
        if (compressionRatio < 0.8) { // 压缩率超过20%才使用
          processedValue = compressed as T;
          size = compressed.byteLength;
          
          // 更新压缩统计
          const stats = this.stats.get(cacheName)!;
          stats.compressionRatio = (stats.compressionRatio + compressionRatio) / 2;
        }
      } catch (error) {
        console.warn('Compression failed:', error);
      }
    }
    
    const item: CacheItem<unknown> = {
      key,
      value: processedValue,
      size,
      accessCount: 1,
      lastAccess: now,
      createdAt: now,
      priority: options.priority || 1,
      tags: options.tags || []
    };
    
    // 检查容量并执行清理
    await this.ensureCapacity(cacheName, size);
    
    cache.set(key, item);
    this.updateStats(cacheName, 'set', size);
    
    // 更新访问模式
    this.updateAccessPattern(key, now);
  }
  
  /**
   * 获取缓存项
   */
  async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    const stats = this.stats.get(cacheName);
    
    if (!cache || !config || !stats) {
      return null;
    }
    
    const item = cache.get(key);
    const now = Date.now();
    
    if (!item) {
      stats.misses++;
      this.updateHitRate(cacheName);
      
      // 触发预取
      if (config.enablePrefetch) {
        this.triggerPrefetch(key);
      }
      
      return null;
    }
    
    // 检查TTL
    if (config.ttl > 0 && now - item.createdAt > config.ttl) {
      cache.delete(key);
      stats.misses++;
      this.updateHitRate(cacheName);
      return null;
    }
    
    // 更新访问信息
    item.accessCount++;
    item.lastAccess = now;
    
    stats.hits++;
    this.updateHitRate(cacheName);
    
    // 更新访问模式
    this.updateAccessPattern(key, now);
    
    // 解压缩处理
    let value = item.value;
    if (config.enableCompression && value instanceof ArrayBuffer) {
      try {
        value = await this.compressor.decompress(value);
      } catch (error) {
        console.warn('Decompression failed:', error);
        return null;
      }
    }
    
    return value as T;
  }
  
  /**
   * 删除缓存项
   */
  delete(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;
    
    const item = cache.get(key);
    if (item) {
      cache.delete(key);
      this.updateStats(cacheName, 'delete', -item.size);
      return true;
    }
    
    return false;
  }
  
  /**
   * 清空缓存
   */
  clear(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.clear();
      const stats = this.stats.get(cacheName)!;
      stats.totalSize = 0;
      stats.itemCount = 0;
    }
  }
  
  /**
   * 按标签删除
   */
  deleteByTag(cacheName: string, tag: string): number {
    const cache = this.caches.get(cacheName);
    if (!cache) return 0;
    
    let deletedCount = 0;
    for (const [key, item] of cache.entries()) {
      if (item.tags.includes(tag)) {
        cache.delete(key);
        this.updateStats(cacheName, 'delete', -item.size);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  /**
   * 确保缓存容量
   */
  private async ensureCapacity(cacheName: string, newItemSize: number): Promise<void> {
    const cache = this.caches.get(cacheName)!;
    const config = this.configs.get(cacheName)!;
    const stats = this.stats.get(cacheName)!;
    
    // 检查项目数量限制
    while (cache.size >= config.maxItems) {
      await this.evictItem(cacheName);
    }
    
    // 检查大小限制
    while (stats.totalSize + newItemSize > config.maxSize) {
      await this.evictItem(cacheName);
    }
  }
  
  /**
   * 驱逐缓存项
   */
  private async evictItem(cacheName: string): Promise<void> {
    const cache = this.caches.get(cacheName)!;
    const config = this.configs.get(cacheName)!;
    const stats = this.stats.get(cacheName)!;
    
    if (cache.size === 0) return;
    
    let victimKey: string;
    
    switch (config.strategy) {
      case CacheStrategy.LRU:
        victimKey = this.findLRUVictim(cache);
        break;
      case CacheStrategy.LFU:
        victimKey = this.findLFUVictim(cache);
        break;
      case CacheStrategy.FIFO:
        victimKey = this.findFIFOVictim(cache);
        break;
      case CacheStrategy.ADAPTIVE:
        victimKey = this.findAdaptiveVictim(cache);
        break;
      default:
        victimKey = cache.keys().next().value;
    }
    
    const item = cache.get(victimKey)!;
    cache.delete(victimKey);
    stats.evictions++;
    this.updateStats(cacheName, 'delete', -item.size);
  }
  
  /**
   * 查找LRU受害者
   */
  private findLRUVictim(cache: Map<string, CacheItem<unknown>>): string {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, item] of cache.entries()) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * 查找LFU受害者
   */
  private findLFUVictim(cache: Map<string, CacheItem<unknown>>): string {
    let leastKey = '';
    let leastCount = Infinity;
    
    for (const [key, item] of cache.entries()) {
      if (item.accessCount < leastCount) {
        leastCount = item.accessCount;
        leastKey = key;
      }
    }
    
    return leastKey;
  }
  
  /**
   * 查找FIFO受害者
   */
  private findFIFOVictim(cache: Map<string, CacheItem<unknown>>): string {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, item] of cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * 查找自适应受害者
   */
  private findAdaptiveVictim(cache: Map<string, CacheItem<unknown>>): string {
    let worstKey = '';
    let worstScore = Infinity;
    const now = Date.now();
    
    for (const [key, item] of cache.entries()) {
      const recencyScore = (now - item.lastAccess) / (1000 * 60); // 分钟
      const frequencyScore = 1 / (item.accessCount + 1);
      const sizeScore = item.size / (1024 * 1024); // MB
      const priorityScore = 1 / (item.priority + 1);
      
      const score = 
        this.adaptiveWeights.recency * recencyScore +
        this.adaptiveWeights.frequency * frequencyScore +
        this.adaptiveWeights.size * sizeScore +
        this.adaptiveWeights.priority * priorityScore;
      
      if (score < worstScore) {
        worstScore = score;
        worstKey = key;
      }
    }
    
    return worstKey;
  }
  
  /**
   * 更新访问模式
   */
  private updateAccessPattern(key: string, timestamp: number): void {
    const pattern = this.accessPatterns.get(key) || {
      key,
      frequency: 0,
      lastAccess: 0,
      predictedNextAccess: 0,
      confidence: 0
    };
    
    pattern.frequency++;
    
    if (pattern.lastAccess > 0) {
      const interval = timestamp - pattern.lastAccess;
      pattern.predictedNextAccess = timestamp + interval;
      pattern.confidence = Math.min(pattern.confidence + 0.1, 1.0);
    }
    
    pattern.lastAccess = timestamp;
    this.accessPatterns.set(key, pattern);
  }
  
  /**
   * 触发预取
   */
  private triggerPrefetch(key: string): void {
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.confidence < 0.5) return;
    
    const now = Date.now();
    if (pattern.predictedNextAccess - now < 5000) { // 5秒内预测访问
      this.prefetchQueue.add(key);
    }
  }
  
  /**
   * 初始化预取Worker
   */
  private initializePrefetchWorker(): void {
    if (typeof Worker !== 'undefined') {
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          if (type === 'prefetch') {
            // 模拟预取逻辑
            setTimeout(() => {
              self.postMessage({ type: 'prefetch-complete', key: data.key });
            }, 100);
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.prefetchWorker = new Worker(URL.createObjectURL(blob));
      
      this.prefetchWorker.onmessage = (e) => {
        const { type, key } = e.data;
        if (type === 'prefetch-complete') {
          this.prefetchQueue.delete(key);
        }
      };
    }
  }
  
  /**
   * 开始自适应优化
   */
  private startAdaptiveOptimization(): void {
    setInterval(() => {
      this.optimizeAdaptiveWeights();
    }, 60000); // 每分钟优化一次
  }
  
  /**
   * 优化自适应权重
   */
  private optimizeAdaptiveWeights(): void {
    // 基于缓存命中率调整权重
    for (const [, stats] of this.stats.entries()) {
      if (stats.hitRate < 0.7) {
        // 命中率低，增加频率权重
        this.adaptiveWeights.frequency = Math.min(this.adaptiveWeights.frequency + 0.05, 0.6);
        this.adaptiveWeights.recency = Math.max(this.adaptiveWeights.recency - 0.02, 0.1);
      } else if (stats.hitRate > 0.9) {
        // 命中率高，增加大小权重以节省内存
        this.adaptiveWeights.size = Math.min(this.adaptiveWeights.size + 0.05, 0.4);
        this.adaptiveWeights.frequency = Math.max(this.adaptiveWeights.frequency - 0.02, 0.2);
      }
    }
  }
  
  /**
   * 计算数据大小
   */
  private calculateSize(value: unknown): number {
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    
    try {
      return JSON.stringify(value).length * 2; // UTF-16编码
    } catch {
      return 1024; // 默认大小
    }
  }
  
  /**
   * 更新统计信息
   */
  private updateStats(cacheName: string, operation: 'set' | 'delete', sizeChange: number): void {
    const stats = this.stats.get(cacheName)!;
    const cache = this.caches.get(cacheName)!;
    
    if (operation === 'set') {
      stats.totalSize += sizeChange;
      stats.itemCount = cache.size;
    } else if (operation === 'delete') {
      stats.totalSize += sizeChange; // sizeChange为负数
      stats.itemCount = cache.size;
    }
  }
  
  /**
   * 更新命中率
   */
  private updateHitRate(cacheName: string): void {
    const stats = this.stats.get(cacheName)!;
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
  }
  
  /**
   * 获取缓存统计
   */
  getStats(cacheName: string): CacheStats | null {
    return this.stats.get(cacheName) || null;
  }
  
  /**
   * 获取所有缓存统计
   */
  getAllStats(): Map<string, CacheStats> {
    return new Map(this.stats);
  }
  
  /**
   * 获取缓存信息
   */
  getCacheInfo(cacheName: string): {
    config: CacheConfig;
    stats: CacheStats;
    itemCount: number;
  } | null {
    const config = this.configs.get(cacheName);
    const stats = this.stats.get(cacheName);
    const cache = this.caches.get(cacheName);
    
    if (!config || !stats || !cache) {
      return null;
    }
    
    return {
      config,
      stats,
      itemCount: cache.size
    };
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    if (this.prefetchWorker) {
      this.prefetchWorker.terminate();
      this.prefetchWorker = null;
    }
    
    this.caches.clear();
    this.configs.clear();
    this.stats.clear();
    this.accessPatterns.clear();
    this.prefetchQueue.clear();
  }
}