import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import { HelpCircle, Minus, Plus, Redo, Settings, Undo } from 'lucide-react'
import React from 'react'
import { useCanvas } from '../../contexts'
import { useCanvasStore } from '../../store/canvasStore'

const StatusBar: React.FC = () => {
  const { zoom, setZoom } = useCanvasStore()
  const [sdkState, sdkActions] = useCanvas()

  // 预设缩放级别
  const zoomLevels = [25, 50, 75, 100, 125, 150, 200, 300, 400]

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    if (sdkState.isInitialized && sdkActions.zoomViewport) {
      // 将百分比转换为缩放因子
      const zoomFactor = newZoom / 100
      const currentZoom = sdkState.viewport?.zoom || 1
      sdkActions.zoomViewport(zoomFactor / currentZoom)
    }
  }

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.findIndex(level => level >= zoom)
    const nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1)
    if (nextIndex !== currentIndex) {
      handleZoomChange(zoomLevels[nextIndex])
    }
  }

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.findIndex(level => level >= zoom)
    const prevIndex = Math.max(currentIndex - 1, 0)
    if (prevIndex !== currentIndex) {
      handleZoomChange(zoomLevels[prevIndex])
    }
  }

  const handleResetZoom = () => {
    handleZoomChange(100)
  }

  const handleFitToContent = () => {
    if (sdkState.isInitialized && sdkActions.fitToContent) {
      sdkActions.fitToContent()
      // 更新store中的缩放值
      setTimeout(() => {
        const newZoom = Math.round((sdkState.viewport?.zoom || 1) * 100)
        setZoom(newZoom)
      }, 100)
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
      {/* 撤销重做按钮 */}
      {sdkState.isInitialized && (
        <>
          <div className="flex items-center gap-0.5">
            <Button
              variant="light"
              size="sm"
              isIconOnly
              isDisabled={!sdkState.canUndo}
              onPress={sdkActions.undo}
              className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              title="撤销"
            >
              <div className="flex items-center justify-center w-full h-full">
                <Undo size={12} />
              </div>
            </Button>
            
            <Button
              variant="light"
              size="sm"
              isIconOnly
              isDisabled={!sdkState.canRedo}
              onPress={sdkActions.redo}
              className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              title="重做"
            >
              <div className="flex items-center justify-center w-full h-full">
                <Redo size={12} />
              </div>
            </Button>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        </>
      )}

      {/* 缩放控制 */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="light"
          size="sm"
          isIconOnly
          onPress={handleZoomOut}
          className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <div className="flex items-center justify-center w-full h-full">
            <Minus size={12} />
          </div>
        </Button>
        
        <Dropdown>
          <DropdownTrigger>
            <button 
              className="flex items-center justify-center px-3 py-1 text-sm font-medium text-center text-gray-600 transition-colors border border-transparent rounded-md dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 min-w-16 h-7 hover:border-gray-200 dark:hover:border-gray-600"
            >
              {zoom}%
            </button>
          </DropdownTrigger>
          <DropdownMenu 
            aria-label="缩放级别"
            className="min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
            onAction={(key) => {
              if (key === 'fit') {
                handleFitToContent()
              } else {
                handleZoomChange(Number(key))
              }
            }}
          >
            <>
              {zoomLevels.map((level) => (
                <DropdownItem
                  key={level}
                  className={zoom === level ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}
                >
                  {level}%{zoom === level ? ' ✓' : ''}
                </DropdownItem>
              ))}
              <DropdownItem 
                key="fit"
                className="text-gray-700 border-t border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              >
                🎯 适应内容
              </DropdownItem>
            </>
          </DropdownMenu>
        </Dropdown>
        
        <Button
          variant="light"
          size="sm"
          isIconOnly
          onPress={handleZoomIn}
          className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
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
          {sdkState.isInitialized ? 
            `形状: ${sdkState.shapes.length} | 选中: ${sdkState.selectedShapes.length}` :
            '初始化中...'
          }
        </span>
        
        <Button
          variant="light"
          size="sm"
          isIconOnly
          className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
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
          className="flex items-center justify-center min-w-0 rounded-md h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
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