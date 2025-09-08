import { CircleTool, DiamondTool, RectangleTool, TextTool } from '@sky-canvas/canvas-sdk'
import React, { useEffect, useRef } from 'react'
import { useCanvas } from '../../contexts'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { useCanvasStore } from '../../store/canvasStore'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 使用Canvas上下文中的SDK实例
  const [sdkState, sdkActions] = useCanvas()
  
  // 获取当前选中的工具
  const { selectedTool } = useCanvasStore()
  
  // 使用Canvas交互hook
  const { interactionState } = useCanvasInteraction(
    canvasRef,
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
        
        // 注册SDK工具
        // 创建工具实例并设置回调函数
        const interactionManager = sdkActions.getInteractionManager()
        if (interactionManager) {
          const rectangleTool = new RectangleTool()
          rectangleTool.setCallbacks({
            onSetCursor: (cursor: string) => {
              if (interactionManager) {
                interactionManager.setCursor(cursor)
              }
            },
            onAddShape: (shape: any) => {
              sdkActions.addShape(shape)
            }
          })
          
          const circleTool = new CircleTool()
          circleTool.setCallbacks({
            onSetCursor: (cursor: string) => {
              if (interactionManager) {
                interactionManager.setCursor(cursor)
              }
            },
            onAddShape: (shape: any) => {
              sdkActions.addShape(shape)
            }
          })
          
          const diamondTool = new DiamondTool(
            interactionManager,
            (cursor: string) => {
              if (interactionManager) {
                interactionManager.setCursor(cursor)
              }
            },
            (shape: any) => {
              sdkActions.addShape(shape)
            }
          )
          
          const textTool = new TextTool(
            interactionManager,
            (cursor: string) => {
              if (interactionManager) {
                interactionManager.setCursor(cursor)
              }
            },
            (shape: any) => {
              sdkActions.addShape(shape)
            }
          )
          
          // 通过SDK注册工具
          sdkActions.registerInteractionTool(rectangleTool)
          sdkActions.registerInteractionTool(circleTool)
          sdkActions.registerInteractionTool(diamondTool)
          sdkActions.registerInteractionTool(textTool)
        }
        
        // 设置默认工具
        sdkActions.setTool('select')
      } catch (error) {
        console.error('Failed to initialize Canvas SDK:', error)
      }
    }

    initializeCanvas()
  }, [sdkState.isInitialized]) // 移除sdkActions依赖，避免循环

  // 启动SDK渲染循环
  useEffect(() => {
    if (!sdkState.isInitialized) return

    try {
      // 启动SDK内置的渲染循环
      sdkActions.startRender()
    } catch (error) {
      console.error('Failed to start SDK render loop:', error)
    }
  }, [sdkState.isInitialized])

  // 这个 useEffect 不再需要，因为工具选择现在由 Toolbar 组件直接通过 SDK 处理

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
          <div>工具: {sdkState.interactionMode}</div>
          <div>交互模式: {sdkState.interactionMode}</div>
          <div>初始化: {sdkState.isInitialized ? '是' : '否'}</div>
          <div>视口缩放: {sdkState.viewport.zoom.toFixed(2)}</div>
        </div>
      )}

    </div>
  )
}

export default Canvas