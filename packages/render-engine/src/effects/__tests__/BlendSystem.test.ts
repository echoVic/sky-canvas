/**
 * 混合系统测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BlendManager,
  BlendMode,
  createBlendOperation,
  DifferenceBlend,
  getBlendModeCategory,
  getBlendModeDescription,
  getSupportedBlendModes,
  isBlendModeSupported,
  MultiplyBlend,
  NormalBlend,
  ScreenBlend,
} from '../blends'

// Mock Canvas APIs
Object.defineProperty(global, 'CanvasRenderingContext2D', {
  value: class MockCanvasRenderingContext2D {
    globalAlpha = 1

    save() {}
    restore() {}
    drawImage() {}
    getImageData() {
      return new (global as any).ImageData(100, 100)
    }
    putImageData() {}
  },
  writable: true,
})

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockHTMLCanvasElement {
    width = 0
    height = 0

    getContext() {
      return new (global as any).CanvasRenderingContext2D()
    }
  },
  writable: true,
})

Object.defineProperty(global, 'ImageData', {
  value: class MockImageData {
    width: number
    height: number
    data: Uint8ClampedArray

    constructor(dataOrWidth: Uint8ClampedArray | number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth
        this.height = height || 0
        this.data = new Uint8ClampedArray(dataOrWidth * (height || 0) * 4)
      } else {
        this.data = dataOrWidth
        this.width = 0
        this.height = 0
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

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
  },
  writable: true,
})

describe('混合系统', () => {
  let blendManager: BlendManager

  beforeEach(() => {
    blendManager = new BlendManager()
  })

  describe('BlendManager', () => {
    it('应该能够创建管理器实例', () => {
      expect(blendManager).toBeDefined()
      expect(blendManager.getAllBlendOperations()).toEqual([])
    })

    it('应该能够添加混合操作', () => {
      const config = {
        mode: BlendMode.MULTIPLY,
        opacity: 0.8,
        enabled: true,
      }

      const operation = createBlendOperation(BlendMode.MULTIPLY, config)
      blendManager.addBlendOperation(operation)

      expect(blendManager.getAllBlendOperations()).toHaveLength(1)
      expect(blendManager.getBlendOperation(operation.id)).toBe(operation)
    })

    it('应该能够移除混合操作', () => {
      const config = {
        mode: BlendMode.SCREEN,
        opacity: 1,
        enabled: true,
      }

      const operation = createBlendOperation(BlendMode.SCREEN, config)
      blendManager.addBlendOperation(operation)

      const removed = blendManager.removeBlendOperation(operation.id)
      expect(removed).toBe(true)
      expect(blendManager.getAllBlendOperations()).toHaveLength(0)
    })

    it('应该能够混合图层', () => {
      const canvas1 = new (global as any).HTMLCanvasElement()
      canvas1.width = 100
      canvas1.height = 100

      const canvas2 = new (global as any).HTMLCanvasElement()
      canvas2.width = 100
      canvas2.height = 100

      const layers = [
        {
          id: 'layer1',
          canvas: canvas1,
          blendMode: BlendMode.NORMAL,
          opacity: 1,
          visible: true,
        },
        {
          id: 'layer2',
          canvas: canvas2,
          blendMode: BlendMode.MULTIPLY,
          opacity: 0.8,
          visible: true,
        },
      ]

      const normalOp = createBlendOperation(BlendMode.NORMAL, {
        mode: BlendMode.NORMAL,
        opacity: 1,
        enabled: true,
      })
      const multiplyOp = createBlendOperation(BlendMode.MULTIPLY, {
        mode: BlendMode.MULTIPLY,
        opacity: 0.8,
        enabled: true,
      })

      blendManager.addBlendOperation(normalOp)
      blendManager.addBlendOperation(multiplyOp)

      const result = blendManager.blend(layers)
      expect(result).toBeInstanceOf((global as any).HTMLCanvasElement)
    })

    it('应该能够获取统计信息', () => {
      const stats = blendManager.getStats()
      expect(stats).toHaveProperty('totalOperations')
      expect(stats).toHaveProperty('activeOperations')
      expect(stats).toHaveProperty('totalBlends')
    })
  })

  describe('混合模式实现', () => {
    it('Normal混合应该直接返回覆盖颜色', () => {
      const config = { mode: BlendMode.NORMAL, opacity: 1, enabled: true }
      const blend = new NormalBlend(config)

      const baseColor = { r: 100, g: 150, b: 200, a: 255 }
      const overlayColor = { r: 200, g: 100, b: 50, a: 255 }

      const result = blend.apply(baseColor, overlayColor)
      expect(result).toEqual(overlayColor)
    })

    it('Multiply混合应该使颜色变暗', () => {
      const config = { mode: BlendMode.MULTIPLY, opacity: 1, enabled: true }
      const blend = new MultiplyBlend(config)

      const baseColor = { r: 255, g: 255, b: 255, a: 255 }
      const overlayColor = { r: 128, g: 128, b: 128, a: 255 }

      const result = blend.apply(baseColor, overlayColor)

      expect(result.r).toBeLessThan(baseColor.r)
      expect(result.g).toBeLessThan(baseColor.g)
      expect(result.b).toBeLessThan(baseColor.b)
    })

    it('Screen混合应该使颜色变亮', () => {
      const config = { mode: BlendMode.SCREEN, opacity: 1, enabled: true }
      const blend = new ScreenBlend(config)

      const baseColor = { r: 128, g: 128, b: 128, a: 255 }
      const overlayColor = { r: 128, g: 128, b: 128, a: 255 }

      const result = blend.apply(baseColor, overlayColor)

      expect(result.r).toBeGreaterThan(baseColor.r)
      expect(result.g).toBeGreaterThan(baseColor.g)
      expect(result.b).toBeGreaterThan(baseColor.b)
    })

    it('Difference混合应该计算颜色差值', () => {
      const config = { mode: BlendMode.DIFFERENCE, opacity: 1, enabled: true }
      const blend = new DifferenceBlend(config)

      const baseColor = { r: 200, g: 150, b: 100, a: 255 }
      const overlayColor = { r: 100, g: 200, b: 150, a: 255 }

      const result = blend.apply(baseColor, overlayColor)

      expect(result.r).toBe(Math.abs(baseColor.r - overlayColor.r))
      expect(result.g).toBe(Math.abs(baseColor.g - overlayColor.g))
      expect(result.b).toBe(Math.abs(baseColor.b - overlayColor.b))
    })
  })

  describe('工厂函数', () => {
    it('应该创建所有支持的混合模式', () => {
      const supportedModes = getSupportedBlendModes()

      for (const mode of supportedModes) {
        const config = { mode, opacity: 1, enabled: true }
        const operation = createBlendOperation(mode, config)

        expect(operation).toBeDefined()
        expect(operation.mode).toBe(mode)
      }
    })

    it('应该对无效混合模式抛出错误', () => {
      const invalidMode = 'invalid-mode' as BlendMode
      const config = { mode: invalidMode, opacity: 1, enabled: true }

      expect(() => createBlendOperation(invalidMode, config)).toThrow()
    })
  })

  describe('工具函数', () => {
    it('应该正确识别支持的混合模式', () => {
      expect(isBlendModeSupported(BlendMode.NORMAL)).toBe(true)
      expect(isBlendModeSupported(BlendMode.MULTIPLY)).toBe(true)
      expect(isBlendModeSupported('invalid' as BlendMode)).toBe(false)
    })

    it('应该提供混合模式描述', () => {
      const description = getBlendModeDescription(BlendMode.MULTIPLY)
      expect(description).toBeTruthy()
      expect(description.length).toBeGreaterThan(0)
    })

    it('应该提供混合模式分类', () => {
      expect(getBlendModeCategory(BlendMode.NORMAL)).toBe('标准')
      expect(getBlendModeCategory(BlendMode.DARKEN)).toBe('暗色')
      expect(getBlendModeCategory(BlendMode.LIGHTEN)).toBe('亮色')
      expect(getBlendModeCategory(BlendMode.DIFFERENCE)).toBe('差值')
      expect(getBlendModeCategory(BlendMode.HUE)).toBe('颜色')
    })
  })

  describe('配置管理', () => {
    it('应该支持透明度配置', () => {
      const config = { mode: BlendMode.NORMAL, opacity: 0.5, enabled: true }
      const operation = createBlendOperation(BlendMode.NORMAL, config)

      expect(operation.config.opacity).toBe(0.5)
    })

    it('应该支持启用禁用配置', () => {
      const config = { mode: BlendMode.MULTIPLY, opacity: 1, enabled: false }
      const operation = createBlendOperation(BlendMode.MULTIPLY, config)

      expect(operation.config.enabled).toBe(false)
    })

    it('应该支持配置更新', () => {
      const config = { mode: BlendMode.SCREEN, opacity: 1, enabled: true }
      const operation = createBlendOperation(BlendMode.SCREEN, config)

      operation.updateConfig({ opacity: 0.7, enabled: false })

      expect(operation.config.opacity).toBe(0.7)
      expect(operation.config.enabled).toBe(false)
    })

    it('应该支持操作克隆', () => {
      const config = { mode: BlendMode.OVERLAY, opacity: 0.8, enabled: true }
      const operation = createBlendOperation(BlendMode.OVERLAY, config)
      const cloned = operation.clone()

      expect(cloned.mode).toBe(operation.mode)
      expect(cloned.config.opacity).toBe(operation.config.opacity)
      expect(cloned.config.enabled).toBe(operation.config.enabled)
      expect(cloned.id).not.toBe(operation.id)
    })
  })

  afterEach(() => {
    blendManager.dispose()
  })
})
