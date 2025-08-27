import React, { useRef, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useCanvasInteraction, ToolType } from '../../hooks'
import { Canvas2DGraphicsContextFactory } from '../../adapters'
import { useCanvas } from '../../contexts'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedTool, zoom } = useCanvasStore()
  
  // 使用Canvas上下文
  const [sdkState, sdkActions] = useCanvas()

  // 使用Canvas交互
  const { interactionState } = useCanvasInteraction(
    canvasRef,
    [sdkState, sdkActions],
    selectedTool as ToolType
  )

  // 初始化SDK
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || sdkState.isInitialized) return

    const initializeCanvas = async () => {
      try {
        const factory = new Canvas2DGraphicsContextFactory()
        await sdkActions.initialize(canvas, factory)
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeCanvas()
  }, [sdkState.isInitialized, sdkActions])

  // 当形状更新时重新渲染
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sdkState.isInitialized) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 渲染所有形状
    sdkState.shapes.forEach(shape => {
      if (shape.visible) {
        ctx.save()
        shape.render(ctx)
        
        // 如果形状被选中，绘制选择框
        if (sdkState.selectedShapes.some(s => s.id === shape.id)) {
          const bounds = shape.getBounds()
          ctx.strokeStyle = '#007AFF'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4)
          ctx.setLineDash([])
        }
        
        ctx.restore()
      }
    })
  }, [sdkState.shapes, sdkState.selectedShapes, sdkState.isInitialized])

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
        style={{ cursor: interactionState.cursor }}
      />
      
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <div>形状数量: {sdkState.shapes.length}</div>
          <div>选中: {sdkState.selectedShapes.length}</div>
          <div>工具: {selectedTool}</div>
          <div>初始化: {sdkState.isInitialized ? '是' : '否'}</div>
        </div>
      )}
    </div>
  )
}

export default Canvas