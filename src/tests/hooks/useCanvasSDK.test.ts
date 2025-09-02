/**
 * useCanvasSDK Hook 单元测试
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useCanvasSDK } from '../../hooks/useCanvasSDK';
import { InteractionMode } from '@sky-canvas/canvas-sdk';

// Mock Canvas SDK
const mockSDK = {
  initialize: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn(),
  isInitialized: vi.fn().mockReturnValue(true),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  updateShape: vi.fn(),
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
  clearShapes: vi.fn(),
  getInteractionMode: vi.fn().mockReturnValue(InteractionMode.SELECT),
  setInteractionMode: vi.fn(),
  setTool: vi.fn(),
  getInteractionManager: vi.fn().mockReturnValue(null),
  setInteractionEnabled: vi.fn(),
  getViewport: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600, zoom: 1 }),
  setViewport: vi.fn(),
  panViewport: vi.fn(),
  zoomViewport: vi.fn(),
  fitToContent: vi.fn(),
  resetViewport: vi.fn(),
  startRender: vi.fn(),
  stopRender: vi.fn(),
  render: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};

vi.mock('@sky-canvas/canvas-sdk', () => ({
  CanvasSDK: vi.fn().mockImplementation(() => mockSDK),
  InteractionMode: {
    SELECT: 'select',
    PAN: 'pan',
    DRAW: 'draw'
  }
}));

describe('useCanvasSDK', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    document.body.appendChild(mockCanvas);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    if (document.body.contains(mockCanvas)) {
      document.body.removeChild(mockCanvas);
    }
  });

  describe('初始化测试', () => {
    test('应该返回初始状态', () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [state] = result.current;
      
      expect(state.isInitialized).toBe(false);
      expect(state.sdk).toBeNull();
      expect(state.shapes).toEqual([]);
      expect(state.selectedShapes).toEqual([]);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    test('应该能够初始化SDK', async () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
      
      const [state] = result.current;
      expect(state.isInitialized).toBe(true);
      expect(state.sdk).toBeTruthy();
      expect(mockSDK.initialize).toHaveBeenCalledWith(mockCanvas, {
        enableInteraction: true,
        renderEngine: 'webgl',
      });
    });
  });

  describe('形状管理测试', () => {
    let actions: any;

    beforeEach(async () => {
      const { result } = renderHook(() => useCanvasSDK());
      actions = result.current[1];
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
    });

    test('应该能够添加形状', () => {
      const mockShape = {
        id: 'shape-1',
        type: 'rectangle' as const,
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        selected: false,
        locked: false,
        bounds: { x: 10, y: 20, width: 100, height: 80 },
        render: vi.fn(),
        getBounds: vi.fn(() => ({ x: 10, y: 20, width: 100, height: 80 })),
        hitTest: vi.fn(() => false),
        clone: vi.fn(),
        update: vi.fn(),
        serialize: vi.fn(() => ({
          id: 'shape-1',
          type: 'rectangle' as const,
          position: { x: 10, y: 20 },
          size: { width: 100, height: 80 },
          visible: true,
          zIndex: 0,
          selected: false,
          locked: false,
        })),
        deserialize: vi.fn(),
        dispose: vi.fn(),
      };
      
      act(() => {
        actions.addShape(mockShape);
      });
      
      expect(mockSDK.addShape).toHaveBeenCalledWith(mockShape);
    });

    test('应该能够移除形状', () => {
      act(() => {
        actions.removeShape('shape-1');
      });
      
      expect(mockSDK.removeShape).toHaveBeenCalledWith('shape-1');
    });

    test('应该能够更新形状', () => {
      const updates = { position: { x: 50, y: 60 } };
      
      act(() => {
        actions.updateShape('shape-1', updates);
      });
      
      expect(mockSDK.updateShape).toHaveBeenCalledWith('shape-1', updates);
    });
  });

  describe('选择管理测试', () => {
    let actions: any;

    beforeEach(async () => {
      const { result } = renderHook(() => useCanvasSDK());
      actions = result.current[1];
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
    });

    test('应该能够选择形状', () => {
      act(() => {
        actions.selectShape('shape-1');
      });
      
      expect(mockSDK.selectShape).toHaveBeenCalledWith('shape-1');
    });

    test('应该能够取消选择形状', () => {
      act(() => {
        actions.deselectShape('shape-1');
      });
      
      expect(mockSDK.deselectShape).toHaveBeenCalledWith('shape-1');
    });

    test('应该能够清空选择', () => {
      act(() => {
        actions.clearSelection();
      });
      
      expect(mockSDK.clearSelection).toHaveBeenCalled();
    });
  });

  describe('撤销重做测试', () => {
    let actions: any;

    beforeEach(async () => {
      const { result } = renderHook(() => useCanvasSDK());
      actions = result.current[1];
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
    });

    test('应该能够撤销', () => {
      act(() => {
        actions.undo();
      });
      
      expect(mockSDK.undo).toHaveBeenCalled();
    });

    test('应该能够重做', () => {
      act(() => {
        actions.redo();
      });
      
      expect(mockSDK.redo).toHaveBeenCalled();
    });
  });

  describe('其他操作测试', () => {
    let actions: any;

    beforeEach(async () => {
      const { result } = renderHook(() => useCanvasSDK());
      actions = result.current[1];
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
    });

    test('应该能够清空所有形状', () => {
      act(() => {
        actions.clearShapes();
      });
      
      expect(mockSDK.clearShapes).toHaveBeenCalled();
    });

    test('应该能够执行点击测试', () => {
      const point = { x: 100, y: 100 };
      const hitShape = actions.hitTest(point);
      
      expect(mockSDK.hitTest).toHaveBeenCalledWith(point);
      expect(hitShape).toBe(null);
    });
  });

  describe('清理和销毁', () => {
    test('应该能够手动销毁SDK', async () => {
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
      
      act(() => {
        actions.dispose();
      });
      
      expect(mockSDK.dispose).toHaveBeenCalled();
      
      const [state] = result.current;
      expect(state.sdk).toBeNull();
      expect(state.isInitialized).toBe(false);
    });

    test('应该在组件卸载时自动清理', async () => {
      const { result, unmount } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(mockCanvas);
      });
      
      unmount();
      
      expect(mockSDK.dispose).toHaveBeenCalled();
    });
  });
});