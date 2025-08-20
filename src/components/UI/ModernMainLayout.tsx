import React from 'react';
import { Card } from '@heroui/react';
import { RendererType } from '../../engine/core/RenderTypes';
import { DrawingCanvas } from '../Canvas/DrawingCanvas';
import { ModernToolbar } from '../Tools/ModernToolbar';
import { ModernSidebar } from './ModernSidebar';

interface ModernMainLayoutProps {
  rendererType?: RendererType;
}

export const ModernMainLayout: React.FC<ModernMainLayoutProps> = ({ rendererType = RendererType.CANVAS_2D }) => {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 现代化工具栏 */}
      <ModernToolbar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 中间画布区域 */}
        <div className="flex-1 flex flex-col p-4">
          <Card className="flex-1 p-4" shadow="sm">
            <DrawingCanvas className="w-full h-full" />
          </Card>
        </div>
        
        {/* 右侧现代化侧边栏 */}
        <ModernSidebar />
      </div>
    </div>
  );
};
