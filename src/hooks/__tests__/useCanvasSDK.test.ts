import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Shape } from '@sky-canvas/render-engine';
import { useCanvasSDK } from '../useCanvasSDK';

// 创建mock canvas元素的辅助函数
const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
};

// 创建符合Shape类结构的mock形状
const createMockShape = (overrides = {}) => {
  const defaultBounds = { x: 10, y: 10, width: 50, height: 30 };

  // 创建符合Shape类接口的mock对象
  const shape = {
    // Shape基类的属性（模拟私有属性）
    _id: 'shape-1',
    _visible: true,
    _zIndex: 0,
    _transform: {
      transformPoint: vi.fn(),
      inverseTransformPoint: vi.fn(),
      getMatrix: vi.fn(),
    },
    _style: {},

    // Shape基类的公共属性getter/setter
    get id() { return this._id; },
    set id(value) { this._id = value; },
    get visible() { return this._visible; },
    set visible(value) { this._visible = value; },
    get zIndex() { return this._zIndex; },
    set zIndex(value) { this._zIndex = value; },
    get x() { return 10; },
    set x(value) {},
    get y() { return 10; },
    set y(value) {},
    get rotation() { return 0; },
    set rotation(value) {},
    get scaleX() { return 1; },
    set scaleX(value) {},
    get scaleY() { return 1; },
    set scaleY(value) {},
    get transform(): any { return this._transform; },
    get fill() { return '#ffffff'; },
    get stroke() { return '#000000'; },
    get strokeWidth() { return 1; },
    get opacity() { return 1; },
    set opacity(value) {},
    get position() { return { x: 10, y: 10 }; },
    set position(value) {},
    get scale() { return { x: 1, y: 1 }; },
    set scale(value) {},

    // Shape基类的方法
    style: vi.fn(() => ({})),
    setZIndex: vi.fn(),
    setVisible: vi.fn(),
    move: vi.fn(),
    moveTo: vi.fn(),
    rotate: vi.fn(),
    rotateTo: vi.fn(),
    scaleBy: vi.fn(),
    scaleTo: vi.fn(),
    render: vi.fn(),
    getBounds: vi.fn(() => defaultBounds),
    hitTest: vi.fn(() => true),
    clone: vi.fn(),
    dispose: vi.fn(),
    generateId: vi.fn(() => 'shape-1'),
    saveAndRestore: vi.fn(),
    applyTransform: vi.fn(),
    applyStyle: vi.fn(),
    fillAndStroke: vi.fn(),

    ...overrides,
  };

  return shape as unknown as Shape;
};

// Use vi.hoisted to ensure proper variable hoisting
const { mockCanvasManager, mockToolManager, mockSDK } = vi.hoisted(() => {
  const mockCanvasManager = {
    addShape: vi.fn(),
    removeShape: vi.fn(),
    updateShape: vi.fn(),
    selectShape: vi.fn(),
    deselectShape: vi.fn(),
    clearSelection: vi.fn(),
    getObjects: vi.fn(() => [] as any[]),
    getSelectedShapes: vi.fn(() => [] as any[]),
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

      expect(mockSDK.on).toHaveBeenCalledTimes(6); // 6个事件监听器
      
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

      await expect(act(async () => {
        await actions.initialize(canvas, config);
      })).rejects.toThrow('SDK already initialized');
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
      const canvas = createMockCanvas();
      const config = { renderEngine: 'webgl' as const, enableInteraction: true };
      
      const { result, unmount } = renderHook(() => useCanvasSDK());
      const [, actions] = result.current;
      
      await act(async () => {
        await actions.initialize(canvas, config);
      });

      unmount();

      expect(mockSDK.dispose).toHaveBeenCalled();
    });
  });
});