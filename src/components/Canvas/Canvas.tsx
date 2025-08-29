import { InteractionMode } from '@sky-canvas/canvas-sdk'
import React, { useEffect, useRef } from 'react'
import { useCanvas } from '../../contexts'
import { useCanvasStore } from '../../store/canvasStore'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedTool, zoom } = useCanvasStore()
  
  // 使用Canvas上下文中的SDK实例
  const [sdkState, sdkActions] = useCanvas()

  // 工具映射到交互模式
  const getInteractionMode = (tool: string): InteractionMode => {
    switch (tool) {
      case 'select': return InteractionMode.SELECT
      case 'hand': return InteractionMode.PAN
      case 'pan': return InteractionMode.PAN
      case 'zoom': return InteractionMode.ZOOM
      case 'draw': return InteractionMode.DRAW
      // 对于其他绘画工具，也使用DRAW模式
      case 'rectangle':
      case 'circle':
      case 'line':
      case 'arrow':
      case 'diamond':
      case 'frame':
        return InteractionMode.DRAW
      default: return InteractionMode.SELECT
    }
  }

  // 初始化SDK
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || sdkState.isInitialized) return

    const initializeCanvas = async () => {
      try {
        await sdkActions.initialize(canvas, {
          renderEngine: 'webgl', // 使用WebGL渲染引擎
          enableInteraction: true,
          viewport: {
            width: canvas.offsetWidth,
            height: canvas.offsetHeight
          }
        })
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeCanvas()
  }, [sdkState.isInitialized]) // 移除sdkActions依赖，避免循环

  // 同步工具选择到交互模式
  useEffect(() => {
    if (sdkState.isInitialized) {
      const mode = getInteractionMode(selectedTool)
      const success = sdkActions.setInteractionMode(mode)
      if (!success) {
        console.log('Failed to set interaction mode, SDK may not be ready yet')
      }
    }
  }, [selectedTool, sdkState.isInitialized]) // 移除sdkActions依赖避免循环

  // 处理画布尺寸变化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sdkState.isInitialized) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = width
        canvas.height = height
        
        // 更新SDK视口 - 检查SDK状态再调用
        if (sdkState.isInitialized && sdkState.sdk) {
          try {
            sdkActions.panViewport({
              x: 0,
              y: 0
            })
          } catch (error) {
            console.warn('Failed to update viewport during resize:', error)
          }
        }
      }
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [sdkState.isInitialized, sdkState.sdk]) // 移除sdkActions依赖避免循环

  // 清理资源 - 只在组件卸载时清理
  useEffect(() => {
    return () => {
      // 只在组件真正卸载时清理
      sdkActions.dispose()
    }
  }, []) // 空依赖数组，只在组件卸载时调用

  return (
    <div className="relative w-full h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={800}
        height={600}
      />
      
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute p-2 text-xs text-white bg-black bg-opacity-50 rounded top-2 right-2">
          <div>形状数量: {sdkState.shapes.length}</div>
          <div>选中: {sdkState.selectedShapes.length}</div>
          <div>工具: {selectedTool}</div>
          <div>交互模式: {sdkState.interactionMode}</div>
          <div>初始化: {sdkState.isInitialized ? '是' : '否'}</div>
          <div>视口缩放: {sdkState.viewport.zoom.toFixed(2)}</div>
        </div>
      )}

    </div>
  )
}

export default Canvas