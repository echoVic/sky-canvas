import React from 'react';
import { useTools } from '../../hooks/useTools';
import { useAppStore } from '../../store/appStore';

interface ToolButtonProps {
  icon: string;
  name: string;
  shortcut?: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  name,
  shortcut,
  isActive,
  onClick
}) => (
  <button
    className={`
      flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200
      ${isActive 
        ? 'bg-blue-500 text-white shadow-lg' 
        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
      }
    `}
    onClick={onClick}
    title={`${name} ${shortcut ? `(${shortcut})` : ''}`}
  >
    <span className="text-xl mb-1">{icon}</span>
    <span className="text-xs font-medium">{name}</span>
    {shortcut && (
      <span className="text-xs opacity-60 mt-1">{shortcut}</span>
    )}
  </button>
);

export const Toolbar: React.FC = () => {
  const { showToolbar } = useAppStore();
  const { currentTool, tools, selectTool } = useTools();
  
  if (!showToolbar) return null;
  
  return (
    <div className="bg-white border-r border-gray-200 p-4 flex flex-col gap-2 min-w-[80px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">工具</h3>
      
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <ToolButton
            key={tool.type}
            icon={tool.icon}
            name={tool.name}
            shortcut={tool.shortcut}
            isActive={currentTool === tool.type}
            onClick={() => selectTool(tool.type)}
          />
        ))}
      </div>
      
      {/* 工具分隔线 */}
      <div className="border-t border-gray-200 my-2" />
      
      {/* 快速操作 */}
      <div className="flex flex-col gap-2">
        <button
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all duration-200"
          title="重置视图"
        >
          <span className="text-lg">🏠</span>
          <span className="text-xs">重置</span>
        </button>
        
        <button
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all duration-200"
          title="适应画布"
        >
          <span className="text-lg">📐</span>
          <span className="text-xs">适应</span>
        </button>
      </div>
    </div>
  );
};
