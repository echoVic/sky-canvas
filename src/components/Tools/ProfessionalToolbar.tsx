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

  const toolGroups = [
    {
      name: '选择工具',
      tools: [
        { type: ToolType.SELECT, icon: MousePointer2, name: '选择', shortcut: 'V' },
        { type: ToolType.PAN, icon: Hand, name: '平移', shortcut: 'H' },
      ]
    },
    {
      name: '绘制工具', 
      tools: [
        { type: ToolType.BRUSH, icon: Paintbrush, name: '画笔', shortcut: 'B' },
        { type: ToolType.ERASER, icon: Eraser, name: '橡皮擦', shortcut: 'E' },
      ]
    },
    {
      name: '形状工具',
      tools: [
        { type: ToolType.RECTANGLE, icon: Square, name: '矩形', shortcut: 'R' },
        { type: ToolType.CIRCLE, icon: Circle, name: '圆形', shortcut: 'O' },
        { type: ToolType.LINE, icon: Minus, name: '直线', shortcut: 'L' },
        { type: ToolType.TRIANGLE, icon: Triangle, name: '三角形', shortcut: 'T' },
      ]
    },
    {
      name: '文字工具',
      tools: [
        { type: ToolType.TEXT, icon: Type, name: '文字', shortcut: 'T' },
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
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* 工具组 */}
        {toolGroups.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500 font-medium px-1">{group.name}</div>
              <ButtonGroup variant="flat" size="sm">
                {group.tools.map((tool) => {
                  const IconComponent = tool.icon;
                  return (
                    <Tooltip key={tool.type} content={`${tool.name} (${tool.shortcut})`}>
                      <Button
                        isIconOnly
                        variant={currentTool === tool.type ? "solid" : "flat"}
                        color={currentTool === tool.type ? "primary" : "default"}
                        onPress={() => setCurrentTool(tool.type)}
                        className="h-11 w-11"
                      >
                        <IconComponent size={20} />
                      </Button>
                    </Tooltip>
                  );
                })}
              </ButtonGroup>
            </div>
            {groupIndex < toolGroups.length - 1 && (
              <Divider orientation="vertical" className="h-16" />
            )}
          </React.Fragment>
        ))}

        <Divider orientation="vertical" className="h-16" />

        {/* 历史操作 */}
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 font-medium px-1">历史</div>
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
                    className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">自定义颜色</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">预设颜色</label>
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
          <div className="text-xs text-gray-500 font-medium px-1">视图</div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onPress={zoomOut}
              className="h-8 w-8"
            >
              <span className="text-lg">−</span>
            </Button>
            <span className="min-w-16 text-center text-sm text-gray-600">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onPress={zoomIn}
              className="h-8 w-8"
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
