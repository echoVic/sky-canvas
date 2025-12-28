import React, { useEffect, useRef } from 'react'
import { useCanvasSDK } from '../../hooks'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { useCanvasStore } from '../../store/canvasStore'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 直接使用Canvas SDK Hook
  const [sdkState, sdkActions] = useCanvasSDK()
  
  // 获取当前选中的工具
  const { selectedTool } = useCanvasStore()
  
  // 使用Canvas交互hook
  const { interactionState } = useCanvasInteraction(
    canvasRef,
    [sdkState, sdkActions],
    selectedTool
  )

  // 工具映射到工具名称
  const getToolName = (tool: string): string => {
    switch (tool) {
      case 'select': return 'select'
      case 'hand':
      case 'pan': return 'pan'
      case 'zoom': return 'zoom'
      case 'draw': return 'draw'
      case 'rectangle': return 'rectangle'
      case 'circle': return 'circle'
      case 'diamond': return 'diamond'
      case 'text': return 'text'
      // 其他工具目前使用draw作为默认
      case 'line':
      case 'arrow':
      case 'frame':
      default: return 'draw'
    }
  }

  // 初始化SDK
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || sdkState.isInitialized) return

    const initializeCanvas = async () => {
      try {
        await sdkActions.initialize(canvas, {
          enableInteraction: true,
          logLevel: 'info'
        })
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeCanvas()
  }, [sdkState.isInitialized]) // 移除sdkActions依赖，避免循环

  // 渲染由SDK内部自动处理，不需要手动启动

  // 这个 useEffect 不再需要，因为工具选择现在由 Toolbar 组件直接通过 SDK 处理

  // 处理画布尺寸变化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sdkState.isInitialized) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = width
        canvas.height = height
        
        // 画布尺寸变化，暂时不需要特殊处理
        // Canvas SDK会自动处理渲染更新
      }
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [sdkState.isInitialized, sdkState.sdk]) // 移除sdkActions依赖避免循环

  // 注意：dispose 已经在 useCanvasSDK hook 内部处理，这里不需要重复调用

  return (
    <div className="relative w-full h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={800}
        height={600}
        style={{ cursor: interactionState.cursor }}
      />
      
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute p-2 text-xs text-white bg-black bg-opacity-50 rounded top-2 right-2">
          <div>形状数量: {sdkState.shapes.length}</div>
          <div>选中: {sdkState.selectedShapes.length}</div>
          <div>初始化: {sdkState.isInitialized ? '是' : '否'}</div>
          <div>SDK状态: {sdkState.sdk ? 'Ready' : 'Not Ready'}</div>
        </div>
      )}

    </div>
  )
}

export default Canvas