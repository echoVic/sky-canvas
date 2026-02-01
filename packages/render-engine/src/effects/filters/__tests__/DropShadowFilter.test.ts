/**
 * 投影滤镜测试
 */

import '../../__tests__/setup'
import { FilterType } from '../../types/FilterTypes'
import { DropShadowFilter } from '../DropShadowFilter'

describe('DropShadowFilter', () => {
  let filter: DropShadowFilter

  beforeEach(() => {
    filter = new DropShadowFilter()
  })

  afterEach(() => {
    filter.dispose()
  })

  it('应该正确初始化', () => {
    expect(filter.type).toBe(FilterType.DROP_SHADOW)
    expect(filter.name).toBe('Drop Shadow')
    expect(filter.requiresWebGL).toBe(false)
  })

  it('应该返回默认参数', () => {
    const defaultParams = filter.getDefaultParameters()
    expect(defaultParams.type).toBe(FilterType.DROP_SHADOW)
    expect(defaultParams.offsetX).toBe(4)
    expect(defaultParams.offsetY).toBe(4)
    expect(defaultParams.blur).toBe(4)
    expect(defaultParams.color).toBe('#000000')
    expect(defaultParams.opacity).toBe(0.5)
    expect(defaultParams.enabled).toBe(true)
  })

  it('应该验证参数', () => {
    const validParams = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 5,
      offsetY: 5,
      blur: 3,
      color: '#000000',
      opacity: 0.8,
      enabled: true,
    }

    expect(filter.validateParameters(validParams)).toBe(true)
  })

  it('应该拒绝无效参数', () => {
    const invalidParams = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 'invalid', // 应该是数字
      offsetY: 2,
      blur: 3,
      color: '#000000',
      opacity: 1,
      enabled: true,
    }

    expect(filter.validateParameters(invalidParams as any)).toBe(false)
  })

  it('应该拒绝负的模糊值', () => {
    const invalidParams = {
      type: FilterType.INNER_SHADOW as const,
      offsetX: 2,
      offsetY: 2,
      blur: -5, // 负值无效
      color: '#ff0000',
      opacity: 0.7,
      enabled: true,
    }

    expect(filter.validateParameters(invalidParams)).toBe(false)
  })

  it('当偏移和模糊都为0时应该返回原始图像', async () => {
    const imageData = new ImageData(10, 10)
    // 设置测试数据
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255 // R
      imageData.data[i + 1] = 0 // G
      imageData.data[i + 2] = 0 // B
      imageData.data[i + 3] = 255 // A
    }

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 3,
      offsetY: 3,
      blur: 2,
      color: '#000000',
      opacity: 0.8,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData).toBeDefined()
    expect(result.processedImageData!.width).toBe(imageData.width)
    expect(result.processedImageData!.height).toBe(imageData.height)
  })

  it('应该创建投影效果', async () => {
    const imageData = new ImageData(5, 5)
    // 设置一个小的测试图形
    const centerIndex = (2 * 5 + 2) * 4 // 中心像素
    imageData.data[centerIndex] = 255 // R
    imageData.data[centerIndex + 1] = 255 // G
    imageData.data[centerIndex + 2] = 255 // B
    imageData.data[centerIndex + 3] = 255 // A

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 5,
      offsetY: 5,
      blur: 3,
      color: '#000000',
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)

    expect(result.success).toBe(true)
    expect(result.processedImageData).toBeDefined()
    expect(result.processingTime).toBeGreaterThan(0)
  })

  it('应该正确处理颜色解析', async () => {
    const imageData = new ImageData(3, 3)
    imageData.data[0] = 255
    imageData.data[3] = 255

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    // 测试十六进制颜色
    const params = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 2,
      offsetY: 2,
      blur: 1,
      color: '#ff0000',
      opacity: 0.5,
      enabled: true,
    }

    const result1 = await filter.apply(context, params)
    expect(result1.success).toBe(true)

    // 测试rgba颜色
    const params2 = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 2,
      offsetY: 2,
      blur: 1,
      color: 'rgba(255, 0, 0, 0.8)',
      opacity: 1,
      enabled: true,
    }

    const result2 = await filter.apply(context, params2)
    expect(result2.success).toBe(true)
  })

  it('应该估算处理时间', () => {
    const params = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 10,
      offsetY: 10,
      blur: 5,
      color: '#000000',
      opacity: 1,
      enabled: true,
    }

    const time = filter.estimateProcessingTime(100, 100, params)
    expect(time).toBeGreaterThan(0)
  })

  it('应该处理不同的不透明度', async () => {
    const imageData = new ImageData(2, 2)
    imageData.data[0] = 255
    imageData.data[3] = 255

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now(),
    }

    const params = {
      type: FilterType.DROP_SHADOW as const,
      offsetX: 1,
      offsetY: 1,
      blur: 0,
      color: '#000000',
      opacity: 1,
      enabled: true,
    }

    const result = await filter.apply(context, params)
    expect(result.success).toBe(true)
    expect(result.processedImageData).toBeDefined()
  })
})
