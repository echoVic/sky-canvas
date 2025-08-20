import { useState, useEffect } from 'react';
import { Button, ButtonGroup, Select, SelectItem } from '@heroui/react';
import { Palette, Cpu, Gamepad2, Puzzle } from 'lucide-react';
import { ModernMainLayout } from './components/UI/ModernMainLayout';
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
      {/* 现代化顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 视图模式切换 */}
          <ButtonGroup variant="flat">
            <Button
              startContent={<Palette size={16} />}
              variant={viewMode === 'canvas' ? 'solid' : 'flat'}
              color={viewMode === 'canvas' ? 'primary' : 'default'}
              onPress={() => setViewMode('canvas')}
            >
              绘图画布
            </Button>
            <Button
              startContent={<Gamepad2 size={16} />}
              variant={viewMode === 'interactive' ? 'solid' : 'flat'}
              color={viewMode === 'interactive' ? 'primary' : 'default'}
              onPress={() => setViewMode('interactive')}
            >
              交互演示
            </Button>
            <Button
              startContent={<Cpu size={16} />}
              variant={viewMode === 'rendering' ? 'solid' : 'flat'}
              color={viewMode === 'rendering' ? 'primary' : 'default'}
              onPress={() => setViewMode('rendering')}
            >
              渲染系统
            </Button>
            <Button
              startContent={<Puzzle size={16} />}
              variant="flat"
              color="secondary"
              onPress={() => setShowPluginManager(true)}
            >
              插件管理
            </Button>
          </ButtonGroup>
          
          {/* 渲染器类型选择 */}
          {viewMode === 'canvas' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">渲染器:</span>
              <Select
                size="sm"
                selectedKeys={[rendererType]}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as RendererType;
                  setRendererType(key);
                }}
                className="w-32"
              >
                <SelectItem key={RendererType.CANVAS_2D}>Canvas 2D</SelectItem>
                <SelectItem key={RendererType.WEBGL}>WebGL</SelectItem>
                <SelectItem key={RendererType.WEBGL2}>WebGL 2</SelectItem>
                <SelectItem key={RendererType.WEBGPU}>WebGPU</SelectItem>
              </Select>
            </div>
          )}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'canvas' && (
          <ModernMainLayout rendererType={rendererType} />
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
