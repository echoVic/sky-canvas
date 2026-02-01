import { beforeEach, describe, expect, test, vi } from 'vitest'
import { LayerCache } from '../LayerCache'

describe('LayerCache', () => {
  let layerCache: LayerCache

  beforeEach(() => {
    layerCache = new LayerCache()
  })

  test('should cache layer and return cached canvas', () => {
    // Mock renderable objects
    const mockRenderables: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: vi.fn(),
      },
    ]

    const canvas = layerCache.cacheLayer('test-layer', mockRenderables)
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.width).toBe(50)
    expect(canvas.height).toBe(50)
  })

  test('should invalidate cache', () => {
    const mockRenderables: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: vi.fn(),
      },
    ]

    // Cache layer
    layerCache.cacheLayer('test-layer', mockRenderables)
    expect(layerCache.getCacheMemoryUsage()).toBeGreaterThan(0)

    // Invalidate cache
    layerCache.invalidateCache('test-layer')
    expect(layerCache.getCacheMemoryUsage()).toBe(0)
  })

  test('should get cache memory usage', () => {
    const initialUsage = layerCache.getCacheMemoryUsage()
    expect(typeof initialUsage).toBe('number')
    expect(initialUsage).toBe(0)
  })

  test('should get cache hit rate', () => {
    const hitRate = layerCache.getCacheHitRate()
    expect(typeof hitRate).toBe('number')
  })

  test('should cleanup expired cache', () => {
    // Modify cache policy for testing
    ;(layerCache as any).cachePolicy.ttl = 10

    const mockRenderables: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: vi.fn(),
      },
    ]

    layerCache.cacheLayer('test-layer', mockRenderables)
    expect(layerCache.getCacheMemoryUsage()).toBeGreaterThan(0)

    // Wait for expiration and cleanup
    setTimeout(() => {
      ;(layerCache as any).cleanupExpiredCache()
      expect(layerCache.getCacheMemoryUsage()).toBe(0)
    }, 20)
  })
})
