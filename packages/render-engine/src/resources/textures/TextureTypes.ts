/**
 * 纹理类型定义
 */

/**
 * 纹理格式枚举
 */
export enum TextureFormat {
  RGBA = 0x1908,
  RGB = 0x1907,
  ALPHA = 0x1906,
  LUMINANCE = 0x1909,
  LUMINANCE_ALPHA = 0x190a
}

/**
 * 纹理类型枚举
 */
export enum TextureType {
  UNSIGNED_BYTE = 0x1401,
  UNSIGNED_SHORT_5_6_5 = 0x8363,
  UNSIGNED_SHORT_4_4_4_4 = 0x8033,
  UNSIGNED_SHORT_5_5_5_1 = 0x8034
}

/**
 * 纹理配置
 */
export interface TextureConfig {
  width: number;
  height: number;
  format: TextureFormat;
  type: TextureType;
  generateMipmaps: boolean;
  wrapS: number;
  wrapT: number;
  minFilter: number;
  magFilter: number;
  premultiplyAlpha: boolean;
  flipY: boolean;
}

/**
 * 池化纹理对象接口
 */
export interface PooledTexture {
  readonly id: string;
  readonly texture: WebGLTexture;
  readonly config: TextureConfig;
  readonly inUse: boolean;
  readonly createdAt: number;
  lastUsed: number;
  useCount: number;
  memoryUsage: number;
  textureUnit: number;

  update(
    data: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): void;
  bind(unit?: number): void;
  unbind(): void;
  acquire(): void;
  release(): void;
  dispose(): void;
}

/**
 * 纹理池配置
 */
export interface TexturePoolConfig {
  maxTextures: number;
  memoryLimit: number;
  expirationTime: number;
  cleanupInterval: number;
  enableCompression: boolean;
  preallocationSize: number;
  enableStreaming: boolean;
  manageTextureUnits: boolean;
  maxTextureUnits: number;
}

/**
 * 纹理池事件
 */
export interface TexturePoolEvents {
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
export enum TextureSizeCategory {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge'
}

/**
 * 默认纹理池配置
 */
export const DEFAULT_TEXTURE_POOL_CONFIG: TexturePoolConfig = {
  maxTextures: 1000,
  memoryLimit: 100 * 1024 * 1024,
  expirationTime: 300000,
  cleanupInterval: 60000,
  enableCompression: false,
  preallocationSize: 10,
  enableStreaming: false,
  manageTextureUnits: true,
  maxTextureUnits: 8
};
