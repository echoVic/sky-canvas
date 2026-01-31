import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasSDK } from '../useCanvasSDK';
import { createMockCanvas, createMockShape } from './test-utils';

// Use vi.hoisted to ensure proper variable hoisting
const { mockCanvasManager, mockToolManager, mockSDK } = vi.hoisted(() => {
  const mockCanvasManager = {
    addShape: vi.fn(),
    removeShape: vi.fn(),
    updateShape: vi.fn(),
    selectShape: vi.fn(),
    deselectShape: vi.fn(),
    clearSelection: vi.fn(),
    getRenderables: vi.fn(() => [] as any[]),
    getSelectedShapes: vi.fn(() => [] as any[]),
    getShapesByZOrder: vi.fn(() => [] as any[]),
    getStats: vi.fn(() => ({ history: { canUndo: false, canRedo: false } })),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
    hitTest: vi.fn(() => null),
  };
  
  const mockToolManager = {
    activateTool: vi.fn(() => true),
    getCurrentToolName: vi.fn(() => 'select'),
    getAvailableTools: vi.fn(() => ['select', 'rectangle']),
  };

  const mockSDK = {
    getCanvasManager: vi.fn(() => mockCanvasManager),
    getToolManager: vi.fn(() => mockToolManager),
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return { mockCanvasManager, mockToolManager, mockSDK };
});

vi.mock('@sky-canvas/canvas-sdk', () => ({
  createCanvasSDK: vi.fn(() => Promise.resolve(mockSDK)),
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
      expect(typeof actions.setTool).toBe('function');
      expect(typeof actions.dispose).toBe('function');
    });
  });

  describe('SDK 初始化', () => {
    it('应该成功初始化SDK', async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      await act(async () => {
        await actions.initialize(canvas, config);
      });

      expect(mockSDK.on).toHaveBeenCalledTimes(13);
      
      const [state] = result.current;
      expect(state.isInitialized).toBe(true);
      expect(state.sdk).toBe(mockSDK);
    });

    it('应该防止重复初始化', async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };

      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;

      await act(async () => {
        await actions.initialize(canvas, config);
      });

      await act(async () => {
        await actions.initialize(canvas, config);
      });

      expect(mockSDK.on).toHaveBeenCalled();
    });
  });

  describe('形状操作', () => {
    let hookResult: any;

    beforeEach(async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      hookResult = renderHook(() => useCanvasSDK());
      const [, actions] = hookResult.result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });
    });

    it('应该能够添加形状', () => {
      const shape = createMockShape();
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.addShape(shape);
      });

      expect(mockCanvasManager.addShape).toHaveBeenCalledWith(shape);
    });

    it('应该能够移除形状', () => {
      const shapeId = 'shape-1';
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.removeShape(shapeId);
      });

      expect(mockCanvasManager.removeShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够更新形状', () => {
      const shapeId = 'shape-1';
      const updates = { transform: { position: { x: 20, y: 30 } } };
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.updateShape(shapeId, updates);
      });

      expect(mockCanvasManager.updateShape).toHaveBeenCalledWith(shapeId, updates);
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
    let hookResult: any;

    beforeEach(async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      hookResult = renderHook(() => useCanvasSDK());
      const [, actions] = hookResult.result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });
    });

    it('应该能够选择形状', () => {
      const shapeId = 'shape-1';
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.selectShape(shapeId);
      });

      expect(mockCanvasManager.selectShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够取消选择形状', () => {
      const shapeId = 'shape-1';
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.deselectShape(shapeId);
      });

      expect(mockCanvasManager.deselectShape).toHaveBeenCalledWith(shapeId);
    });

    it('应该能够清空选择', () => {
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.clearSelection();
      });

      expect(mockCanvasManager.clearSelection).toHaveBeenCalled();
    });
  });

  describe('工具操作', () => {
    let hookResult: any;

    beforeEach(async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      hookResult = renderHook(() => useCanvasSDK());
      const [, actions] = hookResult.result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });
    });

    it('应该能够设置工具', () => {
      const [, actions] = hookResult.result.current;

      const success = actions.setTool('rectangle');

      expect(mockToolManager.activateTool).toHaveBeenCalledWith('rectangle');
      expect(success).toBe(true);
    });
  });

  describe('历史操作', () => {
    let hookResult: any;

    beforeEach(async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      hookResult = renderHook(() => useCanvasSDK());
      const [, actions] = hookResult.result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });
    });

    it('应该能够执行撤销操作', () => {
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.undo();
      });

      expect(mockCanvasManager.undo).toHaveBeenCalled();
    });

    it('应该能够执行重做操作', () => {
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.redo();
      });

      expect(mockCanvasManager.redo).toHaveBeenCalled();
    });
  });

  describe('其他操作', () => {
    let hookResult: any;

    beforeEach(async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      hookResult = renderHook(() => useCanvasSDK());
      const [, actions] = hookResult.result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });
    });

    it('应该能够清空所有形状', () => {
      const [, actions] = hookResult.result.current;

      act(() => {
        actions.clearShapes();
      });

      expect(mockCanvasManager.clear).toHaveBeenCalled();
    });

    it('应该能够执行点击测试', () => {
      const point = { x: 100, y: 100 };
      const [, actions] = hookResult.result.current;

      const hitShape = actions.hitTest(point);

      expect(mockCanvasManager.hitTest).toHaveBeenCalledWith(100, 100);
      expect(hitShape).toBe(null);
    });
  });

  describe('清理和销毁', () => {
    it('应该能够手动销毁SDK', async () => {
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      const { result } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
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
      vi.useFakeTimers()
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      const { result, unmount } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });

      unmount();
      vi.runAllTimers()

      expect(mockSDK.dispose).toHaveBeenCalled();
      vi.useRealTimers()
    });
  });
});
