/**
 * useDrawingTools Hook 单元测试
 */
import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDrawingTools, ToolType } from '../../hooks/useDrawingTools';

describe('useDrawingTools', () => {
  describe('createShapeForTool', () => {
    test('应该能创建矩形形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 10, y: 10 };
      const endPoint = { x: 110, y: 60 };
      const shape = createShapeForTool('rectangle', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('rectangle');
      expect(shape?.position.x).toBe(10);
      expect(shape?.position.y).toBe(10);
      expect(shape?.size.width).toBe(100);
      expect(shape?.size.height).toBe(50);
    });

    test('应该能创建圆形形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 50, y: 50 };
      const endPoint = { x: 150, y: 150 };
      const shape = createShapeForTool('circle', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('circle');
      expect(shape?.position.x).toBe(50);
      expect(shape?.position.y).toBe(50);
      expect(shape?.size.width).toBe(100);
      expect(shape?.size.height).toBe(100);
    });

    test('应该能创建线条形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 0, y: 0 };
      const endPoint = { x: 100, y: 100 };
      const shape = createShapeForTool('line', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('line');
    });

    test('应该为不支持的工具返回null', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 10, y: 10 };
      const shape = createShapeForTool('select', startPoint);
      
      expect(shape).toBeNull();
    });
  });

  describe('isDrawingTool', () => {
    test('应该正确识别绘图工具', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { isDrawingTool } = result.current;
      
      const drawingTools: ToolType[] = ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'draw', 'text', 'image', 'sticky', 'frame'];
      const nonDrawingTools: ToolType[] = ['select', 'hand'];
      
      drawingTools.forEach(tool => {
        expect(isDrawingTool(tool)).toBe(true);
      });
      
      nonDrawingTools.forEach(tool => {
        expect(isDrawingTool(tool)).toBe(false);
      });
    });
  });

  describe('needsDrag', () => {
    test('应该正确识别需要拖拽的工具', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { needsDrag } = result.current;
      
      const dragTools: ToolType[] = ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'frame'];
      const nonDragTools: ToolType[] = ['select', 'hand', 'draw', 'text', 'image', 'sticky', 'link'];
      
      dragTools.forEach(tool => {
        expect(needsDrag(tool)).toBe(true);
      });
      
      nonDragTools.forEach(tool => {
        expect(needsDrag(tool)).toBe(false);
      });
    });
  });

  describe('getCursorForTool', () => {
    test('应该返回正确的光标样式', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { getCursorForTool } = result.current;
      
      expect(getCursorForTool('select')).toBe('default');
      expect(getCursorForTool('hand')).toBe('grab');
      expect(getCursorForTool('text')).toBe('text');
      expect(getCursorForTool('rectangle')).toBe('crosshair');
      expect(getCursorForTool('circle')).toBe('crosshair');
    });
  });
});