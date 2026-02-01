/**
 * Canvas SDK Context
 * 提供全局 SDK 状态和操作的 React Context
 */

import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { type CanvasSDKActions, type CanvasSDKState, useCanvasSDK } from '../hooks/useCanvasSDK'

/**
 * Canvas Context 值接口
 */
interface CanvasContextValue {
  state: CanvasSDKState
  actions: CanvasSDKActions
  canvasRef: React.RefObject<HTMLCanvasElement>
}

/**
 * Canvas Context
 */
const CanvasContext = createContext<CanvasContextValue | null>(null)

/**
 * Canvas Provider Props
 */
interface CanvasProviderProps {
  children: React.ReactNode
  config?: {
    renderEngine?: 'webgl' | 'canvas2d' | 'webgpu'
    enableHistory?: boolean
    enableInteraction?: boolean
  }
}

/**
 * Canvas Provider 组件
 * 包装应用并提供 SDK 访问
 */
export function CanvasProvider({ children, config }: CanvasProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, actions] = useCanvasSDK()
  const initializingRef = useRef(false)

  // 当 canvas 元素可用时自动初始化
  const initializeCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (initializingRef.current || state.isInitialized) return

      initializingRef.current = true
      try {
        await actions.initialize(canvas, config)
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      } finally {
        initializingRef.current = false
      }
    },
    [actions, config, state.isInitialized]
  )

  // 监听 canvas ref 变化
  useEffect(() => {
    if (canvasRef.current && !state.isInitialized) {
      initializeCanvas(canvasRef.current)
    }
  }, [initializeCanvas, state.isInitialized])

  const value: CanvasContextValue = {
    state,
    actions,
    canvasRef,
  }

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
}

/**
 * 使用 Canvas Context 的 Hook
 * @throws 如果在 CanvasProvider 外部使用会抛出错误
 */
export function useCanvas(): [CanvasSDKState, CanvasSDKActions] {
  const context = useContext(CanvasContext)

  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }

  return [context.state, context.actions]
}

/**
 * 获取 Canvas Ref 的 Hook
 */
export function useCanvasRef(): React.RefObject<HTMLCanvasElement> {
  const context = useContext(CanvasContext)

  if (!context) {
    throw new Error('useCanvasRef must be used within a CanvasProvider')
  }

  return context.canvasRef
}

/**
 * 获取选中形状的 Hook
 */
export function useSelectedShapes() {
  const [state] = useCanvas()
  return state.selectedShapes
}

/**
 * 获取所有形状的 Hook
 */
export function useShapes() {
  const [state] = useCanvas()
  return state.shapes
}

/**
 * 获取 SDK 初始化状态的 Hook
 */
export function useSDKStatus() {
  const [state] = useCanvas()
  return {
    isInitialized: state.isInitialized,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  }
}

export { CanvasContext }
