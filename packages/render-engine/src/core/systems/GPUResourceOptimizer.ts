/**
 * GPU资源优化系统
 */

import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';
import {
  GPUResourceType,
  GPUResource,
  TextureConfig,
  BufferConfig,
  GPUMemoryStats,
  GPUOptimizerConfig,
  createDefaultGPUConfig,
  createDefaultMemoryStats
} from './GPUResourceTypes';
import { ResourcePool, PoolStats } from './ResourcePool';
import { GPUMemoryAllocator } from './GPUMemoryAllocator';

// 重新导出类型
export type { GPUResource, TextureConfig, BufferConfig, GPUMemoryStats, GPUOptimizerConfig } from './GPUResourceTypes';
export { GPUResourceType } from './GPUResourceTypes';
export { ResourcePool, type PoolStats } from './ResourcePool';
export { GPUMemoryAllocator } from './GPUMemoryAllocator';

/**
 * GPU资源优化系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'gpu-resource-optimizer',
  priority: 850
})
export class GPUResourceOptimizer extends BaseSystem {
  readonly name = 'gpu-resource-optimizer';
  readonly priority = 850;

  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private memoryAllocator: GPUMemoryAllocator;

  private texturePools = new Map<string, ResourcePool<GPUResource>>();
  private bufferPool = new ResourcePool<GPUResource>(200);
  private framebufferPool = new ResourcePool<GPUResource>(50);
  private shaderPool = new ResourcePool<GPUResource>(100);

  private resources = new Map<string, GPUResource>();
  private resourceSizes = new Map<GPUResourceType, number>();

  private config: GPUOptimizerConfig;
  private stats: GPUMemoryStats;

  constructor() {
    super();
    this.config = createDefaultGPUConfig();
    this.stats = createDefaultMemoryStats();
    this.memoryAllocator = new GPUMemoryAllocator(this.config.memoryBudget);
  }

  init(): void {
    this.initializeResourcePools();
    this.startResourceMonitoring();
  }

  setWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
  }

  private initializeResourcePools(): void {
    const textureSizes = [64, 128, 256, 512, 1024, 2048];
    for (const size of textureSizes) {
      this.texturePools.set(`${size}x${size}`, new ResourcePool<GPUResource>(20));
    }
  }

  createTexture(
    config: TextureConfig,
    data?: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement
  ): string {
    if (!this.gl) throw new Error('WebGL context not set');

    const id = this.generateResourceId('texture');
    const size = this.calculateTextureSize(config);

    if (!this.checkMemoryBudget(size)) {
      this.freeUnusedResources();
      if (!this.checkMemoryBudget(size)) {
        throw new Error('Insufficient GPU memory for texture');
      }
    }

    const poolKey = `${config.width}x${config.height}`;
    const pool = this.texturePools.get(poolKey);
    let texture: WebGLTexture | null = null;

    if (pool) {
      const pooledResource = pool.acquire(id);
      if (pooledResource?.webglObject) {
        texture = pooledResource.webglObject as WebGLTexture;
      }
    }

    if (!texture) {
      texture = this.gl.createTexture();
      if (!texture) throw new Error('Failed to create texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, config.minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, config.magFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, config.wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, config.wrapT);

    this.uploadTextureData(config, data);

    if (config.generateMipmaps && this.config.automaticMipmapGeneration) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    const resource: GPUResource = {
      id,
      type: GPUResourceType.TEXTURE,
      size,
      lastUsed: Date.now(),
      useCount: 1,
      priority: 1,
      persistent: false,
      webglObject: texture
    };

    this.resources.set(id, resource);
    this.updateMemoryStats(GPUResourceType.TEXTURE, size);
    this.stats.allocationCount++;

    return id;
  }

  private uploadTextureData(
    config: TextureConfig,
    data?: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement
  ): void {
    if (!this.gl) return;

    if (data) {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, config.format,
          config.width, config.height, 0,
          config.format, config.type, data as ArrayBufferView
        );
      } else {
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, config.format,
          config.format, config.type, data as TexImageSource
        );
      }
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, config.format,
        config.width, config.height, 0,
        config.format, config.type, null
      );
    }
  }

  createBuffer(config: BufferConfig, data?: ArrayBufferView): string {
    if (!this.gl) throw new Error('WebGL context not set');

    const id = this.generateResourceId('buffer');
    const size = data ? data.byteLength : config.size;

    if (!this.checkMemoryBudget(size)) {
      this.freeUnusedResources();
      if (!this.checkMemoryBudget(size)) {
        throw new Error('Insufficient GPU memory for buffer');
      }
    }

    const pooledResource = this.bufferPool.acquire(id);
    let buffer: WebGLBuffer | null = pooledResource?.webglObject as WebGLBuffer | null;

    if (!buffer) {
      buffer = this.gl.createBuffer();
      if (!buffer) throw new Error('Failed to create buffer');
    }

    this.gl.bindBuffer(config.target, buffer);
    if (data) {
      this.gl.bufferData(config.target, data, config.usage);
    } else {
      this.gl.bufferData(config.target, size, config.usage);
    }

    const resource: GPUResource = {
      id,
      type: GPUResourceType.BUFFER,
      size,
      lastUsed: Date.now(),
      useCount: 1,
      priority: 1,
      persistent: false,
      webglObject: buffer
    };

    this.resources.set(id, resource);
    this.updateMemoryStats(GPUResourceType.BUFFER, size);
    this.stats.allocationCount++;

    return id;
  }

  getResource(id: string): GPUResource | null {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
      resource.useCount++;
    }
    return resource || null;
  }

  releaseResource(id: string): void {
    const resource = this.resources.get(id);
    if (!resource) return;

    let pooled = false;

    switch (resource.type) {
      case GPUResourceType.TEXTURE:
        for (const pool of this.texturePools.values()) {
          pool.release(id);
          pooled = true;
          break;
        }
        break;
      case GPUResourceType.BUFFER:
        this.bufferPool.release(id);
        pooled = true;
        break;
      case GPUResourceType.FRAMEBUFFER:
        this.framebufferPool.release(id);
        pooled = true;
        break;
    }

    if (!pooled) {
      this.destroyResource(resource);
    }
  }

  private destroyResource(resource: GPUResource): void {
    if (!this.gl || !resource.webglObject) return;

    switch (resource.type) {
      case GPUResourceType.TEXTURE:
        this.gl.deleteTexture(resource.webglObject as WebGLTexture);
        break;
      case GPUResourceType.BUFFER:
        this.gl.deleteBuffer(resource.webglObject as WebGLBuffer);
        break;
      case GPUResourceType.FRAMEBUFFER:
        this.gl.deleteFramebuffer(resource.webglObject as WebGLFramebuffer);
        break;
      case GPUResourceType.SHADER:
        this.gl.deleteProgram(resource.webglObject as WebGLProgram);
        break;
    }

    this.resources.delete(resource.id);
    this.updateMemoryStats(resource.type, -resource.size);
    this.stats.deallocationCount++;
  }

  private freeUnusedResources(): void {
    const now = Date.now();
    const resourcesToFree: GPUResource[] = [];

    for (const resource of this.resources.values()) {
      if (!resource.persistent && now - resource.lastUsed > this.config.resourceTimeoutMs) {
        resourcesToFree.push(resource);
      }
    }

    resourcesToFree.sort((a, b) => a.useCount - b.useCount);

    for (const resource of resourcesToFree) {
      this.destroyResource(resource);
    }
  }

  private checkMemoryBudget(requiredSize: number): boolean {
    return this.memoryAllocator.hasEnoughMemory(requiredSize);
  }

  private calculateTextureSize(config: TextureConfig): number {
    let bytesPerPixel = 4;

    if (this.gl) {
      switch (config.format) {
        case this.gl.RGB:
          bytesPerPixel = 3;
          break;
        case this.gl.LUMINANCE:
          bytesPerPixel = 1;
          break;
        case this.gl.LUMINANCE_ALPHA:
          bytesPerPixel = 2;
          break;
      }
    }

    let size = config.width * config.height * bytesPerPixel;

    if (config.generateMipmaps) {
      size *= 1.33;
    }

    return Math.ceil(size);
  }

  private updateMemoryStats(type: GPUResourceType, sizeChange: number): void {
    const currentSize = this.resourceSizes.get(type) || 0;
    this.resourceSizes.set(type, currentSize + sizeChange);

    switch (type) {
      case GPUResourceType.TEXTURE:
        this.stats.textureMemory += sizeChange;
        break;
      case GPUResourceType.BUFFER:
        this.stats.bufferMemory += sizeChange;
        break;
      case GPUResourceType.FRAMEBUFFER:
        this.stats.framebufferMemory += sizeChange;
        break;
    }

    this.stats.totalAllocated += sizeChange;
    this.stats.totalUsed = this.stats.textureMemory + this.stats.bufferMemory + this.stats.framebufferMemory;
    this.stats.availableMemory = this.config.memoryBudget - this.stats.totalUsed;
    this.stats.fragmentationRatio = this.memoryAllocator.getFragmentationRatio();
  }

  private generateResourceId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startResourceMonitoring(): void {
    setInterval(() => this.monitorResources(), 10000);
  }

  private monitorResources(): void {
    const memoryUsageRatio = this.stats.totalUsed / this.config.memoryBudget;

    if (memoryUsageRatio > 0.9) {
      console.warn('GPU memory usage is high:', memoryUsageRatio);
      this.freeUnusedResources();
    }

    if (this.stats.fragmentationRatio > 0.5) {
      console.warn('GPU memory fragmentation is high:', this.stats.fragmentationRatio);
      this.defragmentMemory();
    }
  }

  private defragmentMemory(): void {
    const activeResources = Array.from(this.resources.values())
      .filter(r => Date.now() - r.lastUsed < this.config.resourceTimeoutMs)
      .sort((a, b) => b.useCount - a.useCount);

    console.log(`Defragmenting memory for ${activeResources.length} active resources`);
  }

  getMemoryStats(): GPUMemoryStats {
    return { ...this.stats };
  }

  getPoolStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};

    for (const [key, pool] of this.texturePools.entries()) {
      stats[`texture_${key}`] = pool.getStats();
    }

    stats.buffer = this.bufferPool.getStats();
    stats.framebuffer = this.framebufferPool.getStats();
    stats.shader = this.shaderPool.getStats();

    return stats;
  }

  setConfig(config: Partial<GPUOptimizerConfig>): void {
    Object.assign(this.config, config);

    if (config.memoryBudget) {
      this.memoryAllocator.updateBudget(config.memoryBudget);
    }
  }

  cleanup(): void {
    for (const resource of this.resources.values()) {
      this.destroyResource(resource);
    }

    for (const pool of this.texturePools.values()) {
      pool.clear();
    }

    this.bufferPool.clear();
    this.framebufferPool.clear();
    this.shaderPool.clear();
  }

  dispose(): void {
    this.cleanup();
    this.resources.clear();
    this.resourceSizes.clear();
    this.texturePools.clear();
  }
}
