/**
 * 池化纹理实现
 */

import { TextureFormat, TextureConfig, PooledTexture } from './TextureTypes';

/**
 * 池化纹理实现类
 */
export class PooledTextureImpl implements PooledTexture {
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
    this.memoryUsage = this.calculateMemoryUsage(config);
  }

  get inUse(): boolean {
    return this._inUse;
  }

  update(
    data: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    if (
      data instanceof HTMLImageElement ||
      data instanceof HTMLCanvasElement ||
      data instanceof HTMLVideoElement
    ) {
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

    let usage = config.width * config.height * bytesPerPixel;

    // 如果生成mipmap，增加33%的内存使用量
    if (config.generateMipmaps) {
      usage *= 1.33;
    }

    return Math.ceil(usage);
  }
}
