/**
 * SelectTool 测试文件
 */
import { SelectTool } from '../SelectTool';
import { CanvasSDK } from '../core/CanvasSDK';
import { IShape } from '../scene/IShape';
import { IPoint } from '@sky-canvas/render-engine';

// 模拟CanvasSDK
jest.mock('../core/CanvasSDK', () => {
  return {
    CanvasSDK: jest.fn().mockImplementation(() => {
      return {
        getInteractionManager: jest.fn(),
        hitTest: jest.fn(),
        getSelectedShapes: jest.fn(),
        selectShape: jest.fn(),
        clearSelection: jest.fn(),
        isSelected: jest.fn(),
        hitTestBounds: jest.fn()
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
    render: jest.fn(),
    hitTest: jest.fn(),
    containsPoint: jest.fn()
  };
};

describe('SelectTool', () => {
  let selectTool: SelectTool;
  let mockCanvasSDK: jest.Mocked<CanvasSDK>;
  let mockShape: IShape;
  let mockShapes: IShape[];

  beforeEach(() => {
    // 创建模拟的CanvasSDK
    mockCanvasSDK = new CanvasSDK() as jest.Mocked<CanvasSDK>;
    
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
      const mockSetCursor = jest.fn();
      mockCanvasSDK.getInteractionManager = jest.fn().mockReturnValue({
        setCursor: mockSetCursor
      });

      selectTool.onActivate();
      
      expect(mockSetCursor).toHaveBeenCalledWith('default');
    });

    it('应该正确停用工具', () => {
      selectTool.isSelecting = true;
      selectTool.isTransforming = true;
      selectTool.startPoint = { x: 10, y: 10 };
      selectTool.selectionRect = { x: 0, y: 0, width: 100, height: 100 };

      selectTool.onDeactivate();
      
      expect(selectTool.isSelecting).toBe(false);
      expect(selectTool.isTransforming).toBe(false);
      expect(selectTool.startPoint).toBeNull();
      expect(selectTool.selectionRect).toBeNull();
    });
  });

  describe('鼠标事件处理', () => {
    const createMouseEvent = (button: number, ctrlKey: boolean = false, shiftKey: boolean = false) => {
      return {
        button,
        ctrlKey,
        shiftKey,
        worldPosition: { x: 50, y: 50 }
      };
    };

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
      mockCanvasSDK.getSelectedShapes = jest.fn().mockReturnValue([mockShape]);
      mockCanvasSDK.hitTest = jest.fn().mockReturnValue(mockShape);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.startPoint).toEqual({ x: 50, y: 50 });
    });

    it('应该处理点击未选择的形状', () => {
      mockCanvasSDK.getSelectedShapes = jest.fn().mockReturnValue([]);
      mockCanvasSDK.hitTest = jest.fn().mockReturnValue(mockShape);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(mockCanvasSDK.clearSelection).toHaveBeenCalled();
      expect(mockCanvasSDK.selectShape).toHaveBeenCalledWith('test-shape-1');
    });

    it('应该开始框选当点击空白区域', () => {
      mockCanvasSDK.hitTest = jest.fn().mockReturnValue(null);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseDown(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.isSelecting).toBe(true);
      expect(selectTool.startPoint).toEqual({ x: 50, y: 50 });
    });

    it('应该处理鼠标移动时的框选', () => {
      selectTool.isSelecting = true;
      selectTool.startPoint = { x: 10, y: 10 };
      
      const mouseEvent = createMouseEvent(0);
      mouseEvent.worldPosition = { x: 100, y: 100 };
      
      const result = selectTool.onMouseMove(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.selectionRect).toEqual({
        x: 10,
        y: 10,
        width: 90,
        height: 90
      });
    });

    it('应该处理鼠标移动时的变形操作', () => {
      selectTool.isTransforming = true;
      selectTool.startPoint = { x: 10, y: 10 };
      
      const mouseEvent = createMouseEvent(0);
      mouseEvent.worldPosition = { x: 100, y: 100 };
      
      const result = selectTool.onMouseMove(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.startPoint).toEqual({ x: 100, y: 100 });
    });

    it('应该结束框选操作', () => {
      selectTool.isSelecting = true;
      selectTool.selectionRect = { x: 0, y: 0, width: 100, height: 100 };
      mockCanvasSDK.hitTestBounds = jest.fn().mockReturnValue(mockShapes);
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseUp(mouseEvent);
      
      expect(result).toBe(true);
      expect(mockCanvasSDK.clearSelection).toHaveBeenCalled();
      expect(mockCanvasSDK.selectShape).toHaveBeenCalledTimes(2);
      expect(selectTool.isSelecting).toBe(false);
      expect(selectTool.selectionRect).toBeNull();
    });

    it('应该结束变形操作', () => {
      selectTool.isTransforming = true;
      
      const mouseEvent = createMouseEvent(0);
      const result = selectTool.onMouseUp(mouseEvent);
      
      expect(result).toBe(true);
      expect(selectTool.isTransforming).toBe(false);
      expect(selectTool.startPoint).toBeNull();
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
      selectTool['isSelecting'] = true;
      selectTool['startPoint'] = { x: 0, y: 0 };
      
      const mouseEvent = {
        button: 0,
        ctrlKey: false,
        shiftKey: false,
        worldPosition: { x: 100, y: 100 }
      };
      
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
        save: jest.fn(),
        strokeStyle: '',
        lineWidth: 0,
        setLineDash: jest.fn(),
        strokeRect: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fillRect: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn()
      } as unknown as CanvasRenderingContext2D;

      // 模拟transformController.render
      selectTool['transformController'].render = jest.fn();
      
      selectTool.renderSelectionBox(mockContext);
      
      expect(selectTool['transformController'].render).toHaveBeenCalledWith(mockContext);
    });
  });
});