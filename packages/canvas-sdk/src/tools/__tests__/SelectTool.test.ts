/**
 * SelectTool 测试文件
 */
import { CanvasSDK } from '../../CanvasSDK';
import { IMouseEvent } from '../../interaction/types';
import { IShape } from '../../scene/IShape';
import { SelectTool } from '../SelectTool';
import { vi } from 'vitest';

// 模拟CanvasSDK
vi.mock('../../CanvasSDK', () => {
  return {
    CanvasSDK: vi.fn().mockImplementation(() => {
      return {
        getShapes: vi.fn(() => []),
        getSelectedShapes: vi.fn(),
        selectShape: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: vi.fn()
      };
    })
  };
});

// 模拟IShape
const createMockShape = (id: string): IShape => {
  return {
    id,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    render: vi.fn(),
    hitTest: vi.fn()
  } as unknown as IShape;
};

// 创建模拟鼠标事件的辅助函数
const createMouseEvent = (button: number, ctrlKey: boolean = false, shiftKey: boolean = false): IMouseEvent => {
  return {
    type: 'mousedown',
    screenPosition: { x: 50, y: 50 },
    worldPosition: { x: 50, y: 50 },
    button,
    ctrlKey,
    shiftKey,
    altKey: false,
    metaKey: false,
    timestamp: Date.now()
  };
};

describe('SelectTool', () => {
  let selectTool: SelectTool;
  let mockCanvasSDK: any;
  let mockShape: IShape;
  let mockShapes: IShape[];

  beforeEach(() => {
    // 创建模拟的CanvasSDK
    mockCanvasSDK = new (CanvasSDK as any)() as any;
    
    // 创建模拟的形状
    mockShape = createMockShape('test-shape-1');
    mockShapes = [mockShape, createMockShape('test-shape-2')];
    
    // 创建SelectTool实例
    selectTool = new SelectTool(mockCanvasSDK);
  });

  describe('初始化', () => {
    it('应该正确初始化SelectTool', () => {
      expect(selectTool).toBeInstanceOf(SelectTool);
      expect(selectTool.name).toBe('select');
      expect(selectTool.mode).toBe('select');
      expect(selectTool.cursor).toBe('default');
      expect(selectTool.enabled).toBe(true);
    });

    it('应该设置CanvasSDK实例', () => {
      const toolWithSDK = new SelectTool(mockCanvasSDK);
      expect(toolWithSDK).toBeDefined();
    });
  });

  describe('工具激活和停用', () => {
    it('应该正确激活工具', () => {
      const mockSetCursor = vi.fn();
      mockCanvasSDK.getInteractionManager = vi.fn().mockReturnValue({
        setCursor: mockSetCursor
      });

      selectTool.onActivate();
      
      expect(mockSetCursor).toHaveBeenCalledWith('default');
    });

    it('应该正确停用工具', () => {
      selectTool.isSelectingState = true;
      selectTool.isTransformingState = true;
      selectTool.startPointState = { x: 10, y: 10 };
      selectTool.selectionRectState = { x: 0, y: 0, width: 100, height: 100 };

      selectTool.onDeactivate();
      
      expect(selectTool.isSelectingState).toBe(false);
      expect(selectTool.isTransformingState).toBe(false);
      expect(selectTool.startPointState).toBeNull();
      expect(selectTool.selectionRectState).toBeNull();
    });
  });

  describe('鼠标事件处理', () => {

    it('应该处理左键点击', () => {
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
    });

    it('应该忽略非左键点击', () => {
      const mouseEvent = createMouseEvent(1); // 右键
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(false);
    });

    it('应该处理点击已选择的形状', () => {
      mockCanvasSDK.getSelectedShapes = vi.fn().mockReturnValue([mockShape]);
      mockCanvasSDK.hitTest = vi.fn().mockReturnValue(mockShape);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.startPointState).toEqual({ x: 50, y: 50 });
    });

    it('应该处理点击未选择的形状', () => {
      mockCanvasSDK.getSelectedShapes = vi.fn().mockReturnValue([]);
      mockCanvasSDK.hitTest = vi.fn().mockReturnValue(mockShape);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(mockCanvasSDK.clearSelection).toHaveBeenCalled();
      expect(mockCanvasSDK.selectShape).toHaveBeenCalledWith('test-shape-1');
    });

    it('应该开始框选当点击空白区域', () => {
      mockCanvasSDK.hitTest = vi.fn().mockReturnValue(null);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.isSelectingState).toBe(true);
      expect(selectTool.startPointState).toEqual({ x: 50, y: 50 });
    });

    it('应该处理鼠标移动时的框选', () => {
      selectTool.isSelectingState = true;
      selectTool.startPointState = { x: 10, y: 10 };
      
      const mouseEvent: IMouseEvent = {
        type: 'mousemove',
        screenPosition: { x: 100, y: 100 },
        worldPosition: { x: 100, y: 100 },
        button: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now()
      };
      
      const result = selectTool.onMouseMove(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.getSelectionRect()).toEqual({
        x: 10,
        y: 10,
        width: 90,
        height: 90
      });
    });

    it('应该处理鼠标移动时的变形操作', () => {
      selectTool.isTransformingState = true;
      selectTool.startPointState = { x: 10, y: 10 };
      
      const mouseEvent = createMouseEvent(0);
      mouseEvent.worldPosition = { x: 100, y: 100 };
      
      const result = selectTool.onMouseMove(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.startPointState).toEqual({ x: 100, y: 100 });
    });

    it('应该结束框选操作', () => {
      selectTool.isSelectingState = true;
      selectTool.selectionRectState = { x: 0, y: 0, width: 100, height: 100 };
      mockCanvasSDK.hitTestBounds = vi.fn().mockReturnValue(mockShapes);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseUp(mouseEvent);
      
      expect(result).toBe(true);
      expect(mockCanvasSDK.clearSelection).toHaveBeenCalled();
      expect(mockCanvasSDK.selectShape).toHaveBeenCalledTimes(2);
      expect(selectTool.isSelectingState).toBe(false);
      expect(selectTool.selectionRectState).toBeNull();
    });

    it('应该结束变形操作', () => {
      selectTool.isTransformingState = true;
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseUp(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.isTransformingState).toBe(false);
      expect(selectTool.startPointState).toBeNull();
    });
  });

  describe('键盘事件处理', () => {
    it('应该处理网格捕捉切换', () => {
      const result1 = selectTool.onKeyDown('G');
      const result2 = selectTool.onKeyDown('g');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('应该处理网格大小调整', () => {
      const result1 = selectTool.onKeyDown('[');
      const result2 = selectTool.onKeyDown(']');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('应该忽略未知键盘事件', () => {
      const result = selectTool.onKeyDown('UnknownKey');
      
      expect(result).toBe(false);
    });
  });

  describe('手势事件处理', () => {
    it('应该忽略手势事件', () => {
      const result = selectTool.onGesture({});
      
      expect(result).toBe(false);
    });
  });

  describe('获取选择矩形', () => {
    it('应该返回当前的选择矩形', () => {
      // 通过模拟鼠标操作来设置selectionRect
      selectTool.isSelectingState = true;
      selectTool.startPointState = { x: 0, y: 0 };
      
      const mouseEvent = createMouseEvent(0);
      mouseEvent.worldPosition = { x: 100, y: 100 };
      
      selectTool.onMouseMove(mouseEvent);
      
      const result = selectTool.getSelectionRect();
      
      expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it('应该返回null当没有选择矩形时', () => {
      const result = selectTool.getSelectionRect();
      
      expect(result).toBeNull();
    });
  });

  describe('渲染选择框', () => {
    it('应该渲染选择框和变形控制器', () => {
      const mockContext = {
        save: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        setLineDash: vi.fn(),
        strokeRect: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      // 模拟transformController.render
      selectTool['transformController'].render = vi.fn();
      
      selectTool.renderSelectionBox(mockContext);
      
      expect(selectTool['transformController'].render).toHaveBeenCalledWith(mockContext);
    });
  });
});