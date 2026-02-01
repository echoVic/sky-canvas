/**
 * 滤镜系统测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyBrightness,
  applyGaussianBlur,
  BrightnessFilter,
  type FilterContext,
  FilterManager,
  FilterPresets,
  FilterType,
  GaussianBlurFilter,
} from '../filters'
import type {
  BrightnessParameters,
  FilterParameters,
  GaussianBlurParameters,
} from '../types/FilterTypes'

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      getContext: vi.fn(() => ({
        createImageData: vi.fn((width, height) => new ImageData(width, height)),
        putImageData: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => new ImageData(100, 100)),
      })),
    })),
  },
  writable: true,
})

Object.defineProperty(global, 'ImageData', {
  value: class MockImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(dataOrWidth: Uint8ClampedArray | number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth
        this.height = height || dataOrWidth
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
      } else {
        this.data = dataOrWidth
        this.width = Math.sqrt(dataOrWidth.length / 4)
        this.height = this.width
      }
    }
  },
  writable: true,
})

describe('滤镜系统', () => {
  let filterManager: FilterManager
  let testImageData: ImageData
  let testContext: FilterContext

  beforeEach(() => {
    filterManager = new FilterManager()

    // 创建测试用的ImageData
    testImageData = new ImageData(100, 100)
    // 填充一些测试数据
    for (let i = 0; i < testImageData.data.length; i += 4) {
      testImageData.data[i] = 128 // R
      testImageData.data[i + 1] = 128 // G
      testImageData.data[i + 2] = 128 // B
      testImageData.data[i + 3] = 255 // A
    }

    testContext = {
      sourceImageData: testImageData,
      width: 100,
      height: 100,
      timestamp: Date.now(),
    }
  })

  describe('FilterManager', () => {
    it('应该初始化内置滤镜', () => {
      const availableFilters = filterManager.getAvailableFilters()
      expect(availableFilters.length).toBeGreaterThan(0)

      const gaussianBlur = filterManager.getFilter(FilterType.GAUSSIAN_BLUR)
      const brightness = filterManager.getFilter(FilterType.BRIGHTNESS)

      expect(gaussianBlur).toBeInstanceOf(GaussianBlurFilter)
      expect(brightness).toBeInstanceOf(BrightnessFilter)
    })

    it('应该能够应用单个滤镜', async () => {
      const parameters: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        brightness: 50,
        enabled: true,
        opacity: 1,
      }

      const result = await filterManager.applyFilter(testContext, parameters)

      expect(result.success).toBe(true)
      expect(result.processedImageData).toBeDefined()
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('应该能够应用滤镜链', async () => {
      const chainConfig = {
        filters: [
          {
            type: FilterType.BRIGHTNESS,
            brightness: 20,
            enabled: true,
            opacity: 1,
          } as BrightnessParameters,
          {
            type: FilterType.GAUSSIAN_BLUR,
            radius: 3,
            quality: 'medium' as const,
            enabled: true,
            opacity: 1,
          } as GaussianBlurParameters,
        ],
      }

      const results = await filterManager.applyFilterChain(testImageData, chainConfig)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('应该验证滤镜参数', () => {
      const validParams = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 50,
        enabled: true,
        opacity: 1,
      }

      const invalidParams = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 150, // 超出范围
        enabled: true,
        opacity: 1,
      }

      expect(filterManager.validateFilterParameters(validParams)).toBe(true)
      expect(filterManager.validateFilterParameters(invalidParams)).toBe(false)
    })

    it('应该获取滤镜默认参数', () => {
      const defaults = filterManager.getFilterDefaults(FilterType.GAUSSIAN_BLUR as const)

      expect(defaults).toBeDefined()
      expect(defaults?.type).toBe(FilterType.GAUSSIAN_BLUR)
      expect(defaults).toHaveProperty('radius')
      expect(defaults).toHaveProperty('quality')
    })

    it('应该预估处理时间', () => {
      const parameters: FilterParameters[] = [
        {
          type: FilterType.BRIGHTNESS,
          brightness: 20,
          enabled: true,
          opacity: 1,
        } as BrightnessParameters,
        {
          type: FilterType.GAUSSIAN_BLUR,
          radius: 5,
          quality: 'medium' as const,
          enabled: true,
          opacity: 1,
        } as GaussianBlurParameters,
      ]

      const estimatedTime = filterManager.estimateProcessingTime(100, 100, parameters)

      expect(estimatedTime).toBeGreaterThan(0)
      expect(typeof estimatedTime).toBe('number')
    })
  })

  describe('GaussianBlurFilter', () => {
    let gaussianBlurFilter: GaussianBlurFilter

    beforeEach(() => {
      gaussianBlurFilter = new GaussianBlurFilter()
    })

    it('应该有正确的滤镜信息', () => {
      expect(gaussianBlurFilter.type).toBe(FilterType.GAUSSIAN_BLUR)
      expect(gaussianBlurFilter.name).toBe('Gaussian Blur')
      expect(gaussianBlurFilter.requiresWebGL).toBe(false)
    })

    it('应该验证参数', () => {
      const validParams: GaussianBlurParameters = {
        type: FilterType.GAUSSIAN_BLUR as const,
        radius: 5,
        quality: 'medium' as const,
        enabled: true,
        opacity: 1,
      }

      const invalidParams: GaussianBlurParameters = {
        type: FilterType.GAUSSIAN_BLUR as const,
        radius: -1, // 无效半径
        quality: 'medium' as const,
        enabled: true,
        opacity: 1,
      }

      expect(gaussianBlurFilter.validateParameters(validParams)).toBe(true)
      expect(gaussianBlurFilter.validateParameters(invalidParams)).toBe(false)
    })

    it('应该应用高斯模糊', async () => {
      const parameters: GaussianBlurParameters = {
        type: FilterType.GAUSSIAN_BLUR as const,
        radius: 3,
        quality: 'medium' as const,
        enabled: true,
        opacity: 1,
      }

      const result = await gaussianBlurFilter.apply(testContext, parameters)

      expect(result.success).toBe(true)
      expect(result.processedImageData).toBeDefined()
      expect(result.processedImageData?.width).toBe(100)
      expect(result.processedImageData?.height).toBe(100)
    })

    it('半径为0时应该返回原图', async () => {
      const parameters = {
        type: FilterType.GAUSSIAN_BLUR as const,
        radius: 0,
        quality: 'medium' as const,
        enabled: true,
        opacity: 1,
      }

      const result = await gaussianBlurFilter.apply(testContext, parameters)

      expect(result.success).toBe(true)
      expect(result.processedImageData?.data).toEqual(testImageData.data)
    })
  })

  describe('BrightnessFilter', () => {
    let brightnessFilter: BrightnessFilter

    beforeEach(() => {
      brightnessFilter = new BrightnessFilter()
    })

    it('应该有正确的滤镜信息', () => {
      expect(brightnessFilter.type).toBe(FilterType.BRIGHTNESS)
      expect(brightnessFilter.name).toBe('Brightness')
      expect(brightnessFilter.requiresWebGL).toBe(false)
    })

    it('应该应用亮度调整', async () => {
      const parameters = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 50,
        enabled: true,
        opacity: 1,
      }

      const result = await brightnessFilter.apply(testContext, parameters)

      expect(result.success).toBe(true)
      expect(result.processedImageData).toBeDefined()

      // 检查亮度是否增加了
      if (!result.processedImageData) {
        throw new Error('processedImageData should be defined')
      }
      const resultData = result.processedImageData.data
      expect(resultData[0]).toBeGreaterThan(testImageData.data[0]) // R通道应该更亮
    })

    it('亮度为0时应该返回原图', async () => {
      const parameters = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 0,
        enabled: true,
        opacity: 1,
      }

      const result = await brightnessFilter.apply(testContext, parameters)

      expect(result.success).toBe(true)
      expect(result.processedImageData?.data).toEqual(testImageData.data)
    })
  })

  describe('便捷函数', () => {
    it('applyGaussianBlur应该工作', async () => {
      const result = await applyGaussianBlur(testImageData, 3, 'medium')

      expect(result.success).toBe(true)
      expect(result.processedImageData).toBeDefined()
    })

    it('applyBrightness应该工作', async () => {
      const result = await applyBrightness(testImageData, 30)

      expect(result.success).toBe(true)
      expect(result.processedImageData).toBeDefined()
    })
  })

  describe('滤镜预设', () => {
    it('应该创建复古滤镜预设', () => {
      const vintageFilters = FilterPresets.createVintage()

      expect(Array.isArray(vintageFilters)).toBe(true)
      expect(vintageFilters.length).toBeGreaterThan(0)
      expect(vintageFilters[0]).toHaveProperty('type')
      expect(vintageFilters[0]).toHaveProperty('enabled')
    })

    it('应该创建黑白滤镜预设', () => {
      const bwFilters = FilterPresets.createBlackAndWhite()

      expect(Array.isArray(bwFilters)).toBe(true)
      expect(bwFilters.length).toBeGreaterThan(0)
    })

    it('应该创建暖色调滤镜预设', () => {
      const warmFilters = FilterPresets.createWarmTone()

      expect(Array.isArray(warmFilters)).toBe(true)
      expect(warmFilters.length).toBeGreaterThan(0)
    })

    it('应该创建发光效果预设', () => {
      const glowFilters = FilterPresets.createGlowEffect('#ff0000', 15)

      expect(Array.isArray(glowFilters)).toBe(true)
      expect(glowFilters.length).toBeGreaterThan(0)
    })
  })

  describe('事件系统', () => {
    it('应该触发滤镜开始事件', async () => {
      const startCallback = vi.fn()
      filterManager.on('filter-start', startCallback)

      const parameters = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 20,
        enabled: true,
        opacity: 1,
      }

      await filterManager.applyFilter(testContext, parameters)

      expect(startCallback).toHaveBeenCalledWith(FilterType.BRIGHTNESS, testContext)
    })

    it('应该触发滤镜完成事件', async () => {
      const completeCallback = vi.fn()
      filterManager.on('filter-complete', completeCallback)

      const parameters = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 20,
        enabled: true,
        opacity: 1,
      }

      await filterManager.applyFilter(testContext, parameters)

      expect(completeCallback).toHaveBeenCalledWith(
        FilterType.BRIGHTNESS,
        expect.objectContaining({ success: true })
      )
    })

    it('应该触发滤镜链事件', async () => {
      const chainStartCallback = vi.fn()
      const chainCompleteCallback = vi.fn()

      filterManager.on('chain-start', chainStartCallback)
      filterManager.on('chain-complete', chainCompleteCallback)

      const chainConfig = {
        filters: [
          {
            type: FilterType.BRIGHTNESS as const,
            brightness: 20,
            enabled: true,
            opacity: 1,
          },
        ],
      }

      await filterManager.applyFilterChain(testImageData, chainConfig)

      expect(chainStartCallback).toHaveBeenCalled()
      expect(chainCompleteCallback).toHaveBeenCalled()
    })
  })

  describe('性能统计', () => {
    it('应该收集性能统计', async () => {
      const parameters = {
        type: FilterType.BRIGHTNESS as const,
        brightness: 20,
        enabled: true,
        opacity: 1,
      }

      // 应用几次滤镜
      await filterManager.applyFilter(testContext, parameters)
      await filterManager.applyFilter(testContext, parameters)

      const stats = filterManager.getAllPerformanceStats()

      expect(Array.isArray(stats)).toBe(true)
      expect(stats.length).toBeGreaterThan(0)

      const brightnessStats = stats.find((s) => s.filterType === FilterType.BRIGHTNESS)
      expect(brightnessStats).toBeDefined()
      expect(brightnessStats?.totalExecutions).toBeGreaterThan(0)
    })

    it('应该重置性能统计', () => {
      filterManager.resetAllPerformanceStats()
      const stats = filterManager.getAllPerformanceStats()

      for (const stat of stats) {
        expect(stat.totalExecutions).toBe(0)
      }
    })
  })
})
