import React, { useRef, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedTool, zoom } = useCanvasStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // 清空画布 - 默认不显示网格
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ cursor: selectedTool === 'hand' ? 'grab' : 'crosshair' }}
      />
    </div>
  )
}

export default Canvas