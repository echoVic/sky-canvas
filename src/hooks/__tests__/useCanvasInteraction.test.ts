import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasInteraction } from '../useCanvasInteraction';
import { useCanvasSDK } from '../useCanvasSDK';
import { useDrawingTools } from '../useDrawingTools';
import { createMouseEvent, createMockCanvas } from '../../tests/test-utils';
import { InteractionMode } from '@sky-canvas/canvas-sdk';

// Mock dependencies
vi.mock('../useCanvasSDK');
vi.mock('../useDrawingTools');

      const mockSDKActions = {
        initialize: vi.fn(),
        addShape: vi.fn(),
        removeShape: vi.fn(),
        updateShape: vi.fn(),
        selectShape: vi.fn(),
        deselectShape: vi.fn(),
        clearSelection: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        clearShapes: vi.fn(),
        hitTest: vi.fn().mockReturnValue(null),
        setInteractionMode: vi.fn(),
        getInteractionManager: vi.fn(),
        setInteractionEnabled: vi.fn(),
        setTool: vi.fn(() => true),
        setViewport: vi.fn(),
        panViewport: vi.fn(),
        zoomViewport: vi.fn(),
        fitToContent: vi.fn(),
        resetViewport: vi.fn(),
        startRender: vi.fn(),
        stopRender: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      };

const mockSDKState = {
  sdk: null,
  isInitialized: true,
  shapes: [],
  selectedShapes: [],
  canUndo: false,
  canRedo: false,
  interactionMode: InteractionMode.SELECT,
  viewport: {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    zoom: 1
  },
};

const mockDrawingTools = {
  createShapeForTool: vi.fn(),
  isDrawingTool: vi.fn(),
  needsDrag: vi.fn(),
  getCursorForTool: vi.fn(),
};

describe('useCanvasInteraction', () => {
  let mockCanvasRef: React.RefObject<HTMLCanvasElement>;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockCanvasRef = { current: mockCanvas };
    
    // Mock getBoundingClientRect
    mockCanvas.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));

    vi.mocked(useDrawingTools).mockReturnValue(mockDrawingTools);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该返回初始交互状态', () => {
      mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');
      
      const { result } = renderHook(() => 
        useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
      );

      expect(result.current.interactionState).toEqual({
        mouseState: {
          isDown: false,
          startPoint: null,
          currentPoint: null,
          button: -1,
        },
        isDrawing: false,
        cursor: 'crosshair',
      });
    });

    it('应该绑定事件监听器', () => {
      const addEventListener = vi.spyOn(mockCanvas, 'addEventListener');
      
      renderHook(() => 
        useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
      );

      expect(addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    it('应该在unmount时清理事件监听器', () => {
      const removeEventListener = vi.spyOn(mockCanvas, 'removeEventListener');
      
      const { unmount } = renderHook(() => 
        useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
      );

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });
  });

  describe('工具切换', () => {
    it('应该在工具切换时更新光标', () => {
      mockDrawingTools.getCursorForTool
        .mockReturnValueOnce('crosshair')
        .mockReturnValueOnce('default');

      const { result, rerender } = renderHook(
        ({ tool }) => useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], tool),
        { initialProps: { tool: 'rectangle' as const } }
      );

      expect(result.current.interactionState.cursor).toBe('crosshair');

      rerender({ tool: 'select' as const });

      expect(result.current.interactionState.cursor).toBe('default');
      expect(mockDrawingTools.getCursorForTool).toHaveBeenLastCalledWith('select');
    });
  });

  describe('鼠标事件处理', () => {
    describe('mousedown', () => {
      it('应该处理选择工具的点击', () => {
        const mockShape = { id: 'shape-1', type: 'rectangle' };
        mockSDKActions.hitTest.mockReturnValue(mockShape);
        mockDrawingTools.isDrawingTool.mockReturnValue(false);

        renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'select')
        );

        const event = createMouseEvent('mousedown', { clientX: 100, clientY: 100 });
        mockCanvas.dispatchEvent(event);

        expect(mockSDKActions.hitTest).toHaveBeenCalledWith({ x: 100, y: 100 });
        expect(mockSDKActions.selectShape).toHaveBeenCalledWith('shape-1');
      });

      it('应该在选择工具点击空白处时清空选择', () => {
        mockSDKActions.hitTest.mockReturnValue(null);
        mockDrawingTools.isDrawingTool.mockReturnValue(false);

        renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'select')
        );

        const event = createMouseEvent('mousedown', { clientX: 100, clientY: 100 });
        mockCanvas.dispatchEvent(event);

        expect(mockSDKActions.hitTest).toHaveBeenCalledWith({ x: 100, y: 100 });
        expect(mockSDKActions.clearSelection).toHaveBeenCalled();
      });

      it('应该处理点击即创建的绘图工具', () => {
        const mockShape = { id: 'circle-1', type: 'circle' };
        mockDrawingTools.isDrawingTool.mockReturnValue(true);
        mockDrawingTools.needsDrag.mockReturnValue(false);
        mockDrawingTools.createShapeForTool.mockReturnValue(mockShape);

        renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'text')
        );

        const event = createMouseEvent('mousedown', { clientX: 50, clientY: 50 });
        mockCanvas.dispatchEvent(event);

        expect(mockDrawingTools.createShapeForTool).toHaveBeenCalledWith('text', { x: 50, y: 50 });
        expect(mockSDKActions.addShape).toHaveBeenCalledWith(mockShape);
      });

      it('应该设置拖拽绘图工具的状态', () => {
        mockDrawingTools.isDrawingTool.mockReturnValue(true);
        mockDrawingTools.needsDrag.mockReturnValue(true);
        mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');

        const { result } = renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );

        const event = createMouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 });
        
        act(() => {
          mockCanvas.dispatchEvent(event);
        });

        expect(result.current.interactionState.mouseState.isDown).toBe(true);
        expect(result.current.interactionState.mouseState.startPoint).toEqual({ x: 100, y: 100 });
        expect(result.current.interactionState.mouseState.button).toBe(0);
        expect(result.current.interactionState.isDrawing).toBe(true);
      });
    });

    describe('mousemove', () => {
      it('应该更新鼠标当前位置', () => {
        mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');
        
        const { result } = renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );

        const moveEvent = createMouseEvent('mousemove', { clientX: 150, clientY: 150 });
        
        act(() => {
          mockCanvas.dispatchEvent(moveEvent);
        });

        expect(result.current.interactionState.mouseState.currentPoint).toEqual({ x: 150, y: 150 });
      });

      it('应该在拖拽时创建临时形状', async () => {
        const mockShape = { id: 'temp-rect', type: 'rectangle' };
        mockDrawingTools.isDrawingTool.mockReturnValue(true);
        mockDrawingTools.needsDrag.mockReturnValue(true);
        mockDrawingTools.createShapeForTool.mockReturnValue(mockShape);
        mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');

        const { result } = renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );

        // 先模拟mousedown
        const downEvent = createMouseEvent('mousedown', { clientX: 50, clientY: 50 });
        act(() => {
          mockCanvas.dispatchEvent(downEvent);
        });

        // 再模拟mousemove
        const moveEvent = createMouseEvent('mousemove', { clientX: 150, clientY: 150 });
        act(() => {
          mockCanvas.dispatchEvent(moveEvent);
        });

        expect(mockDrawingTools.createShapeForTool).toHaveBeenCalledWith(
          'rectangle', 
          { x: 50, y: 50 }, 
          { x: 150, y: 150 }
        );
        expect(mockSDKActions.addShape).toHaveBeenCalledWith(mockShape);
      });

      it('应该在拖拽时替换之前的临时形状', () => {
        const mockShape1 = { id: 'temp-1', type: 'rectangle' };
        const mockShape2 = { id: 'temp-2', type: 'rectangle' };
        
        mockDrawingTools.isDrawingTool.mockReturnValue(true);
        mockDrawingTools.needsDrag.mockReturnValue(true);
        mockDrawingTools.createShapeForTool
          .mockReturnValueOnce(mockShape1)
          .mockReturnValueOnce(mockShape2);
        mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');

        renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );

        // mousedown
        const downEvent = createMouseEvent('mousedown', { clientX: 50, y: 50 });
        act(() => {
          mockCanvas.dispatchEvent(downEvent);
        });

        // 第一次mousemove
        const moveEvent1 = createMouseEvent('mousemove', { clientX: 100, clientY: 100 });
        act(() => {
          mockCanvas.dispatchEvent(moveEvent1);
        });

        // 第二次mousemove
        const moveEvent2 = createMouseEvent('mousemove', { clientX: 120, clientY: 120 });
        act(() => {
          mockCanvas.dispatchEvent(moveEvent2);
        });

        expect(mockSDKActions.removeShape).toHaveBeenCalledWith('temp-1');
        expect(mockSDKActions.addShape).toHaveBeenCalledWith(mockShape2);
      });
    });

    describe('mouseup', () => {
      it('应该重置鼠标状态', () => {
        mockDrawingTools.isDrawingTool.mockReturnValue(false);
        mockDrawingTools.getCursorForTool.mockReturnValue('default');

        const { result } = renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'select')
        );

        // 先设置一些状态
        const downEvent = createMouseEvent('mousedown', { clientX: 50, clientY: 50 });
        act(() => {
          mockCanvas.dispatchEvent(downEvent);
        });

        // mouseup重置状态
        const upEvent = createMouseEvent('mouseup', { clientX: 100, clientY: 100 });
        act(() => {
          mockCanvas.dispatchEvent(upEvent);
        });

        expect(result.current.interactionState.mouseState.isDown).toBe(false);
        expect(result.current.interactionState.mouseState.startPoint).toBeNull();
        expect(result.current.interactionState.mouseState.currentPoint).toBeNull();
        expect(result.current.interactionState.mouseState.button).toBe(-1);
        expect(result.current.interactionState.isDrawing).toBe(false);
      });
    });

    describe('mouseleave', () => {
      it('应该重置所有状态', () => {
        mockDrawingTools.getCursorForTool.mockReturnValue('crosshair');
        
        const { result } = renderHook(() => 
          useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );

        // 先设置一些状态
        const downEvent = createMouseEvent('mousedown', { clientX: 50, clientY: 50 });
        act(() => {
          mockCanvas.dispatchEvent(downEvent);
        });

        // mouseleave重置状态
        const leaveEvent = createMouseEvent('mouseleave');
        act(() => {
          mockCanvas.dispatchEvent(leaveEvent);
        });

        expect(result.current.interactionState.mouseState.isDown).toBe(false);
        expect(result.current.interactionState.mouseState.startPoint).toBeNull();
        expect(result.current.interactionState.mouseState.currentPoint).toBeNull();
        expect(result.current.interactionState.mouseState.button).toBe(-1);
        expect(result.current.interactionState.isDrawing).toBe(false);
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理canvas为null的情况', () => {
      const nullCanvasRef = { current: null };
      
      expect(() => {
        renderHook(() => 
          useCanvasInteraction(nullCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
        );
      }).not.toThrow();
    });

    it('应该处理getBoundingClientRect返回异常的情况', () => {
      mockCanvas.getBoundingClientRect = vi.fn(() => {
        throw new Error('getBoundingClientRect failed');
      });

      const { result } = renderHook(() => 
        useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'rectangle')
      );

      const event = createMouseEvent('mousedown', { clientX: 100, clientY: 100 });
      
      expect(() => {
        act(() => {
          mockCanvas.dispatchEvent(event);
        });
      }).not.toThrow();

      // 应该不改变状态
      expect(result.current.interactionState.mouseState.isDown).toBe(false);
    });

    it('应该处理createShapeForTool返回null的情况', () => {
      mockDrawingTools.isDrawingTool.mockReturnValue(true);
      mockDrawingTools.needsDrag.mockReturnValue(false);
      mockDrawingTools.createShapeForTool.mockReturnValue(null);

      renderHook(() => 
        useCanvasInteraction(mockCanvasRef, [mockSDKState, mockSDKActions], 'text')
      );

      const event = createMouseEvent('mousedown', { clientX: 50, clientY: 50 });
      mockCanvas.dispatchEvent(event);

      expect(mockSDKActions.addShape).not.toHaveBeenCalled();
    });
  });
});