import { AnimatePresence, motion } from 'framer-motion';
import {
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Paintbrush,
  Palette,
  Redo,
  Square,
  Triangle,
  Type,
  Undo,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToolStore } from '../../store/toolStore';
import { ToolType } from '../../types';
import { Button } from '../UI/atoms/Button';

// 创建一个简单的历史管理 hook
const useHistoryStore = () => ({
  undo: () => console.log('undo'),
  redo: () => console.log('redo'),
  canUndo: false,
  canRedo: false
});

// 颜色选择器组件
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const colorPresets = [
    '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D92',
    '#8E8E93', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ];
  
  return (
    <div className="relative">
      <button
        className="w-8 h-8 transition-transform border-2 border-white rounded-lg shadow-md hover:scale-105"
        style={{ backgroundColor: value }}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute left-0 z-50 p-3 mt-2 bg-white border border-gray-200 shadow-xl top-full rounded-xl"
          >
            <div className="grid w-40 grid-cols-5 gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 transition-transform border border-gray-200 rounded-md hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 滑块组件
interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
}

const Slider: React.FC<SliderProps> = ({ value, onChange, min, max, step = 1, label }) => {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 min-w-0 text-sm text-gray-600">{label}</span>
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <span className="flex-shrink-0 min-w-0 text-sm text-gray-500">{value}</span>
    </div>
  );
};

export const BeautifulToolbar: React.FC = () => {
  const { 
    currentTool, 
    setCurrentTool, 
    brushSize, 
    setBrushSize, 
    brushOpacity, 
    setBrushOpacity, 
    color, 
    setColor,
    fontSize,
    setFontSize
  } = useToolStore();
  
  const { zoomIn, zoomOut, resetView, zoom } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const [showProperties, setShowProperties] = useState(false);

  // 工具分组
  const toolGroups = [
    {
      name: '选择',
      tools: [
        { type: ToolType.SELECT, icon: MousePointer2, label: '选择', shortcut: 'V' },
        { type: ToolType.PAN, icon: Hand, label: '平移', shortcut: 'H' }
      ]
    },
    {
      name: '绘制',
      tools: [
        { type: ToolType.BRUSH, icon: Paintbrush, label: '画笔', shortcut: 'B' },
        { type: ToolType.ERASER, icon: Eraser, label: '橡皮擦', shortcut: 'E' }
      ]
    },
    {
      name: '形状',
      tools: [
        { type: ToolType.RECTANGLE, icon: Square, label: '矩形', shortcut: 'R' },
        { type: ToolType.CIRCLE, icon: Circle, label: '圆形', shortcut: 'O' },
        { type: ToolType.LINE, icon: Minus, label: '直线', shortcut: 'L' },
        { type: ToolType.TRIANGLE, icon: Triangle, label: '三角形', shortcut: 'T' }
      ]
    },
    {
      name: '文字',
      tools: [
        { type: ToolType.TEXT, icon: Type, label: '文字', shortcut: 'T' }
      ]
    }
  ];

  return (
    <motion.div 
      className="bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-lg p-4 flex flex-wrap gap-4 items-center transition-all duration-300"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 工具组 */}
      <div className="flex gap-2">
        {toolGroups.map((group) => (
          <div key={group.name} className="flex gap-1">
            {group.tools.map((tool) => (
              <Button
                key={tool.type}
                variant={currentTool === tool.type ? "primary" : "ghost"}
                size="sm"
                className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                  currentTool === tool.type 
                    ? "bg-blue-500 text-white shadow-md" 
                    : "hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                }`}
                onClick={() => setCurrentTool(tool.type)}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 历史操作 */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
          onClick={undo}
          disabled={!canUndo}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
          onClick={redo}
          disabled={!canRedo}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 画笔设置 */}
      {(currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">大小:</span>
            <Slider
              value={brushSize}
              onChange={setBrushSize}
              min={1}
              max={50}
              step={1}
              label=""
            />
            <span className="text-xs text-gray-500 w-8">{brushSize}px</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">透明度:</span>
            <Slider
              value={brushOpacity}
              onChange={setBrushOpacity}
              min={0.1}
              max={1}
              step={0.1}
              label=""
            />
            <span className="text-xs text-gray-500 w-8">{Math.round(brushOpacity * 100)}%</span>
          </div>
        </>
      )}

      {/* 颜色选择 */}
      {currentTool !== ToolType.ERASER && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">颜色:</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      )}

      {/* 文字设置 */}
      {currentTool === ToolType.TEXT && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">大小:</span>
          <Slider
            value={fontSize}
            onChange={setFontSize}
            min={8}
            max={72}
            step={1}
            label=""
          />
          <span className="text-xs text-gray-500 w-8">{fontSize}px</span>
        </div>
      )}

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 视图控制 */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          onClick={zoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          onClick={zoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          onClick={resetView}
        >
          重置视图
        </Button>
        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* 设置按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600"
        onClick={() => setShowProperties(!showProperties)}
      >
        <Palette className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};
