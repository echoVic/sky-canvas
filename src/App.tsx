import React, { useState } from 'react'
import Canvas from './components/Canvas/Canvas'
import Inspector from './components/Inspector/Inspector'
import LayersPanel from './components/LayersPanel/LayersPanel'
import StatusBar from './components/StatusBar/StatusBar'
import Toolbar from './components/Toolbar/Toolbar'
import { useCanvasStore } from './store/canvasStore'

const App: React.FC = () => {
  const { theme } = useCanvasStore()
  const [showInspector, setShowInspector] = useState(true)
  const [showLayers, setShowLayers] = useState(true)

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 顶部工具栏 */}
      <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-200">Sky Canvas</span>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* 工具栏 */}
        <div className="flex-1 flex justify-center">
          <Toolbar />
        </div>

        {/* 右侧按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              showLayers 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            图层
          </button>
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              showInspector 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            属性
          </button>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧图层面板 */}
        {showLayers && (
          <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
            <LayersPanel />
          </aside>
        )}

        {/* 画布区域 */}
        <main className="flex-1 relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <Canvas />
        </main>

        {/* 右侧属性面板 */}
        {showInspector && (
          <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Inspector />
          </aside>
        )}
      </div>

      {/* 底部状态栏 */}
      <footer className="h-8 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-4 flex-shrink-0">
        <StatusBar />
      </footer>
    </div>
  )
}

export default App
