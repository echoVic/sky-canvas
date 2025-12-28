/**
 * useDrawingTools Hook
 * 专门管理绘图工具状态和操作
 */

import { useState, useCallback, useEffect } from 'react';
import { useMemoizedFn } from 'ahooks';
import { useCanvas } from '../contexts/CanvasSDKContext';

/**
 * 工具类型
 */
export type ToolType =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'text'
  | 'diamond'
  | 'arrow'
  | 'draw'
  | 'image'
  | 'hand';

/**
 * 工具配置
 */
export interface ToolConfig {
  id: ToolType;
  name: string;
  icon: string;
  shortcut: string;
  cursor: string;
}

/**
 * 可用工具配置
 */
export const TOOLS: ToolConfig[] = [
  { id: 'select', name: '选择', icon: 'cursor', shortcut: 'S', cursor: 'default' },
  { id: 'rectangle', name: '矩形', icon: 'square', shortcut: 'R', cursor: 'crosshair' },
  { id: 'circle', name: '圆形', icon: 'circle', shortcut: 'C', cursor: 'crosshair' },
  { id: 'line', name: '线条', icon: 'minus', shortcut: 'L', cursor: 'crosshair' },
  { id: 'text', name: '文本', icon: 'type', shortcut: 'T', cursor: 'text' },
  { id: 'diamond', name: '菱形', icon: 'diamond', shortcut: 'D', cursor: 'crosshair' },
  { id: 'arrow', name: '箭头', icon: 'arrow-right', shortcut: 'A', cursor: 'crosshair' },
  { id: 'draw', name: '画笔', icon: 'pencil', shortcut: 'P', cursor: 'crosshair' },
  { id: 'hand', name: '平移', icon: 'hand', shortcut: 'H', cursor: 'grab' }
];

/**
 * useDrawingTools Hook 返回类型
 */
export interface UseDrawingToolsResult {
  currentTool: ToolType;
  setTool: (tool: ToolType) => boolean;
  tools: ToolConfig[];
  isToolActive: (tool: ToolType) => boolean;
  getToolConfig: (tool: ToolType) => ToolConfig | undefined;
  getCursor: () => string;
}

/**
 * useDrawingTools Hook
 * 管理绘图工具的状态和切换
 */
export function useDrawingTools(): UseDrawingToolsResult {
  const [state, actions] = useCanvas();
  const [currentTool, setCurrentTool] = useState<ToolType>('select');

  /**
   * 设置当前工具
   */
  const setTool = useMemoizedFn((tool: ToolType): boolean => {
    if (!state.isInitialized) {
      console.warn('SDK not initialized, cannot set tool');
      return false;
    }

    const success = actions.setTool(tool);
    if (success) {
      setCurrentTool(tool);
    }
    return success;
  });

  /**
   * 检查工具是否激活
   */
  const isToolActive = useCallback((tool: ToolType): boolean => {
    return currentTool === tool;
  }, [currentTool]);

  /**
   * 获取工具配置
   */
  const getToolConfig = useCallback((tool: ToolType): ToolConfig | undefined => {
    return TOOLS.find(t => t.id === tool);
  }, []);

  /**
   * 获取当前光标样式
   */
  const getCursor = useCallback((): string => {
    const config = getToolConfig(currentTool);
    return config?.cursor || 'default';
  }, [currentTool, getToolConfig]);

  /**
   * 监听工具变化事件
   */
  useEffect(() => {
    if (!state.isInitialized) return;

    const handleToolChange = (...args: unknown[]) => {
      const data = args[0] as { toolName?: string } | undefined;
      if (data?.toolName && data.toolName !== currentTool) {
        setCurrentTool(data.toolName as ToolType);
      }
    };

    actions.on('tool:activated', handleToolChange);

    return () => {
      actions.off('tool:activated', handleToolChange);
    };
  }, [state.isInitialized, actions, currentTool]);

  return {
    currentTool,
    setTool,
    tools: TOOLS,
    isToolActive,
    getToolConfig,
    getCursor
  };
}

export default useDrawingTools;
