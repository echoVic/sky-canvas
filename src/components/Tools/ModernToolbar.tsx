import React from 'react';
import { 
  Button, 
  ButtonGroup, 
  Slider, 
  Divider, 
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@heroui/react';
import { 
  MousePointer2, 
  Hand, 
  ZoomIn, 
  Paintbrush, 
  Eraser, 
  Type, 
  Square, 
  Undo2, 
  Redo2, 
  Palette,
  Settings
} from 'lucide-react';
import { useToolStore } from '../../store/toolStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';
import { ToolType } from '../../types';

export const ModernToolbar: React.FC = () => {
  const { 
    currentTool, 
    tools, 
    setCurrentTool, 
    brushSize, 
    setBrushSize, 
    brushOpacity, 
    setBrushOpacity, 
    color, 
    setColor 
  } = useToolStore();
  
  const { zoomIn, zoomOut, resetView, zoom } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const toolIcons = {
    [ToolType.SELECT]: MousePointer2,
    [ToolType.PAN]: Hand,
    [ToolType.ZOOM]: ZoomIn,
    [ToolType.BRUSH]: Paintbrush,
    [ToolType.ERASER]: Eraser,
    [ToolType.TEXT]: Type,
    [ToolType.SHAPE]: Square,
  };

  const getToolIcon = (toolType: ToolType) => {
    const IconComponent = toolIcons[toolType];
    return IconComponent ? <IconComponent size={18} /> : null;
  };

  const colorPresets = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ];

  return (
    <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 shadow-sm">
      {/* 主要工具 */}
      <ButtonGroup variant="flat" size="sm">
        {tools.map((tool) => (
          <Tooltip key={tool.type} content={`${tool.name} (${tool.shortcut})`}>
            <Button
              isIconOnly
              variant={currentTool === tool.type ? "solid" : "flat"}
              color={currentTool === tool.type ? "primary" : "default"}
              onPress={() => setCurrentTool(tool.type)}
            >
              {getToolIcon(tool.type)}
            </Button>
          </Tooltip>
        ))}
      </ButtonGroup>

      <Divider orientation="vertical" className="h-8" />

      {/* 历史操作 */}
      <ButtonGroup variant="flat" size="sm">
        <Tooltip content="撤销 (Ctrl+Z)">
          <Button
            isIconOnly
            isDisabled={!canUndo}
            onPress={undo}
          >
            <Undo2 size={18} />
          </Button>
        </Tooltip>
        <Tooltip content="重做 (Ctrl+Y)">
          <Button
            isIconOnly
            isDisabled={!canRedo}
            onPress={redo}
          >
            <Redo2 size={18} />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" className="h-8" />

      {/* 画笔设置 */}
      {(currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 min-w-12">大小:</span>
            <Slider
              size="sm"
              step={1}
              minValue={1}
              maxValue={50}
              value={brushSize}
              onChange={(value) => setBrushSize(Array.isArray(value) ? value[0] : value)}
              className="w-24"
            />
            <span className="text-sm text-gray-500 min-w-8">{brushSize}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 min-w-12">透明:</span>
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

          <Divider orientation="vertical" className="h-8" />
        </>
      )}

      {/* 颜色选择器 */}
      {currentTool === ToolType.BRUSH && (
        <Popover placement="bottom">
          <PopoverTrigger>
            <Button
              isIconOnly
              variant="flat"
              className="relative"
            >
              <Palette size={18} />
              <div 
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white"
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
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">预设颜色</label>
                <div className="grid grid-cols-5 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setColor(preset)}
                      className={`w-8 h-8 rounded border-2 ${
                        color === preset ? 'border-blue-500' : 'border-gray-300'
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

      <Divider orientation="vertical" className="h-8" />

      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <Button
          isIconOnly
          variant="flat"
          size="sm"
          onPress={zoomOut}
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
        >
          <span className="text-lg">+</span>
        </Button>
        <Button
          variant="flat"
          size="sm"
          onPress={resetView}
        >
          重置
        </Button>
      </div>

      <Divider orientation="vertical" className="h-8" />

      {/* 设置按钮 */}
      <Tooltip content="设置">
        <Button
          isIconOnly
          variant="flat"
          size="sm"
        >
          <Settings size={18} />
        </Button>
      </Tooltip>
    </div>
  );
};
