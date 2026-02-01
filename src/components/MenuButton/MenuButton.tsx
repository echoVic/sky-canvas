import { Button } from '@heroui/react'
import { Menu } from 'lucide-react'
import type React from 'react'
import { useCanvasStore } from '../../store/canvasStore'

const MenuButton: React.FC = () => {
  const { toggleSidebar } = useCanvasStore()

  return (
    <Button
      variant="light"
      isIconOnly
      onPress={toggleSidebar}
      className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
    >
      <div className="flex items-center justify-center w-full h-full">
        <Menu size={20} />
      </div>
    </Button>
  )
}

export default MenuButton
