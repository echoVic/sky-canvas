import React from 'react';
import { Button, Slider, Select, SelectItem } from '@heroui/react';
import { 
  MousePointer2, 
  Hand, 
  Paintbrush, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  Triangle, 
  Type,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Palette
} from 'lucide-react';
import { useToolStore } from '../../store/toolStore';
import { useCanvasStore } from '../../store/canvasStore';
import { ToolType } from '../../types';

// 创建一个简单的历史管理 hook
const useHistoryStore = () => ({
  undo: () => console.log('undo'),
  redo: () => console.log('redo'),
  canUndo: false,
  canRedo: false
});

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
    setFontSize,
    fontFamily,
    setFontFamily
  } = useToolStore();
  
  const { zoomIn, zoomOut, resetView, zoom } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  // 工具分组
  const toolGroups = [
    {
      name: '选择',
      tools: [
        { type: ToolType.SELECT, icon: MousePointer2, label: '选择' },
        { type: ToolType.PAN, icon: Hand, label: '平移' }
      ]
    },
    {
      name: '绘制',
      tools: [
        { type: ToolType.BRUSH, icon: Paintbrush, label: '画笔' },
        { type: ToolType.ERASER, icon: Eraser, label: '橡皮擦' }
      ]
    },
    {
      name: '形状',
      tools: [
        { type: ToolType.RECTANGLE, icon: Square, label: '矩形' },
        { type: ToolType.CIRCLE, icon: Circle, label: '圆形' },
        { type: ToolType.LINE, icon: Minus, label: '直线' },
        { type: ToolType.TRIANGLE, icon: Triangle, label: '三角形' }
      ]
    },
    {
      name: '文字',
      tools: [
        { type: ToolType.TEXT, icon: Type, label: '文字' }
      ]
    }
  ];

  const colorPresets = [
    '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D92'
  ];

  const fontFamilies = [
    { key: 'Arial', label: 'Arial' },
    { key: 'Helvetica', label: 'Helvetica' },
    { key: 'Times New Roman', label: 'Times New Roman' },
    { key: 'Georgia', label: 'Georgia' },
    { key: 'Verdana', label: 'Verdana' },
    { key: 'Monaco', label: 'Monaco' },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-gray-200/60 px-6 py-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* 左侧工具组 */}
        <div className="flex items-center space-x-6">
          {toolGroups.map((group, groupIndex) => (
            <div key={group.name} className="flex items-center space-x-3">
              {groupIndex > 0 && (
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-2" />
              )}
              <div className="flex flex-col items-center space-y-1">
                <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-md border border-white/40 hover:shadow-lg transition-all duration-300">
                  {group.tools.map((tool) => (
                    <Button
                      key={tool.type}
                      variant={currentTool === tool.type ? "solid" : "ghost"}
                      size="sm"
                      className={`h-12 w-12 p-0 rounded-xl transition-all duration-300 ${
                        currentTool === tool.type 
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 hover:from-blue-600 hover:to-blue-700" 
                          : "hover:bg-blue-50 hover:shadow-md hover:scale-105 text-gray-600 hover:text-blue-600"
                      }`}
                      onClick={() => setCurrentTool(tool.type)}
                    >
                      <tool.icon className="h-5 w-5" />
                    </Button>
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-500">{group.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 中间工具属性控制 */}
        <div className="flex items-center space-x-4">
          {/* 历史操作 */}
          <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-md border border-white/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-lg hover:bg-blue-50 hover:shadow-sm disabled:opacity-30 text-gray-600 hover:text-blue-600"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-lg hover:bg-blue-50 hover:shadow-sm disabled:opacity-30 text-gray-600 hover:text-blue-600"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* 画笔属性 */}
          {(currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) && (
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md border border-white/40">
              <div className="flex items-center space-x-2">
                <Paintbrush className="h-4 w-4 text-gray-500" />
                <Slider
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  max={50}
                  min={1}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm font-medium text-gray-600 w-8">{brushSize}</span>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">透明度</span>
                <Slider
                  value={[brushOpacity * 100]}
                  onValueChange={(value) => setBrushOpacity(value[0] / 100)}
                  max={100}
                  min={10}
                  step={5}
                  className="w-20"
                />
                <span className="text-sm font-medium text-gray-600 w-10">{Math.round(brushOpacity * 100)}%</span>
              </div>
            </div>
          )}

          {/* 文字属性 */}
          {currentTool === ToolType.TEXT && (
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md border border-white/40">
              <div className="flex items-center space-x-2">
                <Type className="h-4 w-4 text-gray-500" />
                <Select 
                  value={fontFamily} 
                  onSelectionChange={(key) => setFontFamily(key as string)}
                  className="w-36"
                  size="sm"
                >
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.key} value={font.key}>
                      {font.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">大小</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  max={72}
                  min={8}
                  step={2}
                  className="w-20"
                />
                <span className="text-sm font-medium text-gray-600 w-8">{fontSize}</span>
              </div>
            </div>
          )}

          {/* 颜色选择器 */}
          <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md border border-white/40">
            <Palette className="h-4 w-4 text-gray-500" />
            <div className="flex items-center space-x-2">
              {colorPresets.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                    color === presetColor ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 右侧视图控制 */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-md border border-white/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-lg hover:bg-blue-50 hover:shadow-sm text-gray-600 hover:text-blue-600"
              onClick={zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-600 px-3 min-w-[4rem] text-center bg-gray-50 rounded-lg py-1">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-lg hover:bg-blue-50 hover:shadow-sm text-gray-600 hover:text-blue-600"
              onClick={zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-4 rounded-xl bg-white/80 backdrop-blur-sm shadow-md border border-white/40 hover:bg-blue-50 hover:shadow-lg text-sm font-medium text-gray-600 hover:text-blue-600 transition-all duration-200"
            onClick={resetView}
          >
            重置视图
          </Button>
        </div>
      </div>
    </div>
  );
};
