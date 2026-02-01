import { Minus, Plus, Redo, Undo } from 'lucide-react'
import type React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useSDKStore } from '../../store/sdkStore'

const StatusBar: React.FC = () => {
  const { zoom, setZoom } = useCanvasStore()
  const { isInitialized, shapes, selectedShapes, canUndo, canRedo, undo, redo } = useSDKStore()

  const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300, 400]

  const handleZoomIn = () => {
    const currentIndex = zoomPresets.findIndex((z) => z >= zoom)
    if (currentIndex < zoomPresets.length - 1) {
      setZoom(zoomPresets[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    const currentIndex = zoomPresets.findIndex((z) => z >= zoom)
    if (currentIndex > 0) {
      setZoom(zoomPresets[currentIndex - 1])
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      {/* 左侧：撤销/重做 */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="撤销 (Ctrl+Z)"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo size={14} />
        </button>
      </div>

      {/* 中间：缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="缩小"
        >
          <Minus size={14} />
        </button>
        <span className="w-12 text-center">{zoom}%</span>
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="放大"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 右侧：状态信息 */}
      <div className="flex items-center gap-3">
        <span>{isInitialized ? `${shapes.length} 个形状` : '加载中...'}</span>
        {selectedShapes.length > 0 && (
          <span className="text-blue-500">已选 {selectedShapes.length}</span>
        )}
      </div>
    </div>
  )
}

export default StatusBar
