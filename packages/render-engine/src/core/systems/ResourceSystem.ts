/**
 * 资源管理系统
 * 实现统一的资源生命周期管理、缓存和优化
 */

import { createLogger } from '../../utils/Logger';
import { BaseSystem } from './SystemManager';
import { ExtensionType, Extension } from './ExtensionSystem';

const logger = createLogger('ResourceSystem');

/**
 * 资源类型
 */
export enum ResourceType {
  Texture = 'texture',
  Buffer = 'buffer',
  Shader = 'shader',
  Audio = 'audio',
  Font = 'font',
  Model = 'model'
}

/**
 * 资源状态
 */
export enum ResourceState {
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
  Disposed = 'disposed'
}

/**
 * 资源接口
 */
export interface IResource {
  readonly id: string;
  readonly type: ResourceType;
  readonly url?: string;
  readonly size: number;
  readonly state: ResourceState;
  readonly lastAccessed: number;
  readonly refCount: number;
  
  load(): Promise<void>;
  dispose(): void;
  addRef(): void;
  removeRef(): void;
  getData<T>(): T | null;
}

/**
 * 基础资源实现
 */
export abstract class BaseResource implements IResource {
  public state: ResourceState = ResourceState.Loading;
  public lastAccessed: number = Date.now();
  public refCount: number = 0;
  
  constructor(
    public readonly id: string,
    public readonly type: ResourceType,
    public readonly url?: string
  ) {}
  
  abstract get size(): number;
  abstract load(): Promise<void>;
  abstract dispose(): void;
  abstract getData<T>(): T | null;
  
  addRef(): void {
    this.refCount++;
    this.lastAccessed = Date.now();
  }
  
  removeRef(): void {
    this.refCount = Math.max(0, this.refCount - 1);
  }
}

/**
 * 纹理资源
 */
export class TextureResource extends BaseResource {
  private texture: WebGLTexture | null = null;
  private image: HTMLImageElement | null = null;
  
  constructor(id: string, url?: string) {
    super(id, ResourceType.Texture, url);
  }
  
  get size(): number {
    if (!this.image) return 0;
    return this.image.width * this.image.height * 4; // RGBA
  }
  
  async load(): Promise<void> {
    if (!this.url) {
      throw new Error('Texture URL not provided');
    }
    
    try {
      this.state = ResourceState.Loading;
      
      this.image = new Image();
      this.image.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        this.image!.onload = () => resolve();
        this.image!.onerror = () => reject(new Error(`Failed to load texture: ${this.url}`));
        this.image!.src = this.url!;
      });
      
      this.state = ResourceState.Loaded;
    } catch (error) {
      this.state = ResourceState.Error;
      throw error;
    }
  }
  
  createWebGLTexture(gl: WebGLRenderingContext): WebGLTexture | null {
    if (!this.image || this.state !== ResourceState.Loaded) {
      return null;
    }
    
    if (!this.texture) {
      this.texture = gl.createTexture();
      if (this.texture) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    }
    
    return this.texture;
  }
  
  dispose(): void {
    this.image = null;
    this.texture = null;
    this.state = ResourceState.Disposed;
  }
  
  getData<T>(): T | null {
    return this.image as T;
  }
}

/**
 * 资源池
 */
class ResourcePool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;
  
  constructor(createFn: () => T, resetFn: (item: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }
  
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  release(item: T): void {
    this.resetFn(item);
    this.pool.push(item);
  }
  
  clear(): void {
    this.pool = [];
  }
}

/**
 * 资源管理系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'resource-system',
  priority: 1100
})
export class ResourceSystem extends BaseSystem {
  readonly name = 'resource-system';
  readonly priority = 1100;
  
  private resources = new Map<string, IResource>();
  private loadingPromises = new Map<string, Promise<IResource>>();
  private pools = new Map<string, ResourcePool<unknown>>();
  
  // 缓存配置
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB
  private readonly maxUnusedTime = 5 * 60 * 1000; // 5分钟
  private currentCacheSize = 0;
  
  // GPU内存管理
  private gpuMemoryBudget = 256 * 1024 * 1024; // 256MB GPU内存预算
  private currentGpuMemoryUsage = 0;
  private gpuResourceQueue: string[] = []; // LRU队列
  
  // 异步加载管理
  private loadingQueue: Array<{ id: string; priority: number; factory: () => IResource }> = [];
  private maxConcurrentLoads = 4;
  private currentLoadingCount = 0;
  
  // 缓冲区复用池
  private bufferPools = new Map<string, WebGLBuffer[]>();
  private maxBufferPoolSize = 20;
  
  // 垃圾回收
  private gcInterval: number | null = null;
  private readonly gcIntervalTime = 30 * 1000; // 30秒
  
  /**
   * 初始化
   */
  init(): void {
    this.startGarbageCollection();
  }
  
  /**
   * 加载资源（支持优先级和异步队列）
   */
  async loadResource<T extends IResource>(id: string, factory: () => T, priority: number = 0): Promise<T> {
    // 检查是否已存在
    const existing = this.resources.get(id) as T;
    if (existing) {
      existing.addRef();
      this.updateGpuResourceAccess(id);
      return existing;
    }
    
    // 检查是否正在加载
    const loadingPromise = this.loadingPromises.get(id);
    if (loadingPromise) {
      return loadingPromise as Promise<T>;
    }
    
    // 检查并发加载限制
    if (this.currentLoadingCount >= this.maxConcurrentLoads) {
      return new Promise((resolve, reject) => {
        this.loadingQueue.push({
          id,
          priority,
          factory: factory as () => IResource
        });
        this.loadingQueue.sort((a, b) => b.priority - a.priority);
        
        // 等待队列处理
        const checkQueue = () => {
          if (this.currentLoadingCount < this.maxConcurrentLoads) {
            const queueIndex = this.loadingQueue.findIndex(item => item.id === id);
            if (queueIndex !== -1) {
              this.loadingQueue.splice(queueIndex, 1);
              this.doLoadResource(id, factory).then(resolve).catch(reject);
            }
          } else {
            setTimeout(checkQueue, 100);
          }
        };
        checkQueue();
      });
    }
    
    // 开始加载
    const promise = this.doLoadResource(id, factory);
    this.loadingPromises.set(id, promise);
    
    try {
      const resource = await promise;
      this.loadingPromises.delete(id);
      return resource as T;
    } catch (error) {
      this.loadingPromises.delete(id);
      throw error;
    }
  }
  
  /**
   * 执行资源加载
   */
  private async doLoadResource<T extends IResource>(id: string, factory: () => T): Promise<T> {
    this.currentLoadingCount++;
    
    const resource = factory();
    
    try {
      // 检查GPU内存预算
      if (resource.type === ResourceType.Texture || resource.type === ResourceType.Buffer) {
        await this.ensureGpuMemoryBudget(resource.size);
      }
      
      await resource.load();
      resource.addRef();
      
      this.resources.set(id, resource);
      this.currentCacheSize += resource.size;
      
      // 更新GPU内存使用
      if (resource.type === ResourceType.Texture || resource.type === ResourceType.Buffer) {
        this.currentGpuMemoryUsage += resource.size;
        this.gpuResourceQueue.push(id);
      }
      
      // 检查缓存大小
      this.checkCacheSize();
      
      return resource;
    } catch (error) {
      resource.dispose();
      throw error;
    } finally {
      this.currentLoadingCount--;
      this.processLoadingQueue();
    }
  }
  
  /**
   * 获取资源
   */
  getResource<T extends IResource>(id: string): T | null {
    const resource = this.resources.get(id) as T;
    if (resource) {
      resource.addRef();
    }
    return resource || null;
  }
  
  /**
   * 释放资源引用
   */
  releaseResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.removeRef();
    }
  }
  
  /**
   * 强制释放资源
   */
  disposeResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      this.currentCacheSize -= resource.size;
      resource.dispose();
      this.resources.delete(id);
    }
  }
  
  /**
   * 创建资源池
   */
  createPool<T>(name: string, createFn: () => T, resetFn: (item: T) => void): ResourcePool<T> {
    const pool = new ResourcePool(createFn, resetFn);
    this.pools.set(name, pool as ResourcePool<unknown>);
    return pool;
  }
  
  /**
   * 获取资源池
   */
  getPool<T>(name: string): ResourcePool<T> | null {
    return (this.pools.get(name) as ResourcePool<T>) || null;
  }
  
  /**
   * 预加载资源
   */
  async preloadResources(resources: Array<{ id: string; factory: () => IResource }>): Promise<void> {
    const promises = resources.map(({ id, factory }) => 
      this.loadResource(id, factory).catch(error => {
        logger.warn(`Failed to preload resource ${id}:`, error);
        return null;
      })
    );
    
    await Promise.all(promises);
  }
  
  /**
   * 检查缓存大小
   */
  private checkCacheSize(): void {
    if (this.currentCacheSize > this.maxCacheSize) {
      this.performGarbageCollection();
    }
  }
  
  /**
   * 开始垃圾回收
   */
  private startGarbageCollection(): void {
    if (typeof window !== 'undefined') {
      this.gcInterval = window.setInterval(() => {
        this.performGarbageCollection();
      }, this.gcIntervalTime);
    }
  }
  
  /**
   * 执行垃圾回收
   */
  private performGarbageCollection(): void {
    const now = Date.now();
    const toDispose: string[] = [];
    
    for (const [id, resource] of this.resources) {
      // 释放无引用且长时间未使用的资源
      if (resource.refCount === 0 && 
          now - resource.lastAccessed > this.maxUnusedTime) {
        toDispose.push(id);
      }
    }
    
    for (const id of toDispose) {
      this.disposeResource(id);
    }
    
    if (toDispose.length > 0) {
      logger.debug(`Garbage collected ${toDispose.length} resources`);
    }
  }
  
  /**
   * 更新GPU资源访问时间
   */
  private updateGpuResourceAccess(id: string): void {
    const index = this.gpuResourceQueue.indexOf(id);
    if (index !== -1) {
      this.gpuResourceQueue.splice(index, 1);
      this.gpuResourceQueue.push(id);
    }
  }
  
  /**
   * 确保GPU内存预算
   */
  private async ensureGpuMemoryBudget(requiredSize: number): Promise<void> {
    while (this.currentGpuMemoryUsage + requiredSize > this.gpuMemoryBudget && this.gpuResourceQueue.length > 0) {
      const oldestId = this.gpuResourceQueue.shift()!;
      const resource = this.resources.get(oldestId);
      if (resource && resource.refCount === 0) {
        this.currentGpuMemoryUsage -= resource.size;
        this.disposeResource(oldestId);
      }
    }
  }
  
  /**
   * 处理加载队列
   */
  private processLoadingQueue(): void {
    if (this.loadingQueue.length > 0 && this.currentLoadingCount < this.maxConcurrentLoads) {
      const nextItem = this.loadingQueue.shift()!;
      this.loadResource(nextItem.id, nextItem.factory, nextItem.priority);
    }
  }
  
  /**
   * 创建WebGL缓冲区（支持复用）
   */
  createBuffer(gl: WebGLRenderingContext, type: number, size: number): WebGLBuffer | null {
    const poolKey = `${type}_${size}`;
    const pool = this.bufferPools.get(poolKey) || [];
    
    if (pool.length > 0) {
      return pool.pop()!;
    }
    
    const buffer = gl.createBuffer();
    if (buffer) {
      gl.bindBuffer(type, buffer);
      gl.bufferData(type, size, gl.DYNAMIC_DRAW);
    }
    
    return buffer;
  }
  
  /**
   * 释放WebGL缓冲区到池中
   */
  releaseBuffer(type: number, size: number, buffer: WebGLBuffer): void {
    const poolKey = `${type}_${size}`;
    let pool = this.bufferPools.get(poolKey);
    
    if (!pool) {
      pool = [];
      this.bufferPools.set(poolKey, pool);
    }
    
    if (pool.length < this.maxBufferPoolSize) {
      pool.push(buffer);
    }
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      resourceCount: this.resources.size,
      cacheSize: this.currentCacheSize,
      maxCacheSize: this.maxCacheSize,
      loadingCount: this.loadingPromises.size,
      gpuMemoryUsage: this.currentGpuMemoryUsage,
      gpuMemoryBudget: this.gpuMemoryBudget,
      queuedLoads: this.loadingQueue.length,
      currentLoadingCount: this.currentLoadingCount
    };
  }
  
  /**
   * 清理所有资源
   */
  clear(): void {
    for (const [id] of this.resources) {
      this.disposeResource(id);
    }
    
    this.loadingPromises.clear();
    
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    if (this.gcInterval !== null) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    this.clear();
  }
}