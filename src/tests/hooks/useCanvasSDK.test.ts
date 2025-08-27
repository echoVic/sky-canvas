/**
 * useCanvasSDK Hook 单元测试
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useCanvasSDK } from '../../hooks/useCanvasSDK';

// Mock Canvas SDK
vi.mock('@sky-canvas/canvas-sdk', () => ({
  CanvasSDK: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    addShape: vi.fn(),
    removeShape: vi.fn(),
    getShapes: vi.fn().mockReturnValue([]),
    selectShape: vi.fn(),
    deselectShape: vi.fn(),
    clearSelection: vi.fn(),
    getSelectedShapes: vi.fn().mockReturnValue([]),
    hitTest: vi.fn().mockReturnValue(null),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn().mockReturnValue(false),
    canRedo: vi.fn().mockReturnValue(false),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }))
}));

describe('useCanvasSDK', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    document.body.appendChild(mockCanvas);
  });

  afterEach(() => {
    cleanup();
    document.body.removeChild(mockCanvas);
  });

  describe('初始化测试', () => {
    test('应该正确初始化SDK', async () => {
      const { result } = renderHook(() => useCanvasSDK(mockCanvas));
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(true);
      
      // 等待初始化完成
      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('传入null canvas不应该初始化', () => {
      const { result } = renderHook(() => useCanvasSDK(null));
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.sdk).toBeNull();
    });

    test('应该在组件卸载时清理SDK', () => {
      const { result, unmount } = renderHook(() => useCanvasSDK(mockCanvas));
      
      const disposeSpy = vi.spyOn(result.current.sdk!, 'dispose');
      unmount();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('形状管理测试', () => {
    test('应该正确管理形状状态', async () => {
      const { result } = renderHook(() => useCanvasSDK(mockCanvas));
      
      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.shapes).toEqual([]);
      expect(result.current.selectedShapes).toEqual([]);
    });
  });

  describe('历史记录测试', () => {
    test('应该正确管理撤销重做状态', async () => {
      const { result } = renderHook(() => useCanvasSDK(mockCanvas));
      
      await vi.waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('错误处理测试', () => {
    test('应该处理初始化错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock SDK初始化失败
      const mockSDK = await import('@sky-canvas/canvas-sdk');
      vi.mocked(mockSDK.CanvasSDK).mockImplementationOnce(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('初始化失败')),
        dispose: vi.fn()
      } as any));

      const { result } = renderHook(() => useCanvasSDK(mockCanvas));

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Canvas SDK:', expect.any(Error));
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });
});