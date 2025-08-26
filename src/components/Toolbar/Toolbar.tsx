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
  Frame
} from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore'

const iconMap = {
  MousePointer2, Hand, Square, Diamond, Circle, MoveRight, Minus, 
  Pencil, Type, Image, StickyNote, Link, Frame
}

const Toolbar: React.FC = () => {
  const { tools, selectedTool, setSelectedTool } = useCanvasStore()

  return (
    <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 rounded-lg p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
      {tools.map((tool) => {
        const IconComponent = iconMap[tool.icon as keyof typeof iconMap]
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
            onPress={() => setSelectedTool(tool.id)}
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