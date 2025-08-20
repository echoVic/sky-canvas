import { useState } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { Toolbar } from './components/Tools/Toolbar';
import { PropertyPanel } from './components/Tools/PropertyPanel';
import { MathTestPanel } from './components/UI/MathTestPanel';
import { AdvancedRenderingExample } from './examples/AdvancedRenderingExample';

type ViewMode = 'canvas' | 'rendering';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <Toolbar />
          
          {/* 视图切换按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              画布模式
            </button>
            <button
              onClick={() => setViewMode('rendering')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'rendering'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              渲染系统演示
            </button>
          </div>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      {viewMode === 'canvas' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* 画布区域 */}
          <div className="flex-1 relative">
            <InfiniteCanvas className="absolute inset-0" />
          </div>
          
          {/* 右侧面板 */}
          <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
            {/* 数学库测试面板 */}
            <div className="p-4 border-b border-gray-200">
              <MathTestPanel />
            </div>
            
            {/* 属性面板 */}
            <PropertyPanel />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <AdvancedRenderingExample />
        </div>
      )}
    </div>
  );
}

export default App;
