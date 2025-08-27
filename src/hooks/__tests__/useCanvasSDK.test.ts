import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasSDK } from '../useCanvasSDK';
import { createMockCanvas, createMockGraphicsContextFactory, createMockShape } from '../../tests/test-utils';

// Mock CanvasSDK
const mockSDK = {
  initialize: vi.fn(),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  updateShape: vi.fn(),
  selectShape: vi.fn(),
  deselectShape: vi.fn(),
  clearSelection: vi.fn(),
  getShapes: vi.fn(() => []),
  getSelectedShapes: vi.fn(() => []),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  undo: vi.fn(),
  redo: vi.fn(),
  clearShapes: vi.fn(),
  hitTest: vi.fn(() => null),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@sky-canvas/canvas-sdk', () => ({
  CanvasSDK: vi.fn(() => mockSDK),
}));

describe('useCanvasSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [state] = result.current;

      expect(state.sdk).toBeNull();
      expect(state.isInitialized).toBe(false);
      expect(state.shapes).toEqual([]);
      expect(state.selectedShapes).toEqual([]);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it('应该返回所有必要的操作函数', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      expect(typeof actions.initialize).toBe('function');
      expect(typeof actions.addShape).toBe('function');
      expect(typeof actions.removeShape).toBe('function');
      expect(typeof actions.updateShape).toBe('function');
      expect(typeof actions.selectShape).toBe('function');
      expect(typeof actions.deselectShape).toBe('function');
      expect(typeof actions.clearSelection).toBe('function');
      expect(typeof actions.undo).toBe('function');
      expect(typeof actions.redo).toBe('function');
      expect(typeof actions.clearShapes).toBe('function');
      expect(typeof actions.hitTest).toBe('function');
      expect(typeof actions.dispose).toBe('function');
    });
  });

  describe('SDK 初始化', () => {
    it('应该成功初始化SDK', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      
      mockSDK.initialize.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      await act(async () => {
        await actions.initialize(canvas, factory);
      });

      expect(mockSDK.initialize).toHaveBeenCalledWith(canvas);
      expect(mockSDK.on).toHaveBeenCalledTimes(6);
      
      const [state] = result.current;
      expect(state.isInitialized).toBe(true);
      expect(state.sdk).toBe(mockSDK);
    });

    it('应该在初始化失败时清理资源', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      const error = new Error('初始化失败');
      
      mockSDK.initialize.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      await expect(act(async () => {
        await actions.initialize(canvas, factory);
      })).rejects.toThrow('初始化失败');

      expect(mockSDK.dispose).toHaveBeenCalled();
    });

    it('应该防止重复初始化', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      
      mockSDK.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      await act(async () => {
        await actions.initialize(canvas, factory);
      });

      await expect(act(async () => {
        await actions.initialize(canvas, factory);
      })).rejects.toThrow('SDK already initialized');
    });
  });

  describe('形状操作', () => {
    beforeEach(async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });
    });

    it('应该能够添加形状', () => {
      const shape = createMockShape();
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.addShape(shape);
      });

      expect(mockSDK.addShape).toHaveBeenCalledWith(shape);
    });

    it('应该能够移除形状', () => {
      const shapeId = 'shape-1';
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.removeShape(shapeId);
      });

      expect(mockSDK.removeShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够更新形状', () => {
      const shapeId = 'shape-1';
      const updates = { x: 20, y: 30 };
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.updateShape(shapeId, updates);
      });

      expect(mockSDK.updateShape).toHaveBeenCalledWith(shapeId, updates);
    });

    it('应该在SDK未初始化时抛出错误', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      const shape = createMockShape();

      expect(() => {
        actions.addShape(shape);
      }).toThrow('SDK not initialized');
    });
  });

  describe('选择操作', () => {
    beforeEach(async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });
    });

    it('应该能够选择形状', () => {
      const shapeId = 'shape-1';
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.selectShape(shapeId);
      });

      expect(mockSDK.selectShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够取消选择形状', () => {
      const shapeId = 'shape-1';
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.deselectShape(shapeId);
      });

      expect(mockSDK.deselectShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够清空选择', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.clearSelection();
      });

      expect(mockSDK.clearSelection).toHaveBeenCalled();
    });
  });

  describe('历史操作', () => {
    beforeEach(async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });
    });

    it('应该能够执行撤销操作', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.undo();
      });

      expect(mockSDK.undo).toHaveBeenCalled();
    });

    it('应该能够执行重做操作', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.redo();
      });

      expect(mockSDK.redo).toHaveBeenCalled();
    });
  });

  describe('其他操作', () => {
    beforeEach(async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });
    });

    it('应该能够清空所有形状', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      act(() => {
        actions.clearShapes();
      });

      expect(mockSDK.clearShapes).toHaveBeenCalled();
    });

    it('应该能够执行点击测试', () => {
      const point = { x: 100, y: 100 };
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      const hitShape = actions.hitTest(point);

      expect(mockSDK.hitTest).toHaveBeenCalledWith(point);
      expect(hitShape).toBe(null);
    });
  });

  describe('清理和销毁', () => {
    it('应该能够手动销毁SDK', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });

      act(() => {
        actions.dispose();
      });

      expect(mockSDK.dispose).toHaveBeenCalled();
      
      const [state] = result.current;
      expect(state.sdk).toBeNull();
      expect(state.isInitialized).toBe(false);
    });

    it('应该在组件卸载时自动清理', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      mockSDK.initialize.mockResolvedValue(undefined);
      
      const { result, unmount } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });

      unmount();

      expect(mockSDK.dispose).toHaveBeenCalled();
    });
  });

  describe('状态更新', () => {
    it('应该在事件触发时更新状态', async () => {
      const canvas = createMockCanvas();
      const factory = createMockGraphicsContextFactory();
      const shapes = [createMockShape('shape-1')];
      const selectedShapes = [shapes[0]];
      
      mockSDK.initialize.mockResolvedValue(undefined);
      mockSDK.getShapes.mockReturnValue(shapes);
      mockSDK.getSelectedShapes.mockReturnValue(selectedShapes);
      mockSDK.canUndo.mockReturnValue(true);
      mockSDK.canRedo.mockReturnValue(true);

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, factory);
      });

      // 模拟事件回调
      const eventHandlers = mockSDK.on.mock.calls.reduce((acc, call) => {
        acc[call[0]] = call[1];
        return acc;
      }, {} as any);

      act(() => {
        eventHandlers.shapeAdded();
      });

      const [state] = result.current;
      expect(state.shapes).toEqual(shapes);
      expect(state.selectedShapes).toEqual(selectedShapes);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(true);
    });
  });
});