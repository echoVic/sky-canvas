import { Button } from '@heroui/react'
import {
  Circle,
  Diamond,
  Frame,
  Hand,
  Image,
  Link,
  LucideIcon,
  Minus,
  MousePointer2,
  MoveRight,
  Pencil,
  Square,
  StickyNote,
  Type
} from 'lucide-react'
import React from 'react'
import { useCanvasSDK } from '../../hooks'
import { useCanvasStore } from '../../store/canvasStore'

const iconMap: Record<string, LucideIcon> = {
  MousePointer2, Hand, Square, Diamond, Circle, MoveRight, Minus, 
  Pencil, Type, Image, StickyNote, Link, Frame
}

const Toolbar: React.FC = () => {
  const { tools, selectedTool, setSelectedTool } = useCanvasStore()
  const [sdkState, sdkActions] = useCanvasSDK()

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
              ${selectedTool === tool.id
                ? 'bg-blue-500 text-white shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            onPress={() => {
              // 先更新UI状态
              setSelectedTool(tool.id)
              // TODO: 将来可能需要通过Action系统同步到SDK
              // 当前工具选择主要由前端状态管理
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