import React from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useTools } from '../../hooks/useTools';
import { useAppStore } from '../../store/appStore';
import { ToolType } from '../../types';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => (
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-gray-700">颜色</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
      />
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
        placeholder="#000000"
      />
    </div>
  </div>
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  unit = '' 
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-xs text-gray-500">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

export const PropertiesPanel: React.FC = () => {
  const { 
    currentTool, 
    brushSize, 
    brushOpacity, 
    color,
    updateBrushSize,
    updateBrushOpacity,
    updateColor,
    isDrawingTool
  } = useTools();
  
  const { selectedNodes, hasSelection } = useSelection();
  const { showPropertiesPanel } = useAppStore();
  
  if (!showPropertiesPanel) return null;
  
  return (
    <div className="bg-white border-l border-gray-200 p-4 w-64 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-700">属性</h3>
      
      {/* 工具属性 */}
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">工具设置</h4>
        
        {isDrawingTool() && (
          <>
            <ColorPicker color={color} onChange={updateColor} />
            
            <Slider
              label="笔刷大小"
              value={brushSize}
              min={1}
              max={100}
              onChange={updateBrushSize}
              unit="px"
            />
            
            <Slider
              label="不透明度"
              value={brushOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={updateBrushOpacity}
              unit="%"
            />
          </>
        )}
        
        {currentTool === ToolType.TEXT && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">字体大小</label>
              <input
                type="number"
                min="8"
                max="72"
                defaultValue="16"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">字体</label>
              <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>
          </>
        )}
      </div>
      
      {/* 选择对象属性 */}
      {hasSelection && (
        <>
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
              选中对象 ({selectedNodes.length})
            </h4>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">X</label>
                  <input
                    type="number"
                    defaultValue="0"
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Y</label>
                  <input
                    type="number"
                    defaultValue="0"
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">宽度</label>
                  <input
                    type="number"
                    defaultValue="100"
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">高度</label>
                  <input
                    type="number"
                    defaultValue="100"
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>
              
              <Slider
                label="旋转"
                value={0}
                min={-180}
                max={180}
                onChange={() => {}}
                unit="°"
              />
              
              <Slider
                label="透明度"
                value={1}
                min={0}
                max={1}
                step={0.01}
                onChange={() => {}}
                unit="%"
              />
            </div>
          </div>
        </>
      )}
      
      {/* 图层操作 */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">操作</h4>
        
        <div className="flex flex-col gap-2">
          <button className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
            复制
          </button>
          <button className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors">
            粘贴
          </button>
          <button className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors">
            删除
          </button>
        </div>
      </div>
    </div>
  );
};
