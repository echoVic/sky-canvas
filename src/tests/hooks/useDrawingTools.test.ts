/**
 * useDrawingTools Hook 单元测试
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawingTools } from '../../hooks/useDrawingTools';

// Mock Canvas SDK
const mockSDK = {
  addShape: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

describe('useDrawingTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('工具状态管理', () => {
    test('应该有默认的当前工具', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      expect(result.current.currentTool).toBe('select');
      expect(result.current.isDrawing).toBe(false);
    });

    test('应该能切换工具', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      act(() => {
        result.current.setCurrentTool('rectangle');
      });
      
      expect(result.current.currentTool).toBe('rectangle');
    });
  });

  describe('形状创建测试', () => {
    test('应该能创建矩形', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      const mockRect = {
        id: 'rect1',
        type: 'rectangle' as const,
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0
      };
      
      act(() => {
        result.current.createRectangle(mockRect.position, mockRect.size);
      });
      
      expect(mockSDK.addShape).toHaveBeenCalled();
    });

    test('应该能创建圆形', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      const mockCircle = {
        position: { x: 50, y: 50 },
        radius: 25
      };
      
      act(() => {
        result.current.createCircle(mockCircle.position, mockCircle.radius);
      });
      
      expect(mockSDK.addShape).toHaveBeenCalled();
    });

    test('应该能创建线条', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      const mockLine = {
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      };
      
      act(() => {
        result.current.createLine(mockLine.start, mockLine.end);
      });
      
      expect(mockSDK.addShape).toHaveBeenCalled();
    });
  });

  describe('绘制状态管理', () => {
    test('应该正确管理绘制状态', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      act(() => {
        result.current.startDrawing({ x: 10, y: 20 });
      });
      
      expect(result.current.isDrawing).toBe(true);
      expect(result.current.startPoint).toEqual({ x: 10, y: 20 });
      
      act(() => {
        result.current.finishDrawing();
      });
      
      expect(result.current.isDrawing).toBe(false);
      expect(result.current.startPoint).toBeNull();
    });

    test('应该能取消绘制', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      act(() => {
        result.current.startDrawing({ x: 10, y: 20 });
      });
      
      expect(result.current.isDrawing).toBe(true);
      
      act(() => {
        result.current.cancelDrawing();
      });
      
      expect(result.current.isDrawing).toBe(false);
      expect(result.current.startPoint).toBeNull();
    });
  });

  describe('工具配置测试', () => {
    test('应该正确返回工具配置', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      const tools = result.current.availableTools;
      
      expect(tools).toContain('select');
      expect(tools).toContain('pan');
      expect(tools).toContain('rectangle');
      expect(tools).toContain('circle');
      expect(tools).toContain('line');
      expect(tools).toContain('arrow');
    });
  });

  describe('预览功能测试', () => {
    test('应该能管理预览形状', () => {
      const { result } = renderHook(() => useDrawingTools(mockSDK as any));
      
      const previewShape = {
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 50, height: 30 }
      };
      
      act(() => {
        result.current.setPreviewShape(previewShape);
      });
      
      expect(result.current.previewShape).toEqual(previewShape);
      
      act(() => {
        result.current.clearPreview();
      });
      
      expect(result.current.previewShape).toBeNull();
    });
  });
});