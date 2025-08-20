import React from 'react';
import { RendererType } from '../../engine/core/RenderTypes';
import { useAppStore } from '../../store/appStore';
import { SimpleCanvas } from '../Canvas/SimpleCanvas';
import { LayerPanel } from './LayerPanel';
import { MenuBar } from './MenuBar';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';

interface MainLayoutProps {
  rendererType?: RendererType;
}

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const { showToolbar, showLayerPanel, showPropertiesPanel } = useAppStore();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部菜单栏 */}
      <MenuBar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧工具栏 */}
        {showToolbar && <Toolbar />}
        
        {/* 中间画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* 画布容器 */}
          <div className="flex-1 relative">
            <SimpleCanvas 
              className="w-full h-full"
            />
          </div>
        </div>
        
        {/* 右侧面板区域 */}
        <div className="flex">
          {/* 图层面板 */}
          {showLayerPanel && <LayerPanel />}
          
          {/* 属性面板 */}
          {showPropertiesPanel && <PropertiesPanel />}
        </div>
      </div>
    </div>
  );
};
