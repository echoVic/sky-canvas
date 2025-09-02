import React from 'react'
import { Button } from '@heroui/react'
import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  Image,
  StickyNote,
  Link,
  Frame,
  LucideIcon
} from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore'
import { useCanvas } from '../../contexts'

const iconMap: Record<string, LucideIcon> = {
  MousePointer2, Hand, Square, Diamond, Circle, MoveRight, Minus, 
  Pencil, Type, Image, StickyNote, Link, Frame
}

const Toolbar: React.FC = () => {
  const { tools } = useCanvasStore()
  const [sdkState, sdkActions] = useCanvas()
  
  // 获取当前激活的工具名称
  const getActiveTool = () => {
    if (!sdkState.isInitialized) return 'select'
    
    // 直接使用SDK状态中的currentTool
    const currentTool = sdkState.currentTool
    
    // 将SDK工具名称映射到UI工具ID
    switch (currentTool) {
      case 'select': return 'select'
      case 'pan': return 'hand'
      case 'zoom': return 'zoom'
      case 'draw': return 'draw'
      case 'rectangle': return 'rectangle'
      case 'circle': return 'circle'
      case 'diamond': return 'diamond'
      case 'text': return 'text'
      default: return 'select'
    }
  }
  
  const activeTool = getActiveTool()

  return (
    <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 rounded-lg p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
      {tools.map((tool) => {
        const IconComponent = iconMap[tool.icon]
        return (
          <Button
            key={tool.id}
            variant="light"
            size="sm"
            isIconOnly
            className={`
              w-8 h-8 transition-all duration-150 rounded-md flex items-center justify-center
              ${activeTool === tool.id
                ? 'bg-blue-500 text-white shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            onPress={() => {
              if (sdkState.isInitialized) {
                sdkActions.setTool(tool.id)
              }
            }}
            title={tool.name}
          >
            <div className="flex items-center justify-center w-full h-full">
              <IconComponent size={16} />
            </div>
          </Button>
        )
      })}
    </div>
  )
}

export default Toolbar