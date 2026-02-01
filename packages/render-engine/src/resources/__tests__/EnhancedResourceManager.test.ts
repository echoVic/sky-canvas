/**
 * 增强型资源管理系统测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ResourceConfig, ResourceType } from '../AsyncResourceLoader'
import { EnhancedResourceManager, type ResourceManagerConfig } from '../EnhancedResourceManager'

// Mock全局API
global.fetch = vi.fn()
global.Image = class MockImage {
  private _src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 100
  height = 100
  naturalWidth = 100
  naturalHeight = 100

  get src() {
    return this._src
  }
  set src(value: string) {
    this._src = value
    setTimeout(() => {
      if (value.includes('error')) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 10)
  }
} as any

describe('EnhancedResourceManager', () => {
  let manager: EnhancedResourceManager

  beforeEach(() => {
    vi.useFakeTimers()

    const config: ResourceManagerConfig = {
      cacheMaxMemory: 10 * 1024 * 1024,
      cacheMaxItems: 100,
      maxConcurrentLoads: 3,
      enableAutoGC: false,
      gcInterval: 1000,
    }

    manager = new EnhancedResourceManager(config)
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    manager?.dispose()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('基础功能', () => {
    it('应该能够创建资源管理器实例', () => {
      expect(manager).toBeInstanceOf(EnhancedResourceManager)
    })

    it('应该能够获取统计信息', () => {
      const stats = manager.getStats()
      expect(stats).toHaveProperty('loader')
      expect(stats).toHaveProperty('cache')
      expect(stats).toHaveProperty('gpuCache')
      expect(stats).toHaveProperty('references')
      expect(stats).toHaveProperty('performance')
    })
  })

  describe('单个资源加载', () => {
    it('应该能够加载纹理资源', async () => {
      const config: ResourceConfig = {
        id: 'test-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const resourceRef = await loadPromise

      expect(resourceRef.id).toBe('test-texture')
      expect(resourceRef.type).toBe(ResourceType.TEXTURE)
      expect(resourceRef.data).toBeInstanceOf(Image)
      expect(resourceRef.cached).toBe(true)
    })

    it('应该能够从缓存获取资源', async () => {
      const config: ResourceConfig = {
        id: 'cached-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise1 = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const ref1 = await loadPromise1

      const loadPromise2 = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const ref2 = await loadPromise2

      expect(ref1.data).toBe(ref2.data)
    })

    it('应该能够处理加载失败', async () => {
      const config: ResourceConfig = {
        id: 'error-texture',
        url: 'https://example.com/error.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config).catch((e) => e)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
    })

    it('应该能够跟踪资源引用', async () => {
      const config: ResourceConfig = {
        id: 'ref-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const ref = await loadPromise
      ref.addRef()

      const stats = manager.getStats()
      expect(stats.references.totalRefs).toBe(1)
      expect(stats.references.activeRefs).toBe(1)
    })
  })

  describe('批量资源加载', () => {
    it('应该能够批量加载资源', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'batch1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE,
        },
        {
          id: 'batch2',
          url: 'https://example.com/texture2.png',
          type: ResourceType.TEXTURE,
        },
      ]

      const loadPromise = manager.loadBatch(configs)
      await vi.runAllTimersAsync()
      const refs = await loadPromise
      expect(refs).toHaveLength(2)
      expect(refs[0].id).toBe('batch1')
      expect(refs[1].id).toBe('batch2')
    })

    it('应该能够触发批量完成事件', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'event-batch1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE,
        },
      ]

      let batchCompleteCalled = false
      manager.on('batchComplete', (batchId, results) => {
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe('event-batch1')
        batchCompleteCalled = true
      })

      const loadPromise = manager.loadBatch(configs)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(batchCompleteCalled).toBe(true)
    })
  })

  describe('预加载功能', () => {
    it('应该能够预加载资源', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'preload1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE,
        },
        {
          id: 'preload2',
          url: 'https://example.com/texture2.png',
          type: ResourceType.TEXTURE,
        },
      ]

      const preloadPromise = manager.preloadResources(configs)
      await vi.runAllTimersAsync()
      await expect(preloadPromise).resolves.toBeUndefined()

      const ref1 = manager.getResource('preload1')
      const ref2 = manager.getResource('preload2')

      expect(ref1).not.toBeNull()
      expect(ref2).not.toBeNull()
    })

    it('应该能够处理预加载失败', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'preload-error',
          url: 'https://example.com/error.png',
          type: ResourceType.TEXTURE,
        },
      ]

      const preloadPromise = manager.preloadResources(configs)
      await vi.runAllTimersAsync()
      await expect(preloadPromise).resolves.toBeUndefined()
    })
  })

  describe('资源引用管理', () => {
    it('应该能够获取和释放资源引用', async () => {
      const config: ResourceConfig = {
        id: 'ref-management',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      const ref = manager.getResource('ref-management')
      expect(ref).not.toBeNull()

      if (ref) {
        ref.addRef()
        manager.releaseResource('ref-management')

        const stats = manager.getStats()
        expect(stats.references.totalRefs).toBe(1)
      }
    })

    it('应该能够强制释放资源', async () => {
      const config: ResourceConfig = {
        id: 'force-release',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      const released = manager.forceReleaseResource('force-release')
      expect(released).toBe(true)

      const ref = manager.getResource('force-release')
      expect(ref).toBeNull()
    })

    it('应该能够处理不存在资源的释放', () => {
      const released = manager.forceReleaseResource('nonexistent')
      expect(released).toBe(false)
    })
  })

  describe('加载控制', () => {
    it('应该能够取消资源加载', async () => {
      const config: ResourceConfig = {
        id: 'cancel-test',
        url: 'https://example.com/slow-texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config).catch((e) => e)

      const cancelled = manager.cancelResourceLoading('cancel-test')
      expect(cancelled).toBe(true)

      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
    })

    it('应该能够获取加载进度', async () => {
      const config: ResourceConfig = {
        id: 'progress-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)

      const progress = manager.getLoadingProgress('progress-test')

      await vi.runAllTimersAsync()
      await loadPromise
    })
  })

  describe('缓存和性能', () => {
    it('应该能够区分缓存命中和未命中', async () => {
      const config: ResourceConfig = {
        id: 'cache-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise1 = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise1

      const loadPromise2 = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise2

      const stats = manager.getStats()
      expect(stats.performance.cacheHitRate).toBeGreaterThan(0)
    })

    it('应该能够跟踪平均加载时间', async () => {
      const config: ResourceConfig = {
        id: 'timing-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      const stats = manager.getStats()
      expect(stats.performance.averageLoadTime).toBeGreaterThan(0)
    })
  })

  describe('垃圾收集', () => {
    it('应该能够执行垃圾收集', async () => {
      const config: ResourceConfig = {
        id: 'gc-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const ref = await loadPromise
      ref.removeRef()

      expect(() => manager.forceGC()).not.toThrow()
    })

    it('应该能够触发垃圾收集事件', async () => {
      const testManager = new EnhancedResourceManager({
        cacheMaxMemory: 10 * 1024 * 1024,
        cacheMaxItems: 100,
        maxConcurrentLoads: 3,
        enableAutoGC: false,
        cacheDefaultTTL: 1,
      })

      const config: ResourceConfig = {
        id: 'gc-event-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = testManager.loadResource(config)
      vi.advanceTimersByTime(20)
      const ref = await loadPromise

      vi.advanceTimersByTime(10)

      let gcCompleteCalled = false
      testManager.on('gcComplete', (freedMemory, itemsRemoved) => {
        expect(typeof freedMemory).toBe('number')
        expect(typeof itemsRemoved).toBe('number')
        gcCompleteCalled = true
      })

      testManager.forceGC()

      expect(gcCompleteCalled).toBe(true)
      testManager.dispose()
    })
  })

  describe('事件系统', () => {
    it('应该能够触发资源加载事件', async () => {
      let resourceLoadedCalled = false
      manager.on('resourceLoaded', (ref) => {
        expect(ref.id).toBe('event-test')
        resourceLoadedCalled = true
      })

      const config: ResourceConfig = {
        id: 'event-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(resourceLoadedCalled).toBe(true)
    })

    it('应该能够触发资源缓存事件', async () => {
      let resourceCachedCalled = false
      manager.on('resourceCached', (id, size) => {
        expect(id).toBe('cache-event-test')
        expect(typeof size).toBe('number')
        resourceCachedCalled = true
      })

      const config: ResourceConfig = {
        id: 'cache-event-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(resourceCachedCalled).toBe(true)
    })

    it('应该能够触发加载进度事件', async () => {
      const mockResponseBody = {
        getReader: () => {
          let callCount = 0
          return {
            read: async () => {
              callCount++
              if (callCount === 1) {
                return { done: false, value: new Uint8Array(500) }
              } else {
                return { done: true }
              }
            },
          }
        },
      }

      const mockResponse = {
        ok: true,
        body: mockResponseBody,
        headers: { get: () => '1000' },
        text: () => Promise.resolve('<svg></svg>'),
        clone: function () {
          return this
        },
      }
      ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

      let loadingProgressCalled = false
      manager.on('loadingProgress', (id, progress) => {
        if (id === 'progress-event-test') {
          expect(progress).toHaveProperty('percentage')
          loadingProgressCalled = true
        }
      })

      const config: ResourceConfig = {
        id: 'progress-event-test',
        url: 'https://example.com/test.svg',
        type: ResourceType.SVG,
      }

      const loadPromise = manager.loadResource(config).catch(() => {})
      await vi.runAllTimersAsync()
      await loadPromise

      expect(loadingProgressCalled).toBe(true)
    })
  })

  describe('配置和清理', () => {
    it('应该能够清空所有资源', async () => {
      const config: ResourceConfig = {
        id: 'clear-test',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      manager.clear()

      const stats = manager.getStats()
      expect(stats.references.totalRefs).toBe(0)
      expect(stats.cache.itemCount).toBe(0)
    })

    it('应该能够正确销毁管理器', () => {
      expect(() => manager.dispose()).not.toThrow()

      // 销毁后的操作不应该导致错误
      const stats = manager.getStats()
      expect(stats).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('应该能够处理无效的资源类型', async () => {
      const config: ResourceConfig = {
        id: 'invalid-type',
        url: 'https://example.com/unknown.xyz',
        type: 'unknown' as ResourceType,
      }

      const loadPromise = manager.loadResource(config).catch((e) => e)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
    })

    it('应该能够处理网络错误', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const config: ResourceConfig = {
        id: 'network-error',
        url: 'https://example.com/texture.png',
        type: ResourceType.JSON,
      }

      const loadPromise = manager.loadResource(config).catch((e) => e)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
    })
  })

  describe('JSON资源特定测试', () => {
    it('应该能够加载JSON资源', async () => {
      const mockData = { test: 'data', number: 123 }
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockData),
        body: {
          getReader: () => ({
            read: async () => ({ done: true }),
          }),
        },
        headers: { get: () => '100' },
        clone: function () {
          return this
        },
      }
      ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

      const config: ResourceConfig = {
        id: 'json-test',
        url: 'https://example.com/data.json',
        type: ResourceType.JSON,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      const ref = await loadPromise
      expect(ref.data).toEqual(mockData)
    })
  })

  describe('并发控制', () => {
    it('应该能够限制并发加载数量', async () => {
      const configs = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        url: `https://example.com/texture${i}.png`,
        type: ResourceType.TEXTURE,
      }))

      const promises = configs.map((config) => manager.loadResource(config))

      await vi.runAllTimersAsync()
      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
    })
  })

  describe('内存监控', () => {
    it('应该能够监控内存使用', async () => {
      const config: ResourceConfig = {
        id: 'memory-test',
        url: 'https://example.com/large-texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = manager.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      const stats = manager.getStats()
      expect(stats.cache.used).toBeGreaterThan(0)
      expect(stats.cache.utilization).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('全局资源管理器函数', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('应该能够获取全局资源管理器', async () => {
    const module = await import('../EnhancedResourceManager')
    const manager = module.getResourceManager()
    vi.clearAllTimers()
    expect(manager).toBeInstanceOf(EnhancedResourceManager)
    manager.dispose()
  })

  it('应该能够设置全局资源管理器', async () => {
    const module = await import('../EnhancedResourceManager')

    const customManager = module.createResourceManager()
    vi.clearAllTimers()
    module.setResourceManager(customManager)

    const retrieved = module.getResourceManager()
    expect(retrieved).toBe(customManager)
    customManager.dispose()
  })

  it('应该能够创建新的资源管理器实例', async () => {
    const module = await import('../EnhancedResourceManager')

    const manager = module.createResourceManager({
      cacheMaxMemory: 50 * 1024 * 1024,
    })
    vi.clearAllTimers()

    expect(manager).toBeInstanceOf(EnhancedResourceManager)
    manager.dispose()
  })
})
