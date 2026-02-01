import { Button, Tooltip } from '@heroui/react'
import {
  Download,
  Folder,
  FolderOpen,
  HelpCircle,
  Moon,
  Save,
  Search,
  Share,
  Sun,
  Users,
  X,
} from 'lucide-react'
import type React from 'react'
import { useCanvasStore } from '../../store/canvasStore'

const Sidebar: React.FC = () => {
  const { theme, toggleTheme, toggleSidebar } = useCanvasStore()

  const menuItems = [
    { icon: FolderOpen, label: '打开', shortcut: 'Cmd+O' },
    { icon: Save, label: '保存', shortcut: 'Cmd+S' },
    { icon: Download, label: '导出', shortcut: 'Cmd+Shift+E' },
    { icon: Share, label: '分享', shortcut: '' },
    { icon: Folder, label: '素材库', shortcut: '' },
    { icon: Users, label: '协作', shortcut: '' },
    { icon: Search, label: '查找', shortcut: 'Cmd+F' },
    { icon: HelpCircle, label: '帮助', shortcut: '?' },
  ]

  return (
    <div className="w-16 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* 顶部关闭按钮 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <Tooltip content="关闭菜单" placement="right">
          <Button
            variant="light"
            isIconOnly
            onPress={toggleSidebar}
            className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </Button>
        </Tooltip>
      </div>

      {/* 主菜单图标 */}
      <div className="flex-1 px-3 py-3 space-y-2">
        {menuItems.map((item) => (
          <Tooltip key={item.label} content={`${item.label} ${item.shortcut}`} placement="right">
            <Button
              variant="light"
              isIconOnly
              className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <item.icon size={20} />
            </Button>
          </Tooltip>
        ))}
      </div>

      {/* 底部主题切换 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Tooltip content="切换主题" placement="right">
          <Button
            variant="light"
            isIconOnly
            className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
            onPress={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

export default Sidebar
