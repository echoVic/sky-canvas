import React from 'react'
import { useCanvasStore } from './store/canvasStore'
import Toolbar from './components/Toolbar/Toolbar'
import Canvas from './components/Canvas/Canvas'
import StatusBar from './components/StatusBar/StatusBar'
import MenuDropdown from './components/MenuDropdown/MenuDropdown'

const App: React.FC = () => {
  const { theme } = useCanvasStore()

  return (
    <div className={`h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 主内容区域 */}
      <div className="w-full h-full bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
        <Canvas />
        
        {/* 左上角菜单下拉按钮 */}
        <div className="absolute top-4 left-4 z-20">
          <MenuDropdown />
        </div>
        
        {/* 悬浮工具栏 - 顶部中央 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <Toolbar />
        </div>
        
        {/* 悬浮状态栏 - 底部中央 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <StatusBar />
        </div>
      </div>
    </div>
  )
}

export default App