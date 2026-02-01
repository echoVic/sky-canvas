import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import {
  Download,
  Folder,
  FolderOpen,
  HelpCircle,
  Menu,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Search,
  Share,
  Sun,
  Terminal,
  Users,
} from 'lucide-react'
import type React from 'react'
import { useCanvasStore } from '../../store/canvasStore'

const MenuDropdown: React.FC = () => {
  const { theme, toggleTheme } = useCanvasStore()

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
          base: 'rounded-lg data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-gray-800 px-3 py-2',
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

        <DropdownItem key="collaborate" startContent={<Users size={16} />} className="h-9 text-sm">
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

        <DropdownItem key="reset" startContent={<RotateCcw size={16} />} className="h-9 text-sm">
          重置画布
        </DropdownItem>

        {/* 主题分隔区域 */}
        <DropdownItem key="theme-section" className="p-0 h-auto">
          <div className="pt-3 pb-2">
            <div className="border-t border-gray-200 dark:border-gray-700 mb-3" />
            <div className="px-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主题</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                    theme === 'light'
                      ? 'bg-blue-50 border-blue-500 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Sun size={16} />
                  <span>浅色</span>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                    theme === 'dark'
                      ? 'bg-blue-50 border-blue-500 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Moon size={16} />
                  <span>深色</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-xs">
                  <Monitor size={16} />
                  <span>系统</span>
                </button>
              </div>
            </div>

            {/* 画布背景 */}
            <div className="px-2 mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">画布背景</p>
              <div className="flex gap-1.5">
                {[
                  { color: 'bg-white', border: 'border-blue-500', active: true },
                  { color: 'bg-gray-100', border: 'border-gray-300', active: false },
                  { color: 'bg-blue-50', border: 'border-gray-300', active: false },
                  { color: 'bg-yellow-50', border: 'border-gray-300', active: false },
                  { color: 'bg-pink-50', border: 'border-gray-300', active: false },
                  { color: 'bg-transparent', border: 'border-gray-300', active: false },
                ].map((item, index) => (
                  <button
                    key={index}
                    className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-105 ${item.color} ${
                      item.active ? item.border : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={
                      index === 5
                        ? {
                            background:
                              'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 6px 6px',
                          }
                        : {}
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default MenuDropdown
