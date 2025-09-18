/**
 * 统一纹理管理器
 * 整合纹理加载、图集管理和缓存功能
 */

import EventEmitter3 from 'eventemitter3';
import { TextureAtlas, AtlasEntry, TextureInfo, AtlasConfig } from './TextureAtlas';
import { TextureLoader, LoadOptions, TextureLoadState } from './TextureLoader';

// 纹理配置
export interface TextureConfig {
  atlas?: Partial<AtlasConfig>;
  loader?: {
    maxConcurrentLoads?: number;
    defaultTimeout?: number;
    maxRetries?: number;
  };
  cache?: {
    maxSize?: number;
    ttl?: number; // Time to live in milliseconds
  };
}

// 缓存项
interface CacheEntry {
  data: AtlasEntry | HTMLImageElement;
  lastAccessed: number;
  accessCount: number;
  size: number; // 估算的内存大小
}

// 管理器事件
export interface ManagerEvents {
  textureLoaded: { url: string; entry: AtlasEntry | HTMLImageElement };
  textureUnloaded: { url: string };
  atlasOptimized: { atlasId: string; utilization: number };
  cacheCleared: { freedMemory: number };
  memoryWarning: { usage: number; limit: number };
}

// 纹理管理器事件接口
export interface TextureManagerEvents {
  // 标准事件
  update: TextureManager;
  destroy: TextureManager;

  // 纹理管理事件
  atlasOptimized: { atlasId: string; utilization: number };
  textureLoaded: { id: string; url: string };
  textureEvicted: { id: string; reason: string };
  textureUnloaded: { id: string };
  memoryPressure: { usage: number; limit: number };
  memoryWarning: { usage: number; threshold: number };
  cacheCleared: void;
}

/**
 * 纹理管理器
 */
export class TextureManager extends EventEmitter3<TextureManagerEvents> {
  private atlas: TextureAtlas;
  private loader: TextureLoader;
  private cache = new Map<string, CacheEntry>();
  
  private config: Required<TextureConfig>;
  private cacheSize = 0;
  private lastCleanupTime = 0;
  
  private readonly CLEANUP_INTERVAL = 60000; // 1分钟

  constructor(config?: TextureConfig) {
    super();
    
    this.config = {
      atlas: {
        maxWidth: 2048,
        maxHeight: 2048,
        padding: 2,
        powerOfTwo: true,
        allowRotation: false,
        algorithm: 'maxrects',
        ...config?.atlas
      },
      loader: {
        maxConcurrentLoads: 6,
        defaultTimeout: 10000,
        maxRetries: 3,
        ...config?.loader
      },
      cache: {
        maxSize: 128 * 1024 * 1024, // 128MB
        ttl: 5 * 60 * 1000, // 5分钟
        ...config?.cache
      }
    };

    this.atlas = new TextureAtlas(this.config.atlas);
    this.loader = new TextureLoader(this.atlas);
    
    this.setupEventListeners();
    this.startCleanupTimer();
  }

  /**
   * 加载纹理
   */
  async loadTexture(url: string, options?: LoadOptions): Promise<AtlasEntry | HTMLImageElement> {
    // 检查缓存
    const cached = this.cache.get(url);
    if (cached) {
      cached.lastAccessed = Date.now();
      cached.accessCount++;
      return cached.data;
    }

    // 加载纹理
    const data = await this.loader.loadTexture(url, options);
    
    // 添加到缓存
    this.addToCache(url, data);
    
    this.emit('textureLoaded', { url, entry: data });
    
    return data;
  }

  /**
   * 批量加载纹理
   */
  async loadTextures(urls: string[], options?: LoadOptions): Promise<Map<string, AtlasEntry | HTMLImageElement>> {
    const results = new Map<string, AtlasEntry | HTMLImageElement>();
    
    // 分批加载以避免内存峰值
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(url => this.loadTexture(url, options))
      );
      
      batch.forEach((url, index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results.set(url, result.value);
        }
      });
    }
    
    return results;
  }

  /**
   * 预加载纹理
   */
  preloadTextures(urls: string[], options?: LoadOptions): void {
    for (const url of urls) {
      this.loader.preloadTexture(url, options);
    }
  }

  /**
   * 获取纹理
   */
  getTexture(url: string): AtlasEntry | HTMLImageElement | null {
    const cached = this.cache.get(url);
    if (cached) {
      cached.lastAccessed = Date.now();
      cached.accessCount++;
      return cached.data;
    }
    
    return null;
  }

  /**
   * 卸载纹理
   */
  unloadTexture(url: string): boolean {
    const cached = this.cache.get(url);
    if (!cached) return false;
    
    // 从缓存中移除
    this.cacheSize -= cached.size;
    this.cache.delete(url);
    
    // 如果是图集纹理，从图集中移除
    if (cached.data && typeof cached.data === 'object' && 'atlasId' in cached.data) {
      const atlasEntry = cached.data as AtlasEntry;
      this.atlas.removeTexture(atlasEntry.textureId);
    }
    
    this.emit('textureUnloaded', { url });
    
    return true;
  }

  /**
   * 批量卸载纹理
   */
  unloadTextures(urls: string[]): number {
    let unloadedCount = 0;
    for (const url of urls) {
      if (this.unloadTexture(url)) {
        unloadedCount++;
      }
    }
    return unloadedCount;
  }

  /**
   * 清理未使用的纹理
   */
  cleanup(force = false): number {
    const now = Date.now();
    let freedMemory = 0;
    const toRemove: string[] = [];
    
    for (const [url, entry] of this.cache) {
      const isExpired = now - entry.lastAccessed > (this.config.cache?.ttl || 300000);
      const isLowPriority = entry.accessCount < 2;
      
      if (force || (isExpired && isLowPriority)) {
        toRemove.push(url);
        freedMemory += entry.size;
      }
    }
    
    for (const url of toRemove) {
      this.unloadTexture(url);
    }
    
    // 优化图集
    this.atlas.optimizeAll();
    
    if (freedMemory > 0) {
      this.emit('cacheCleared', { freedMemory });
    }
    
    this.lastCleanupTime = now;
    
    return freedMemory;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const atlasStats = this.atlas.getStats();
    const loaderProgress = this.loader.getProgress();
    
    return {
      cache: {
        entries: this.cache.size,
        totalSize: this.cacheSize,
        maxSize: this.config.cache?.maxSize || 100 * 1024 * 1024,
        utilization: this.cacheSize / (this.config.cache?.maxSize || 100 * 1024 * 1024)
      },
      atlas: atlasStats,
      loader: loaderProgress
    };
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): { cache: number; atlas: number; total: number } {
    const atlasStats = this.atlas.getStats();
    
    return {
      cache: this.cacheSize,
      atlas: atlasStats.totalMemoryUsage,
      total: this.cacheSize + atlasStats.totalMemoryUsage
    };
  }

  /**
   * 设置内存限制
   */
  setMemoryLimit(limit: number): void {
    this.config.cache.maxSize = limit;
    
    // 如果当前使用量超过限制，强制清理
    if (this.cacheSize > limit) {
      this.cleanup(true);
    }
  }

  /**
   * 优化纹理图集
   */
  optimizeAtlases(): void {
    this.atlas.optimizeAll();
  }

  /**
   * 添加到缓存
   */
  private addToCache(url: string, data: AtlasEntry | HTMLImageElement): void {
    // 估算内存大小
    let size = 0;
    if (data instanceof HTMLImageElement) {
      size = data.width * data.height * 4; // RGBA
    } else if ('width' in data && 'height' in data) {
      size = data.width * data.height * 4;
    }
    
    // 检查是否需要清理缓存
    const maxSize = this.config.cache?.maxSize || 100 * 1024 * 1024;
    if (this.cacheSize + size > maxSize) {
      this.cleanup();
      
      // 如果还是超出限制，清理最少使用的纹理
      if (this.cacheSize + size > maxSize) {
        this.cleanupLRU(size);
      }
    }
    
    const entry: CacheEntry = {
      data,
      lastAccessed: Date.now(),
      accessCount: 1,
      size
    };
    
    this.cache.set(url, entry);
    this.cacheSize += size;
  }

  /**
   * LRU清理
   */
  private cleanupLRU(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        // 按最后访问时间和访问次数排序
        const aScore = a.lastAccessed + a.accessCount * 10000;
        const bScore = b.lastAccessed + b.accessCount * 10000;
        return aScore - bScore;
      });
    
    let freedSpace = 0;
    for (const [url, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.unloadTexture(url);
      freedSpace += entry.size;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.atlas.on('atlasOptimized', (event) => {
      this.emit('atlasOptimized', { 
        atlasId: event.atlasId, 
        utilization: event.afterUtilization 
      });
    });
    
    this.atlas.on('memoryPressure', (event) => {
      this.emit('memoryWarning', { 
        usage: event.totalMemory, 
        limit: event.threshold 
      });
      
      // 自动清理
      this.cleanup();
    });
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
        this.cleanup();
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    // 1. 先发送 destroy 事件
    this.emit('destroy', this);

    // 2. 清理资源
    this.loader.dispose();
    this.atlas.dispose();
    this.cache.clear();
    this.cacheSize = 0;

    // 3. 最后移除所有监听器
    this.removeAllListeners();
  }
}

// 全局纹理管理器实例
export const globalTextureManager = new TextureManager();