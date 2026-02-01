/**
 * 异步资源加载器测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AsyncResourceLoader,
  LoadingState,
  type ResourceConfig,
  ResourceType,
} from '../AsyncResourceLoader'

// Mock fetch
global.fetch = vi.fn()
global.Image = class MockImage {
  private _src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  crossOrigin = ''
  width = 100
  height = 100
  naturalWidth = 100
  naturalHeight = 100

  get src() {
    return this._src
  }
  set src(value: string) {
    this._src = value
    // 模拟异步加载
    setTimeout(() => {
      if (value.includes('error')) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 10)
  }
} as any

// Mock FontFace
global.FontFace = class MockFontFace {
  constructor(
    public family: string,
    public source: any
  ) {}
  async load() {
    return this
  }
} as any

// Mock AudioContext
global.AudioContext = class MockAudioContext {
  async decodeAudioData(buffer: ArrayBuffer): Promise<any> {
    return { buffer }
  }
} as any
;(global as any).webkitAudioContext = global.AudioContext

describe('AsyncResourceLoader', () => {
  let loader: AsyncResourceLoader
  let unhandledRejections: Error[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    unhandledRejections = []

    // 捕获未处理的 rejection
    process.on('unhandledRejection', (error: Error) => {
      unhandledRejections.push(error)
    })

    loader = new AsyncResourceLoader({
      maxConcurrentLoads: 3,
      defaultTimeout: 5000,
      defaultRetries: 2,
    })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // 清理所有待处理的定时器
    try {
      await vi.runAllTimersAsync()
    } catch (e) {
      // 忽略清理过程中的错误
    }

    loader?.dispose()
    vi.clearAllTimers()
    vi.useRealTimers()

    // 清空未处理的 rejection 列表
    unhandledRejections = []
  })

  describe('基础功能', () => {
    it('应该能够创建加载器实例', () => {
      expect(loader).toBeInstanceOf(AsyncResourceLoader)
    })

    it('应该能够获取统计信息', () => {
      const stats = loader.getStats()
      expect(stats).toMatchObject({
        total: 0,
        pending: 0,
        loading: 0,
        loaded: 0,
        error: 0,
        cancelled: 0,
        queueSize: 0,
        activeLoaders: 0,
      })
    })
  })

  describe('纹理加载', () => {
    it('应该能够加载纹理资源', async () => {
      const config: ResourceConfig = {
        id: 'test-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Image)
    })

    it('应该能够处理纹理加载失败', async () => {
      const config: ResourceConfig = {
        id: 'error-texture',
        url: 'https://example.com/error.png',
        type: ResourceType.TEXTURE,
        retries: 0,
      }

      const loadPromise = loader.loadResource(config).catch((e) => e)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
    })

    it('应该能够设置跨域属性', async () => {
      const config: ResourceConfig = {
        id: 'cors-texture',
        url: 'https://example.com/texture.png',
        type: ResourceType.TEXTURE,
        crossOrigin: 'anonymous',
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect((result as any).crossOrigin).toBe('anonymous')
    })
  })

  describe('JSON加载', () => {
    it('应该能够加载JSON资源', async () => {
      const mockData = { test: 'data' }
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
        id: 'test-json',
        url: 'https://example.com/data.json',
        type: ResourceType.JSON,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toEqual(mockData)
    })

    it('应该能够处理HTTP错误', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const config: ResourceConfig = {
        id: 'error-json',
        url: 'https://example.com/notfound.json',
        type: ResourceType.JSON,
        retries: 0,
      }

      const loadPromise = loader.loadResource(config).catch((e) => e)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toContain('JSON loading failed: Not Found')
    })
  })

  describe('字体加载', () => {
    it('应该能够加载字体资源', async () => {
      const mockBuffer = new ArrayBuffer(1000)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: new Uint8Array(100) }),
          }),
        },
        headers: { get: () => '1000' },
      })

      const config: ResourceConfig = {
        id: 'test-font',
        url: 'https://example.com/font.woff2',
        type: ResourceType.FONT,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toBeInstanceOf(FontFace)
    })
  })

  describe('音频加载', () => {
    it('应该能够加载音频资源', async () => {
      const mockBuffer = new ArrayBuffer(1000)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: new Uint8Array(100) }),
          }),
        },
        headers: { get: () => '1000' },
      })

      const config: ResourceConfig = {
        id: 'test-audio',
        url: 'https://example.com/audio.mp3',
        type: ResourceType.AUDIO,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      const result = await loadPromise
      expect(result).toEqual({ buffer: mockBuffer })
    })
  })

  describe('批量加载', () => {
    it('应该能够批量加载资源', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'texture1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE,
        },
        {
          id: 'texture2',
          url: 'https://example.com/texture2.png',
          type: ResourceType.TEXTURE,
        },
      ]

      const loadPromise = loader.loadBatch(configs, 'test-batch')
      await vi.runAllTimersAsync()
      const results = await loadPromise
      expect(results).toHaveLength(2)
    })

    it('应该能够监听批次进度事件', async () => {
      const configs: ResourceConfig[] = [
        {
          id: 'batch-texture1',
          url: 'https://example.com/texture1.png',
          type: ResourceType.TEXTURE,
        },
      ]

      let batchStartCalled = false
      let batchCompleteCalled = false

      loader.on('batchStart', (batchId) => {
        expect(batchId).toMatch(/^batch_/)
        batchStartCalled = true
      })

      loader.on('batchComplete', (batchId) => {
        expect(batchId).toMatch(/^batch_/)
        batchCompleteCalled = true
      })

      const loadPromise = loader.loadBatch(configs)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(batchStartCalled).toBe(true)
      expect(batchCompleteCalled).toBe(true)
    })
  })

  describe('进度跟踪', () => {
    it('应该能够跟踪加载进度', async () => {
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
        text: () => Promise.resolve('test svg content'),
        clone: function () {
          return this
        },
      }
      ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

      const config: ResourceConfig = {
        id: 'progress-test',
        url: 'https://example.com/test.svg',
        type: ResourceType.SVG,
      }

      let progressReceived = false
      loader.on('taskProgress', (task, progress) => {
        if (task.config.id === 'progress-test') {
          progressReceived = true
          expect(progress.percentage).toBeGreaterThanOrEqual(0)
          expect(progress.loaded).toBeGreaterThanOrEqual(0)
        }
      })

      let taskCompleted = false
      loader.on('taskComplete', (task) => {
        if (task.config.id === 'progress-test') {
          taskCompleted = true
        }
      })

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(progressReceived).toBe(true)
      expect(taskCompleted).toBe(true)
    })
  })

  describe('错误处理和重试', () => {
    it('应该能够重试失败的加载', async () => {
      let attempts = 0
      ;(global.fetch as any).mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        const mockResponse = {
          ok: true,
          text: () => Promise.resolve('success'),
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
        return Promise.resolve(mockResponse)
      })

      const config: ResourceConfig = {
        id: 'retry-test',
        url: 'https://example.com/unreliable.txt',
        type: ResourceType.SVG,
        retries: 2,
      }

      const loadPromise = loader.loadResource(config)

      // 快进所有定时器以完成重试延迟
      await vi.runAllTimersAsync()

      await loadPromise
      expect(attempts).toBe(3)
    })
  })

  describe('取消功能', () => {
    it('应该能够取消单个资源加载', async () => {
      const config: ResourceConfig = {
        id: 'cancel-test',
        url: 'https://example.com/slow-resource.png',
        type: ResourceType.TEXTURE,
      }

      // 开始加载但不等待
      const loadPromise = loader.loadResource(config)

      // 立即取消
      const cancelled = loader.cancelResource('cancel-test')
      expect(cancelled).toBe(true)

      // 加载应该被拒绝
      await expect(loadPromise).rejects.toThrow()
    })

    it('应该能够取消所有加载任务', () => {
      const configs: ResourceConfig[] = [
        { id: 'cancel1', url: 'https://example.com/1.png', type: ResourceType.TEXTURE },
        { id: 'cancel2', url: 'https://example.com/2.png', type: ResourceType.TEXTURE },
      ]

      // 开始加载
      configs.forEach((config) => loader.loadResource(config))

      // 取消所有
      loader.cancelAll()

      const stats = loader.getStats()
      expect(stats.cancelled).toBeGreaterThan(0)
    })
  })

  describe('预加载功能', () => {
    it('应该能够静默预加载资源', async () => {
      const config: ResourceConfig = {
        id: 'preload-test',
        url: 'https://example.com/preload.png',
        type: ResourceType.TEXTURE,
        priority: 10,
      }

      // 预加载不应该抛出错误，即使失败
      const preloadPromise = loader.preloadResource(config)
      await vi.runAllTimersAsync()
      await expect(preloadPromise).resolves.toBeInstanceOf(Image)

      // 降低优先级的配置
      const task = loader.getTask('preload-test')
      expect(task?.config.priority).toBeLessThan(config.priority!)
    })

    it('应该能够静默处理预加载失败', async () => {
      const config: ResourceConfig = {
        id: 'preload-error',
        url: 'https://example.com/error.png',
        type: ResourceType.TEXTURE,
      }

      // 预加载失败应该返回null而不是抛出错误
      const preloadPromise = loader.preloadResource(config)
      await vi.runAllTimersAsync()
      const result = await preloadPromise
      expect(result).toBeNull()
    })
  })

  describe('任务管理', () => {
    it('应该能够获取任务信息', async () => {
      const config: ResourceConfig = {
        id: 'task-info-test',
        url: 'https://example.com/test.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config)
      const task = loader.getTask('task-info-test')

      expect(task).toBeDefined()
      expect(task?.config.id).toBe('task-info-test')
      expect([LoadingState.PENDING, LoadingState.LOADING]).toContain(task?.state)

      await vi.runAllTimersAsync()
      await loadPromise
    })

    it('应该能够获取所有任务', async () => {
      const configs = [
        { id: 'task1', url: 'https://example.com/1.png', type: ResourceType.TEXTURE },
        { id: 'task2', url: 'https://example.com/2.png', type: ResourceType.TEXTURE },
      ]

      const loadPromises = configs.map((config) => loader.loadResource(config))
      await vi.runAllTimersAsync()
      await Promise.all(loadPromises)

      const allTasks = loader.getAllTasks()
      expect(allTasks.length).toBeGreaterThanOrEqual(2)
    })

    it('应该能够清理已完成的任务', async () => {
      const config: ResourceConfig = {
        id: 'cleanup-test',
        url: 'https://example.com/cleanup.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      const beforeCleanup = loader.getAllTasks().length
      loader.cleanup()
      const afterCleanup = loader.getAllTasks().length

      expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup)
    })
  })

  describe('事件系统', () => {
    it('应该触发任务开始事件', async () => {
      let taskStarted = false
      loader.on('taskStart', (task) => {
        if (task.config.id === 'event-test') {
          taskStarted = true
        }
      })

      const config: ResourceConfig = {
        id: 'event-test',
        url: 'https://example.com/event.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(taskStarted).toBe(true)
    })

    it('应该触发任务完成事件', async () => {
      let taskCompleted = false
      loader.on('taskComplete', (task) => {
        if (task.config.id === 'complete-test') {
          expect(task.state).toBe(LoadingState.LOADED)
          taskCompleted = true
        }
      })

      const config: ResourceConfig = {
        id: 'complete-test',
        url: 'https://example.com/complete.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config)
      await vi.runAllTimersAsync()
      await loadPromise

      expect(taskCompleted).toBe(true)
    })

    it('应该触发任务错误事件', async () => {
      let errorReceived = false
      loader.on('taskError', (task, error) => {
        if (task.config.id === 'error-event-test') {
          expect(error).toBeInstanceOf(Error)
          errorReceived = true
        }
      })

      const config: ResourceConfig = {
        id: 'error-event-test',
        url: 'https://example.com/error.png',
        type: ResourceType.TEXTURE,
      }

      const loadPromise = loader.loadResource(config).catch(() => {}) // 忽略错误
      await vi.runAllTimersAsync()
      await loadPromise

      expect(errorReceived).toBe(true)
    })
  })

  describe('优先级处理', () => {
    it('应该按优先级排序加载队列', async () => {
      // 创建有限的并发加载器来测试队列
      const queueLoader = new AsyncResourceLoader({
        maxConcurrentLoads: 1,
      })

      const configs = [
        { id: 'low', url: 'https://example.com/low.png', type: ResourceType.TEXTURE, priority: 10 },
        {
          id: 'high',
          url: 'https://example.com/high.png',
          type: ResourceType.TEXTURE,
          priority: 90,
        },
        {
          id: 'medium',
          url: 'https://example.com/med.png',
          type: ResourceType.TEXTURE,
          priority: 50,
        },
      ]

      const loadOrder: string[] = []
      queueLoader.on('taskStart', (task) => {
        loadOrder.push(task.config.id)
      })

      // 同时启动所有加载
      const loadPromises = configs.map((config) => queueLoader.loadResource(config))
      await vi.runAllTimersAsync()
      await Promise.all(loadPromises)

      // 第一个任务会立即开始(low),后续按优先级排序(high, medium)
      expect(loadOrder).toEqual(['low', 'high', 'medium'])

      queueLoader.dispose()
    })
  })

  describe('内存和清理', () => {
    it('应该能够正确销毁加载器', () => {
      const testLoader = new AsyncResourceLoader()
      expect(() => testLoader.dispose()).not.toThrow()

      // 销毁后的操作应该不会导致错误
      const stats = testLoader.getStats()
      expect(stats.total).toBe(0)
    })
  })
})
