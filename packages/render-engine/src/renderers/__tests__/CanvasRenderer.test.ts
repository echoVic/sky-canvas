/**
 * CanvasRenderer 架构测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas2DContextFactory } from '../../adapters/Canvas2DContext'
import { CanvasRenderer } from '../CanvasRenderer'

// 模拟 DOM 环境
Object.defineProperty(global, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => setTimeout(callback, 16),
  writable: true,
})

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
  writable: true,
})

describe('CanvasRenderer 架构测试', () => {
  let canvas: HTMLCanvasElement
  let renderer: CanvasRenderer

  beforeEach(async () => {
    // 创建模拟 canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // 模拟 Canvas2D 上下文
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      closePath: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      drawImage: vi.fn(),
    }

    canvas.getContext = vi.fn().mockReturnValue(mockContext)

    // 使用工厂创建适配器
    const factory = new Canvas2DContextFactory()
    const adapter = await factory.createContext(canvas)

    // 创建renderer实例
    renderer = new CanvasRenderer(adapter)
  })

  it('应该创建 CanvasRenderer 实例', () => {
    expect(renderer).toBeInstanceOf(CanvasRenderer)
  })

  it('应该通过适配器使用Canvas2D API', () => {
    // 验证适配器被正确注入
    expect(renderer['canvasAdapter']).toBeDefined()
  })

  it('应该能够清空画布', () => {
    renderer.clear()
    // 基础功能测试，确保不抛出错误
    expect(true).toBe(true)
  })

  it('应该能够获取渲染器能力信息', () => {
    const capabilities = renderer.getCapabilities()
    expect(capabilities).toHaveProperty('supportsTransforms')
    expect(capabilities).toHaveProperty('supportsFilters')
    expect(capabilities).toHaveProperty('supportsBlending')
    expect(capabilities.supportsTransforms).toBe(true)
  })

  it('应该正确处理渲染循环', () => {
    const renderContext = {
      canvas,
      ctx: canvas.getContext('2d')!,
      viewport: { x: 0, y: 0, width: 800, height: 600 },
      devicePixelRatio: 1,
    }

    expect(() => {
      renderer.startRenderLoop(renderContext)
      renderer.stopRenderLoop()
    }).not.toThrow()
  })

  it('应该能够绘制基础图形', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 100, y: 100 }
    const center = { x: 50, y: 50 }

    expect(() => {
      renderer.drawLine(start, end)
      renderer.drawRect(10, 10, 50, 50, false)
      renderer.drawCircle(center, 25, false)
      renderer.drawText('测试', { x: 0, y: 0 })
    }).not.toThrow()
  })

  it('应该正确处理销毁', () => {
    expect(() => {
      renderer.dispose()
    }).not.toThrow()
  })
})
