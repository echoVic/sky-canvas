/**
 * 性能优化系统
 * 实现缓存、剔除、对象池等优化技术
 */

import { BaseSystem } from './SystemManager';
import { ExtensionType, Extension } from './ExtensionSystem';
import { Rect } from '../../../types';

/**
 * 性能配置
 */
interface PerformanceConfig {
  enableCulling: boolean;
  enableCaching: boolean;
  enableObjectPooling: boolean;
  cullMargin: number;
  cacheThreshold: number;
  maxPoolSize: number;
}

/**
 * 可缓存对象接口
 */
export interface ICacheable {
  readonly cacheKey: string;
  readonly isDirty: boolean;
  readonly cacheAsBitmap: boolean;
  
  markDirty(): void;
  clearCache(): void;
  getCachedTexture(): WebGLTexture | null;
  setCachedTexture(texture: WebGLTexture): void;
}

/**
 * 可剔除对象接口
 */
export interface ICullable {
  readonly bounds: Rect;
  readonly visible: boolean;
  
  isInViewport(viewport: Rect, margin?: number): boolean;
}

/**
 * 对象池接口
 */
export interface IPoolable {
  readonly poolKey: string;
  
  reset(): void;
  isInUse(): boolean;
}

/**
 * 性能统计
 */
interface PerformanceStats {
  culledObjects: number;
  cachedObjects: number;
  poolHits: number;
  poolMisses: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
}

/**
 * 对象池
 */
class ObjectPool<T extends IPoolable> {
  private pool: T[] = [];
  private active = new Set<T>();
  private factory: () => T;
  private maxSize: number;
  
  constructor(factory: () => T, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
  }
  
  get(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.factory();
    }
    
    obj.reset();
    this.active.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
  }
  
  clear(): void {
    this.pool = [];
    this.active.clear();
  }
  
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      maxSize: this.maxSize
    };
  }
}

/**
 * 缓存管理器
 */
class CacheManager {
  private cache = new Map<string, WebGLTexture>();
  private dirtyObjects = new Set<string>();
  private maxCacheSize: number;
  
  constructor(maxCacheSize: number = 50) {
    this.maxCacheSize = maxCacheSize;
  }
  
  get(key: string): WebGLTexture | null {
    return this.cache.get(key) || null;
  }
  
  set(key: string, texture: WebGLTexture): void {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, texture);
    this.dirtyObjects.delete(key);
  }
  
  markDirty(key: string): void {
    this.dirtyObjects.add(key);
  }
  
  isDirty(key: string): boolean {
    return this.dirtyObjects.has(key);
  }
  
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.dirtyObjects.delete(key);
    } else {
      this.cache.clear();
      this.dirtyObjects.clear();
    }
  }
  
  private evictLRU(): void {
    // 简单的FIFO策略，实际应该实现LRU
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
  
  getStats() {
    return {
      cacheSize: this.cache.size,
      dirtyCount: this.dirtyObjects.size,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * 视锥剔除器
 */
class FrustumCuller {
  private viewport: Rect = { x: 0, y: 0, width: 800, height: 600 };
  private margin: number = 50;
  
  setViewport(viewport: Rect): void {
    this.viewport = { ...viewport };
  }
  
  setMargin(margin: number): void {
    this.margin = margin;
  }
  
  cull(objects: ICullable[]): ICullable[] {
    const expandedViewport = {
      x: this.viewport.x - this.margin,
      y: this.viewport.y - this.margin,
      width: this.viewport.width + this.margin * 2,
      height: this.viewport.height + this.margin * 2
    };
    
    return objects.filter(obj => 
      obj.visible && obj.isInViewport(expandedViewport, this.margin)
    );
  }
}

/**
 * 性能优化系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'performance-system',
  priority: 800
})
export class PerformanceSystem extends BaseSystem {
  readonly name = 'performance-system';
  readonly priority = 800;
  
  private config: PerformanceConfig = {
    enableCulling: true,
    enableCaching: true,
    enableObjectPooling: true,
    cullMargin: 50,
    cacheThreshold: 100,
    maxPoolSize: 100
  };
  
  private cacheManager: CacheManager;
  private frustumCuller: FrustumCuller;
  private objectPools = new Map<string, ObjectPool<IPoolable>>();
  
  private stats: PerformanceStats = {
    culledObjects: 0,
    cachedObjects: 0,
    poolHits: 0,
    poolMisses: 0,
    frameTime: 0,
    renderTime: 0,
    updateTime: 0
  };
  
  private frameStartTime = 0;
  
  constructor() {
    super();
    
    this.cacheManager = new CacheManager(this.config.cacheThreshold);
    this.frustumCuller = new FrustumCuller();
  }
  
  /**
   * 初始化
   */
  init(): void {
    this.frustumCuller.setMargin(this.config.cullMargin);
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.frustumCuller.setMargin(this.config.cullMargin);
  }
  
  /**
   * 开始帧
   */
  beginFrame(): void {
    this.frameStartTime = performance.now();
    this.resetFrameStats();
  }
  
  /**
   * 结束帧
   */
  endFrame(): void {
    this.stats.frameTime = performance.now() - this.frameStartTime;
  }
  
  /**
   * 视锥剔除
   */
  cullObjects<T extends ICullable>(objects: T[], viewport: Rect): T[] {
    if (!this.config.enableCulling) {
      return objects;
    }
    
    this.frustumCuller.setViewport(viewport);
    const culled = this.frustumCuller.cull(objects) as T[];
    
    this.stats.culledObjects = objects.length - culled.length;
    return culled;
  }
  
  /**
   * 获取缓存纹理
   */
  getCachedTexture(cacheable: ICacheable): WebGLTexture | null {
    if (!this.config.enableCaching || !cacheable.cacheAsBitmap) {
      return null;
    }
    
    if (cacheable.isDirty) {
      this.cacheManager.markDirty(cacheable.cacheKey);
      return null;
    }
    
    const cached = this.cacheManager.get(cacheable.cacheKey);
    if (cached) {
      this.stats.cachedObjects++;
    }
    
    return cached;
  }
  
  /**
   * 设置缓存纹理
   */
  setCachedTexture(cacheable: ICacheable, texture: WebGLTexture): void {
    if (!this.config.enableCaching || !cacheable.cacheAsBitmap) {
      return;
    }
    
    this.cacheManager.set(cacheable.cacheKey, texture);
  }
  
  /**
   * 清除缓存
   */
  clearCache(key?: string): void {
    this.cacheManager.clear(key);
  }
  
  /**
   * 创建对象池
   */
  createObjectPool<T extends IPoolable>(key: string, factory: () => T): ObjectPool<T> {
    const pool = new ObjectPool(factory, this.config.maxPoolSize);
    this.objectPools.set(key, pool as ObjectPool<IPoolable>);
    return pool;
  }
  
  /**
   * 从对象池获取对象
   */
  getPooledObject<T extends IPoolable>(key: string): T | null {
    if (!this.config.enableObjectPooling) {
      return null;
    }
    
    const pool = this.objectPools.get(key) as ObjectPool<T>;
    if (pool) {
      this.stats.poolHits++;
      return pool.get();
    }
    
    this.stats.poolMisses++;
    return null;
  }
  
  /**
   * 释放对象到池
   */
  releasePooledObject<T extends IPoolable>(obj: T): void {
    if (!this.config.enableObjectPooling) {
      return;
    }
    
    const pool = this.objectPools.get(obj.poolKey) as ObjectPool<T>;
    if (pool) {
      pool.release(obj);
    }
  }
  
  /**
   * 批量处理对象
   */
  batchProcess<T>(objects: T[], batchSize: number, processor: (batch: T[]) => void): void {
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      processor(batch);
    }
  }
  
  /**
   * 测量执行时间
   */
  measureTime<T>(operation: () => T, statKey: keyof PerformanceStats): T {
    const start = performance.now();
    const result = operation();
    const time = performance.now() - start;
    
    if (typeof this.stats[statKey] === 'number') {
      (this.stats[statKey] as number) += time;
    }
    
    return result;
  }
  
  /**
   * 获取性能统计
   */
  getStats(): PerformanceStats & {
    cache: ReturnType<CacheManager['getStats']>;
    pools: Record<string, ReturnType<ObjectPool<IPoolable>['getStats']>>;
  } {
    const poolStats: Record<string, ReturnType<ObjectPool<IPoolable>['getStats']>> = {};
    
    for (const [key, pool] of this.objectPools) {
      poolStats[key] = pool.getStats();
    }
    
    return {
      ...this.stats,
      cache: this.cacheManager.getStats(),
      pools: poolStats
    };
  }
  
  /**
   * 重置帧统计
   */
  private resetFrameStats(): void {
    this.stats.culledObjects = 0;
    this.stats.cachedObjects = 0;
    this.stats.poolHits = 0;
    this.stats.poolMisses = 0;
    this.stats.renderTime = 0;
    this.stats.updateTime = 0;
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    this.cacheManager.clear();
    
    for (const pool of this.objectPools.values()) {
      pool.clear();
    }
    this.objectPools.clear();
  }
}