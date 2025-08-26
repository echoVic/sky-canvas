import React from 'react'
import { Button } from '@heroui/react'
import { Plus, Minus, HelpCircle, Settings } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore'

const StatusBar: React.FC = () => {
  const { zoom, setZoom } = useCanvasStore()

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 10, 500))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 10, 10))
  }

  const handleResetZoom = () => {
    setZoom(100)
  }

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
      {/* 缩放控制 */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="light"
          size="sm"
          isIconOnly
          onPress={handleZoomOut}
          className="h-7 w-7 min-w-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center"
        >
          <div className="flex items-center justify-center w-full h-full">
            <Minus size={12} />
          </div>
        </Button>
        
        <button 
          onClick={handleResetZoom}
          className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors min-w-16 text-center flex items-center justify-center h-7"
        >
          {zoom}%
        </button>
        
        <Button
          variant="light"
          size="sm"
          isIconOnly
          onPress={handleZoomIn}
          className="h-7 w-7 min-w-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center"
        >
          <div className="flex items-center justify-center w-full h-full">
            <Plus size={12} />
          </div>
        </Button>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />

      {/* 状态信息 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          就绪 | 拖拽画布
        </span>
        
        <Button
          variant="light"
          size="sm"
          isIconOnly
          className="h-7 w-7 min-w-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center"
          title="帮助"
        >
          <div className="flex items-center justify-center w-full h-full">
            <HelpCircle size={12} />
          </div>
        </Button>
        
        <Button
          variant="light"
          size="sm"
          isIconOnly
          className="h-7 w-7 min-w-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center"
          title="设置"
        >
          <div className="flex items-center justify-center w-full h-full">
            <Settings size={12} />
          </div>
        </Button>
      </div>
    </div>
  )
}

export default StatusBar