/**
 * 纹理池化管理系统
 * 优化纹理资源的分配、复用和内存管理
 */

import { EventEmitter } from '../events/EventBus'
import {
  DEFAULT_TEXTURE_POOL_CONFIG,
  type PooledTexture,
  type TextureConfig,
  TextureFormat,
  type TexturePoolConfig,
  type TexturePoolEvents,
  TextureSizeCategory,
  TextureType,
} from './textures'
import { PooledTextureImpl } from './textures/PooledTextureImpl'
import { TextureUnitManager } from './textures/TextureUnitManager'

export type {
  PooledTexture,
  TextureConfig,
  TexturePoolConfig,
  TexturePoolEvents,
} from './textures'
// 重新导出类型
export { TextureFormat, TextureSizeCategory, TextureType } from './textures'

/**
 * 纹理池管理器
 */
export class TexturePool extends EventEmitter<TexturePoolEvents> {
  private gl: WebGLRenderingContext
  private config: TexturePoolConfig

  // 纹理存储 - 按尺寸分类存储
  private texturePools = new Map<TextureSizeCategory, Map<string, PooledTexture[]>>()
  private allTextures = new Map<string, PooledTexture>()

  // 资源统计
  private currentMemoryUsage = 0
  private textureIdCounter = 0

  // 纹理单元管理
  private textureUnitManager: TextureUnitManager

  constructor(gl: WebGLRenderingContext, config?: Partial<TexturePoolConfig>) {
    super()

    this.gl = gl
    this.config = {
      ...DEFAULT_TEXTURE_POOL_CONFIG,
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8,
      ...config,
    }

    this.textureUnitManager = new TextureUnitManager(this.config.maxTextureUnits)
    this.initializeTexturePools()
    this.setupCleanupTimer()

    if (this.config.preallocationSize > 0) {
      this.preallocateTextures()
    }
  }

  /**
   * 获取或创建纹理
   */
  getTexture(config: Partial<TextureConfig>): PooledTexture {
    const fullConfig = this.normalizeConfig(config)
    const configKey = this.getConfigKey(fullConfig)
    const sizeCategory = this.getSizeCategory(fullConfig)

    // 尝试从池中获取可复用的纹理
    const pool = this.texturePools.get(sizeCategory)?.get(configKey)
    if (pool && pool.length > 0) {
      const texture = pool.pop()!
      texture.acquire()
      this.emit('texture-reused', { id: texture.id, fromPool: true })
      return texture
    }

    // 检查是否超过限制
    if (
      this.allTextures.size >= this.config.maxTextures ||
      this.currentMemoryUsage >= this.config.memoryLimit
    ) {
      this.performCleanup()

      if (this.allTextures.size >= this.config.maxTextures) {
        this.emit('pool-full', {
          currentSize: this.allTextures.size,
          limit: this.config.maxTextures,
        })
        throw new Error('Texture pool is full')
      }
    }

    return this.createTexture(fullConfig)
  }

  /**
   * 释放纹理回池中
   */
  releaseTexture(texture: PooledTexture): void {
    if (!texture.inUse) return

    texture.release()

    const sizeCategory = this.getSizeCategory(texture.config)
    const configKey = this.getConfigKey(texture.config)

    let categoryPools = this.texturePools.get(sizeCategory)
    if (!categoryPools) {
      categoryPools = new Map()
      this.texturePools.set(sizeCategory, categoryPools)
    }

    let pool = categoryPools.get(configKey)
    if (!pool) {
      pool = []
      categoryPools.set(configKey, pool)
    }

    pool.push(texture)
  }

  /**
   * 强制清理池中未使用的纹理
   */
  cleanup(force = false): { texturesRemoved: number; memoryFreed: number } {
    let texturesRemoved = 0
    let memoryFreed = 0
    const now = Date.now()
    const texturesToRemove: string[] = []

    for (const [id, texture] of this.allTextures) {
      const shouldRemove =
        force || (!texture.inUse && now - texture.lastUsed > this.config.expirationTime)

      if (shouldRemove) {
        texturesToRemove.push(id)
        memoryFreed += texture.memoryUsage
        texturesRemoved++

        if (texture.textureUnit >= 0) {
          this.textureUnitManager.releaseUnit(texture.textureUnit)
        }

        texture.dispose()
        this.emit('texture-disposed', { id, memoryFreed: texture.memoryUsage })
      }
    }

    for (const id of texturesToRemove) {
      this.allTextures.delete(id)
    }

    this.cleanupPoolReferences(texturesToRemove)
    this.currentMemoryUsage -= memoryFreed

    if (texturesRemoved > 0) {
      this.emit('cleanup-performed', { texturesRemoved, memoryFreed })
    }

    return { texturesRemoved, memoryFreed }
  }

  /**
   * 获取池统计信息
   */
  getStats(): {
    totalTextures: number
    memoryUsage: number
    memoryLimit: number
    textureUnits: { available: number; used: number; total: number }
    poolSizes: Record<TextureSizeCategory, number>
  } {
    const poolSizes: Record<TextureSizeCategory, number> = {
      [TextureSizeCategory.SMALL]: 0,
      [TextureSizeCategory.MEDIUM]: 0,
      [TextureSizeCategory.LARGE]: 0,
      [TextureSizeCategory.XLARGE]: 0,
    }

    for (const [category, pools] of this.texturePools) {
      let count = 0
      for (const pool of pools.values()) {
        count += pool.length
      }
      poolSizes[category] = count
    }

    return {
      totalTextures: this.allTextures.size,
      memoryUsage: this.currentMemoryUsage,
      memoryLimit: this.config.memoryLimit,
      textureUnits: this.textureUnitManager.getStats(),
      poolSizes,
    }
  }

  /**
   * 预热纹理池
   */
  async warmupPool(configs: Partial<TextureConfig>[]): Promise<void> {
    const warmupPromises = configs.map(async (config) => {
      try {
        const texture = this.getTexture(config)
        this.releaseTexture(texture)
      } catch (error) {
        console.warn('Failed to warmup texture:', error)
      }
    })

    await Promise.all(warmupPromises)
  }

  /**
   * 销毁纹理池
   */
  dispose(): void {
    this.cleanup(true)
    this.removeAllListeners()
  }

  private createTexture(config: TextureConfig): PooledTexture {
    const gl = this.gl
    const glTexture = gl.createTexture()

    if (!glTexture) {
      throw new Error('Failed to create WebGL texture')
    }

    const id = `texture_${++this.textureIdCounter}`

    gl.bindTexture(gl.TEXTURE_2D, glTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, config.wrapS)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, config.wrapT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, config.minFilter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, config.magFilter)

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
    )

    if (config.generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    const texture = new PooledTextureImpl(gl, id, glTexture, config)
    texture.acquire()

    this.allTextures.set(id, texture)
    this.currentMemoryUsage += texture.memoryUsage

    if (this.config.manageTextureUnits) {
      const unit = this.textureUnitManager.allocateUnit()
      if (unit !== null) {
        texture.textureUnit = unit
        this.textureUnitManager.bindTexture(unit, texture)
      }
    }

    this.emit('texture-created', { id, config })

    if (this.currentMemoryUsage > this.config.memoryLimit * 0.8) {
      this.emit('memory-warning', {
        currentUsage: this.currentMemoryUsage,
        limit: this.config.memoryLimit,
      })
    }

    return texture
  }

  private normalizeConfig(config: Partial<TextureConfig>): TextureConfig {
    const gl = this.gl

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
      flipY: config.flipY ?? true,
    }
  }

  private getConfigKey(config: TextureConfig): string {
    return `${config.width}x${config.height}_${config.format}_${config.type}_${config.generateMipmaps ? 'mip' : 'nomip'}`
  }

  private getSizeCategory(config: TextureConfig): TextureSizeCategory {
    const size = Math.max(config.width, config.height)

    if (size <= 128) return TextureSizeCategory.SMALL
    if (size <= 512) return TextureSizeCategory.MEDIUM
    if (size <= 1024) return TextureSizeCategory.LARGE
    return TextureSizeCategory.XLARGE
  }

  private initializeTexturePools(): void {
    for (const category of Object.values(TextureSizeCategory)) {
      this.texturePools.set(category, new Map())
    }
  }

  private preallocateTextures(): void {
    const commonConfigs: Partial<TextureConfig>[] = [
      { width: 64, height: 64 },
      { width: 128, height: 128 },
      { width: 256, height: 256 },
      { width: 512, height: 512 },
    ]

    setTimeout(() => {
      this.warmupPool(commonConfigs).catch((error) => {
        console.warn('Failed to preallocate textures:', error)
      })
    }, 0)
  }

  private setupCleanupTimer(): void {
    setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }

  private performCleanup(): void {
    this.cleanup()
  }

  private cleanupPoolReferences(removedIds: string[]): void {
    const removedSet = new Set(removedIds)

    for (const pools of this.texturePools.values()) {
      for (const [key, pool] of pools) {
        const filteredPool = pool.filter((texture) => !removedSet.has(texture.id))
        if (filteredPool.length !== pool.length) {
          pools.set(key, filteredPool)
        }
      }
    }
  }
}
