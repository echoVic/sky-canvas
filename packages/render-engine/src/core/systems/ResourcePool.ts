/**
 * GPU资源池
 */

import type { GPUResource } from './GPUResourceTypes';

/**
 * 资源池统计
 */
export interface PoolStats {
  total: number;
  free: number;
  used: number;
}

/**
 * 资源池
 */
export class ResourcePool<T extends GPUResource> {
  private resources = new Map<string, T>();
  private freeResources = new Set<string>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * 获取资源
   */
  acquire(id: string): T | null {
    const resource = this.resources.get(id);
    if (resource && this.freeResources.has(id)) {
      this.freeResources.delete(id);
      resource.lastUsed = Date.now();
      resource.useCount++;
      return resource;
    }
    return null;
  }

  /**
   * 释放资源回池
   */
  release(id: string): void {
    if (this.resources.has(id)) {
      this.freeResources.add(id);
    }
  }

  /**
   * 添加资源到池
   */
  add(resource: T): void {
    if (this.resources.size >= this.maxSize) {
      this.evictLRU();
    }

    this.resources.set(resource.id, resource);
    this.freeResources.add(resource.id);
  }

  /**
   * 从池中移除资源
   */
  remove(id: string): T | null {
    const resource = this.resources.get(id);
    if (resource) {
      this.resources.delete(id);
      this.freeResources.delete(id);
      return resource;
    }
    return null;
  }

  /**
   * 驱逐最久未使用的资源
   */
  private evictLRU(): void {
    let oldestId = '';
    let oldestTime = Infinity;

    for (const id of this.freeResources) {
      const resource = this.resources.get(id)!;
      if (resource.lastUsed < oldestTime && !resource.persistent) {
        oldestTime = resource.lastUsed;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.remove(oldestId);
    }
  }

  /**
   * 获取池统计
   */
  getStats(): PoolStats {
    return {
      total: this.resources.size,
      free: this.freeResources.size,
      used: this.resources.size - this.freeResources.size
    };
  }

  /**
   * 清空池
   */
  clear(): void {
    this.resources.clear();
    this.freeResources.clear();
  }

  /**
   * 获取池大小
   */
  get size(): number {
    return this.resources.size;
  }

  /**
   * 获取空闲资源数量
   */
  get freeCount(): number {
    return this.freeResources.size;
  }
}
