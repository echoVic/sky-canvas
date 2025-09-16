/**
 * 纹理池化管理系统
 * 优化纹理资源的分配、复用和内存管理
 */
import EventEmitter3 from 'eventemitter3';

/**
 * 纹理格式枚举
 */
export enum TextureFormat {
  RGBA = 0x1908, // WebGLRenderingContext.RGBA
  RGB = 0x1907,  // WebGLRenderingContext.RGB
  ALPHA = 0x1906, // WebGLRenderingContext.ALPHA
  LUMINANCE = 0x1909, // WebGLRenderingContext.LUMINANCE
  LUMINANCE_ALPHA = 0x190A // WebGLRenderingContext.LUMINANCE_ALPHA
}

/**
 * 纹理类型枚举
 */
export enum TextureType {
  UNSIGNED_BYTE = 0x1401, // WebGLRenderingContext.UNSIGNED_BYTE
  UNSIGNED_SHORT_5_6_5 = 0x8363,
  UNSIGNED_SHORT_4_4_4_4 = 0x8033,
  UNSIGNED_SHORT_5_5_5_1 = 0x8034
}

/**
 * 纹理配置
 */
export interface TextureConfig {
  /** 纹理宽度 */
  width: number;
  /** 纹理高度 */
  height: number;
  /** 纹理格式 */
  format: TextureFormat;
  /** 数据类型 */
  type: TextureType;
  /** 是否生成mipmap */
  generateMipmaps: boolean;
  /** 包装模式S */
  wrapS: number;
  /** 包装模式T */
  wrapT: number;
  /** 缩小过滤器 */
  minFilter: number;
  /** 放大过滤器 */
  magFilter: number;
  /** 是否预乘alpha */
  premultiplyAlpha: boolean;
  /** 是否翻转Y轴 */
  flipY: boolean;
}

/**
 * 池化纹理对象
 */
export interface PooledTexture {
  /** 纹理ID */
  readonly id: string;
  /** WebGL纹理对象 */
  readonly texture: WebGLTexture;
  /** 纹理配置 */
  readonly config: TextureConfig;
  /** 是否正在使用 */
  readonly inUse: boolean;
  /** 创建时间 */
  readonly createdAt: number;
  /** 最后使用时间 */
  lastUsed: number;
  /** 使用次数 */
  useCount: number;
  /** 内存使用量（字节） */
  memoryUsage: number;
  /** 纹理单元索引 */
  textureUnit: number;
  
  /**
   * 更新纹理数据
   */
  update(data: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void;
  
  /**
   * 绑定纹理到指定单元
   */
  bind(unit?: number): void;
  
  /**
   * 解绑纹理
   */
  unbind(): void;
  
  /**
   * 标记为使用中
   */
  acquire(): void;
  
  /**
   * 标记为可复用
   */
  release(): void;
  
  /**
   * 销毁纹理
   */
  dispose(): void;
}

/**
 * 纹理池配置
 */
interface TexturePoolConfig {
  /** 最大纹理数量 */
  maxTextures: number;
  /** 内存限制（字节） */
  memoryLimit: number;
  /** 未使用纹理的过期时间（毫秒） */
  expirationTime: number;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 启用纹理压缩 */
  enableCompression: boolean;
  /** 预分配纹理池大小 */
  preallocationSize: number;
  /** 启用纹理流式加载 */
  enableStreaming: boolean;
  /** 纹理单元管理 */
  manageTextureUnits: boolean;
  /** 最大纹理单元数量 */
  maxTextureUnits: number;
}

/**
 * 纹理池事件
 */
interface TexturePoolEvents {
  'texture-created': { id: string; config: TextureConfig };
  'texture-reused': { id: string; fromPool: boolean };
  'texture-disposed': { id: string; memoryFreed: number };
  'pool-full': { currentSize: number; limit: number };
  'memory-warning': { currentUsage: number; limit: number };
  'cleanup-performed': { texturesRemoved: number; memoryFreed: number };
}

/**
 * 纹理大小类别
 */
enum TextureSizeCategory {
  SMALL = 'small',    // <= 128x128
  MEDIUM = 'medium',  // <= 512x512
  LARGE = 'large',    // <= 1024x1024
  XLARGE = 'xlarge'   // > 1024x1024
}

/**
 * 池化纹理实现
 */
class PooledTextureImpl implements PooledTexture {
  readonly id: string;
  readonly texture: WebGLTexture;
  readonly config: TextureConfig;
  readonly createdAt: number;
  lastUsed: number;
  useCount = 0;
  memoryUsage: number;
  textureUnit = -1;
  
  private _inUse = false;
  private gl: WebGLRenderingContext;
  
  constructor(
    gl: WebGLRenderingContext, 
    id: string, 
    texture: WebGLTexture, 
    config: TextureConfig
  ) {
    this.gl = gl;
    this.id = id;
    this.texture = texture;
    this.config = config;
    this.createdAt = Date.now();
    this.lastUsed = this.createdAt;
    
    // 计算内存使用量
    this.memoryUsage = this.calculateMemoryUsage(config);
  }
  
  get inUse(): boolean {
    return this._inUse;
  }
  
  update(data: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement || data instanceof HTMLVideoElement) {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 
        0, 
        this.config.format, 
        this.config.format, 
        this.config.type, 
        data
      );
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 
        0, 
        this.config.format, 
        this.config.width, 
        this.config.height, 
        0, 
        this.config.format, 
        this.config.type, 
        data as ArrayBufferView
      );
    }
    
    if (this.config.generateMipmaps) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
  }
  
  bind(unit?: number): void {
    if (unit !== undefined && unit >= 0) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.textureUnit = unit;
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }
  
  unbind(): void {
    if (this.textureUnit >= 0) {
      this.gl.activeTexture(this.gl.TEXTURE0 + this.textureUnit);
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
  
  acquire(): void {
    this._inUse = true;
    this.useCount++;
    this.lastUsed = Date.now();
  }
  
  release(): void {
    this._inUse = false;
    this.lastUsed = Date.now();
  }
  
  dispose(): void {
    this.gl.deleteTexture(this.texture);
  }
  
  private calculateMemoryUsage(config: TextureConfig): number {
    let bytesPerPixel: number;
    
    switch (config.format) {
      case TextureFormat.RGBA:
        bytesPerPixel = 4;
        break;
      case TextureFormat.RGB:
        bytesPerPixel = 3;
        break;
      case TextureFormat.LUMINANCE_ALPHA:
        bytesPerPixel = 2;
        break;
      case TextureFormat.ALPHA:
      case TextureFormat.LUMINANCE:
        bytesPerPixel = 1;
        break;
      default:
        bytesPerPixel = 4;
    }
    
    // 基础内存使用量
    let usage = config.width * config.height * bytesPerPixel;
    
    // 如果生成mipmap，增加33%的内存使用量
    if (config.generateMipmaps) {
      usage *= 1.33;
    }
    
    return Math.ceil(usage);
  }
}

/**
 * 纹理单元管理器
 */
class TextureUnitManager {
  private availableUnits: number[] = [];
  private usedUnits = new Set<number>();
  private unitTextures = new Map<number, PooledTexture>();
  
  constructor(maxUnits: number) {
    for (let i = 0; i < maxUnits; i++) {
      this.availableUnits.push(i);
    }
  }
  
  /**
   * 分配纹理单元
   */
  allocateUnit(): number | null {
    if (this.availableUnits.length === 0) {
      // 尝试回收最少使用的单元
      return this.reclaimLeastUsedUnit();
    }
    
    const unit = this.availableUnits.pop()!;
    this.usedUnits.add(unit);
    return unit;
  }
  
  /**
   * 释放纹理单元
   */
  releaseUnit(unit: number): void {
    if (this.usedUnits.has(unit)) {
      this.usedUnits.delete(unit);
      this.unitTextures.delete(unit);
      this.availableUnits.push(unit);
    }
  }
  
  /**
   * 绑定纹理到单元
   */
  bindTexture(unit: number, texture: PooledTexture): void {
    this.unitTextures.set(unit, texture);
  }
  
  /**
   * 获取单元统计
   */
  getStats(): { available: number; used: number; total: number } {
    return {
      available: this.availableUnits.length,
      used: this.usedUnits.size,
      total: this.availableUnits.length + this.usedUnits.size
    };
  }
  
  private reclaimLeastUsedUnit(): number | null {
    let leastUsedUnit = -1;
    let oldestTime = Date.now();
    
    for (const [unit, texture] of this.unitTextures) {
      if (!texture.inUse && texture.lastUsed < oldestTime) {
        oldestTime = texture.lastUsed;
        leastUsedUnit = unit;
      }
    }
    
    if (leastUsedUnit >= 0) {
      const texture = this.unitTextures.get(leastUsedUnit);
      if (texture) {
        texture.unbind();
        this.unitTextures.delete(leastUsedUnit);
      }
      return leastUsedUnit;
    }
    
    return null;
  }
}

/**
 * 纹理池管理器
 */
export class TexturePool extends EventEmitter3<TexturePoolEvents> {
  private gl: WebGLRenderingContext;
  private config: TexturePoolConfig;
  
  // 纹理存储 - 按尺寸分类存储
  private texturePools = new Map<TextureSizeCategory, Map<string, PooledTexture[]>>();
  private allTextures = new Map<string, PooledTexture>();
  
  // 资源统计
  private currentMemoryUsage = 0;
  private textureIdCounter = 0;
  
  // 纹理单元管理
  private textureUnitManager: TextureUnitManager;
  
  constructor(gl: WebGLRenderingContext, config?: Partial<TexturePoolConfig>) {
    super();
    
    this.gl = gl;
    this.config = {
      maxTextures: 1000,
      memoryLimit: 100 * 1024 * 1024, // 100MB
      expirationTime: 300000, // 5分钟
      cleanupInterval: 60000, // 1分钟
      enableCompression: false,
      preallocationSize: 10,
      enableStreaming: false,
      manageTextureUnits: true,
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8,
      ...config
    };
    
    this.textureUnitManager = new TextureUnitManager(this.config.maxTextureUnits);
    
    // 初始化纹理池
    this.initializeTexturePools();
    
    // 设置清理定时器
    this.setupCleanupTimer();
    
    // 预分配一些常用尺寸的纹理
    if (this.config.preallocationSize > 0) {
      this.preallocateTextures();
    }
  }
  
  /**
   * 获取或创建纹理
   */
  getTexture(config: Partial<TextureConfig>): PooledTexture {
    const fullConfig = this.normalizeConfig(config);
    const configKey = this.getConfigKey(fullConfig);
    const sizeCategory = this.getSizeCategory(fullConfig);
    
    // 尝试从池中获取可复用的纹理
    const pool = this.texturePools.get(sizeCategory)?.get(configKey);
    if (pool && pool.length > 0) {
      const texture = pool.pop()!;
      texture.acquire();
      this.emit('texture-reused', { id: texture.id, fromPool: true });
      return texture;
    }
    
    // 检查是否超过限制
    if (this.allTextures.size >= this.config.maxTextures || 
        this.currentMemoryUsage >= this.config.memoryLimit) {
      this.performCleanup();
      
      if (this.allTextures.size >= this.config.maxTextures) {
        this.emit('pool-full', { currentSize: this.allTextures.size, limit: this.config.maxTextures });
        throw new Error('Texture pool is full');
      }
    }
    
    // 创建新纹理
    return this.createTexture(fullConfig);
  }
  
  /**
   * 释放纹理回池中
   */
  releaseTexture(texture: PooledTexture): void {
    if (!texture.inUse) return;
    
    texture.release();
    
    // 将纹理放回对应的池中
    const sizeCategory = this.getSizeCategory(texture.config);
    const configKey = this.getConfigKey(texture.config);
    
    let categoryPools = this.texturePools.get(sizeCategory);
    if (!categoryPools) {
      categoryPools = new Map();
      this.texturePools.set(sizeCategory, categoryPools);
    }
    
    let pool = categoryPools.get(configKey);
    if (!pool) {
      pool = [];
      categoryPools.set(configKey, pool);
    }
    
    pool.push(texture);
  }
  
  /**
   * 强制清理池中未使用的纹理
   */
  cleanup(force = false): { texturesRemoved: number; memoryFreed: number } {
    let texturesRemoved = 0;
    let memoryFreed = 0;
    const now = Date.now();
    
    const texturesToRemove: string[] = [];
    
    for (const [id, texture] of this.allTextures) {
      const shouldRemove = force || 
        (!texture.inUse && (now - texture.lastUsed > this.config.expirationTime));
      
      if (shouldRemove) {
        texturesToRemove.push(id);
        memoryFreed += texture.memoryUsage;
        texturesRemoved++;
        
        // 从纹理单元管理器中释放
        if (texture.textureUnit >= 0) {
          this.textureUnitManager.releaseUnit(texture.textureUnit);
        }
        
        texture.dispose();
        this.emit('texture-disposed', { id, memoryFreed: texture.memoryUsage });
      }
    }
    
    // 从所有存储中移除
    for (const id of texturesToRemove) {
      this.allTextures.delete(id);
    }
    
    // 清理池中的引用
    this.cleanupPoolReferences(texturesToRemove);
    
    this.currentMemoryUsage -= memoryFreed;
    
    if (texturesRemoved > 0) {
      this.emit('cleanup-performed', { texturesRemoved, memoryFreed });
    }
    
    return { texturesRemoved, memoryFreed };
  }
  
  /**
   * 获取池统计信息
   */
  getStats(): {
    totalTextures: number;
    memoryUsage: number;
    memoryLimit: number;
    textureUnits: { available: number; used: number; total: number };
    poolSizes: Record<TextureSizeCategory, number>;
  } {
    const poolSizes: Record<TextureSizeCategory, number> = {
      [TextureSizeCategory.SMALL]: 0,
      [TextureSizeCategory.MEDIUM]: 0,
      [TextureSizeCategory.LARGE]: 0,
      [TextureSizeCategory.XLARGE]: 0
    };
    
    for (const [category, pools] of this.texturePools) {
      let count = 0;
      for (const pool of pools.values()) {
        count += pool.length;
      }
      poolSizes[category] = count;
    }
    
    return {
      totalTextures: this.allTextures.size,
      memoryUsage: this.currentMemoryUsage,
      memoryLimit: this.config.memoryLimit,
      textureUnits: this.textureUnitManager.getStats(),
      poolSizes
    };
  }
  
  /**
   * 预热纹理池
   */
  async warmupPool(configs: Partial<TextureConfig>[]): Promise<void> {
    const warmupPromises = configs.map(async (config) => {
      try {
        const texture = this.getTexture(config);
        // 立即释放回池中
        this.releaseTexture(texture);
      } catch (error) {
        console.warn('Failed to warmup texture:', error);
      }
    });
    
    await Promise.all(warmupPromises);
  }
  
  /**
   * 销毁纹理池
   */
  dispose(): void {
    this.cleanup(true);
    this.removeAllListeners();
  }
  
  /**
   * 创建新纹理
   */
  private createTexture(config: TextureConfig): PooledTexture {
    const gl = this.gl;
    const glTexture = gl.createTexture();
    
    if (!glTexture) {
      throw new Error('Failed to create WebGL texture');
    }
    
    const id = `texture_${++this.textureIdCounter}`;
    
    // 配置WebGL纹理
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, config.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, config.wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, config.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, config.magFilter);
    
    // 创建空纹理数据
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      config.format,
      config.width,
      config.height,
      0,
      config.format,
      config.type,
      null
    );
    
    if (config.generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    const texture = new PooledTextureImpl(gl, id, glTexture, config);
    texture.acquire();
    
    this.allTextures.set(id, texture);
    this.currentMemoryUsage += texture.memoryUsage;
    
    // 分配纹理单元
    if (this.config.manageTextureUnits) {
      const unit = this.textureUnitManager.allocateUnit();
      if (unit !== null) {
        texture.textureUnit = unit;
        this.textureUnitManager.bindTexture(unit, texture);
      }
    }
    
    this.emit('texture-created', { id, config });
    
    // 检查内存警告
    if (this.currentMemoryUsage > this.config.memoryLimit * 0.8) {
      this.emit('memory-warning', { 
        currentUsage: this.currentMemoryUsage, 
        limit: this.config.memoryLimit 
      });
    }
    
    return texture;
  }
  
  /**
   * 标准化纹理配置
   */
  private normalizeConfig(config: Partial<TextureConfig>): TextureConfig {
    const gl = this.gl;
    
    return {
      width: config.width || 256,
      height: config.height || 256,
      format: config.format || TextureFormat.RGBA,
      type: config.type || TextureType.UNSIGNED_BYTE,
      generateMipmaps: config.generateMipmaps ?? true,
      wrapS: config.wrapS ?? gl.CLAMP_TO_EDGE,
      wrapT: config.wrapT ?? gl.CLAMP_TO_EDGE,
      minFilter: config.minFilter ?? gl.LINEAR_MIPMAP_LINEAR,
      magFilter: config.magFilter ?? gl.LINEAR,
      premultiplyAlpha: config.premultiplyAlpha ?? false,
      flipY: config.flipY ?? true
    };
  }
  
  /**
   * 获取配置键
   */
  private getConfigKey(config: TextureConfig): string {
    return `${config.width}x${config.height}_${config.format}_${config.type}_${config.generateMipmaps ? 'mip' : 'nomip'}`;
  }
  
  /**
   * 获取尺寸类别
   */
  private getSizeCategory(config: TextureConfig): TextureSizeCategory {
    const size = Math.max(config.width, config.height);
    
    if (size <= 128) return TextureSizeCategory.SMALL;
    if (size <= 512) return TextureSizeCategory.MEDIUM;
    if (size <= 1024) return TextureSizeCategory.LARGE;
    return TextureSizeCategory.XLARGE;
  }
  
  /**
   * 初始化纹理池
   */
  private initializeTexturePools(): void {
    for (const category of Object.values(TextureSizeCategory)) {
      this.texturePools.set(category, new Map());
    }
  }
  
  /**
   * 预分配纹理
   */
  private preallocateTextures(): void {
    const commonConfigs: Partial<TextureConfig>[] = [
      { width: 64, height: 64 },
      { width: 128, height: 128 },
      { width: 256, height: 256 },
      { width: 512, height: 512 }
    ];
    
    setTimeout(() => {
      this.warmupPool(commonConfigs).catch(error => {
        console.warn('Failed to preallocate textures:', error);
      });
    }, 0);
  }
  
  /**
   * 设置清理定时器
   */
  private setupCleanupTimer(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * 执行清理
   */
  private performCleanup(): void {
    this.cleanup();
  }
  
  /**
   * 清理池中的引用
   */
  private cleanupPoolReferences(removedIds: string[]): void {
    const removedSet = new Set(removedIds);
    
    for (const pools of this.texturePools.values()) {
      for (const [key, pool] of pools) {
        const filteredPool = pool.filter(texture => !removedSet.has(texture.id));
        if (filteredPool.length !== pool.length) {
          pools.set(key, filteredPool);
        }
      }
    }
  }
}