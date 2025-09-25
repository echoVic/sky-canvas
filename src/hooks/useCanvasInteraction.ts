import { useState, useEffect } from 'react';
import { useMemoizedFn } from 'ahooks';
import { UIToolType } from '../store/canvasStore';
import { UseCanvasSDKResult } from './useCanvasSDK';

/**
 * 交互状态
 */
export interface CanvasInteractionState {
  /** 当前光标样式 */
  cursor: string;
}

/**
 * useCanvasInteraction Hook
 *
 * 根据UI状态切换SDK的当前工具
 */
export function useCanvasInteraction(
  containerRef: React.RefObject<HTMLDivElement>,
  sdkResult: UseCanvasSDKResult,
  currentTool: UIToolType
) {
  const [sdkState, sdkActions] = sdkResult;
  
  const [interactionState, setInteractionState] = useState<CanvasInteractionState>({
    cursor: 'default',
  });

  // 工具映射到工具名称
  const getToolName = useMemoizedFn((tool: UIToolType): string => {
    switch (tool) {
      case 'select': return 'select';
      case 'hand': return 'pan';
      case 'rectangle': return 'rectangle';
      case 'diamond': return 'diamond';
      case 'circle': return 'circle';
      case 'arrow':
      case 'line': return 'line';
      case 'draw': return 'draw';
      case 'text': return 'text';
      case 'image':
      case 'sticky':
      case 'link':
      case 'frame':
      default: return 'draw';
    }
  });

  // 获取工具的光标样式
  const getCursorForTool = useMemoizedFn((tool: UIToolType): string => {
    switch (tool) {
      case 'select':
        return 'default';
      case 'hand':
        return 'grab';
      case 'text':
        return 'text';
      default:
        return 'crosshair';
    }
  });

  // 更新光标样式
  useEffect(() => {
    setInteractionState(prev => ({
      ...prev,
      cursor: getCursorForTool(currentTool),
    }));
  }, [currentTool, getCursorForTool]);

  // 同步工具选择到SDK
  const syncToolToSDK = useMemoizedFn(async () => {
    if (sdkState.isInitialized) {
      try {
        const toolName = getToolName(currentTool);
        await sdkActions.setTool(toolName);
        console.log(`Tool synced to SDK: ${toolName}`);
      } catch (error) {
        console.log('Error setting tool:', error);
      }
    }
  });

  useEffect(() => {
    syncToolToSDK();
  }, [currentTool, sdkState.isInitialized]); // 移除syncToolToSDK依赖，因为useMemoizedFn已保证稳定性

  return {
    interactionState,
  };
}