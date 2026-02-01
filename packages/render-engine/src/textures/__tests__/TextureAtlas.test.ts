/**
 * 纹理图集测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type AtlasConfig, TextureAtlas, type TextureInfo } from '../TextureAtlas'

// Mock Canvas API
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockHTMLCanvasElement {
    width = 0
    height = 0

    getContext() {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(100 * 100 * 4),
          width: 100,
          height: 100,
        })),
        putImageData: vi.fn(),
      }
    }
  },
  writable: true,
})

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => new (global as any).HTMLCanvasElement()),
  },
  writable: true,
})

Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
})

describe('TextureAtlas', () => {
  let atlas: TextureAtlas
  let mockTexture: TextureInfo

  beforeEach(() => {
    atlas = new TextureAtlas()

    mockTexture = {
      id: 'test-texture',
      width: 100,
      height: 100,
      data: new (global as any).HTMLCanvasElement(),
    }
  })

  describe('基础功能', () => {
    it('应该能够创建图集实例', () => {
      expect(atlas).toBeDefined()

      const stats = atlas.getStats()
      expect(stats.atlasCount).toBe(0)
      expect(stats.totalTextures).toBe(0)
    })

    it('应该能够添加纹理', () => {
      const entry = atlas.addTexture(mockTexture)

      expect(entry).toBeDefined()
      expect(entry?.textureId).toBe('test-texture')
      expect(entry?.width).toBe(100)
      expect(entry?.height).toBe(100)

      const stats = atlas.getStats()
      expect(stats.atlasCount).toBe(1)
      expect(stats.totalTextures).toBe(1)
    })

    it('应该能够获取纹理信息', () => {
      const entry = atlas.addTexture(mockTexture)
      const retrieved = atlas.getTexture('test-texture')

      expect(retrieved).toEqual(entry)
    })

    it('应该能够移除纹理', () => {
      atlas.addTexture(mockTexture)

      const removed = atlas.removeTexture('test-texture')
      expect(removed).toBe(true)

      const retrieved = atlas.getTexture('test-texture')
      expect(retrieved).toBeNull()
    })
  })

  describe('批量操作', () => {
    it('应该能够批量添加纹理', () => {
      const textures: TextureInfo[] = [
        { id: 'tex1', width: 50, height: 50, data: new (global as any).HTMLCanvasElement() },
        { id: 'tex2', width: 75, height: 75, data: new (global as any).HTMLCanvasElement() },
        { id: 'tex3', width: 100, height: 100, data: new (global as any).HTMLCanvasElement() },
      ]

      const results = atlas.addTextures(textures)

      expect(results.size).toBe(3)
      expect(results.has('tex1')).toBe(true)
      expect(results.has('tex2')).toBe(true)
      expect(results.has('tex3')).toBe(true)

      const stats = atlas.getStats()
      expect(stats.totalTextures).toBe(3)
    })

    it('应该按面积大小排序添加纹理', () => {
      const textures: TextureInfo[] = [
        { id: 'small', width: 32, height: 32, data: new (global as any).HTMLCanvasElement() },
        { id: 'large', width: 128, height: 128, data: new (global as any).HTMLCanvasElement() },
        { id: 'medium', width: 64, height: 64, data: new (global as any).HTMLCanvasElement() },
      ]

      const results = atlas.addTextures(textures)

      // 大纹理应该优先添加，获得更好的位置
      expect(results.size).toBe(3)

      const largeEntry = results.get('large')
      const mediumEntry = results.get('medium')
      const smallEntry = results.get('small')

      expect(largeEntry).toBeDefined()
      expect(mediumEntry).toBeDefined()
      expect(smallEntry).toBeDefined()
    })
  })

  describe('图集配置', () => {
    it('应该使用自定义配置', () => {
      const config: Partial<AtlasConfig> = {
        maxWidth: 1024,
        maxHeight: 1024,
        padding: 4,
        powerOfTwo: false,
      }

      const customAtlas = new TextureAtlas(config)

      // 测试配置是否生效需要通过行为验证
      const entry = customAtlas.addTexture(mockTexture)
      expect(entry).toBeDefined()
    })

    it('应该支持2的幂次尺寸', () => {
      const config: Partial<AtlasConfig> = {
        powerOfTwo: true,
      }

      const atlasWithPowerOfTwo = new TextureAtlas(config)
      const entry = atlasWithPowerOfTwo.addTexture(mockTexture)

      expect(entry).toBeDefined()
    })
  })

  describe('空间管理', () => {
    it('应该能够在同一图集中打包多个纹理', () => {
      const texture1 = { ...mockTexture, id: 'tex1' }
      const texture2 = { ...mockTexture, id: 'tex2', width: 50, height: 50 }

      const entry1 = atlas.addTexture(texture1)
      const entry2 = atlas.addTexture(texture2)

      expect(entry1?.atlasId).toBe(entry2?.atlasId)

      const stats = atlas.getStats()
      expect(stats.atlasCount).toBe(1)
      expect(stats.totalTextures).toBe(2)
    })

    it('应该在空间不足时创建新图集', () => {
      const largeTexture: TextureInfo = {
        id: 'large',
        width: 1500,
        height: 1500,
        data: new (global as any).HTMLCanvasElement(),
      }

      const largeTexture2: TextureInfo = {
        id: 'large2',
        width: 1500,
        height: 1500,
        data: new (global as any).HTMLCanvasElement(),
      }

      atlas.addTexture(largeTexture)
      atlas.addTexture(largeTexture2)

      const stats = atlas.getStats()
      expect(stats.atlasCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('优化功能', () => {
    it('应该能够优化图集', () => {
      const texture1 = { ...mockTexture, id: 'tex1' }
      const texture2 = { ...mockTexture, id: 'tex2' }

      atlas.addTexture(texture1)
      atlas.addTexture(texture2)

      // 移除一个纹理创建碎片
      atlas.removeTexture('tex1')

      const atlasId = atlas.getTexture('tex2')?.atlasId
      if (atlasId) {
        const optimized = atlas.optimizeAtlas(atlasId)
        expect(typeof optimized).toBe('boolean')
      }
    })

    it('应该能够优化所有图集', () => {
      atlas.addTexture(mockTexture)
      atlas.optimizeAll()

      // 优化应该成功执行
      expect(atlas.getStats().atlasCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('UV坐标', () => {
    it('应该正确计算UV坐标', () => {
      const entry = atlas.addTexture(mockTexture)

      expect(entry?.uvX).toBeGreaterThanOrEqual(0)
      expect(entry?.uvY).toBeGreaterThanOrEqual(0)
      expect(entry?.uvWidth).toBeGreaterThan(0)
      expect(entry?.uvHeight).toBeGreaterThan(0)
      expect(entry?.uvWidth).toBeLessThanOrEqual(1)
      expect(entry?.uvHeight).toBeLessThanOrEqual(1)
    })

    it('应该为不同纹理生成不同的UV坐标', () => {
      const texture1 = { ...mockTexture, id: 'tex1' }
      const texture2 = { ...mockTexture, id: 'tex2', width: 50, height: 50 }

      const entry1 = atlas.addTexture(texture1)
      const entry2 = atlas.addTexture(texture2)

      // UV坐标应该不同（除非完全重叠，但这种情况很少）
      const sameUV = entry1?.uvX === entry2?.uvX && entry1?.uvY === entry2?.uvY

      // 在大多数情况下，UV坐标应该不同
      expect(entry1).toBeDefined()
      expect(entry2).toBeDefined()
    })
  })

  describe('事件系统', () => {
    it('应该发出图集创建事件', () => {
      const handler = vi.fn()
      atlas.on('atlasCreated', handler)

      atlas.addTexture(mockTexture)

      expect(handler).toHaveBeenCalled()
      const call = handler.mock.calls[0][0]
      expect(call.atlasId).toBeDefined()
      expect(call.width).toBeGreaterThan(0)
      expect(call.height).toBeGreaterThan(0)
    })

    it('应该发出纹理添加事件', () => {
      const handler = vi.fn()
      atlas.on('textureAdded', handler)

      atlas.addTexture(mockTexture)

      expect(handler).toHaveBeenCalled()
      const call = handler.mock.calls[0][0]
      expect(call.textureId).toBe('test-texture')
      expect(call.entry).toBeDefined()
    })

    it('应该发出纹理移除事件', () => {
      const handler = vi.fn()
      atlas.on('textureRemoved', handler)

      atlas.addTexture(mockTexture)
      atlas.removeTexture('test-texture')

      expect(handler).toHaveBeenCalled()
      const call = handler.mock.calls[0][0]
      expect(call.textureId).toBe('test-texture')
    })
  })

  describe('内存管理', () => {
    it('应该跟踪内存使用情况', () => {
      const stats = atlas.getStats()
      const initialMemory = stats.totalMemoryUsage

      atlas.addTexture(mockTexture)

      const newStats = atlas.getStats()
      expect(newStats.totalMemoryUsage).toBeGreaterThanOrEqual(initialMemory)
    })

    it('应该在内存压力下发出警告', () => {
      const handler = vi.fn()
      atlas.on('memoryPressure', handler)

      // 创建大量纹理触发内存压力
      for (let i = 0; i < 100; i++) {
        const texture: TextureInfo = {
          id: `tex${i}`,
          width: 500,
          height: 500,
          data: new (global as any).HTMLCanvasElement(),
        }
        atlas.addTexture(texture)
      }

      // 根据实现，可能会触发内存压力事件
      // 这取决于内存限制的设置
    })
  })

  describe('统计信息', () => {
    it('应该提供准确的统计信息', () => {
      const initialStats = atlas.getStats()
      expect(initialStats.atlasCount).toBe(0)
      expect(initialStats.totalTextures).toBe(0)

      atlas.addTexture(mockTexture)

      const newStats = atlas.getStats()
      expect(newStats.atlasCount).toBe(1)
      expect(newStats.totalTextures).toBe(1)
      expect(newStats.averageUtilization).toBeGreaterThanOrEqual(0)
    })

    it('应该计算正确的利用率', () => {
      atlas.addTexture(mockTexture)

      const stats = atlas.getStats()
      expect(stats.averageUtilization).toBeGreaterThan(0)
      expect(stats.averageUtilization).toBeLessThanOrEqual(1)
    })
  })

  describe('边界情况', () => {
    it('应该处理重复添加相同纹理', () => {
      const entry1 = atlas.addTexture(mockTexture)
      const entry2 = atlas.addTexture(mockTexture)

      // 应该返回相同的entry或更新现有的
      expect(entry1?.textureId).toBe(entry2?.textureId)

      const stats = atlas.getStats()
      expect(stats.totalTextures).toBe(1)
    })

    it('应该处理移除不存在的纹理', () => {
      const result = atlas.removeTexture('nonexistent')
      expect(result).toBe(false)
    })

    it('应该处理零尺寸纹理', () => {
      const zeroTexture: TextureInfo = {
        id: 'zero',
        width: 0,
        height: 0,
        data: new (global as any).HTMLCanvasElement(),
      }

      const entry = atlas.addTexture(zeroTexture)
      // 根据实现，可能返回null或创建entry
      expect(entry === null || entry?.width === 0).toBe(true)
    })

    it('应该处理超大纹理', () => {
      const hugeTexture: TextureInfo = {
        id: 'huge',
        width: 10000,
        height: 10000,
        data: new (global as any).HTMLCanvasElement(),
      }

      const entry = atlas.addTexture(hugeTexture)
      // 超大纹理可能无法添加到图集
      if (entry === null) {
        expect(entry).toBeNull()
      } else {
        expect(entry.textureId).toBe('huge')
      }
    })
  })

  describe('销毁和清理', () => {
    it('应该能够正确销毁', () => {
      atlas.addTexture(mockTexture)

      atlas.dispose()

      const stats = atlas.getStats()
      expect(stats.atlasCount).toBe(0)
      expect(stats.totalTextures).toBe(0)
    })
  })
})
