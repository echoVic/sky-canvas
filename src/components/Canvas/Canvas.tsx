import React, { useEffect, useRef } from 'react'
import { useCanvasSDK } from '../../hooks'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { useCanvasStore } from '../../store/canvasStore'
import { Rectangle, Circle } from '@sky-canvas/render-engine'

const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 直接使用Canvas SDK Hook
  const [sdkState, sdkActions] = useCanvasSDK()
  
  // 获取当前选中的工具
  const { selectedTool } = useCanvasStore()
  
  // 使用Canvas交互hook
  const { interactionState } = useCanvasInteraction(
    containerRef,
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
    const container = containerRef.current
    if (!container || sdkState.isInitialized) return

    const initializeSDK = async () => {
      try {
        console.log('Initializing Canvas SDK with container')
        await sdkActions.initialize(container, {
          enableInteraction: true,
          logLevel: 'info'
        })
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeSDK()
  }, [sdkState.isInitialized, sdkActions.initialize])

  // 渲染由SDK内部自动处理，不需要手动启动

  // 这个 useEffect 不再需要，因为工具选择现在由 Toolbar 组件直接通过 SDK 处理

  // 渲染引擎应该自己处理canvas尺寸变化
  // 移除ResizeObserver，避免手动干预canvas尺寸

  // 清理逻辑已移除 - 由 useCanvasSDK hook 内部管理生命周期

  return (
    <div className="relative w-full h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
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

      {/* 测试按钮 */}
      {process.env.NODE_ENV === 'development' && sdkState.isInitialized && (
        <div className="absolute bottom-2 right-2 space-y-2">
          <button
            onClick={() => {
              const rect = new Rectangle({
                x: Math.random() * 400 + 50,
                y: Math.random() * 300 + 50,
                width: 100,
                height: 60,
                style: {
                  fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
                  stroke: '#333',
                  strokeWidth: 2
                },
                visible: true,
                zIndex: 1
              });
              console.log('=== Frontend: About to call addShape ===', rect);
              sdkActions.addShape(rect);
              console.log('=== Frontend: addShape call completed ===');
            }}
            className="block px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            添加矩形测试
          </button>
          <button
            onClick={() => {
              const circle = new Circle({
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
                radius: 40,
                style: {
                  fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
                  stroke: '#333',
                  strokeWidth: 2
                },
                visible: true,
                zIndex: 1
              });
              sdkActions.addShape(circle);
            }}
            className="block px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            添加圆形测试
          </button>
        </div>
      )}

    </div>
  )
}

export default Canvas