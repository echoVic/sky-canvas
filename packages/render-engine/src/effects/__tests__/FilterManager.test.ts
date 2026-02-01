/**
 * 滤镜管理器测试
 */

import { FilterManager } from '../FilterManager'
import {
  type BrightnessParameters,
  type ContrastParameters,
  type FilterParameters,
  FilterType,
  type GaussianBlurParameters,
  type SaturationParameters,
} from '../types/FilterTypes'
import './setup'

describe('FilterManager', () => {
  let filterManager: FilterManager

  beforeEach(() => {
    filterManager = new FilterManager()
  })

  afterEach(() => {
    filterManager.dispose()
  })

  it('应该正确初始化并注册基础滤镜', () => {
    const availableFilters = filterManager.getAvailableFilters()

    expect(availableFilters).toContain(FilterType.GAUSSIAN_BLUR)
    expect(availableFilters).toContain(FilterType.BRIGHTNESS)
    expect(availableFilters).toContain(FilterType.CONTRAST)
    expect(availableFilters).toContain(FilterType.SATURATION)
    expect(availableFilters).toContain(FilterType.HUE_ROTATE)
    expect(availableFilters).toContain(FilterType.GRAYSCALE)
  })

  it('应该能够获取特定滤镜', () => {
    const blurFilter = filterManager.getFilter(FilterType.GAUSSIAN_BLUR)
    expect(blurFilter).toBeDefined()
    expect(blurFilter!.type).toBe(FilterType.GAUSSIAN_BLUR)
  })

  it('应该能够应用单个滤镜', async () => {
    const imageData = new ImageData(10, 10)
    // 设置测试数据
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 100
      imageData.data[i + 1] = 150
      imageData.data[i + 2] = 200
      imageData.data[i + 3] = 255
    }

    const params: BrightnessParameters = {
      type: FilterType.BRIGHTNESS,
      brightness: 50,
      opacity: 1,
      enabled: true,
    }

    const result = await filterManager.applyFilter(imageData, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData).toBeDefined()
    expect(result.processingTime).toBeGreaterThan(0)
  })

  it('当滤镜不存在时应该返回错误', async () => {
    const imageData = new ImageData(10, 10)

    const params = {
      type: 'nonexistent-filter' as FilterType,
      enabled: true,
      opacity: 1,
    } as FilterParameters

    const result = await filterManager.applyFilter(imageData, params)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('当滤镜禁用时应该跳过处理', async () => {
    const imageData = new ImageData(10, 10)

    const params: BrightnessParameters = {
      type: FilterType.BRIGHTNESS,
      brightness: 50,
      opacity: 1,
      enabled: false,
    }

    const result = await filterManager.applyFilter(imageData, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData).toBe(imageData)
    expect(result.processingTime).toBe(0)
  })

  it('应该能够应用滤镜链', async () => {
    const imageData = new ImageData(10, 10)
    // 设置测试数据
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 128
      imageData.data[i + 1] = 128
      imageData.data[i + 2] = 128
      imageData.data[i + 3] = 255
    }

    const config = {
      filters: [
        {
          type: FilterType.BRIGHTNESS,
          brightness: 20,
          opacity: 1,
          enabled: true,
          priority: 1,
        } as BrightnessParameters,
        {
          type: FilterType.CONTRAST,
          contrast: 15,
          opacity: 1,
          enabled: true,
          priority: 2,
        } as ContrastParameters,
      ],
    }

    const results = await filterManager.applyFilterChain(imageData, config)

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })

  it('应该按优先级排序滤镜', async () => {
    const imageData = new ImageData(5, 5)

    const config = {
      filters: [
        {
          type: FilterType.BRIGHTNESS,
          brightness: 10,
          opacity: 1,
          enabled: true,
          priority: 1,
        } as BrightnessParameters,
        {
          type: FilterType.CONTRAST,
          contrast: 10,
          opacity: 1,
          enabled: true,
          priority: 3, // 更高优先级，应该先执行
        } as ContrastParameters,
        {
          type: FilterType.SATURATION,
          saturation: 10,
          opacity: 1,
          enabled: true,
          priority: 2,
        } as SaturationParameters,
      ],
    }

    const startTime = Date.now()
    filterManager.on('filter-start', (type) => {
      if (type === FilterType.CONTRAST) {
        expect(Date.now() - startTime).toBeLessThan(50) // 应该最先执行
      }
    })

    const results = await filterManager.applyFilterChain(imageData, config)
    expect(results).toHaveLength(3)
  })

  it('应该能够创建预览', async () => {
    const imageData = new ImageData(100, 100)

    const params: GaussianBlurParameters = {
      type: FilterType.GAUSSIAN_BLUR,
      radius: 5,
      quality: 'medium' as const,
      opacity: 1,
      enabled: true,
    }

    const previewSize = { width: 50, height: 50 }
    const result = await filterManager.createPreview(imageData, params, previewSize)

    expect(result.success).toBe(true)
    expect(result.processedImageData!.width).toBe(50)
    expect(result.processedImageData!.height).toBe(50)
  })

  it('应该能够估算处理时间', () => {
    const imageData = new ImageData(100, 100)

    const params: FilterParameters[] = [
      {
        type: FilterType.BRIGHTNESS,
        brightness: 20,
        opacity: 1,
        enabled: true,
      } as BrightnessParameters,
      {
        type: FilterType.GAUSSIAN_BLUR,
        radius: 10,
        quality: 'high' as const,
        opacity: 1,
        enabled: true,
      } as GaussianBlurParameters,
    ]

    const estimatedTime = filterManager.estimateProcessingTime(imageData, params)
    expect(estimatedTime).toBeGreaterThan(0)
  })

  it('应该能够清理缓存', () => {
    expect(() => filterManager.clearCache()).not.toThrow()

    const cacheStats = filterManager.getCacheStats()
    expect(cacheStats.size).toBe(0)
    expect(cacheStats.maxSize).toBeGreaterThan(0)
  })

  it('应该检测WebGL支持', () => {
    const supportsWebGL = FilterManager.supportsWebGL()
    expect(typeof supportsWebGL).toBe('boolean')
  })

  it('应该正确处理事件', (done) => {
    const imageData = new ImageData(5, 5)

    const params: BrightnessParameters = {
      type: FilterType.BRIGHTNESS,
      brightness: 10,
      opacity: 1,
      enabled: true,
    }

    let eventFired = false

    filterManager.on('filter-start', (type) => {
      expect(type).toBe(FilterType.BRIGHTNESS)
      eventFired = true
    })

    filterManager.on('filter-complete', () => {
      expect(eventFired).toBe(true)
      done()
    })

    filterManager.applyFilter(imageData, params)
  })
})
