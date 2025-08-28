import React, { useRef, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useCanvasSDK } from '../../hooks/useCanvasSDK'
import { InteractionMode } from '@sky-canvas/canvas-sdk'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedTool, zoom } = useCanvasStore()
  
  // 使用新的Canvas SDK Hook
  const [sdkState, sdkActions] = useCanvasSDK()

  // 工具映射到交互模式
  const getInteractionMode = (tool: string): InteractionMode => {
    switch (tool) {
      case 'select': return InteractionMode.SELECT
      case 'pan': return InteractionMode.PAN
      case 'zoom': return InteractionMode.ZOOM
      case 'draw': return InteractionMode.DRAW
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
  }, [sdkState.isInitialized, sdkActions])

  // 同步工具选择到交互模式
  useEffect(() => {
    if (sdkState.isInitialized) {
      const mode = getInteractionMode(selectedTool)
      sdkActions.setInteractionMode(mode)
    }
  }, [selectedTool, sdkState.isInitialized, sdkActions])

  // 处理画布尺寸变化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sdkState.isInitialized) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = width
        canvas.height = height
        
        // 更新SDK视口
        sdkActions.panViewport({
          x: 0,
          y: 0
        })
      }
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [sdkState.isInitialized, sdkActions])

  // 清理资源
  useEffect(() => {
    return () => {
      sdkActions.dispose()
    }
  }, [sdkActions])

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
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <div>形状数量: {sdkState.shapes.length}</div>
          <div>选中: {sdkState.selectedShapes.length}</div>
          <div>工具: {selectedTool}</div>
          <div>交互模式: {sdkState.interactionMode}</div>
          <div>初始化: {sdkState.isInitialized ? '是' : '否'}</div>
          <div>视口缩放: {sdkState.viewport.zoom.toFixed(2)}</div>
        </div>
      )}

      {/* 视口控制按钮 */}
      {sdkState.isInitialized && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => sdkActions.fitToContent()}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            title="适应内容"
          >
            适应
          </button>
          <button
            onClick={() => sdkActions.resetViewport()}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            title="重置视口"
          >
            重置
          </button>
        </div>
      )}
    </div>
  )
}

export default Canvas