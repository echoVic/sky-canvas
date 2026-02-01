/**
 * GPU资源类型定义
 */

/**
 * GPU资源类型
 */
export enum GPUResourceType {
  TEXTURE = 'texture',
  BUFFER = 'buffer',
  FRAMEBUFFER = 'framebuffer',
  SHADER = 'shader',
  VAO = 'vao',
}

/**
 * GPU资源接口
 */
export interface GPUResource {
  id: string
  type: GPUResourceType
  size: number
  lastUsed: number
  useCount: number
  priority: number
  persistent: boolean
  webglObject:
    | WebGLTexture
    | WebGLBuffer
    | WebGLFramebuffer
    | WebGLProgram
    | WebGLVertexArrayObject
    | null
}

/**
 * 纹理配置
 */
export interface TextureConfig {
  width: number
  height: number
  format: number
  type: number
  minFilter: number
  magFilter: number
  wrapS: number
  wrapT: number
  generateMipmaps: boolean
}

/**
 * 缓冲区配置
 */
export interface BufferConfig {
  target: number
  usage: number
  size: number
}

/**
 * GPU内存统计
 */
export interface GPUMemoryStats {
  totalAllocated: number
  totalUsed: number
  textureMemory: number
  bufferMemory: number
  framebufferMemory: number
  availableMemory: number
  fragmentationRatio: number
  allocationCount: number
  deallocationCount: number
}

/**
 * GPU优化器配置
 */
export interface GPUOptimizerConfig {
  memoryBudget: number
  textureCompressionEnabled: boolean
  automaticMipmapGeneration: boolean
  resourceTimeoutMs: number
  enableResourceStreaming: boolean
  maxTextureSize: number
}

/**
 * 创建默认配置
 */
export function createDefaultGPUConfig(): GPUOptimizerConfig {
  return {
    memoryBudget: 256 * 1024 * 1024, // 256MB
    textureCompressionEnabled: true,
    automaticMipmapGeneration: true,
    resourceTimeoutMs: 300000, // 5分钟
    enableResourceStreaming: true,
    maxTextureSize: 2048,
  }
}

/**
 * 创建默认内存统计
 */
export function createDefaultMemoryStats(): GPUMemoryStats {
  return {
    totalAllocated: 0,
    totalUsed: 0,
    textureMemory: 0,
    bufferMemory: 0,
    framebufferMemory: 0,
    availableMemory: 0,
    fragmentationRatio: 0,
    allocationCount: 0,
    deallocationCount: 0,
  }
}
