import React from 'react';
import { AdvancedCanvas } from '../Canvas/AdvancedCanvas';
import { BeautifulToolbar } from '../Tools/BeautifulToolbar';
import { ModernSidebar } from './ModernSidebar';
import { RendererType } from '../../engine/core/RenderTypes';

interface ModernMainLayoutProps {
  rendererType?: RendererType;
}

export const ModernMainLayout: React.FC<ModernMainLayoutProps> = () => {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* 美观工具栏 */}
      <BeautifulToolbar />
      
      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none" />
        
        {/* 画布区域 */}
        <div className="flex-1 p-6 relative z-10">
          <div className="h-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <AdvancedCanvas className="w-full h-full" />
          </div>
        </div>
        
        {/* 侧边栏 */}
        <div className="w-80 relative z-10">
          <div className="h-full bg-white/90 backdrop-blur-md border-l border-white/30 shadow-2xl">
            <ModernSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};
