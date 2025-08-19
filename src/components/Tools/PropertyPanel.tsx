import React from 'react';
import { useToolStore } from '../../store/toolStore';
import { ToolType } from '../../types';

export const PropertyPanel: React.FC = () => {
  const { 
    currentTool, 
    brushSize, 
    brushOpacity, 
    color, 
    setBrushSize, 
    setBrushOpacity, 
    setColor 
  } = useToolStore();

  const showBrushProperties = currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER;

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 space-y-4">
      <h3 className="font-medium text-gray-900">属性面板</h3>
      
      {showBrushProperties && (
        <>
          {/* 画笔大小 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              画笔大小: {brushSize}px
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 不透明度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              不透明度: {Math.round(brushOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 颜色选择器 */}
          {currentTool === ToolType.BRUSH && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                颜色
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* 工具说明 */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">快捷键</h4>
        <div className="text-xs text-gray-500 space-y-1">
          <div>V - 选择工具</div>
          <div>H - 平移工具</div>
          <div>B - 画笔工具</div>
          <div>E - 橡皮擦</div>
          <div>空格 + 拖拽 - 临时平移</div>
          <div>滚轮 - 缩放</div>
        </div>
      </div>
    </div>
  );
};
