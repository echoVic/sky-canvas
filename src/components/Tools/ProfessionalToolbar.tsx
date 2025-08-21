import {
  Button,
  ButtonGroup,
  Divider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Slider,
  Tooltip
} from '@heroui/react';
import {
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Paintbrush,
  Palette,
  Redo2,
  Square,
  Triangle,
  Type,
  Undo2
} from 'lucide-react';
import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';
import { useToolStore } from '../../store/toolStore';
import { ToolType } from '../../types';

export const ProfessionalToolbar: React.FC = () => {
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
        { type: ToolType.SELECT, icon: MousePointer, label: '选择' },
        { type: ToolType.PAN, icon: Hand, label: '平移' }
      ]
    },
    {
      name: '绘制',
      tools: [
        { type: ToolType.BRUSH, icon: Brush, label: '画笔' },
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
    <div className="px-6 py-4 border-b shadow-sm bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200/60">
      <div className="flex items-center justify-between mx-auto max-w-7xl">
        {/* 左侧工具组 */}
        <div className="flex items-center space-x-8">
          {toolGroups.map((group, groupIndex) => (
            <div key={group.name} className="flex items-center space-x-2">
              {groupIndex > 0 && (
                <div className="w-px h-8 mx-4 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              )}
              <div className="flex items-center p-1 space-x-1 border shadow-sm bg-white/60 backdrop-blur-sm rounded-xl border-white/20">
                {group.tools.map((tool) => (
                  <Button
                    key={tool.type}
                    variant={currentTool === tool.type ? "default" : "ghost"}
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                      currentTool === tool.type 
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105" 
                        : "hover:bg-white/80 hover:shadow-sm hover:scale-105"
                    }`}
                    onClick={() => setCurrentTool(tool.type)}
                  >
                    <tool.icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>
              <span className="ml-2 text-xs font-medium text-gray-600">{group.name}</span>
            </div>
          ))}
        </div>

        <Divider orientation="vertical" className="h-16" />

        {/* 历史操作 */}
        <div className="flex flex-col gap-1">
          <div className="px-1 text-xs font-medium text-gray-500">历史</div>
          <ButtonGroup variant="flat" size="sm">
            <Tooltip content="撤销 (⌘Z)">
              <Button
                isIconOnly
                isDisabled={!canUndo}
                onPress={undo}
                className="h-11 w-11"
              >
                <Undo2 size={20} />
              </Button>
            </Tooltip>
            <Tooltip content="重做 (⌘⇧Z)">
              <Button
                isIconOnly
                isDisabled={!canRedo}
                onPress={redo}
                className="h-11 w-11"
              >
                <Redo2 size={20} />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </div>

        <Divider orientation="vertical" className="h-16" />

        {/* 工具属性 */}
        <div className="flex items-center gap-4">
          {/* 画笔设置 */}
          {(currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-12">大小</span>
                <Slider
                  size="sm"
                  step={1}
                  minValue={1}
                  maxValue={100}
                  value={brushSize}
                  onChange={(value) => setBrushSize(Array.isArray(value) ? value[0] : value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 min-w-8">{brushSize}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-12">透明</span>
                <Slider
                  size="sm"
                  step={0.1}
                  minValue={0.1}
                  maxValue={1}
                  value={brushOpacity}
                  onChange={(value) => setBrushOpacity(Array.isArray(value) ? value[0] : value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 min-w-8">{Math.round(brushOpacity * 100)}%</span>
              </div>
            </>
          )}

          {/* 文字设置 */}
          {currentTool === ToolType.TEXT && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">字体</span>
                <Select
                  size="sm"
                  selectedKeys={[fontFamily]}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setFontFamily(key);
                  }}
                  className="w-32"
                >
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.key}>{font.label}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">大小</span>
                <Slider
                  size="sm"
                  step={1}
                  minValue={8}
                  maxValue={72}
                  value={fontSize}
                  onChange={(value) => setFontSize(Array.isArray(value) ? value[0] : value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 min-w-8">{fontSize}px</span>
              </div>
            </>
          )}

          {/* 颜色选择器 */}
          {(currentTool === ToolType.BRUSH || currentTool === ToolType.TEXT || 
            currentTool === ToolType.RECTANGLE || currentTool === ToolType.CIRCLE ||
            currentTool === ToolType.LINE || currentTool === ToolType.TRIANGLE) && (
            <Popover placement="bottom">
              <PopoverTrigger>
                <Button
                  variant="flat"
                  className="relative h-11 w-11"
                >
                  <Palette size={20} />
                  <div 
                    className="absolute w-3 h-3 border border-white rounded-full shadow-sm bottom-1 right-1"
                    style={{ backgroundColor: color }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block mb-2 text-sm font-medium">自定义颜色</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">预设颜色</label>
                    <div className="grid grid-cols-5 gap-2">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setColor(preset)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            color === preset ? 'border-blue-500 scale-110' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: preset }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Divider orientation="vertical" className="h-16" />

        {/* 视图控制 */}
        <div className="flex flex-col gap-1">
          <div className="px-1 text-xs font-medium text-gray-500">视图</div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onPress={zoomOut}
              className="w-8 h-8"
            >
              <span className="text-lg">−</span>
            </Button>
            <span className="text-sm text-center text-gray-600 min-w-16">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onPress={zoomIn}
              className="w-8 h-8"
            >
              <span className="text-lg">+</span>
            </Button>
            <Button
              variant="flat"
              size="sm"
              onPress={resetView}
              className="h-8"
            >
              重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
