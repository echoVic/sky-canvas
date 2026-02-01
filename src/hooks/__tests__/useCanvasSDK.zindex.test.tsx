/**
 * useCanvasSDK Hook Z轴管理功能测试
 */

import { createCanvasSDK } from '@sky-canvas/canvas-sdk'
import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useCanvasSDK } from '../useCanvasSDK'

// Mock Canvas SDK
vi.mock('@sky-canvas/canvas-sdk', () => ({
  createCanvasSDK: vi.fn(),
}))

describe('useCanvasSDK Z轴管理', () => {
  let mockSDK: any
  let mockCanvasManager: any
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    // 创建模拟canvas元素
    mockCanvas = document.createElement('canvas')

    // 创建模拟的CanvasManager
    mockCanvasManager = {
      getRenderables: vi.fn(() => []),
      getStats: vi.fn(() => ({ history: { canUndo: false, canRedo: false } })),
      getSelectedShapes: vi.fn(() => [
        { id: 'shape1', type: 'rectangle' },
        { id: 'shape2', type: 'circle' },
      ]),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      setZIndex: vi.fn(),
      getShapesByZOrder: vi.fn(() => [
        { id: 'shape1', type: 'rectangle', zIndex: 0 },
        { id: 'shape2', type: 'circle', zIndex: 1 },
        { id: 'shape3', type: 'rectangle', zIndex: 2 },
      ]),
    }

    // 创建模拟的SDK
    mockSDK = {
      getCanvasManager: vi.fn(() => mockCanvasManager),
      on: vi.fn(),
      off: vi.fn(),
      dispose: vi.fn(),
    }

    ;(createCanvasSDK as any).mockResolvedValue(mockSDK)
  })

  it('bringToFront应该将选中的形状置顶', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    // 初始化SDK
    await actions.initialize(mockCanvas)

    // 执行置顶操作
    actions.bringToFront()

    expect(mockCanvasManager.getSelectedShapes).toHaveBeenCalled()
    expect(mockCanvasManager.bringToFront).toHaveBeenCalledWith(['shape1', 'shape2'])
  })

  it('sendToBack应该将选中的形状置底', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)
    actions.sendToBack()

    expect(mockCanvasManager.sendToBack).toHaveBeenCalledWith(['shape1', 'shape2'])
  })

  it('bringForward应该将选中的形状上移一层', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)
    actions.bringForward()

    expect(mockCanvasManager.bringForward).toHaveBeenCalledWith(['shape1', 'shape2'])
  })

  it('sendBackward应该将选中的形状下移一层', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)
    actions.sendBackward()

    expect(mockCanvasManager.sendBackward).toHaveBeenCalledWith(['shape1', 'shape2'])
  })

  it('setZIndex应该设置指定形状的zIndex值', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)
    actions.setZIndex(['shape1', 'shape2'], 10)

    expect(mockCanvasManager.setZIndex).toHaveBeenCalledWith(['shape1', 'shape2'], 10)
  })

  it('getShapesByZOrder应该返回按Z轴排序的形状', async () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)
    const shapes = actions.getShapesByZOrder()

    expect(mockCanvasManager.getShapesByZOrder).toHaveBeenCalled()
    expect(shapes).toEqual([
      { id: 'shape1', type: 'rectangle', zIndex: 0 },
      { id: 'shape2', type: 'circle', zIndex: 1 },
      { id: 'shape3', type: 'rectangle', zIndex: 2 },
    ])
  })

  it('没有选中形状时Z轴操作不应该出错', async () => {
    mockCanvasManager.getSelectedShapes.mockReturnValue([])

    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    await actions.initialize(mockCanvas)

    // 这些操作不应该抛出错误
    expect(() => {
      actions.bringToFront()
      actions.sendToBack()
      actions.bringForward()
      actions.sendBackward()
    }).not.toThrow()

    expect(mockCanvasManager.bringToFront).not.toHaveBeenCalled()
    expect(mockCanvasManager.sendToBack).not.toHaveBeenCalled()
    expect(mockCanvasManager.bringForward).not.toHaveBeenCalled()
    expect(mockCanvasManager.sendBackward).not.toHaveBeenCalled()
  })

  it('SDK未初始化时Z轴操作应该抛出错误', () => {
    const { result } = renderHook(() => useCanvasSDK())
    const [, actions] = result.current

    expect(() => actions.bringToFront()).toThrow('SDK not initialized')
    expect(() => actions.sendToBack()).toThrow('SDK not initialized')
    expect(() => actions.bringForward()).toThrow('SDK not initialized')
    expect(() => actions.sendBackward()).toThrow('SDK not initialized')
    expect(() => actions.setZIndex(['shape1'], 5)).toThrow('SDK not initialized')
    expect(() => actions.getShapesByZOrder()).toThrow('SDK not initialized')
  })
})
