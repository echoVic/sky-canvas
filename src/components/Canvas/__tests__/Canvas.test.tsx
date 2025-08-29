import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Canvas from '../Canvas';
import { useCanvasStore } from '../../../store/canvasStore';
import { useCanvas } from '../../../contexts';
import { useCanvasInteraction } from '../../../hooks';
import { InteractionMode } from '@sky-canvas/canvas-sdk';

// Mock dependencies
vi.mock('../../../store/canvasStore');
vi.mock('../../../contexts');
vi.mock('../../../hooks');
vi.mock('../../../adapters', () => ({
  Canvas2DGraphicsContextFactory: vi.fn(() => ({
    create: vi.fn(),
  })),
}));

const mockSDKState = {
  sdk: null,
  isInitialized: false,
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
  hitTest: vi.fn(),
  // 新增的交互系统方法
  setInteractionMode: vi.fn(),
  getInteractionManager: vi.fn(),
  setInteractionEnabled: vi.fn(),
  setTool: vi.fn(() => true),
  // 新增的视口控制方法
  setViewport: vi.fn(),
  panViewport: vi.fn(),
  zoomViewport: vi.fn(),
  fitToContent: vi.fn(),
  resetViewport: vi.fn(),
  // 新增的渲染控制方法
  startRender: vi.fn(),
  stopRender: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
};

const mockInteractionState = {
  mouseState: {
    isDown: false,
    startPoint: null,
    currentPoint: null,
    button: -1,
  },
  isDrawing: false,
  cursor: 'default',
};

const mockCanvasStore = {
  selectedTool: 'select',
  zoom: 1,
};

// 创建mock形状的辅助函数
const createMockShape = (overrides = {}) => ({
  id: 'shape-1',
  type: 'rectangle' as const,
  position: { x: 10, y: 10 },
  size: { width: 50, height: 30 },
  visible: true,
  zIndex: 0,
  render: vi.fn(),
  getBounds: vi.fn(() => ({ x: 10, y: 10, width: 50, height: 30 })),
  hitTest: vi.fn(),
  clone: vi.fn(),
  dispose: vi.fn(),
  ...overrides,
});

describe('Canvas', () => {
  beforeEach(() => {
    vi.mocked(useCanvasStore).mockReturnValue(mockCanvasStore);
    vi.mocked(useCanvas).mockReturnValue([mockSDKState, mockSDKActions]);
    vi.mocked(useCanvasInteraction).mockReturnValue({ interactionState: mockInteractionState });
    
    // 设置测试环境
    process.env.NODE_ENV = 'test';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染canvas元素', () => {
      render(<Canvas />);
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('应该设置正确的样式', () => {
      render(<Canvas />);
      
      const canvasContainer = screen.getByRole('img', { hidden: true }).parentElement;
      expect(canvasContainer).toHaveClass('relative', 'w-full', 'h-full', 'overflow-hidden', 'bg-white', 'dark:bg-gray-900');
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full');
    });

    it('应该根据交互状态设置光标样式', () => {
      const customInteractionState = {
        ...mockInteractionState,
        cursor: 'crosshair',
      };
      
      vi.mocked(useCanvasInteraction).mockReturnValue({ interactionState: customInteractionState });
      
      render(<Canvas />);
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ cursor: 'crosshair' });
    });
  });

  describe('SDK初始化', () => {
    it('应该在组件挂载时初始化SDK', async () => {
      render(<Canvas />);
      
      await waitFor(() => {
        expect(mockSDKActions.initialize).toHaveBeenCalled();
      });
    });

    it('应该在已初始化时跳过初始化', () => {
      const initializedState = {
        ...mockSDKState,
        isInitialized: true,
      };
      
      vi.mocked(useCanvas).mockReturnValue([initializedState, mockSDKActions]);
      
      render(<Canvas />);
      
      expect(mockSDKActions.initialize).not.toHaveBeenCalled();
    });

    it('应该处理初始化失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initError = new Error('Initialization failed');
      mockSDKActions.initialize.mockRejectedValue(initError);
      
      render(<Canvas />);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to initialize Canvas SDK:', initError);
      });
      
      consoleError.mockRestore();
    });
  });

  describe('形状渲染', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        setLineDash: vi.fn(),
        strokeRect: vi.fn(),
      };

      // Mock HTMLCanvasElement.getContext
      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
    });

    it('应该在SDK初始化后渲染形状', () => {
      const mockShape = {
        id: 'shape-1',
        type: 'rectangle' as const,
        position: { x: 10, y: 10 },
        size: { width: 50, height: 30 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn(() => ({ x: 10, y: 10, width: 50, height: 30 })),
        hitTest: vi.fn(),
        clone: vi.fn(),
        dispose: vi.fn(),
      };

      const stateWithShapes = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [mockShape],
      };

      vi.mocked(useCanvas).mockReturnValue([stateWithShapes, mockSDKActions]);

      render(<Canvas />);

      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockShape.render).toHaveBeenCalledWith(mockContext);
    });

    it('应该为选中的形状绘制选择框', () => {
      const mockShape = createMockShape();

      const stateWithSelectedShape = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [mockShape],
        selectedShapes: [mockShape],
      };

      vi.mocked(useCanvas).mockReturnValue([stateWithSelectedShape, mockSDKActions]);

      render(<Canvas />);

      expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 4]);
      expect(mockContext.strokeRect).toHaveBeenCalledWith(8, 8, 54, 34);
      expect(mockContext.setLineDash).toHaveBeenCalledWith([]);
    });

    it('应该跳过不可见的形状', () => {
      const invisibleShape = createMockShape({ visible: false });

      const stateWithInvisibleShape = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [invisibleShape],
      };

      vi.mocked(useCanvas).mockReturnValue([stateWithInvisibleShape, mockSDKActions]);

      render(<Canvas />);

      expect(invisibleShape.render).not.toHaveBeenCalled();
    });

    it('应该在SDK未初始化时跳过渲染', () => {
      const mockShape = createMockShape({ id: 'shape-1' });

      const uninitializedState = {
        ...mockSDKState,
        isInitialized: false,
        shapes: [mockShape],
      };

      vi.mocked(useCanvas).mockReturnValue([uninitializedState, mockSDKActions]);

      render(<Canvas />);

      expect(mockShape.render).not.toHaveBeenCalled();
    });

    it('应该在getContext失败时处理gracefully', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

      const stateWithShapes = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [createMockShape({ id: 'shape-1' })],
      };

      vi.mocked(useCanvas).mockReturnValue([stateWithShapes, mockSDKActions]);

      expect(() => render(<Canvas />)).not.toThrow();
    });
  });

  describe('调试信息', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('应该在开发环境显示调试信息', () => {
      const stateWithData = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [createMockShape({ id: '1' }), createMockShape({ id: '2' })],
        selectedShapes: [createMockShape({ id: '1' })],
      };

      const storeWithTool = {
        ...mockCanvasStore,
        selectedTool: 'rectangle',
      };

      vi.mocked(useCanvas).mockReturnValue([stateWithData, mockSDKActions]);
      vi.mocked(useCanvasStore).mockReturnValue(storeWithTool);

      render(<Canvas />);

      expect(screen.getByText('形状数量: 2')).toBeInTheDocument();
      expect(screen.getByText('选中: 1')).toBeInTheDocument();
      expect(screen.getByText('工具: rectangle')).toBeInTheDocument();
      expect(screen.getByText('初始化: 是')).toBeInTheDocument();
    });

    it('应该在生产环境隐藏调试信息', () => {
      process.env.NODE_ENV = 'production';

      render(<Canvas />);

      expect(screen.queryByText(/形状数量/)).not.toBeInTheDocument();
    });
  });

  describe('清理', () => {
    it('应该在组件卸载时清理SDK', () => {
      const { unmount } = render(<Canvas />);
      
      unmount();
      
      expect(mockSDKActions.dispose).toHaveBeenCalled();
    });
  });

  describe('Hook集成', () => {
    it('应该正确传递参数给useCanvasInteraction', () => {
      const storeWithTool = {
        ...mockCanvasStore,
        selectedTool: 'rectangle',
      };

      vi.mocked(useCanvasStore).mockReturnValue(storeWithTool);

      render(<Canvas />);

      expect(useCanvasInteraction).toHaveBeenCalledWith(
        expect.objectContaining({ current: expect.any(HTMLCanvasElement) }),
        [mockSDKState, mockSDKActions],
        'rectangle'
      );
    });

    it('应该响应工具变化', () => {
      const { rerender } = render(<Canvas />);

      const storeWithNewTool = {
        ...mockCanvasStore,
        selectedTool: 'circle',
      };

      vi.mocked(useCanvasStore).mockReturnValue(storeWithNewTool);

      rerender(<Canvas />);

      expect(useCanvasInteraction).toHaveBeenLastCalledWith(
        expect.any(Object),
        [mockSDKState, mockSDKActions],
        'circle'
      );
    });
  });

  describe('边界情况', () => {
    it('应该处理canvas ref为null的情况', () => {
      // Mock useRef to return null
      const originalUseRef = React.useRef;
      React.useRef = vi.fn(() => ({ current: null }));

      expect(() => render(<Canvas />)).not.toThrow();

      React.useRef = originalUseRef;
    });

    it('应该处理shapes为空数组的情况', () => {
      const emptyState = {
        ...mockSDKState,
        isInitialized: true,
        shapes: [],
      };

      vi.mocked(useCanvas).mockReturnValue([emptyState, mockSDKActions]);

      expect(() => render(<Canvas />)).not.toThrow();
    });
  });
});