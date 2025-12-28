import React, { useState } from 'react'
import { useCanvasStore } from './store/canvasStore'
import Toolbar from './components/Toolbar/Toolbar'
import Canvas from './components/Canvas/Canvas'
import StatusBar from './components/StatusBar/StatusBar'
import MenuDropdown from './components/MenuDropdown/MenuDropdown'
import Inspector from './components/Inspector/Inspector'
import LayersPanel from './components/LayersPanel/LayersPanel'

const App: React.FC = () => {
  const { theme } = useCanvasStore()
  const [showInspector, setShowInspector] = useState(true)
  const [showLayers, setShowLayers] = useState(true)

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 左侧图层面板 */}
      {showLayers && (
        <div className="flex-shrink-0">
          <LayersPanel />
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
        <Canvas />

        {/* 左上角菜单下拉按钮 */}
        <div className="absolute top-4 left-4 z-20">
          <MenuDropdown />
        </div>

        {/* 悬浮工具栏 - 顶部中央 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <Toolbar />
        </div>

        {/* 面板切换按钮 */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`px-3 py-1.5 text-sm rounded shadow ${
              showLayers ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
            title="切换图层面板"
          >
            图层
          </button>
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`px-3 py-1.5 text-sm rounded shadow ${
              showInspector ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
            title="切换属性面板"
          >
            属性
          </button>
        </div>

        {/* 悬浮状态栏 - 底部中央 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <StatusBar />
        </div>
      </div>

      {/* 右侧属性面板 */}
      {showInspector && (
        <div className="flex-shrink-0">
          <Inspector />
        </div>
      )}
    </div>
  )
}

export default App