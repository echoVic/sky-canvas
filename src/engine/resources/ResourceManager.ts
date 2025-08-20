import { Buffer, BufferType, GPUResource, Texture, TextureFormat } from '../core/RenderTypes';

// 资源池配置
export interface ResourcePoolConfig {
  maxBuffers: number;
  maxTextures: number;
  maxMemoryMB: number;
  gcThresholdMB: number;
}

// 资源使用统计
export interface ResourceStats {
  totalBuffers: number;
  totalTextures: number;
  totalMemoryMB: number;
  activeResources: number;
  pooledResources: number;
}

// 资源管理器接口
export interface IResourceManager {
  createBuffer(type: BufferType, data: ArrayBuffer, usage?: number): Buffer;
  createTexture(width: number, height: number, format: TextureFormat, data?: ArrayBuffer): Texture;
  releaseResource(resource: GPUResource): void;
  getStats(): ResourceStats;
  cleanup(): void;
  dispose(): void;
}

// WebGL缓冲区实现
export class WebGLBuffer implements Buffer {
  id: string;
  type: BufferType;
  size: number;
  usage: number;
  data: ArrayBuffer;
  
  private gl: WebGLRenderingContext;
  private buffer: WebGLBuffer | null = null;
  private glType: number;

  constructor(gl: WebGLRenderingContext, id: string, type: BufferType, data: ArrayBuffer, usage: number = gl.STATIC_DRAW) {
    this.gl = gl;
    this.id = id;
    this.type = type;
    this.data = data;
    this.size = data.byteLength;
    this.usage = usage;
    
    this.glType = type === BufferType.VERTEX ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
    this.createBuffer();
  }

  private createBuffer(): void {
    this.buffer = this.gl.createBuffer();
    if (this.buffer) {
      this.gl.bindBuffer(this.glType, this.buffer);
      this.gl.bufferData(this.glType, this.data, this.usage);
    }
  }

  update(data: ArrayBuffer, offset: number = 0): void {
    if (!this.buffer) return;
    
    this.gl.bindBuffer(this.glType, this.buffer);
    if (offset === 0 && data.byteLength === this.size) {
      this.gl.bufferData(this.glType, data, this.usage);
    } else {
      this.gl.bufferSubData(this.glType, offset, data);
    }
    
    this.data = data;
    this.size = data.byteLength;
  }

  bind(): void {
    if (this.buffer) {
      this.gl.bindBuffer(this.glType, this.buffer);
    }
  }

  dispose(): void {
    if (this.buffer) {
      this.gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }
  }
}

// WebGL纹理实现
export class WebGLTexture implements Texture {
  id: string;
  width: number;
  height: number;
  format: TextureFormat;
  mipLevels: number;
  size: number;
  usage: number;
  type: string = 'texture';
  
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture | null = null;
  private glFormat: number;
  private glType: number;

  constructor(gl: WebGLRenderingContext, id: string, width: number, height: number, format: TextureFormat, data?: ArrayBuffer) {
    this.gl = gl;
    this.id = id;
    this.width = width;
    this.height = height;
    this.format = format;
    this.mipLevels = 1;
    this.usage = 0;
    
    // 设置GL格式
    switch (format) {
      case TextureFormat.RGBA8:
        this.glFormat = gl.RGBA;
        this.glType = gl.UNSIGNED_BYTE;
        break;
      case TextureFormat.RGB8:
        this.glFormat = gl.RGB;
        this.glType = gl.UNSIGNED_BYTE;
        break;
      default:
        this.glFormat = gl.RGBA;
        this.glType = gl.UNSIGNED_BYTE;
    }
    
    this.size = width * height * 4; // 假设RGBA格式
    this.createTexture(data);
  }

  private createTexture(data?: ArrayBuffer): void {
    this.texture = this.gl.createTexture();
    if (!this.texture) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    
    // 上传纹理数据
    if (data) {
      const pixels = new Uint8Array(data);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.glFormat, this.width, this.height, 0, this.glFormat, this.glType, pixels);
    } else {
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.glFormat, this.width, this.height, 0, this.glFormat, this.glType, null);
    }
  }

  update(data: ArrayBuffer | ImageData, level: number = 0): void {
    if (!this.texture) return;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    if (data instanceof ImageData) {
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, this.glFormat, this.glFormat, this.glType, data);
    } else {
      const pixels = new Uint8Array(data);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, this.glFormat, this.width, this.height, 0, this.glFormat, this.glType, pixels);
    }
  }

  bind(unit: number = 0): void {
    if (this.texture) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
  }

  dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}

// WebGL资源管理器
export class WebGLResourceManager implements IResourceManager {
  private gl: WebGLRenderingContext;
  private config: ResourcePoolConfig;
  private resources = new Map<string, GPUResource>();
  private bufferPool = new Map<string, Buffer[]>();
  private texturePool = new Map<string, Texture[]>();
  private nextId = 0;

  constructor(gl: WebGLRenderingContext, config?: Partial<ResourcePoolConfig>) {
    this.gl = gl;
    this.config = {
      maxBuffers: 1000,
      maxTextures: 500,
      maxMemoryMB: 512,
      gcThresholdMB: 400,
      ...config
    };
  }

  createBuffer(type: BufferType, data: ArrayBuffer, usage?: number): Buffer {
    const id = `buffer_${this.nextId++}`;
    const buffer = new WebGLBuffer(this.gl, id, type, data, usage);
    this.resources.set(id, buffer);
    
    // 检查内存使用
    this.checkMemoryUsage();
    
    return buffer;
  }

  createTexture(width: number, height: number, format: TextureFormat, data?: ArrayBuffer): Texture {
    const id = `texture_${this.nextId++}`;
    const texture = new WebGLTexture(this.gl, id, width, height, format, data);
    this.resources.set(id, texture);
    
    // 检查内存使用
    this.checkMemoryUsage();
    
    return texture;
  }

  releaseResource(resource: GPUResource): void {
    this.resources.delete(resource.id);
    
    // 尝试放入资源池复用
    if (resource.type === 'buffer') {
      this.poolBuffer(resource as Buffer);
    } else if (resource.type === 'texture') {
      this.poolTexture(resource as Texture);
    } else {
      resource.dispose();
    }
  }

  private poolBuffer(buffer: Buffer): void {
    const key = `${buffer.type}_${buffer.size}`;
    if (!this.bufferPool.has(key)) {
      this.bufferPool.set(key, []);
    }
    
    const pool = this.bufferPool.get(key)!;
    if (pool.length < 10) { // 限制池大小
      pool.push(buffer);
    } else {
      buffer.dispose();
    }
  }

  private poolTexture(texture: Texture): void {
    const key = `${texture.format}_${texture.width}x${texture.height}`;
    if (!this.texturePool.has(key)) {
      this.texturePool.set(key, []);
    }
    
    const pool = this.texturePool.get(key)!;
    if (pool.length < 5) { // 限制池大小
      pool.push(texture);
    } else {
      texture.dispose();
    }
  }

  getStats(): ResourceStats {
    let totalMemory = 0;
    let bufferCount = 0;
    let textureCount = 0;
    
    for (const resource of this.resources.values()) {
      totalMemory += resource.size;
      if (resource.type === 'buffer') bufferCount++;
      else if (resource.type === 'texture') textureCount++;
    }
    
    let pooledCount = 0;
    for (const pool of this.bufferPool.values()) {
      pooledCount += pool.length;
    }
    for (const pool of this.texturePool.values()) {
      pooledCount += pool.length;
    }
    
    return {
      totalBuffers: bufferCount,
      totalTextures: textureCount,
      totalMemoryMB: totalMemory / (1024 * 1024),
      activeResources: this.resources.size,
      pooledResources: pooledCount
    };
  }

  private checkMemoryUsage(): void {
    const stats = this.getStats();
    if (stats.totalMemoryMB > this.config.gcThresholdMB) {
      this.cleanup();
    }
  }

  cleanup(): void {
    // 清理资源池中的旧资源
    for (const [key, pool] of this.bufferPool) {
      while (pool.length > 5) {
        const buffer = pool.pop();
        buffer?.dispose();
      }
    }
    
    for (const [key, pool] of this.texturePool) {
      while (pool.length > 3) {
        const texture = pool.pop();
        texture?.dispose();
      }
    }
  }

  dispose(): void {
    // 释放所有活跃资源
    for (const resource of this.resources.values()) {
      resource.dispose();
    }
    this.resources.clear();
    
    // 清空资源池
    for (const pool of this.bufferPool.values()) {
      for (const buffer of pool) {
        buffer.dispose();
      }
    }
    this.bufferPool.clear();
    
    for (const pool of this.texturePool.values()) {
      for (const texture of pool) {
        texture.dispose();
      }
    }
    this.texturePool.clear();
  }
}
