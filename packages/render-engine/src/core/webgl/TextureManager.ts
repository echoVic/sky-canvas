/**
 * WebGL纹理管理器
 */

import {
  ResourceType,
  ResourceState,
  ResourceMetadata,
  TextureConfig,
  ResourceRef
} from './WebGLResourceTypes';

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
  createTexture(
    id: string,
    config: TextureConfig,
    data?: ArrayBufferView | ImageData | HTMLImageElement
  ): ResourceRef<WebGLTexture> {
    if (this.textures.has(id)) {
      throw new Error(`Texture with id '${id}' already exists`);
    }

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    const format = config.format || this.gl.RGBA;
    const type = config.type || this.gl.UNSIGNED_BYTE;
    const internalFormat = config.internalFormat || format;

    this.uploadTextureData(config, data, internalFormat, format, type);
    this.setTextureParameters(config);

    if (config.generateMipmap) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

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

    const resourceRef: ResourceRef<WebGLTexture> = { id, resource: texture, metadata };
    this.textures.set(id, resourceRef);
    this.defaultConfigs.set(id, config);

    return resourceRef;
  }

  private uploadTextureData(
    config: TextureConfig,
    data: ArrayBufferView | ImageData | HTMLImageElement | undefined,
    internalFormat: number,
    format: number,
    type: number
  ): void {
    if (data instanceof HTMLImageElement || data instanceof ImageData) {
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, format, type, data);
    } else {
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
  }

  private setTextureParameters(config: TextureConfig): void {
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      config.minFilter || this.gl.LINEAR
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      config.magFilter || this.gl.LINEAR
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      config.wrapS || this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      config.wrapT || this.gl.CLAMP_TO_EDGE
    );
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
  updateTexture(
    id: string,
    data: ArrayBufferView | ImageData | HTMLImageElement,
    x = 0,
    y = 0,
    width?: number,
    height?: number
  ): void {
    const ref = this.textures.get(id);
    if (!ref) throw new Error(`Texture '${id}' not found`);

    const config = this.defaultConfigs.get(id);
    if (!config) throw new Error(`Texture config for '${id}' not found`);

    this.gl.bindTexture(this.gl.TEXTURE_2D, ref.resource);

    const format = config.format || this.gl.RGBA;
    const type = config.type || this.gl.UNSIGNED_BYTE;

    if (width !== undefined && height !== undefined) {
      if (data instanceof HTMLImageElement || data instanceof ImageData) {
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, x, y, format, type, data);
      } else {
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, x, y, width, height, format, type, data);
      }
    } else {
      if (data instanceof HTMLImageElement || data instanceof ImageData) {
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          config.internalFormat || format,
          format,
          type,
          data
        );
      } else {
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
   * 检查纹理是否存在
   */
  hasTexture(id: string): boolean {
    return this.textures.has(id);
  }

  /**
   * 获取纹理配置
   */
  getTextureConfig(id: string): TextureConfig | null {
    return this.defaultConfigs.get(id) || null;
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
