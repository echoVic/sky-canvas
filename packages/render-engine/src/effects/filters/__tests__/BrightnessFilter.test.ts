/**
 * 亮度调整滤镜测试
 */

import '../../__tests__/setup'
import { FilterType } from '../../types/FilterTypes'
import { BrightnessFilter } from '../BrightnessFilter'

describe('BrightnessFilter', () => {
  let filter: BrightnessFilter

  beforeEach(() => {
    filter = new BrightnessFilter()
  })

  afterEach(() => {
    filter.dispose()
  })

  it('应该正确初始化', () => {
    expect(filter.type).toBe(FilterType.BRIGHTNESS)
    expect(filter.name).toBe('Brightness')
    expect(filter.requiresWebGL).toBe(false)
  })

  it('应该返回默认参数', () => {
    const defaultParams = filter.getDefaultParameters()
    expect(defaultParams.type).toBe(FilterType.BRIGHTNESS)
    expect(defaultParams.brightness).toBe(0)
    expect(defaultParams.opacity).toBe(1)
    expect(defaultParams.enabled).toBe(true)
  })

  it('应该验证参数', () => {
    const validParams = {
      type: FilterType.BRIGHTNESS as const,
      brightness: 50,
      opacity: 0.8,
      enabled: true,
    }

    expect(filter.validateParameters(validParams)).toBe(true)
  })

  it('应该拒绝超出范围的亮度值', () => {
    const invalidParams = {
      type: FilterType.BRIGHTNESS as const,
      brightness: 150, // 超出-100到100范围
      opacity: 1,
      enabled: true,
    }

    expect(filter.validateParameters(invalidParams)).toBe(false)
  })

  it('当亮度为0时应该返回原始图像', async () => {
    const imageData = new ImageData(2, 2)
    // 设置灰色像素
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 128 // R
      imageData.data[i + 1] = 128 // G
      imageData.data[i + 2] = 128 // B
      imageData.data[i + 3] = 255 // A
    }

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.BRIGHTNESS as const,
      brightness: 0, // 亮度为0时应该返回原始图像
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData).toBeDefined()
    expect(result.processedImageData?.data[0]).toBe(128)
  })

  it('应该正确增加亮度', async () => {
    const imageData = new ImageData(1, 1)
    // 设置中等亮度
    imageData.data[0] = 100 // R
    imageData.data[1] = 100 // G
    imageData.data[2] = 100 // B
    imageData.data[3] = 255 // A

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.BRIGHTNESS as const,
      brightness: 75,
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData?.data[0]).toBeGreaterThan(100)
    expect(result.processedImageData?.data[3]).toBe(255) // Alpha不变
  })

  it('应该正确降低亮度', async () => {
    const imageData = new ImageData(1, 1)
    // 设置中等亮度
    imageData.data[0] = 200 // R
    imageData.data[1] = 200 // G
    imageData.data[2] = 200 // B
    imageData.data[3] = 255 // A

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.BRIGHTNESS as const,
      brightness: -20,
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData?.data[0]).toBeLessThan(200)
    expect(result.processedImageData?.data[3]).toBe(255) // Alpha不变
  })

  it('应该限制颜色值在0-255范围内', async () => {
    const imageData = new ImageData(1, 1)
    // 设置高亮度
    imageData.data[0] = 250 // R
    imageData.data[1] = 250 // G
    imageData.data[2] = 250 // B
    imageData.data[3] = 255 // A

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.BRIGHTNESS as const,
      brightness: 0,
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData?.data[0]).toBeLessThanOrEqual(255)
    expect(result.processedImageData?.data[1]).toBeLessThanOrEqual(255)
    expect(result.processedImageData?.data[2]).toBeLessThanOrEqual(255)
  })
})
