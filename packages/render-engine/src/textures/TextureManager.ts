import { RenderStats } from '../renderers/types';

/**
 * 纹理过滤模式
 */
export enum TextureFilter {
  NEAREST = 'nearest',
  LINEAR = 'linear',
  MIPMAP_NEAREST = 'mipmap_nearest',
  MIPMAP_LINEAR = 'mipmap_linear'
}

/**
 * 纹理包装模式
 */
export enum TextureWrap {
  CLAMP = 'clamp',
  REPEAT = 'repeat',
  MIRROR = 'mirror'
}

/**
 * 纹理格式
 */
export enum TextureFormat {
  RGB = 'rgb',
  RGBA = 'rgba',
  ALPHA = 'alpha',
  LUMINANCE = 'luminance',
  LUMINANCE_ALPHA = 'luminance_alpha'
}

/**
 * 纹理参数
 */
export interface TextureOptions {
  filter?: TextureFilter;
  wrap?: TextureWrap;
  format?: TextureFormat;
  flipY?: boolean;
  premultiplyAlpha?: boolean;
  generateMipmaps?: boolean;
}

/**
 * 纹理信息
 */
export interface TextureInfo {
  id: string;
  width: number;
  height: number;
  format: TextureFormat;
  size: number; // 字节数
  lastUsed: number;
  refCount: number;
}

/**
 * WebGL纹理包装器
 */
export class WebGLTexture {
  public readonly id: string;
  public readonly texture: globalThis.WebGLTexture;
  public readonly info: TextureInfo;

  constructor(
    gl: WebGLRenderingContext,
    id: string,
    texture: globalThis.WebGLTexture,
    width: number,
    height: number,
    format: TextureFormat = TextureFormat.RGBA
  ) {
    this.id = id;
    this.texture = texture;
    
    // 计算纹理大小
    const bytesPerPixel = this.getBytesPerPixel(format);
    const size = width * height * bytesPerPixel;

    this.info = {
      id,
      width,
      height,
      format,
      size,
      lastUsed: Date.now(),
      refCount: 1
    };
  }

  private getBytesPerPixel(format: TextureFormat): number {
    switch (format) {
      case TextureFormat.RGB: return 3;
      case TextureFormat.RGBA: return 4;
      case TextureFormat.ALPHA: return 1;
      case TextureFormat.LUMINANCE: return 1;
      case TextureFormat.LUMINANCE_ALPHA: return 2;
      default: return 4;
    }
  }

  addRef(): void {
    this.info.refCount++;
    this.info.lastUsed = Date.now();
  }

  release(): void {
    if (this.info.refCount > 0) {
      this.info.refCount--;
    }
  }

  isUnused(): boolean {
    return this.info.refCount <= 0;
  }
}

/**
 * 纹理图集条目
 */
export interface AtlasEntry {
  textureId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/**
 * 纹理图集
 */
export class TextureAtlas {
  private atlas: globalThis.WebGLTexture;
  private entries = new Map<string, AtlasEntry>();
  private size: number;
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;

  constructor(
    private gl: WebGLRenderingContext,
    size: number = 1024
  ) {
    this.size = size;
    this.atlas = this.createAtlasTexture();
  }

  private createAtlasTexture(): globalThis.WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create atlas texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      this.size, this.size, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    return texture;
  }

  addTexture(id: string, imageData: ImageData | HTMLImageElement | HTMLCanvasElement): AtlasEntry | null {
    const width = imageData instanceof ImageData ? imageData.width : imageData.width;
    const height = imageData instanceof ImageData ? imageData.height : imageData.height;

    // 检查是否能放入图集
    if (width > this.size || height > this.size) {
      return null; // 纹理太大
    }

    // 简单的左上到右下打包算法
    if (this.currentX + width > this.size) {
      this.currentX = 0;
      this.currentY += this.rowHeight;
      this.rowHeight = 0;
    }

    if (this.currentY + height > this.size) {
      return null; // 图集已满
    }

    const x = this.currentX;
    const y = this.currentY;

    // 更新纹理数据
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlas);
    
    if (imageData instanceof ImageData) {
      this.gl.texSubImage2D(
        this.gl.TEXTURE_2D, 0, x, y,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData
      );
    } else {
      this.gl.texSubImage2D(
        this.gl.TEXTURE_2D, 0, x, y,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData
      );
    }

    // 计算UV坐标
    const u0 = x / this.size;
    const v0 = y / this.size;
    const u1 = (x + width) / this.size;
    const v1 = (y + height) / this.size;

    const entry: AtlasEntry = {
      textureId: id,
      x, y, width, height,
      u0, v0, u1, v1
    };

    this.entries.set(id, entry);

    // 更新打包位置
    this.currentX += width;
    this.rowHeight = Math.max(this.rowHeight, height);

    return entry;
  }

  getEntry(id: string): AtlasEntry | undefined {
    return this.entries.get(id);
  }

  getTexture(): globalThis.WebGLTexture {
    return this.atlas;
  }

  clear(): void {
    this.entries.clear();
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
    
    // 清空纹理数据
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlas);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      this.size, this.size, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
    );
  }

  dispose(): void {
    this.gl.deleteTexture(this.atlas);
    this.entries.clear();
  }
}

/**
 * WebGL纹理管理器
 */
export class WebGLTextureManager {
  private textures = new Map<string, WebGLTexture>();
  private atlases = new Map<string, TextureAtlas>();
  private loadingQueue = new Map<string, Promise<WebGLTexture>>();
  private maxMemoryUsage = 256 * 1024 * 1024; // 256MB
  private currentMemoryUsage = 0;

  constructor(private gl: WebGLRenderingContext) {}

  /**
   * 加载纹理
   */
  async loadTexture(
    id: string,
    source: string | ImageData | HTMLImageElement | HTMLCanvasElement,
    options: TextureOptions = {}
  ): Promise<WebGLTexture> {
    // 检查是否已存在
    const existing = this.textures.get(id);
    if (existing) {
      existing.addRef();
      return existing;
    }

    // 检查是否正在加载
    const loading = this.loadingQueue.get(id);
    if (loading) {
      const texture = await loading;
      texture.addRef(); // 为并发请求增加引用计数
      return texture;
    }

    // 开始加载
    const promise = this.doLoadTexture(id, source, options);
    this.loadingQueue.set(id, promise);

    try {
      const texture = await promise;
      this.loadingQueue.delete(id);
      return texture;
    } catch (error) {
      this.loadingQueue.delete(id);
      throw error;
    }
  }

  private async doLoadTexture(
    id: string,
    source: string | ImageData | HTMLImageElement | HTMLCanvasElement,
    options: TextureOptions
  ): Promise<WebGLTexture> {
    let imageData: ImageData | HTMLImageElement | HTMLCanvasElement;

    if (typeof source === 'string') {
      imageData = await this.loadImage(source);
    } else {
      imageData = source;
    }

    const texture = this.createTexture(imageData, options);
    const webglTexture = new WebGLTexture(
      this.gl,
      id,
      texture,
      imageData instanceof ImageData ? imageData.width : imageData.width,
      imageData instanceof ImageData ? imageData.height : imageData.height,
      options.format || TextureFormat.RGBA
    );

    this.textures.set(id, webglTexture);
    this.currentMemoryUsage += webglTexture.info.size;

    // 检查内存使用
    this.checkMemoryUsage();

    return webglTexture;
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  private createTexture(
    imageData: ImageData | HTMLImageElement | HTMLCanvasElement,
    options: TextureOptions
  ): globalThis.WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // 设置纹理参数
    if (options.flipY !== false) {
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    }

    if (options.premultiplyAlpha) {
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    }

    // 上传纹理数据
    if (imageData instanceof ImageData) {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData
      );
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData
      );
    }

    // 设置过滤器
    const filter = this.getGLFilter(options.filter || TextureFilter.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, 
      filter === this.gl.NEAREST ? this.gl.NEAREST : this.gl.LINEAR);

    // 设置包装模式
    const wrap = this.getGLWrap(options.wrap || TextureWrap.CLAMP);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrap);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrap);

    // 生成mipmap
    if (options.generateMipmaps && this.isPowerOfTwo(imageData)) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    return texture;
  }

  private getGLFilter(filter: TextureFilter): number {
    switch (filter) {
      case TextureFilter.NEAREST: return this.gl.NEAREST;
      case TextureFilter.LINEAR: return this.gl.LINEAR;
      case TextureFilter.MIPMAP_NEAREST: return this.gl.NEAREST_MIPMAP_NEAREST;
      case TextureFilter.MIPMAP_LINEAR: return this.gl.LINEAR_MIPMAP_LINEAR;
      default: return this.gl.LINEAR;
    }
  }

  private getGLWrap(wrap: TextureWrap): number {
    switch (wrap) {
      case TextureWrap.CLAMP: return this.gl.CLAMP_TO_EDGE;
      case TextureWrap.REPEAT: return this.gl.REPEAT;
      case TextureWrap.MIRROR: return this.gl.MIRRORED_REPEAT;
      default: return this.gl.CLAMP_TO_EDGE;
    }
  }

  private isPowerOfTwo(imageData: ImageData | HTMLImageElement | HTMLCanvasElement): boolean {
    const width = imageData instanceof ImageData ? imageData.width : imageData.width;
    const height = imageData instanceof ImageData ? imageData.height : imageData.height;
    return (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
  }

  /**
   * 获取纹理
   */
  getTexture(id: string): WebGLTexture | undefined {
    const texture = this.textures.get(id);
    if (texture) {
      texture.addRef();
    }
    return texture;
  }

  /**
   * 释放纹理
   */
  releaseTexture(id: string): void {
    const texture = this.textures.get(id);
    if (texture) {
      texture.release();
      
      if (texture.isUnused()) {
        this.gl.deleteTexture(texture.texture);
        this.textures.delete(id);
        this.currentMemoryUsage -= texture.info.size;
      }
    }
  }

  /**
   * 创建纹理图集
   */
  createAtlas(id: string, size: number = 1024): TextureAtlas {
    const atlas = new TextureAtlas(this.gl, size);
    this.atlases.set(id, atlas);
    return atlas;
  }

  /**
   * 获取纹理图集
   */
  getAtlas(id: string): TextureAtlas | undefined {
    return this.atlases.get(id);
  }

  /**
   * 检查内存使用情况并清理
   */
  private checkMemoryUsage(): void {
    if (this.currentMemoryUsage > this.maxMemoryUsage) {
      this.cleanup();
    }
  }

  /**
   * 清理未使用的纹理
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1分钟

    for (const [id, texture] of this.textures) {
      if (texture.isUnused() && now - texture.info.lastUsed > maxAge) {
        this.gl.deleteTexture(texture.texture);
        this.textures.delete(id);
        this.currentMemoryUsage -= texture.info.size;
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { textureCount: number; memoryUsage: number; atlasCount: number } {
    return {
      textureCount: this.textures.size,
      memoryUsage: this.currentMemoryUsage,
      atlasCount: this.atlases.size
    };
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    for (const [id, texture] of this.textures) {
      this.gl.deleteTexture(texture.texture);
    }
    this.textures.clear();

    for (const [id, atlas] of this.atlases) {
      atlas.dispose();
    }
    this.atlases.clear();

    this.currentMemoryUsage = 0;
  }
}