import { useMemoizedFn } from 'ahooks'
import { useEffect, useState } from 'react'
import type { UIToolType } from '../store/canvasStore'
import type { UseCanvasSDKResult } from './useCanvasSDK'

/**
 * 交互状态
 */
export interface CanvasInteractionState {
  /** 当前光标样式 */
  cursor: string
}

/**
 * useCanvasInteraction Hook
 *
 * 根据UI状态切换SDK的当前工具
 */
export function useCanvasInteraction(
  _canvasRef: React.RefObject<HTMLCanvasElement>,
  sdkResult: UseCanvasSDKResult,
  currentTool: UIToolType
) {
  const [sdkState, sdkActions] = sdkResult

  const [interactionState, setInteractionState] = useState<CanvasInteractionState>({
    cursor: 'default',
  })

  // 工具映射到工具名称
  const getToolName = useMemoizedFn((tool: UIToolType): string => {
    switch (tool) {
      case 'select':
        return 'select'
      case 'hand':
        return 'hand'
      case 'rectangle':
        return 'rectangle'
      case 'diamond':
        return 'diamond'
      case 'circle':
        return 'circle'
      case 'ellipse':
        return 'ellipse'
      case 'polygon':
        return 'polygon'
      case 'star':
        return 'star'
      case 'arrow':
      case 'line':
        return 'line'
      case 'draw':
        return 'draw'
      case 'text':
        return 'text'
      case 'image':
        return 'image'
      case 'eraser':
        return 'eraser'
      case 'eyedropper':
        return 'eyedropper'
      case 'sticky':
      case 'link':
      case 'frame':
      default:
        return 'draw'
    }
  })

  // 获取工具的光标样式
  const getCursorForTool = useMemoizedFn((tool: UIToolType): string => {
    switch (tool) {
      case 'select':
        return 'default'
      case 'hand':
        return 'grab'
      case 'text':
        return 'text'
      case 'eyedropper':
        return 'copy'
      default:
        return 'crosshair'
    }
  })

  // 更新光标样式
  useEffect(() => {
    setInteractionState((prev) => ({
      ...prev,
      cursor: getCursorForTool(currentTool),
    }))
  }, [currentTool, getCursorForTool])

  // 同步工具选择到SDK
  const syncToolToSDK = useMemoizedFn(() => {
    if (sdkState.isInitialized) {
      try {
        const toolName = getToolName(currentTool)
        const success = sdkActions.setTool(toolName)
        if (!success) {
          console.log('Failed to set tool, SDK may not be ready yet')
        }
      } catch (error) {
        console.log('Error setting tool:', error)
      }
    }
  })

  useEffect(() => {
    syncToolToSDK()
  }, [syncToolToSDK])

  return {
    interactionState,
  }
}
