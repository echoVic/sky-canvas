import { InteractionMode } from '@sky-canvas/canvas-sdk'
import React, { useEffect, useRef } from 'react'
import { useCanvas } from '../../contexts'
import { useCanvasStore } from '../../store/canvasStore'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { Canvas2DGraphicsContext } from '../../adapters'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedTool, zoom } = useCanvasStore()
  
  // 使用Canvas上下文中的SDK实例
  const [sdkState, sdkActions] = useCanvas()
  
  // 使用Canvas交互hook
  const { interactionState } = useCanvasInteraction(
    canvasRef,
    [sdkState, sdkActions],
    selectedTool as any
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

  // 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sdkState.isInitialized) return

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 使用Canvas2DGraphicsContext包装原生context
      const graphicsContext = new Canvas2DGraphicsContext(ctx, canvas)

      // 清除画布
      graphicsContext.clear()

      // 渲染所有形状
      sdkState.shapes.forEach(shape => {
        if (shape.visible) {
          shape.render(graphicsContext)
        }
      })

      // 绘制选中形状的边框
      sdkState.selectedShapes.forEach(shape => {
        if (shape.visible) {
          const bounds = shape.getBounds()
          graphicsContext.save()
          graphicsContext.setStrokeStyle('rgba(59, 130, 246, 0.8)')
          graphicsContext.setLineWidth(2)
          graphicsContext.setLineDash([4, 4])
          graphicsContext.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4)
          graphicsContext.setLineDash([])
          graphicsContext.restore()
        }
      })
    }

    // 初始渲染
    render()

    // 如果需要动画循环，可以在这里添加 requestAnimationFrame
  }, [sdkState.isInitialized, sdkState.shapes, sdkState.selectedShapes])

  // 同步工具选择到工具名称
  useEffect(() => {
    if (sdkState.isInitialized) {
      const toolName = getToolName(selectedTool)
      const success = sdkActions.setTool(toolName)
      if (!success) {
        console.log('Failed to set tool, SDK may not be ready yet')
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
        style={{ cursor: interactionState.cursor }}
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