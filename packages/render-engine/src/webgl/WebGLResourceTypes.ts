/**
 * WebGL 资源管理类型定义
 */

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
export type WebGLResource = WebGLTexture | WebGLFramebuffer | WebGLRenderbuffer | WebGLShader | WebGLProgram | WebGLBuffer;

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

// 内存使用统计
export interface MemoryUsage {
  textures: number;
  buffers: number;
  other: number;
  total: number;
}

// 默认内存预算
export const DEFAULT_MEMORY_BUDGET: MemoryBudget = {
  total: 512 * 1024 * 1024, // 512MB默认
  textures: 256 * 1024 * 1024, // 256MB纹理
  buffers: 128 * 1024 * 1024, // 128MB缓冲区
  other: 128 * 1024 * 1024 // 128MB其他
};

// 默认GC配置
export const DEFAULT_GC_CONFIG: GCConfig = {
  enabled: true,
  interval: 5000, // 5秒
  maxAge: 300000, // 5分钟
  maxUnusedTime: 60000, // 1分钟
  memoryThreshold: 0.8 // 80%
};
