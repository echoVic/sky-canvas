import { useCallback, useRef, useState, useEffect } from 'react';
import { IPoint } from '@sky-canvas/render-engine';
import { ToolType, useDrawingTools } from './useDrawingTools';
import { UseCanvasSDKResult } from './useCanvasSDK';

/**
 * 鼠标交互状态
 */
interface MouseState {
  isDown: boolean;
  startPoint: IPoint | null;
  currentPoint: IPoint | null;
  button: number;
}

/**
 * 交互状态
 */
export interface CanvasInteractionState {
  /** 鼠标状态 */
  mouseState: MouseState;
  /** 是否正在绘制 */
  isDrawing: boolean;
  /** 当前光标样式 */
  cursor: string;
}

/**
 * useCanvasInteraction Hook
 * 
 * 管理Canvas的鼠标交互和绘制逻辑
 */
export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  sdkResult: UseCanvasSDKResult,
  currentTool: ToolType
) {
  const [sdkState, sdkActions] = sdkResult;
  const { createShapeForTool, isDrawingTool, needsDrag, getCursorForTool } = useDrawingTools();
  
  const [interactionState, setInteractionState] = useState<CanvasInteractionState>({
    mouseState: {
      isDown: false,
      startPoint: null,
      currentPoint: null,
      button: -1,
    },
    isDrawing: false,
    cursor: getCursorForTool(currentTool),
  });

  const isDrawingRef = useRef(false);
  const currentShapeRef = useRef<string | null>(null);

  // 更新光标样式
  useEffect(() => {
    setInteractionState(prev => ({
      ...prev,
      cursor: getCursorForTool(currentTool),
    }));
  }, [currentTool, getCursorForTool]);

  /**
   * 获取Canvas相对坐标
   */
  const getCanvasPoint = useCallback((event: MouseEvent): IPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    try {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    } catch (error) {
      console.warn('getBoundingClientRect failed:', error);
      return null;
    }
  }, [canvasRef]);

  /**
   * 鼠标按下事件处理
   */
  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    const point = getCanvasPoint(event);
    if (!point) return;

    setInteractionState(prev => ({
      ...prev,
      mouseState: {
        isDown: true,
        startPoint: point,
        currentPoint: point,
        button: event.button,
      },
      isDrawing: isDrawingTool(currentTool),
    }));

    isDrawingRef.current = isDrawingTool(currentTool);

    // 处理选择工具
    if (currentTool === 'select') {
      const hitShape = sdkActions.hitTest(point);
      if (hitShape) {
        sdkActions.selectShape(hitShape.id);
      } else {
        sdkActions.clearSelection();
      }
      return;
    }

    // 处理绘图工具
    if (isDrawingTool(currentTool) && needsDrag(currentTool)) {
      // 需要拖拽的工具，在mousemove中创建形状
      return;
    }

    // 点击即创建的工具
    if (isDrawingTool(currentTool) && !needsDrag(currentTool)) {
      const shape = createShapeForTool(currentTool, point);
      if (shape) {
        sdkActions.addShape(shape);
      }
    }
  }, [currentTool, getCanvasPoint, isDrawingTool, needsDrag, createShapeForTool, sdkActions]);

  /**
   * 鼠标移动事件处理
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const point = getCanvasPoint(event);
    if (!point) return;

    setInteractionState(prev => ({
      ...prev,
      mouseState: {
        ...prev.mouseState,
        currentPoint: point,
      },
    }));

    // 处理拖拽绘制
    if (isDrawingRef.current && 
        interactionState.mouseState.isDown && 
        interactionState.mouseState.startPoint &&
        needsDrag(currentTool)) {
      
      // 如果已经有临时形状，先移除它
      if (currentShapeRef.current) {
        sdkActions.removeShape(currentShapeRef.current);
      }

      // 创建新的临时形状
      const shape = createShapeForTool(currentTool, interactionState.mouseState.startPoint, point);
      if (shape) {
        sdkActions.addShape(shape);
        currentShapeRef.current = shape.id;
      }
    }
  }, [currentTool, getCanvasPoint, needsDrag, createShapeForTool, sdkActions, interactionState.mouseState]);

  /**
   * 鼠标抬起事件处理
   */
  const handleMouseUp = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    const point = getCanvasPoint(event);
    if (!point) return;

    // 完成绘制
    if (isDrawingRef.current && 
        interactionState.mouseState.startPoint && 
        needsDrag(currentTool)) {
      
      // 最终形状已经在mousemove中创建了，这里不需要额外操作
      currentShapeRef.current = null;
    }

    // 重置状态
    setInteractionState(prev => ({
      ...prev,
      mouseState: {
        isDown: false,
        startPoint: null,
        currentPoint: null,
        button: -1,
      },
      isDrawing: false,
    }));

    isDrawingRef.current = false;
  }, [currentTool, getCanvasPoint, needsDrag, interactionState.mouseState]);

  /**
   * 鼠标离开事件处理
   */
  const handleMouseLeave = useCallback(() => {
    // 如果正在绘制，完成当前形状
    if (currentShapeRef.current) {
      currentShapeRef.current = null;
    }

    setInteractionState(prev => ({
      ...prev,
      mouseState: {
        isDown: false,
        startPoint: null,
        currentPoint: null,
        button: -1,
      },
      isDrawing: false,
    }));

    isDrawingRef.current = false;
  }, []);

  /**
   * 绑定事件监听器
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  return {
    interactionState,
  };
}