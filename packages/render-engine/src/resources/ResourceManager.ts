import { Texture, TextureFormat } from './textures/types';
import { Buffer as WebGLBufferInterface, BufferType } from '../core/webgl/types';
import { GPUResource } from './types';

// 避免与全局Buffer类型冲突
type BufferInterface = WebGLBufferInterface;

// 声明模块作用域，避免全局Buffer类型干扰
declare const Buffer: undefined;

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
  createBuffer(type: BufferType, data: ArrayBuffer, usage?: number): BufferInterface;
  createTexture(width: number, height: number, format: TextureFormat, data?: ArrayBuffer): Texture;
  releaseResource(resource: BufferInterface | Texture): void;
  getStats(): ResourceStats;
  cleanup(): void;
  dispose(): void;
}

// WebGL缓冲区实现
export class WebGLBuffer implements BufferInterface {
  id: string;
  type: BufferType;
  size: number;
  usage: number;
  data: ArrayBuffer;
  
  private gl: WebGLRenderingContext;
  private glBuffer: globalThis.WebGLBuffer | null = null;
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
    this.glBuffer = this.gl.createBuffer();
    if (this.glBuffer) {
      this.gl.bindBuffer(this.glType, this.glBuffer);
      this.gl.bufferData(this.glType, this.data, this.usage);
    }
  }

  update(data: ArrayBuffer, offset: number = 0): void {
    if (!this.glBuffer) return;

    this.gl.bindBuffer(this.glType, this.glBuffer);

    // 核心修复：只在需要时增长缓冲区，永远不缩小
    if (data.byteLength > this.size) {
      // 新数据比当前缓冲区大，需要重新分配
      this.gl.bufferData(this.glType, data, this.usage);
      this.size = data.byteLength;
      this.data = data;
    } else {
      // 新数据小于等于当前缓冲区，使用 bufferSubData 部分更新
      this.gl.bufferSubData(this.glType, offset, data);
      // 不更新 this.size，保持大缓冲区的大小
      // 但更新 this.data 引用
      this.data = data;
    }
  }

  bind(): void {
    if (this.glBuffer) {
      this.gl.bindBuffer(this.glType, this.glBuffer);
    }
  }

  dispose(): void {
    if (this.glBuffer) {
      this.gl.deleteBuffer(this.glBuffer);
      this.glBuffer = null;
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
  private glTexture: globalThis.WebGLTexture | null = null;
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
    this.glTexture = this.gl.createTexture();
    if (!this.glTexture) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture);
    
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
    if (!this.glTexture) return;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture);
    
    if (data instanceof ImageData) {
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, this.glFormat, this.glFormat, this.glType, data);
    } else {
      const pixels = new Uint8Array(data);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, this.glFormat, this.width, this.height, 0, this.glFormat, this.glType, pixels);
    }
  }

  bind(unit: number = 0): void {
    if (this.glTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture);
    }
  }

  dispose(): void {
    if (this.glTexture) {
      this.gl.deleteTexture(this.glTexture);
      this.glTexture = null;
    }
  }
}

// WebGL资源管理器
export class WebGLResourceManager implements IResourceManager {
  private gl: WebGLRenderingContext;
  private config: ResourcePoolConfig;
  private resources = new Map<string, GPUResource>();
  private bufferPool = new Map<string, BufferInterface[]>();
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

  createBuffer(type: BufferType, data: ArrayBuffer, usage?: number): BufferInterface {
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

  releaseResource(resource: BufferInterface | Texture): void {
    this.resources.delete(resource.id);
    
    // 尝试放入资源池复用
    if ('data' in resource) {
      // 这是Buffer类型
      this.poolBuffer(resource as BufferInterface);
    } else {
      // 这是Texture类型
      this.poolTexture(resource as Texture);
    }
  }

  private poolBuffer(buffer: BufferInterface): void {
    const key = `${(buffer as any).type}_${(buffer as any).size}`;
    if (!this.bufferPool.has(key)) {
      this.bufferPool.set(key, []);
    }
    
    const pool = this.bufferPool.get(key)!;
    if (pool.length < 10) { // 限制池大小
      pool.push(buffer);
    } else {
      (buffer as any).dispose();
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
        (buffer as any)?.dispose();
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
        (buffer as any).dispose();
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
