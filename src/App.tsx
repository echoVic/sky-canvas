import { useState } from 'react';
import { MainLayout } from './components/UI/MainLayout';
import { AdvancedRenderingExample } from './examples/AdvancedRenderingExample';
import InteractiveCanvasExample from './examples/InteractiveCanvasExample';
import { RendererType } from './engine/core/RenderTypes';

type ViewMode = 'canvas' | 'rendering' | 'interactive';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [rendererType, setRendererType] = useState<RendererType>(RendererType.CANVAS_2D);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部切换栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* 视图模式切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              主画布
            </button>
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'interactive'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              交互演示
            </button>
            <button
              onClick={() => setViewMode('rendering')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'rendering'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              渲染系统
            </button>
          </div>
          
          {/* 渲染器类型选择 */}
          {viewMode === 'canvas' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">渲染器:</span>
              <select
                value={rendererType}
                onChange={(e) => setRendererType(e.target.value as RendererType)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={RendererType.CANVAS_2D}>Canvas 2D</option>
                <option value={RendererType.WEBGL}>WebGL</option>
                <option value={RendererType.WEBGL2}>WebGL 2</option>
                <option value={RendererType.WEBGPU}>WebGPU</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'canvas' && (
          <MainLayout rendererType={rendererType} />
        )}
        
        {viewMode === 'interactive' && (
          <InteractiveCanvasExample />
        )}
        
        {viewMode === 'rendering' && (
          <AdvancedRenderingExample />
        )}
      </div>
    </div>
  );
}

export default App;
