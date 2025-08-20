import React from 'react';
import { AdvancedCanvas } from '../Canvas/AdvancedCanvas';
import { ProfessionalToolbar } from '../Tools/ProfessionalToolbar';
import { ModernSidebar } from './ModernSidebar';

export const ModernMainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 专业工具栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <ProfessionalToolbar />
      </div>
      
      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 画布区域 */}
        <div className="flex-1 p-4">
          <AdvancedCanvas className="w-full h-full" />
        </div>
        
        {/* 侧边栏 */}
        <div className="w-80 bg-white border-l border-gray-200 shadow-sm">
          <ModernSidebar />
        </div>
      </div>
    </div>
  );
};
