import type React from 'react'
import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useSDKStore } from '../../store/sdkStore'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isInitialized, shapes, selectedShapes, sdk, initialize, setTool } = useSDKStore()
  const { selectedTool } = useCanvasStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isInitialized) return

    const initializeCanvas = async () => {
      try {
        await initialize(canvas, {
          enableInteraction: true,
          logLevel: 'info',
        })
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeCanvas()
  }, [isInitialized, initialize])

  useEffect(() => {
    if (!isInitialized) return

    const toolNameMap: Record<string, string> = {
      select: 'select',
      hand: 'hand',
      rectangle: 'rectangle',
      diamond: 'diamond',
      circle: 'circle',
      ellipse: 'ellipse',
      polygon: 'polygon',
      star: 'star',
      arrow: 'arrow',
      line: 'line',
      draw: 'draw',
      text: 'text',
      image: 'image',
      eraser: 'eraser',
      eyedropper: 'eyedropper',
    }

    const toolName = toolNameMap[selectedTool] || 'draw'
    setTool(toolName)
  }, [selectedTool, isInitialized, setTool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isInitialized) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = width
        canvas.height = height
      }
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [isInitialized])

  const getCursor = () => {
    switch (selectedTool) {
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
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white dark:bg-gray-900">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={800}
        height={600}
        style={{ cursor: getCursor() }}
      />
    </div>
  )
}

export default Canvas
