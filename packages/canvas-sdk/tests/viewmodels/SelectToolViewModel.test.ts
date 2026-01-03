/**
 * SelectToolViewModel 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectToolViewModel, ISelectToolState, HandlePosition } from '../../src/viewmodels/tools/SelectToolViewModel';
import { ISelectionService } from '../../src/services/selection/selectionService';
import { ICanvasManager } from '../../src/managers/CanvasManager';
import { ShapeEntity, IRectangleEntity, ICircleEntity } from '../../src/models/entities/Shape';

function createMockRectangle(id: string, x: number, y: number, width: number, height: number): IRectangleEntity {
  return {
    id,
    type: 'rectangle',
    name: `Rectangle ${id}`,
    transform: {
      position: { x, y },
      rotation: 0,
      scale: { x: 1, y: 1 }
    },
    style: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 1,
      opacity: 1
    },
    size: { width, height },
    visible: true,
    locked: false,
    zIndex: 1
  };
}

function createMockCircle(id: string, x: number, y: number, radius: number): ICircleEntity {
  return {
    id,
    type: 'circle',
    name: `Circle ${id}`,
    transform: {
      position: { x, y },
      rotation: 0,
      scale: { x: 1, y: 1 }
    },
    style: {
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 1,
      opacity: 1
    },
    radius,
    visible: true,
    locked: false,
    zIndex: 1
  };
}

describe('SelectToolViewModel', () => {
  let viewModel: SelectToolViewModel;
  let mockSelectionService: ISelectionService;
  let mockCanvasManager: ICanvasManager;
  let shapes: ShapeEntity[];

  beforeEach(() => {
    shapes = [
      createMockRectangle('rect1', 100, 100, 50, 50),
      createMockRectangle('rect2', 200, 200, 60, 40),
      createMockCircle('circle1', 300, 300, 30)
    ];

    mockSelectionService = {
      _serviceBrand: undefined,
      selectShape: vi.fn(),
      deselectShape: vi.fn(),
      clearSelection: vi.fn(),
      getSelectedIds: vi.fn(() => []),
      getSelectedShapes: vi.fn(() => []),
      isSelected: vi.fn(() => false),
      dispose: vi.fn()
    } as unknown as ISelectionService;

    mockCanvasManager = {
      _serviceBrand: undefined,
      state: {
        shapeCount: 0,
        selectedIds: [],
        canUndo: false,
        canRedo: false,
        hasClipboardData: false
      },
      hitTest: vi.fn(() => null),
      isShapeSelected: vi.fn(() => false),
      selectShape: vi.fn(),
      deselectShape: vi.fn(),
      clearSelection: vi.fn(),
      getSelectedShapes: vi.fn(() => []),
      getShapesByZOrder: vi.fn(() => shapes),
      updateShape: vi.fn(),
      removeShape: vi.fn(),
      addShape: vi.fn(),
      getRenderables: vi.fn(() => []),
      copySelectedShapes: vi.fn(),
      cutSelectedShapes: vi.fn(),
      paste: vi.fn(() => []),
      undo: vi.fn(),
      redo: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      setZIndex: vi.fn(),
      getStats: vi.fn(() => ({
        shapes: { totalShapes: 0, selectedShapes: 0, visibleShapes: 0, shapesByType: {} },
        history: { canUndo: false, canRedo: false }
      })),
      clear: vi.fn(),
      dispose: vi.fn()
    } as unknown as ICanvasManager;

    const ViewModelClass = SelectToolViewModel as unknown as {
      new (selectionService: ISelectionService, canvasManager: ICanvasManager): SelectToolViewModel;
    };
    viewModel = new ViewModelClass(mockSelectionService, mockCanvasManager);
  });

  describe('初始化', () => {
    it('初始状态应该正确', () => {
      expect(viewModel.state.enabled).toBe(false);
      expect(viewModel.state.isSelecting).toBe(false);
      expect(viewModel.state.isDragging).toBe(false);
      expect(viewModel.state.isResizing).toBe(false);
      expect(viewModel.state.isRotating).toBe(false);
      expect(viewModel.state.cursor).toBe('default');
    });
  });

  describe('工具控制', () => {
    it('activate 应该启用工具', () => {
      viewModel.activate();
      expect(viewModel.state.enabled).toBe(true);
    });

    it('deactivate 应该禁用工具', () => {
      viewModel.activate();
      viewModel.deactivate();
      expect(viewModel.state.enabled).toBe(false);
    });
  });

  describe('鼠标事件', () => {
    beforeEach(() => {
      viewModel.activate();
    });

    it('点击空白区域应该清除选择并开始框选', () => {
      viewModel.handleMouseDown(50, 50);

      expect(mockCanvasManager.clearSelection).toHaveBeenCalled();
      expect(viewModel.state.isSelecting).toBe(true);
      expect(viewModel.state.startPoint).toEqual({ x: 50, y: 50 });
    });

    it('点击形状应该选中它', () => {
      vi.mocked(mockCanvasManager.hitTest).mockReturnValue('rect1');

      viewModel.handleMouseDown(110, 110);

      expect(mockCanvasManager.clearSelection).toHaveBeenCalled();
      expect(mockCanvasManager.selectShape).toHaveBeenCalledWith('rect1');
      expect(viewModel.state.isDragging).toBe(true);
    });

    it('Shift 点击应该切换选择状态', () => {
      vi.mocked(mockCanvasManager.hitTest).mockReturnValue('rect1');
      vi.mocked(mockCanvasManager.isShapeSelected).mockReturnValue(false);

      const event = { shiftKey: true } as MouseEvent;
      viewModel.handleMouseDown(110, 110, event);

      expect(mockCanvasManager.selectShape).toHaveBeenCalledWith('rect1');
      expect(mockCanvasManager.clearSelection).not.toHaveBeenCalled();
    });

    it('拖拽应该移动选中的形状', () => {
      vi.mocked(mockCanvasManager.hitTest).mockReturnValue('rect1');
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);

      viewModel.handleMouseDown(110, 110);
      viewModel.handleMouseMove(120, 130);

      expect(mockCanvasManager.updateShape).toHaveBeenCalledWith('rect1', expect.objectContaining({
        transform: expect.objectContaining({
          position: { x: 110, y: 120 }
        })
      }));
    });

    it('mouseUp 应该重置拖拽状态', () => {
      vi.mocked(mockCanvasManager.hitTest).mockReturnValue('rect1');

      viewModel.handleMouseDown(110, 110);
      expect(viewModel.state.isDragging).toBe(true);

      viewModel.handleMouseUp(120, 120);
      expect(viewModel.state.isDragging).toBe(false);
      expect(viewModel.state.startPoint).toBeNull();
    });
  });

  describe('框选功能', () => {
    beforeEach(() => {
      viewModel.activate();
    });

    it('框选应该选中区域内的形状', () => {
      viewModel.handleMouseDown(50, 50);
      expect(viewModel.state.isSelecting).toBe(true);

      viewModel.handleMouseUp(160, 160);

      expect(mockCanvasManager.selectShape).toHaveBeenCalledWith('rect1');
      expect(viewModel.state.isSelecting).toBe(false);
    });

    it('小范围拖拽不应该触发框选', () => {
      viewModel.handleMouseDown(50, 50);
      viewModel.handleMouseUp(52, 52);

      expect(mockCanvasManager.selectShape).not.toHaveBeenCalled();
    });
  });

  describe('键盘事件', () => {
    beforeEach(() => {
      viewModel.activate();
    });

    it('Delete 键应该删除选中的形状', () => {
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);

      const event = { key: 'Delete', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      viewModel.handleKeyDown(event);

      expect(mockCanvasManager.removeShape).toHaveBeenCalledWith('rect1');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('Backspace 键应该删除选中的形状', () => {
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);

      const event = { key: 'Backspace', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      viewModel.handleKeyDown(event);

      expect(mockCanvasManager.removeShape).toHaveBeenCalledWith('rect1');
    });

    it('Escape 键应该清除选择', () => {
      const event = { key: 'Escape' } as KeyboardEvent;
      viewModel.handleKeyDown(event);

      expect(mockCanvasManager.clearSelection).toHaveBeenCalled();
    });

    it('Ctrl+A 应该全选', () => {
      const event = { key: 'a', ctrlKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent;
      viewModel.handleKeyDown(event);

      expect(mockCanvasManager.selectShape).toHaveBeenCalledTimes(3);
    });
  });

  describe('缩放功能', () => {
    beforeEach(() => {
      viewModel.activate();
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);
    });

    it('startResize 应该初始化缩放状态', () => {
      viewModel.startResize('se', 150, 150);

      expect(viewModel.state.isResizing).toBe(true);
      expect(viewModel.state.activeHandle).toBe('se');
      expect(viewModel.state.startPoint).toEqual({ x: 150, y: 150 });
    });

    it('缩放应该更新形状尺寸', () => {
      viewModel.startResize('e', 150, 125);
      viewModel.handleMouseMove(170, 125);

      expect(mockCanvasManager.updateShape).toHaveBeenCalledWith('rect1', expect.objectContaining({
        size: expect.objectContaining({
          width: 70
        })
      }));
    });

    it('mouseUp 应该结束缩放', () => {
      viewModel.startResize('se', 150, 150);
      viewModel.handleMouseUp(170, 170);

      expect(viewModel.state.isResizing).toBe(false);
      expect(viewModel.state.activeHandle).toBeNull();
    });
  });

  describe('旋转功能', () => {
    beforeEach(() => {
      viewModel.activate();
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);
    });

    it('startRotate 应该初始化旋转状态', () => {
      viewModel.startRotate(175, 50);

      expect(viewModel.state.isRotating).toBe(true);
      expect(viewModel.state.activeHandle).toBe('rotate');
      expect(viewModel.state.startPoint).toEqual({ x: 175, y: 50 });
    });

    it('mouseUp 应该结束旋转', () => {
      viewModel.startRotate(175, 50);
      viewModel.handleMouseUp(200, 100);

      expect(viewModel.state.isRotating).toBe(false);
    });
  });

  describe('状态查询', () => {
    it('getSelectedShapes 应该返回选中的形状', () => {
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0], shapes[1]]);

      const selected = viewModel.getSelectedShapes();
      expect(selected).toHaveLength(2);
    });

    it('getSelectionCount 应该返回选中数量', () => {
      vi.mocked(mockCanvasManager.getSelectedShapes).mockReturnValue([shapes[0]]);

      expect(viewModel.getSelectionCount()).toBe(1);
    });
  });
});
