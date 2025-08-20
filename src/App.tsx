import { useState, useEffect } from 'react';
import { MainLayout } from './components/UI/MainLayout';
import { PluginManager } from './components/UI/PluginManager';
import { AdvancedRenderingExample } from './examples/AdvancedRenderingExample';
import InteractiveCanvasExample from './examples/InteractiveCanvasExample';
import { RendererType } from './engine/core/RenderTypes';
import { getGlobalPluginSystem } from './engine/plugins';

type ViewMode = 'canvas' | 'rendering' | 'interactive' | 'plugins';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [rendererType, setRendererType] = useState<RendererType>(RendererType.CANVAS_2D);
  const [showPluginManager, setShowPluginManager] = useState(false);

  // 初始化插件系统
  useEffect(() => {
    const pluginSystem = getGlobalPluginSystem();
    console.log('Plugin system initialized:', pluginSystem);
  }, []);

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
            <button
              onClick={() => setShowPluginManager(true)}
              className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              插件管理
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

      {/* 插件管理器 */}
      <PluginManager 
        isOpen={showPluginManager} 
        onClose={() => setShowPluginManager(false)} 
      />
    </div>
  );
}

export default App;
