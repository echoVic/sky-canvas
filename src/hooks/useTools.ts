import { useCallback, useEffect } from 'react';
import { useToolStore } from '../store/toolStore';
import { ToolType } from '../types';

export const useTools = () => {
  const {
    currentTool,
    tools,
    brushSize,
    brushOpacity,
    color,
    setCurrentTool,
    setBrushSize,
    setBrushOpacity,
    setColor
  } = useToolStore();
  
  // 切换工具
  const selectTool = useCallback((toolType: ToolType) => {
    setCurrentTool(toolType);
    console.log(`Tool changed to: ${toolType}`);
  }, [setCurrentTool]);
  
  // 获取当前工具信息
  const getCurrentTool = useCallback(() => {
    return tools.find(tool => tool.type === currentTool);
  }, [tools, currentTool]);
  
  // 键盘快捷键处理
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    
    const key = event.key.toLowerCase();
    const tool = tools.find(t => t.shortcut?.toLowerCase() === key);
    
    if (tool) {
      event.preventDefault();
      selectTool(tool.type);
    }
  }, [tools, selectTool]);
  
  // 工具属性更新
  const updateBrushSize = useCallback((size: number) => {
    setBrushSize(size);
  }, [setBrushSize]);
  
  const updateBrushOpacity = useCallback((opacity: number) => {
    setBrushOpacity(opacity);
  }, [setBrushOpacity]);
  
  const updateColor = useCallback((newColor: string) => {
    setColor(newColor);
  }, [setColor]);
  
  // 工具特定的操作
  const getToolCursor = useCallback(() => {
    switch (currentTool) {
      case ToolType.SELECT:
        return 'default';
      case ToolType.PAN:
        return 'grab';
      case ToolType.ZOOM:
        return 'zoom-in';
      case ToolType.BRUSH:
        return 'crosshair';
      case ToolType.ERASER:
        return 'crosshair';
      case ToolType.TEXT:
        return 'text';
      case ToolType.SHAPE:
        return 'crosshair';
      default:
        return 'default';
    }
  }, [currentTool]);
  
  const isDrawingTool = useCallback(() => {
    return [ToolType.BRUSH, ToolType.ERASER].includes(currentTool);
  }, [currentTool]);
  
  const isSelectionTool = useCallback(() => {
    return currentTool === ToolType.SELECT;
  }, [currentTool]);
  
  const isNavigationTool = useCallback(() => {
    return [ToolType.PAN, ToolType.ZOOM].includes(currentTool);
  }, [currentTool]);
  
  // 注册键盘事件
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  return {
    // 状态
    currentTool,
    tools,
    brushSize,
    brushOpacity,
    color,
    
    // 方法
    selectTool,
    getCurrentTool,
    updateBrushSize,
    updateBrushOpacity,
    updateColor,
    
    // 工具属性
    getToolCursor,
    isDrawingTool,
    isSelectionTool,
    isNavigationTool
  };
};
