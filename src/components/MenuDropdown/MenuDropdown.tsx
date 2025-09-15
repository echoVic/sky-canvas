import React from 'react'
import { 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Button 
} from '@heroui/react'
import {
  Menu,
  FolderOpen,
  Save,
  Download,
  Users,
  Search,
  HelpCircle,
  Share,
  Folder,
  Sun,
  Moon,
  Terminal,
  RotateCcw,
  TestTube
} from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore'
import { useCanvasSDK } from '../../hooks'

const MenuDropdown: React.FC = () => {
  const { theme, toggleTheme } = useCanvasStore()
  const [sdkState, sdkActions] = useCanvasSDK()

  const handleAction = (key: string) => {
    switch (key) {
      case 'theme-light':
      case 'theme-dark':
        toggleTheme()
        break
      case 'open':
        console.log('打开文件')
        break
      case 'save':
        console.log('保存文件')
        break
      case 'export':
        console.log('导出图片')
        break
      case 'share':
        console.log('分享')
        break
      case 'library':
        console.log('素材库')
        break
      case 'collaborate':
        console.log('实时协作')
        break
      case 'search':
        console.log('查找')
        break
      case 'help':
        console.log('帮助')
        break
      case 'test-shape':
        // 添加测试形状
        if (sdkState.isInitialized && sdkState.sdk) {
          const canvasManager = sdkActions.getCanvasManager()
          if (canvasManager) {
            const testShape = {
              id: `test-rect-${Date.now()}`,
              type: 'rectangle',
              x: 100,
              y: 100,
              width: 100,
              height: 80,
              fill: '#ff6b6b',
              stroke: '#333',
              strokeWidth: 2,
              visible: true,
              zIndex: 1
            }
            console.log('Adding test shape:', testShape)
            canvasManager.addShape(testShape)
          }
        }
        break
      default:
        break
    }
  }

  return (
    <Dropdown placement="bottom-start" className="bg-white dark:bg-gray-900">
      <DropdownTrigger>
        <Button
          variant="light"
          isIconOnly
          className="w-9 h-9 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
        >
          <div className="flex items-center justify-center w-full h-full">
            <Menu size={16} />
          </div>
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="菜单选项"
        onAction={(key) => handleAction(key as string)}
        className="w-64 p-1 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
        itemClasses={{
          base: "rounded-lg data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-gray-800 px-3 py-2"
        }}
      >
        {/* 文件操作 */}
        <DropdownItem
          key="open"
          startContent={<FolderOpen size={16} />}
          endContent={
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
              Cmd+O
            </span>
          }
          className="h-9 text-sm"
        >
          打开
        </DropdownItem>
        
        <DropdownItem
          key="save"
          startContent={<Save size={16} />}
          className="h-9 text-sm data-[hover=true]:bg-blue-50 dark:data-[hover=true]:bg-blue-900/20"
        >
          保存到...
        </DropdownItem>
        
        <DropdownItem
          key="export"
          startContent={<Download size={16} />}
          endContent={
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
              Cmd+Shift+E
            </span>
          }
          className="h-9 text-sm"
        >
          导出图片...
        </DropdownItem>
        
        <DropdownItem
          key="collaborate"
          startContent={<Users size={16} />}
          className="h-9 text-sm"
        >
          实时协作...
        </DropdownItem>
        
        {/* Command palette - 特殊样式 */}
        <DropdownItem
          key="command"
          startContent={<Terminal size={16} className="text-blue-500" />}
          endContent={
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
              Cmd+/
            </span>
          }
          className="h-9 text-sm text-blue-500 data-[hover=true]:bg-blue-50 dark:data-[hover=true]:bg-blue-900/20"
        >
          Command palette
        </DropdownItem>
        
        <DropdownItem
          key="search"
          startContent={<Search size={16} />}
          endContent={
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
              Cmd+F
            </span>
          }
          className="h-9 text-sm"
        >
          Find on canvas
        </DropdownItem>
        
        <DropdownItem
          key="help"
          startContent={<HelpCircle size={16} />}
          endContent={
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
              ?
            </span>
          }
          className="h-9 text-sm"
        >
          帮助
        </DropdownItem>

        {/* 测试按钮 - 仅在开发环境显示 */}
        {process.env.NODE_ENV === 'development' ? (
          <DropdownItem
            key="test-shape"
            startContent={<TestTube size={16} className="text-green-500" />}
            className="h-9 text-sm text-green-500 data-[hover=true]:bg-green-50 dark:data-[hover=true]:bg-green-900/20"
          >
            🧪 添加测试形状
          </DropdownItem>
        ) : null}

        <DropdownItem
          key="reset"
          startContent={<RotateCcw size={16} />}
          className="h-9 text-sm"
        >
          重置画布
        </DropdownItem>

        {/* 主题设置项 */}
        <DropdownItem
          key="theme-light"
          startContent={<Sun size={16} />}
          className={`h-9 text-sm ${theme === 'light' ? 'bg-blue-50 text-blue-600' : ''}`}
        >
          浅色主题
        </DropdownItem>

        <DropdownItem
          key="theme-dark"
          startContent={<Moon size={16} />}
          className={`h-9 text-sm ${theme === 'dark' ? 'bg-blue-50 text-blue-600' : ''}`}
        >
          深色主题
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default MenuDropdown