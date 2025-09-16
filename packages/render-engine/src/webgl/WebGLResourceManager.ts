/**
 * WebGL 资源管理器
 * 统一管理WebGL资源的生命周期，包括纹理、帧缓冲、渲染缓冲等
 */

import EventEmitter3 from 'eventemitter3';

// 资源类型
export enum ResourceType {
  TEXTURE = 'texture',
  FRAMEBUFFER = 'framebuffer',
  RENDERBUFFER = 'renderbuffer',
  SHADER = 'shader',
  BUFFER = 'buffer',
  VAO = 'vao'
}

// 资源状态
export enum ResourceState {
  CREATING = 'creating',
  READY = 'ready',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed',
  ERROR = 'error'
}

// 资源元数据
export interface ResourceMetadata {
  id: string;
  type: ResourceType;
  state: ResourceState;
  size: number; // 内存占用（字节）
  createTime: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
  dependencies: string[]; // 依赖的其他资源ID
}

// 纹理配置
export interface TextureConfig {
  width: number;
  height: number;
  format?: number;
  type?: number;
  internalFormat?: number;
  minFilter?: number;
  magFilter?: number;
  wrapS?: number;
  wrapT?: number;
  generateMipmap?: boolean;
}

// 帧缓冲配置
export interface FramebufferConfig {
  width: number;
  height: number;
  colorTextures: number; // 颜色附件数量
  depthTexture?: boolean;
  stencilTexture?: boolean;
  samples?: number; // MSAA样本数
}

// WebGL资源对象类型
type WebGLResource = WebGLTexture | WebGLFramebuffer | WebGLRenderbuffer | WebGLShader | WebGLProgram | WebGLBuffer;

// 资源引用
export interface ResourceRef<T = WebGLResource> {
  id: string;
  resource: T;
  metadata: ResourceMetadata;
}

// 内存预算配置
export interface MemoryBudget {
  total: number; // 总预算（字节）
  textures: number; // 纹理预算
  buffers: number; // 缓冲区预算
  other: number; // 其他资源预算
}

// 垃圾收集配置
export interface GCConfig {
  enabled: boolean;
  interval: number; // GC间隔（毫秒）
  maxAge: number; // 资源最大存活时间（毫秒）
  maxUnusedTime: number; // 最大未使用时间（毫秒）
  memoryThreshold: number; // 内存阈值（0-1）
}

// 资源管理器事件
export interface ResourceManagerEvents {
  resourceCreated: ResourceMetadata;
  resourceDisposed: ResourceMetadata;
  memoryPressure: { used: number; budget: number };
  gcStarted: { reason: string };
  gcCompleted: { freedMemory: number; freedResources: number };
}

/**
 * WebGL资源引用计数器
 */
export class ResourceRefCounter {
  private refCounts = new Map<string, number>();
  private callbacks = new Map<string, () => void>();

  /**
   * 增加引用计数
   */
  addRef(id: string): number {
    const count = (this.refCounts.get(id) || 0) + 1;
    this.refCounts.set(id, count);
    return count;
  }

  /**
   * 减少引用计数
   */
  releaseRef(id: string): number {
    const count = Math.max(0, (this.refCounts.get(id) || 0) - 1);
    
    if (count === 0) {
      this.refCounts.delete(id);
      const callback = this.callbacks.get(id);
      if (callback) {
        callback();
        this.callbacks.delete(id);
      }
    } else {
      this.refCounts.set(id, count);
    }
    
    return count;
  }

  /**
   * 获取引用计数
   */
  getRefCount(id: string): number {
    return this.refCounts.get(id) || 0;
  }

  /**
   * 设置零引用回调
   */
  setZeroRefCallback(id: string, callback: () => void): void {
    this.callbacks.set(id, callback);
  }

  /**
   * 检查是否无引用
   */
  hasNoReferences(id: string): boolean {
    return this.getRefCount(id) === 0;
  }
}

/**
 * 纹理管理器
 */
export class TextureManager {
  private textures = new Map<string, ResourceRef<WebGLTexture>>();
  private defaultConfigs = new Map<string, TextureConfig>();

  constructor(private gl: WebGLRenderingContext) {}

  /**
   * 创建纹理
   */
  createTexture(id: string, config: TextureConfig, data?: ArrayBufferView | ImageData | HTMLImageElement): ResourceRef<WebGLTexture> {
    if (this.textures.has(id)) {
      throw new Error(`Texture with id '${id}' already exists`);
    }

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    // 设置纹理参数
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    const format = config.format || this.gl.RGBA;
    const type = config.type || this.gl.UNSIGNED_BYTE;
    const internalFormat = config.internalFormat || format;

    // 上传数据
    if (data instanceof HTMLImageElement || data instanceof ImageData) {
      // 处理图像数据
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        internalFormat,
        format,
        type,
        data
      );
    } else {
      // 处理二进制数据
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        internalFormat,
        config.width,
        config.height,
        0,
        format,
        type,
        data || null
      );
    }

    // 设置过滤参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, 
      config.minFilter || this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, 
      config.magFilter || this.gl.LINEAR);
    
    // 设置包装参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, 
      config.wrapS || this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, 
      config.wrapT || this.gl.CLAMP_TO_EDGE);

    // 生成mipmap
    if (config.generateMipmap) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    // 计算内存占用
    const bytesPerPixel = this.getBytesPerPixel(format, type);
    const size = config.width * config.height * bytesPerPixel;

    const metadata: ResourceMetadata = {
      id,
      type: ResourceType.TEXTURE,
      state: ResourceState.READY,
      size,
      createTime: performance.now(),
      lastAccessed: performance.now(),
      accessCount: 0,
      tags: [],
      dependencies: []
    };

    const resourceRef: ResourceRef<WebGLTexture> = {
      id,
      resource: texture,
      metadata
    };

    this.textures.set(id, resourceRef);
    this.defaultConfigs.set(id, config);

    return resourceRef;
  }

  /**
   * 获取纹理
   */
  getTexture(id: string): ResourceRef<WebGLTexture> | null {
    const ref = this.textures.get(id);
    if (ref) {
      ref.metadata.lastAccessed = performance.now();
      ref.metadata.accessCount++;
    }
    return ref || null;
  }

  /**
   * 更新纹理数据
   */
  updateTexture(id: string, data: ArrayBufferView | ImageData | HTMLImageElement, 
    x = 0, y = 0, width?: number, height?: number): void {
    const ref = this.textures.get(id);
    if (!ref) {
      throw new Error(`Texture '${id}' not found`);
    }

    const config = this.defaultConfigs.get(id);
    if (!config) {
      throw new Error(`Texture config for '${id}' not found`);
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, ref.resource);
    
    if (width !== undefined && height !== undefined) {
      if (data instanceof HTMLImageElement || data instanceof ImageData) {
        // 处理图像数据
        this.gl.texSubImage2D(
          this.gl.TEXTURE_2D,
          0,
          x, y,
          config.format || this.gl.RGBA,
          config.type || this.gl.UNSIGNED_BYTE,
          data
        );
      } else {
        // 处理二进制数据
        this.gl.texSubImage2D(
          this.gl.TEXTURE_2D,
          0,
          x, y, width, height,
          config.format || this.gl.RGBA,
          config.type || this.gl.UNSIGNED_BYTE,
          data
        );
      }
    } else {
      if (data instanceof HTMLImageElement || data instanceof ImageData) {
        // 处理图像数据
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          config.internalFormat || config.format || this.gl.RGBA,
          config.format || this.gl.RGBA,
          config.type || this.gl.UNSIGNED_BYTE,
          data
        );
      } else {
        // 处理二进制数据，需要指定尺寸
        throw new Error('Binary data requires width and height parameters');
      }
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    
    ref.metadata.lastAccessed = performance.now();
    ref.metadata.accessCount++;
  }

  /**
   * 删除纹理
   */
  deleteTexture(id: string): boolean {
    const ref = this.textures.get(id);
    if (!ref) return false;

    ref.metadata.state = ResourceState.DISPOSING;
    this.gl.deleteTexture(ref.resource);
    ref.metadata.state = ResourceState.DISPOSED;

    this.textures.delete(id);
    this.defaultConfigs.delete(id);

    return true;
  }

  /**
   * 获取所有纹理
   */
  getAllTextures(): ResourceRef<WebGLTexture>[] {
    return Array.from(this.textures.values());
  }

  /**
   * 计算像素字节数
   */
  private getBytesPerPixel(format: number, type: number): number {
    let components = 1;
    
    switch (format) {
      case this.gl.ALPHA:
      case this.gl.LUMINANCE:
        components = 1;
        break;
      case this.gl.LUMINANCE_ALPHA:
        components = 2;
        break;
      case this.gl.RGB:
        components = 3;
        break;
      case this.gl.RGBA:
        components = 4;
        break;
    }

    let bytesPerComponent = 1;
    
    switch (type) {
      case this.gl.UNSIGNED_BYTE:
        bytesPerComponent = 1;
        break;
      case this.gl.UNSIGNED_SHORT:
      case this.gl.UNSIGNED_SHORT_4_4_4_4:
      case this.gl.UNSIGNED_SHORT_5_5_5_1:
      case this.gl.UNSIGNED_SHORT_5_6_5:
        bytesPerComponent = 2;
        break;
      case this.gl.FLOAT:
        bytesPerComponent = 4;
        break;
    }

    return components * bytesPerComponent;
  }
}

/**
 * 帧缓冲管理器
 */
export class FramebufferManager {
  private framebuffers = new Map<string, ResourceRef<WebGLFramebuffer>>();
  private configs = new Map<string, FramebufferConfig>();

  constructor(
    private gl: WebGLRenderingContext,
    private textureManager: TextureManager
  ) {}

  /**
   * 创建帧缓冲
   */
  createFramebuffer(id: string, config: FramebufferConfig): ResourceRef<WebGLFramebuffer> {
    if (this.framebuffers.has(id)) {
      throw new Error(`Framebuffer with id '${id}' already exists`);
    }

    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create WebGL framebuffer');
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const attachments: string[] = [];
    let totalSize = 0;

    // 创建颜色附件
    for (let i = 0; i < config.colorTextures; i++) {
      const textureId = `${id}_color_${i}`;
      const colorTexture = this.textureManager.createTexture(textureId, {
        width: config.width,
        height: config.height,
        format: this.gl.RGBA,
        type: this.gl.UNSIGNED_BYTE,
        minFilter: this.gl.LINEAR,
        magFilter: this.gl.LINEAR,
        wrapS: this.gl.CLAMP_TO_EDGE,
        wrapT: this.gl.CLAMP_TO_EDGE
      });

      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.TEXTURE_2D,
        colorTexture.resource,
        0
      );

      attachments.push(textureId);
      totalSize += colorTexture.metadata.size;
    }

    // 创建深度附件
    if (config.depthTexture) {
      const depthTextureId = `${id}_depth`;
      const depthTexture = this.textureManager.createTexture(depthTextureId, {
        width: config.width,
        height: config.height,
        format: this.gl.DEPTH_COMPONENT,
        type: this.gl.UNSIGNED_INT,
        minFilter: this.gl.NEAREST,
        magFilter: this.gl.NEAREST,
        wrapS: this.gl.CLAMP_TO_EDGE,
        wrapT: this.gl.CLAMP_TO_EDGE
      });

      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.DEPTH_ATTACHMENT,
        this.gl.TEXTURE_2D,
        depthTexture.resource,
        0
      );

      attachments.push(depthTextureId);
      totalSize += depthTexture.metadata.size;
    }

    // 检查帧缓冲完整性
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    const metadata: ResourceMetadata = {
      id,
      type: ResourceType.FRAMEBUFFER,
      state: ResourceState.READY,
      size: totalSize,
      createTime: performance.now(),
      lastAccessed: performance.now(),
      accessCount: 0,
      tags: [],
      dependencies: attachments
    };

    const resourceRef: ResourceRef<WebGLFramebuffer> = {
      id,
      resource: framebuffer,
      metadata
    };

    this.framebuffers.set(id, resourceRef);
    this.configs.set(id, config);

    return resourceRef;
  }

  /**
   * 获取帧缓冲
   */
  getFramebuffer(id: string): ResourceRef<WebGLFramebuffer> | null {
    const ref = this.framebuffers.get(id);
    if (ref) {
      ref.metadata.lastAccessed = performance.now();
      ref.metadata.accessCount++;
    }
    return ref || null;
  }

  /**
   * 删除帧缓冲
   */
  deleteFramebuffer(id: string): boolean {
    const ref = this.framebuffers.get(id);
    if (!ref) return false;

    ref.metadata.state = ResourceState.DISPOSING;

    // 删除依赖的纹理
    for (const depId of ref.metadata.dependencies) {
      this.textureManager.deleteTexture(depId);
    }

    this.gl.deleteFramebuffer(ref.resource);
    ref.metadata.state = ResourceState.DISPOSED;

    this.framebuffers.delete(id);
    this.configs.delete(id);

    return true;
  }

  /**
   * 调整帧缓冲大小
   */
  resizeFramebuffer(id: string, width: number, height: number): void {
    const ref = this.framebuffers.get(id);
    const config = this.configs.get(id);
    
    if (!ref || !config) {
      throw new Error(`Framebuffer '${id}' not found`);
    }

    // 删除旧的帧缓冲
    this.deleteFramebuffer(id);

    // 创建新的帧缓冲
    const newConfig = { ...config, width, height };
    this.createFramebuffer(id, newConfig);
  }
}

/**
 * WebGL资源管理器
 */
export class WebGLResourceManager extends EventEmitter3 {
  private textureManager: TextureManager;
  private framebufferManager: FramebufferManager;
  private refCounter: ResourceRefCounter;
  private memoryBudget: MemoryBudget;
  private gcConfig: GCConfig;
  private gcTimer: number | null = null;
  private memoryUsage = { textures: 0, buffers: 0, other: 0, total: 0 };

  constructor(
    private gl: WebGLRenderingContext,
    budget?: Partial<MemoryBudget>,
    gcConfig?: Partial<GCConfig>
  ) {
    super();

    this.textureManager = new TextureManager(gl);
    this.framebufferManager = new FramebufferManager(gl, this.textureManager);
    this.refCounter = new ResourceRefCounter();

    this.memoryBudget = {
      total: 512 * 1024 * 1024, // 512MB默认
      textures: 256 * 1024 * 1024, // 256MB纹理
      buffers: 128 * 1024 * 1024, // 128MB缓冲区
      other: 128 * 1024 * 1024, // 128MB其他
      ...budget
    };

    this.gcConfig = {
      enabled: true,
      interval: 5000, // 5秒
      maxAge: 300000, // 5分钟
      maxUnusedTime: 60000, // 1分钟
      memoryThreshold: 0.8, // 80%
      ...gcConfig
    };

    if (this.gcConfig.enabled) {
      this.startGC();
    }
  }

  /**
   * 创建纹理
   */
  createTexture(id: string, config: TextureConfig, data?: ArrayBufferView | ImageData | HTMLImageElement): ResourceRef<WebGLTexture> {
    this.checkMemoryPressure('textures');
    
    const ref = this.textureManager.createTexture(id, config, data);
    this.updateMemoryUsage();
    
    this.emit('resourceCreated', ref.metadata);
    return ref;
  }

  /**
   * 创建帧缓冲
   */
  createFramebuffer(id: string, config: FramebufferConfig): ResourceRef<WebGLFramebuffer> {
    this.checkMemoryPressure('other');
    
    const ref = this.framebufferManager.createFramebuffer(id, config);
    this.updateMemoryUsage();
    
    this.emit('resourceCreated', ref.metadata);
    return ref;
  }

  /**
   * 获取纹理
   */
  getTexture(id: string): ResourceRef<WebGLTexture> | null {
    return this.textureManager.getTexture(id);
  }

  /**
   * 获取帧缓冲
   */
  getFramebuffer(id: string): ResourceRef<WebGLFramebuffer> | null {
    return this.framebufferManager.getFramebuffer(id);
  }

  /**
   * 增加资源引用
   */
  addResourceRef(id: string): number {
    return this.refCounter.addRef(id);
  }

  /**
   * 释放资源引用
   */
  releaseResourceRef(id: string): number {
    return this.refCounter.releaseRef(id);
  }

  /**
   * 删除资源
   */
  deleteResource(id: string): boolean {
    // 检查引用计数
    if (!this.refCounter.hasNoReferences(id)) {
      console.warn(`Cannot delete resource '${id}': still has references`);
      return false;
    }

    let deleted = false;
    let metadata: ResourceMetadata | null = null;

    // 尝试删除各种类型的资源
    const texture = this.textureManager.getTexture(id);
    if (texture) {
      metadata = texture.metadata;
      deleted = this.textureManager.deleteTexture(id);
    } else {
      const framebuffer = this.framebufferManager.getFramebuffer(id);
      if (framebuffer) {
        metadata = framebuffer.metadata;
        deleted = this.framebufferManager.deleteFramebuffer(id);
      }
    }

    if (deleted && metadata) {
      this.updateMemoryUsage();
      this.emit('resourceDisposed', metadata);
    }

    return deleted;
  }

  /**
   * 检查内存压力
   */
  private checkMemoryPressure(type: keyof MemoryBudget): void {
    const usage = this.memoryUsage[type];
    const budget = this.memoryBudget[type];
    
    if (usage > budget) {
      this.emit('memoryPressure', { used: usage, budget });
      
      // 触发垃圾收集
      if (this.gcConfig.enabled) {
        this.performGC('memory_pressure');
      }
    }
  }

  /**
   * 更新内存使用统计
   */
  private updateMemoryUsage(): void {
    let textureMemory = 0;
    let otherMemory = 0;

    // 计算纹理内存
    for (const texture of this.textureManager.getAllTextures()) {
      textureMemory += texture.metadata.size;
    }

    // 计算其他资源内存（帧缓冲、渲染缓冲等）
    // 这里可以扩展其他资源类型的内存计算

    this.memoryUsage = {
      textures: textureMemory,
      buffers: 0, // 待实现
      other: otherMemory,
      total: textureMemory + otherMemory
    };
  }

  /**
   * 开始垃圾收集
   */
  private startGC(): void {
    if (this.gcTimer) return;

    this.gcTimer = window.setInterval(() => {
      this.performGC('scheduled');
    }, this.gcConfig.interval);
  }

  /**
   * 执行垃圾收集
   */
  private performGC(reason: string): void {
    this.emit('gcStarted', { reason });

    const now = performance.now();
    const candidates: string[] = [];
    let freedMemory = 0;

    // 收集候选资源
    for (const texture of this.textureManager.getAllTextures()) {
      const metadata = texture.metadata;
      const age = now - metadata.createTime;
      const unusedTime = now - metadata.lastAccessed;

      if (this.refCounter.hasNoReferences(metadata.id) &&
          (age > this.gcConfig.maxAge || unusedTime > this.gcConfig.maxUnusedTime)) {
        candidates.push(metadata.id);
        freedMemory += metadata.size;
      }
    }

    // 删除候选资源
    for (const id of candidates) {
      this.deleteResource(id);
    }

    this.emit('gcCompleted', { 
      freedMemory, 
      freedResources: candidates.length 
    });
  }

  /**
   * 手动触发垃圾收集
   */
  forceGC(): void {
    this.performGC('manual');
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    return { ...this.memoryUsage };
  }

  /**
   * 获取内存预算
   */
  getMemoryBudget() {
    return { ...this.memoryBudget };
  }

  /**
   * 获取资源统计
   */
  getResourceStats() {
    const textures = this.textureManager.getAllTextures();
    
    return {
      textures: textures.length,
      framebuffers: 0, // 待实现
      totalMemory: this.memoryUsage.total,
      memoryUtilization: this.memoryUsage.total / this.memoryBudget.total
    };
  }

  /**
   * 销毁资源管理器
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    // 删除所有资源
    for (const texture of this.textureManager.getAllTextures()) {
      this.textureManager.deleteTexture(texture.id);
    }
  }
}