import '@testing-library/jest-dom'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSDKStore } from '../../../store/sdkStore'
import { useCanvasStore } from '../../../store/canvasStore'
import Canvas from '../Canvas'

vi.mock('../../../store/sdkStore')
vi.mock('../../../store/canvasStore')

const createSDKState = (overrides: Partial<ReturnType<typeof useSDKStore>> = {}) => ({
  sdk: null,
  isInitialized: false,
  shapes: [],
  selectedShapes: [],
  canUndo: false,
  canRedo: false,
  initialize: vi.fn(),
  setTool: vi.fn(),
  ...overrides
})

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSDKStore).mockReturnValue(createSDKState() as any)
    vi.mocked(useCanvasStore).mockReturnValue({ selectedTool: 'select' } as any)
  })

  it('应该渲染canvas元素', () => {
    render(<Canvas />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas?.tagName).toBe('CANVAS')
  })

  it('应该设置正确的样式', () => {
    render(<Canvas />)
    const canvasContainer = document.querySelector('canvas')?.parentElement
    expect(canvasContainer).toHaveClass('relative', 'w-full', 'h-full', 'overflow-hidden', 'bg-white', 'dark:bg-gray-900')
    const canvas = document.querySelector('canvas')
    expect(canvas).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full')
  })

  it('应该根据工具设置光标样式', () => {
    vi.mocked(useCanvasStore).mockReturnValue({ selectedTool: 'select' } as any)
    const { unmount: unmountSelect } = render(<Canvas />)
    let canvas = document.querySelector('canvas')
    expect(canvas).toHaveStyle({ cursor: 'default' })
    unmountSelect()

    vi.mocked(useCanvasStore).mockReturnValue({ selectedTool: 'hand' } as any)
    const { unmount: unmountHand } = render(<Canvas />)
    canvas = document.querySelector('canvas')
    expect(canvas).toHaveStyle({ cursor: 'grab' })
    unmountHand()

    vi.mocked(useCanvasStore).mockReturnValue({ selectedTool: 'rectangle' } as any)
    const { unmount: unmountRectangle } = render(<Canvas />)
    canvas = document.querySelector('canvas')
    expect(canvas).toHaveStyle({ cursor: 'crosshair' })
    unmountRectangle()
  })

  it('应该在组件挂载时初始化SDK', async () => {
    const state = createSDKState()
    vi.mocked(useSDKStore).mockReturnValue(state as any)
    render(<Canvas />)
    await waitFor(() => {
      expect(state.initialize).toHaveBeenCalled()
    })
  })

  it('应该在已初始化时跳过初始化', () => {
    const state = createSDKState({ isInitialized: true })
    vi.mocked(useSDKStore).mockReturnValue(state as any)
    render(<Canvas />)
    expect(state.initialize).not.toHaveBeenCalled()
  })

  it('应该在初始化后根据工具设置SDK工具', async () => {
    const state = createSDKState({ isInitialized: true })
    vi.mocked(useSDKStore).mockReturnValue(state as any)
    vi.mocked(useCanvasStore).mockReturnValue({ selectedTool: 'hand' } as any)
    render(<Canvas />)
    await waitFor(() => {
      expect(state.setTool).toHaveBeenCalledWith('pan')
    })
  })
})
