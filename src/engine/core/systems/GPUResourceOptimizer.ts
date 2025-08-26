import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';

/**
 * GPU资源类型
 */
export enum GPUResourceType {
  TEXTURE = 'texture',
  BUFFER = 'buffer',
  FRAMEBUFFER = 'framebuffer',
  SHADER = 'shader',
  VAO = 'vao'
}

/**
 * GPU资源接口
 */
export interface GPUResource {
  id: string;
  type: GPUResourceType;
  size: number;
  lastUsed: number;
  useCount: number;
  priority: number;
  persistent: boolean;
  webglObject: WebGLTexture | WebGLBuffer | WebGLFramebuffer | WebGLProgram | WebGLVertexArrayObject | null;
}

/**
 * 纹理配置
 */
interface TextureConfig {
  width: number;
  height: number;
  format: number;
  type: number;
  minFilter: number;
  magFilter: number;
  wrapS: number;
  wrapT: number;
  generateMipmaps: boolean;
}

/**
 * 缓冲区配置
 */
interface BufferConfig {
  target: number;
  usage: number;
  size: number;
}

/**
 * GPU内存统计
 */
export interface GPUMemoryStats {
  totalAllocated: number;
  totalUsed: number;
  textureMemory: number;
  bufferMemory: number;
  framebufferMemory: number;
  availableMemory: number;
  fragmentationRatio: number;
  allocationCount: number;
  deallocationCount: number;
}

/**
 * 资源池
 */
class ResourcePool<T extends GPUResource> {
  private resources = new Map<string, T>();
  private freeResources = new Set<string>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
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
  
  release(id: string): void {
    if (this.resources.has(id)) {
      this.freeResources.add(id);
    }
  }
  
  add(resource: T): void {
    if (this.resources.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.resources.set(resource.id, resource);
    this.freeResources.add(resource.id);
  }
  
  remove(id: string): T | null {
    const resource = this.resources.get(id);
    if (resource) {
      this.resources.delete(id);
      this.freeResources.delete(id);
      return resource;
    }
    return null;
  }
  
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
  
  getStats(): { total: number; free: number; used: number } {
    return {
      total: this.resources.size,
      free: this.freeResources.size,
      used: this.resources.size - this.freeResources.size
    };
  }
  
  clear(): void {
    this.resources.clear();
    this.freeResources.clear();
  }
}

/**
 * 内存分配器
 */
class GPUMemoryAllocator {
  private totalBudget: number;
  private allocatedMemory = 0;
  private allocations = new Map<string, number>();
  private freeBlocks: { offset: number; size: number }[] = [];
  
  constructor(budget: number) {
    this.totalBudget = budget;
    this.freeBlocks.push({ offset: 0, size: budget });
  }
  
  allocate(id: string, size: number): { offset: number; size: number } | null {
    // 找到合适的空闲块
    const blockIndex = this.freeBlocks.findIndex(block => block.size >= size);
    
    if (blockIndex === -1) {
      return null; // 内存不足
    }
    
    const block = this.freeBlocks[blockIndex];
    const allocation = { offset: block.offset, size };
    
    // 更新空闲块
    if (block.size === size) {
      this.freeBlocks.splice(blockIndex, 1);
    } else {
      block.offset += size;
      block.size -= size;
    }
    
    this.allocations.set(id, allocation.offset);
    this.allocatedMemory += size;
    
    return allocation;
  }
  
  deallocate(id: string, size: number): void {
    const offset = this.allocations.get(id);
    if (offset === undefined) return;
    
    this.allocations.delete(id);
    this.allocatedMemory -= size;
    
    // 添加到空闲块并合并相邻块
    this.addFreeBlock({ offset, size });
  }
  
  private addFreeBlock(newBlock: { offset: number; size: number }): void {
    // 插入并合并相邻的空闲块
    let inserted = false;
    
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i];
      
      if (newBlock.offset + newBlock.size === block.offset) {
        // 合并到前面
        block.offset = newBlock.offset;
        block.size += newBlock.size;
        inserted = true;
        break;
      } else if (block.offset + block.size === newBlock.offset) {
        // 合并到后面
        block.size += newBlock.size;
        inserted = true;
        break;
      } else if (newBlock.offset < block.offset) {
        // 插入到中间
        this.freeBlocks.splice(i, 0, newBlock);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.freeBlocks.push(newBlock);
    }
    
    // 合并相邻的空闲块
    this.mergeFreeBlocks();
  }
  
  private mergeFreeBlocks(): void {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    
    for (let i = 0; i < this.freeBlocks.length - 1; i++) {
      const current = this.freeBlocks[i];
      const next = this.freeBlocks[i + 1];
      
      if (current.offset + current.size === next.offset) {
        current.size += next.size;
        this.freeBlocks.splice(i + 1, 1);
        i--; // 重新检查当前块
      }
    }
  }
  
  getFragmentationRatio(): number {
    if (this.freeBlocks.length <= 1) return 0;
    
    const totalFreeMemory = this.freeBlocks.reduce((sum, block) => sum + block.size, 0);
    const largestFreeBlock = Math.max(...this.freeBlocks.map(block => block.size));
    
    return totalFreeMemory > 0 ? 1 - (largestFreeBlock / totalFreeMemory) : 0;
  }
  
  getStats(): {
    totalBudget: number;
    allocatedMemory: number;
    freeMemory: number;
    fragmentationRatio: number;
  } {
    return {
      totalBudget: this.totalBudget,
      allocatedMemory: this.allocatedMemory,
      freeMemory: this.totalBudget - this.allocatedMemory,
      fragmentationRatio: this.getFragmentationRatio()
    };
  }
}

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
  
  // 资源池
  private texturePools = new Map<string, ResourcePool<GPUResource>>();
  private bufferPool = new ResourcePool<GPUResource>(200);
  private framebufferPool = new ResourcePool<GPUResource>(50);
  private shaderPool = new ResourcePool<GPUResource>(100);
  
  // 资源跟踪
  private resources = new Map<string, GPUResource>();
  private resourceSizes = new Map<GPUResourceType, number>();
  
  // 配置
  private config = {
    memoryBudget: 256 * 1024 * 1024, // 256MB
    textureCompressionEnabled: true,
    automaticMipmapGeneration: true,
    resourceTimeoutMs: 300000, // 5分钟
    enableResourceStreaming: true,
    maxTextureSize: 2048
  };
  
  // 统计
  private stats: GPUMemoryStats = {
    totalAllocated: 0,
    totalUsed: 0,
    textureMemory: 0,
    bufferMemory: 0,
    framebufferMemory: 0,
    availableMemory: 0,
    fragmentationRatio: 0,
    allocationCount: 0,
    deallocationCount: 0
  };
  
  constructor() {
    super();
    this.memoryAllocator = new GPUMemoryAllocator(this.config.memoryBudget);
  }
  
  init(): void {
    this.initializeResourcePools();
    this.startResourceMonitoring();
  }
  
  /**
   * 设置WebGL上下文
   */
  setWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
  }
  
  /**
   * 初始化资源池
   */
  private initializeResourcePools(): void {
    // 为不同尺寸的纹理创建专用池
    const textureSizes = [64, 128, 256, 512, 1024, 2048];
    for (const size of textureSizes) {
      this.texturePools.set(`${size}x${size}`, new ResourcePool<GPUResource>(20));
    }
  }
  
  /**
   * 创建优化的纹理
   */
  createTexture(config: TextureConfig, data?: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement): string {
    if (!this.gl) throw new Error('WebGL context not set');
    
    const id = this.generateResourceId('texture');
    const size = this.calculateTextureSize(config);
    
    // 检查内存预算
    if (!this.checkMemoryBudget(size)) {
      this.freeUnusedResources();
      if (!this.checkMemoryBudget(size)) {
        throw new Error('Insufficient GPU memory for texture');
      }
    }
    
    // 尝试从池中获取
    const poolKey = `${config.width}x${config.height}`;
    const pool = this.texturePools.get(poolKey);
    let texture: WebGLTexture | null = null;
    
    if (pool) {
      const pooledResource = pool.acquire(id);
      if (pooledResource?.webglObject) {
        texture = pooledResource.webglObject as WebGLTexture;
      }
    }
    
    // 创建新纹理
    if (!texture) {
      texture = this.gl.createTexture();
      if (!texture) throw new Error('Failed to create texture');
    }
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, config.minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, config.magFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, config.wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, config.wrapT);
    
    // 上传纹理数据
    if (data) {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          config.format,
          config.width,
          config.height,
          0,
          config.format,
          config.type,
          data as ArrayBufferView
        );
      } else {
        // 处理ImageData, HTMLImageElement, HTMLCanvasElement
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          config.format,
          config.format,
          config.type,
          data as TexImageSource
        );
      }
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        config.format,
        config.width,
        config.height,
        0,
        config.format,
        config.type,
        null
      );
    }
    
    // 生成Mipmap
    if (config.generateMipmaps && this.config.automaticMipmapGeneration) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
    
    // 创建资源记录
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
  
  /**
   * 创建优化的缓冲区
   */
  createBuffer(config: BufferConfig, data?: ArrayBufferView): string {
    if (!this.gl) throw new Error('WebGL context not set');
    
    const id = this.generateResourceId('buffer');
    const size = data ? data.byteLength : config.size;
    
    // 检查内存预算
    if (!this.checkMemoryBudget(size)) {
      this.freeUnusedResources();
      if (!this.checkMemoryBudget(size)) {
        throw new Error('Insufficient GPU memory for buffer');
      }
    }
    
    // 尝试从池中获取
    const pooledResource = this.bufferPool.acquire(id);
    let buffer: WebGLBuffer | null = null;
    
    if (pooledResource?.webglObject) {
      buffer = pooledResource.webglObject as WebGLBuffer;
    } else {
      buffer = this.gl.createBuffer();
      if (!buffer) throw new Error('Failed to create buffer');
    }
    
    this.gl.bindBuffer(config.target, buffer);
    if (data) {
      this.gl.bufferData(config.target, data, config.usage);
    } else {
      this.gl.bufferData(config.target, size, config.usage);
    }
    
    // 创建资源记录
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
  
  /**
   * 获取资源
   */
  getResource(id: string): GPUResource | null {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
      resource.useCount++;
    }
    return resource || null;
  }
  
  /**
   * 释放资源
   */
  releaseResource(id: string): void {
    const resource = this.resources.get(id);
    if (!resource) return;
    
    // 尝试放回池中
    let pooled = false;
    
    switch (resource.type) {
      case GPUResourceType.TEXTURE:
        // 根据纹理尺寸放入对应池
        for (const [poolKey, pool] of this.texturePools.entries()) {
          if (poolKey.includes('x')) {
            pool.release(id);
            pooled = true;
            break;
          }
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
  
  /**
   * 销毁资源
   */
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
  
  /**
   * 释放未使用的资源
   */
  private freeUnusedResources(): void {
    const now = Date.now();
    const resourcesToFree: GPUResource[] = [];
    
    for (const resource of this.resources.values()) {
      if (!resource.persistent && now - resource.lastUsed > this.config.resourceTimeoutMs) {
        resourcesToFree.push(resource);
      }
    }
    
    // 按使用频率排序，优先释放使用频率低的资源
    resourcesToFree.sort((a, b) => a.useCount - b.useCount);
    
    for (const resource of resourcesToFree) {
      this.destroyResource(resource);
    }
  }
  
  /**
   * 检查内存预算
   */
  private checkMemoryBudget(requiredSize: number): boolean {
    const allocatorStats = this.memoryAllocator.getStats();
    return allocatorStats.freeMemory >= requiredSize;
  }
  
  /**
   * 计算纹理大小
   */
  private calculateTextureSize(config: TextureConfig): number {
    let bytesPerPixel = 4; // 默认RGBA
    
    // 根据格式计算字节数
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
    
    // 如果生成Mipmap，增加33%的大小
    if (config.generateMipmaps) {
      size *= 1.33;
    }
    
    return Math.ceil(size);
  }
  
  /**
   * 更新内存统计
   */
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
  
  /**
   * 生成资源ID
   */
  private generateResourceId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 开始资源监控
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.monitorResources();
    }, 10000); // 每10秒监控一次
  }
  
  /**
   * 监控资源使用情况
   */
  private monitorResources(): void {
    // 检查内存使用率
    const memoryUsageRatio = this.stats.totalUsed / this.config.memoryBudget;
    
    if (memoryUsageRatio > 0.9) {
      console.warn('GPU memory usage is high:', memoryUsageRatio);
      this.freeUnusedResources();
    }
    
    // 检查碎片化程度
    if (this.stats.fragmentationRatio > 0.5) {
      console.warn('GPU memory fragmentation is high:', this.stats.fragmentationRatio);
      this.defragmentMemory();
    }
  }
  
  /**
   * 内存碎片整理
   */
  private defragmentMemory(): void {
    // 简化的碎片整理：重新分配活跃资源
    const activeResources = Array.from(this.resources.values())
      .filter(r => Date.now() - r.lastUsed < this.config.resourceTimeoutMs)
      .sort((a, b) => b.useCount - a.useCount);
    
    // 在实际实现中，这里会涉及更复杂的内存重新分配逻辑
    console.log(`Defragmenting memory for ${activeResources.length} active resources`);
  }
  
  /**
   * 获取内存统计
   */
  getMemoryStats(): GPUMemoryStats {
    return { ...this.stats };
  }
  
  /**
   * 获取资源池统计
   */
  getPoolStats(): Record<string, { total: number; free: number; used: number }> {
    const stats: Record<string, { total: number; free: number; used: number }> = {};
    
    for (const [key, pool] of this.texturePools.entries()) {
      stats[`texture_${key}`] = pool.getStats();
    }
    
    stats.buffer = this.bufferPool.getStats();
    stats.framebuffer = this.framebufferPool.getStats();
    stats.shader = this.shaderPool.getStats();
    
    return stats;
  }
  
  /**
   * 设置配置
   */
  setConfig(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);
    
    // 更新内存分配器预算
    if (config.memoryBudget) {
      this.memoryAllocator = new GPUMemoryAllocator(config.memoryBudget);
    }
  }
  
  /**
   * 清理所有资源
   */
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
  
  /**
   * 销毁系统
   */
  dispose(): void {
    this.cleanup();
    this.resources.clear();
    this.resourceSizes.clear();
    this.texturePools.clear();
  }
}