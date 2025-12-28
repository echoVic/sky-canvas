/**
 * WebGPU 缓冲区管理器
 * 管理顶点缓冲区、索引缓冲区和 uniform 缓冲区
 */

/**
 * 缓冲区类型
 */
export enum BufferType {
  VERTEX = 'vertex',
  INDEX = 'index',
  UNIFORM = 'uniform',
  STORAGE = 'storage'
}

/**
 * 缓冲区配置
 */
export interface BufferConfig {
  label?: string;
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

/**
 * 托管缓冲区
 */
export interface ManagedBuffer {
  buffer: GPUBuffer;
  size: number;
  type: BufferType;
  label: string;
}

/**
 * 顶点数据布局
 */
export interface VertexLayout {
  position: { offset: number; format: GPUVertexFormat };
  color?: { offset: number; format: GPUVertexFormat };
  texCoord?: { offset: number; format: GPUVertexFormat };
  normal?: { offset: number; format: GPUVertexFormat };
  stride: number;
}

/**
 * 标准顶点布局
 */
export const VERTEX_LAYOUTS = {
  // 位置 + 颜色 (2 + 4 floats = 24 bytes)
  POSITION_COLOR: {
    position: { offset: 0, format: 'float32x2' as GPUVertexFormat },
    color: { offset: 8, format: 'float32x4' as GPUVertexFormat },
    stride: 24
  },
  // 位置 + 纹理坐标 + 颜色 (2 + 2 + 4 floats = 32 bytes)
  POSITION_TEXCOORD_COLOR: {
    position: { offset: 0, format: 'float32x2' as GPUVertexFormat },
    texCoord: { offset: 8, format: 'float32x2' as GPUVertexFormat },
    color: { offset: 16, format: 'float32x4' as GPUVertexFormat },
    stride: 32
  },
  // 位置 + 法线 (2 + 2 floats = 16 bytes)
  POSITION_NORMAL: {
    position: { offset: 0, format: 'float32x2' as GPUVertexFormat },
    normal: { offset: 8, format: 'float32x2' as GPUVertexFormat },
    stride: 16
  }
};

/**
 * WebGPU 缓冲区管理器
 */
export class WebGPUBufferManager {
  private device: GPUDevice;
  private buffers: Map<string, ManagedBuffer> = new Map();
  private bufferPool: Map<number, GPUBuffer[]> = new Map();

  // 统计信息
  private stats = {
    totalBuffers: 0,
    totalMemory: 0,
    pooledBuffers: 0
  };

  constructor(device: GPUDevice) {
    this.device = device;
  }

  /**
   * 创建缓冲区
   */
  createBuffer(config: BufferConfig): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: config.label,
      size: config.size,
      usage: config.usage,
      mappedAtCreation: config.mappedAtCreation ?? false
    });

    this.stats.totalBuffers++;
    this.stats.totalMemory += config.size;

    return buffer;
  }

  /**
   * 创建顶点缓冲区
   */
  createVertexBuffer(data: Float32Array, label?: string): GPUBuffer {
    const buffer = this.createBuffer({
      label: label ?? 'Vertex Buffer',
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    this.device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  /**
   * 创建索引缓冲区
   */
  createIndexBuffer(data: Uint16Array | Uint32Array, label?: string): GPUBuffer {
    const buffer = this.createBuffer({
      label: label ?? 'Index Buffer',
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    this.device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  /**
   * 创建 Uniform 缓冲区
   */
  createUniformBuffer(size: number, label?: string): GPUBuffer {
    // Uniform 缓冲区大小必须是 16 的倍数
    const alignedSize = Math.ceil(size / 16) * 16;

    return this.createBuffer({
      label: label ?? 'Uniform Buffer',
      size: alignedSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  /**
   * 更新缓冲区数据
   */
  updateBuffer(buffer: GPUBuffer, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    this.device.queue.writeBuffer(buffer, offset, data);
  }

  /**
   * 从缓冲池获取或创建缓冲区
   */
  acquireBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    // 对齐到 256 字节
    const alignedSize = Math.ceil(size / 256) * 256;
    const key = alignedSize;

    const pool = this.bufferPool.get(key);
    if (pool && pool.length > 0) {
      this.stats.pooledBuffers--;
      return pool.pop()!;
    }

    return this.createBuffer({
      size: alignedSize,
      usage
    });
  }

  /**
   * 归还缓冲区到池
   */
  releaseBuffer(buffer: GPUBuffer, size: number): void {
    const alignedSize = Math.ceil(size / 256) * 256;
    const key = alignedSize;

    let pool = this.bufferPool.get(key);
    if (!pool) {
      pool = [];
      this.bufferPool.set(key, pool);
    }

    // 限制池大小
    if (pool.length < 10) {
      pool.push(buffer);
      this.stats.pooledBuffers++;
    } else {
      buffer.destroy();
      this.stats.totalBuffers--;
      this.stats.totalMemory -= alignedSize;
    }
  }

  /**
   * 注册托管缓冲区
   */
  registerBuffer(id: string, buffer: GPUBuffer, type: BufferType, size: number, label?: string): void {
    this.buffers.set(id, {
      buffer,
      size,
      type,
      label: label ?? id
    });
  }

  /**
   * 获取托管缓冲区
   */
  getBuffer(id: string): ManagedBuffer | undefined {
    return this.buffers.get(id);
  }

  /**
   * 删除托管缓冲区
   */
  deleteBuffer(id: string): void {
    const managed = this.buffers.get(id);
    if (managed) {
      managed.buffer.destroy();
      this.buffers.delete(id);
      this.stats.totalBuffers--;
      this.stats.totalMemory -= managed.size;
    }
  }

  /**
   * 创建顶点缓冲区布局描述
   */
  createVertexBufferLayout(layout: VertexLayout): GPUVertexBufferLayout {
    const attributes: GPUVertexAttribute[] = [];
    let shaderLocation = 0;

    if (layout.position) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.position.offset,
        format: layout.position.format
      });
    }

    if (layout.texCoord) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.texCoord.offset,
        format: layout.texCoord.format
      });
    }

    if (layout.color) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.color.offset,
        format: layout.color.format
      });
    }

    if (layout.normal) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.normal.offset,
        format: layout.normal.format
      });
    }

    return {
      arrayStride: layout.stride,
      stepMode: 'vertex',
      attributes
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 清理所有缓冲区
   */
  dispose(): void {
    // 清理托管缓冲区
    for (const managed of this.buffers.values()) {
      managed.buffer.destroy();
    }
    this.buffers.clear();

    // 清理缓冲池
    for (const pool of this.bufferPool.values()) {
      for (const buffer of pool) {
        buffer.destroy();
      }
    }
    this.bufferPool.clear();

    this.stats = {
      totalBuffers: 0,
      totalMemory: 0,
      pooledBuffers: 0
    };
  }
}
