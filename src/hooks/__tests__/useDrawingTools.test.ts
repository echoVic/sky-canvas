import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDrawingTools, ToolType, createShape } from '../useDrawingTools';

describe('useDrawingTools', () => {
  describe('createShapeForTool', () => {
    it('应该能创建矩形形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 10, y: 10 };
      const endPoint = { x: 110, y: 60 };
      const shape = createShapeForTool('rectangle', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('rectangle');
      expect(shape?.position.x).toBe(10);
      expect(shape?.position.y).toBe(10);
      expect(shape?.size.width).toBe(100);
      expect(shape?.size.height).toBe(50);
    });

    it('应该能创建圆形形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 50, y: 50 };
      const endPoint = { x: 150, y: 150 };
      const shape = createShapeForTool('circle', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('circle');
      expect(shape?.position.x).toBe(50);
      expect(shape?.position.y).toBe(50);
      expect(shape?.size.width).toBe(100);
      expect(shape?.size.height).toBe(100);
    });

    it('应该能创建线条形状', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 0, y: 0 };
      const endPoint = { x: 100, y: 100 };
      const shape = createShapeForTool('line', startPoint, endPoint);
      
      expect(shape).toBeTruthy();
      expect(shape?.type).toBe('line');
    });

    it('应该为不支持的工具返回null', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 10, y: 10 };
      const shape = createShapeForTool('select', startPoint);
      
      expect(shape).toBeNull();
    });

    it('应该生成唯一ID', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { createShapeForTool } = result.current;
      
      const startPoint = { x: 10, y: 10 };
      const endPoint = { x: 110, y: 60 };
      
      const shape1 = createShapeForTool('rectangle', startPoint, endPoint);
      const shape2 = createShapeForTool('rectangle', startPoint, endPoint);
      
      expect(shape1?.id).not.toBe(shape2?.id);
      expect(shape1?.id).toMatch(/^rectangle_\d+_\w+$/);
    });
  });

  describe('isDrawingTool', () => {
    it('应该正确识别绘图工具', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { isDrawingTool } = result.current;
      
      const drawingTools: ToolType[] = ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'draw', 'text', 'image', 'sticky', 'frame'];
      const nonDrawingTools: ToolType[] = ['select', 'hand'];
      
      drawingTools.forEach(tool => {
        expect(isDrawingTool(tool)).toBe(true);
      });
      
      nonDrawingTools.forEach(tool => {
        expect(isDrawingTool(tool)).toBe(false);
      });
    });
  });

  describe('needsDrag', () => {
    it('应该正确识别需要拖拽的工具', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { needsDrag } = result.current;
      
      const dragTools: ToolType[] = ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'frame'];
      const nonDragTools: ToolType[] = ['select', 'hand', 'draw', 'text', 'image', 'sticky', 'link'];
      
      dragTools.forEach(tool => {
        expect(needsDrag(tool)).toBe(true);
      });
      
      nonDragTools.forEach(tool => {
        expect(needsDrag(tool)).toBe(false);
      });
    });
  });

  describe('getCursorForTool', () => {
    it('应该返回正确的光标样式', () => {
      const { result } = renderHook(() => useDrawingTools());
      const { getCursorForTool } = result.current;
      
      expect(getCursorForTool('select')).toBe('default');
      expect(getCursorForTool('hand')).toBe('grab');
      expect(getCursorForTool('text')).toBe('text');
      expect(getCursorForTool('rectangle')).toBe('crosshair');
      expect(getCursorForTool('circle')).toBe('crosshair');
    });
  });
});

describe('createShape', () => {
  it('应该创建矩形形状', () => {
    const startPoint = { x: 10, y: 20 };
    const endPoint = { x: 110, y: 120 };
    const shape = createShape('rectangle', 'test-rect', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.id).toBe('test-rect');
    expect(shape?.type).toBe('rectangle');
    expect(shape?.position.x).toBe(10);
    expect(shape?.position.y).toBe(20);
    expect(shape?.size.width).toBe(100);
    expect(shape?.size.height).toBe(100);
  });

  it('应该创建钻石形状（作为矩形）', () => {
    const startPoint = { x: 0, y: 0 };
    const endPoint = { x: 50, y: 50 };
    const shape = createShape('diamond', 'test-diamond', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.type).toBe('rectangle'); // 钻石实际上是特殊的矩形
  });

  it('应该创建圆形形状', () => {
    const startPoint = { x: 25, y: 25 };
    const endPoint = { x: 75, y: 75 };
    const shape = createShape('circle', 'test-circle', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.type).toBe('circle');
    expect(shape?.position.x).toBe(25);
    expect(shape?.position.y).toBe(25);
    expect(shape?.size.width).toBe(50);
    expect(shape?.size.height).toBe(50);
  });

  it('应该创建线条形状', () => {
    const startPoint = { x: 0, y: 0 };
    const endPoint = { x: 100, y 50 };
    const shape = createShape('line', 'test-line', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.type).toBe('line');
  });

  it('应该创建箭头形状（作为线条）', () => {
    const startPoint = { x: 10, y: 10 };
    const endPoint = { x: 90, y: 90 };
    const shape = createShape('arrow', 'test-arrow', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.type).toBe('line'); // 箭头实际上是特殊的线条
  });

  it('应该处理反向坐标', () => {
    const startPoint = { x: 100, y: 100 };
    const endPoint = { x: 50, y: 50 };
    const shape = createShape('rectangle', 'test-reverse', startPoint, endPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.position.x).toBe(50); // 应该使用较小的x
    expect(shape?.position.y).toBe(50); // 应该使用较小的y
    expect(shape?.size.width).toBe(50);
    expect(shape?.size.height).toBe(50);
  });

  it('应该在没有endPoint时使用默认大小', () => {
    const startPoint = { x: 10, y: 10 };
    const shape = createShape('rectangle', 'test-default', startPoint);
    
    expect(shape).toBeTruthy();
    expect(shape?.size.width).toBe(100);
    expect(shape?.size.height).toBe(100);
  });

  it('应该要求线条有endPoint', () => {
    const startPoint = { x: 10, y: 10 };
    const shape = createShape('line', 'test-line-no-end', startPoint);
    
    expect(shape).toBeNull();
  });

  it('应该为不支持的类型返回null', () => {
    const startPoint = { x: 10, y: 10 };
    const shape = createShape('unsupported' as ToolType, 'test', startPoint);
    
    expect(shape).toBeNull();
  });
});

describe('形状行为测试', () => {
  describe('RectangleShape', () => {
    it('应该正确执行碰撞检测', () => {
      const startPoint = { x: 10, y: 10 };
      const endPoint = { x: 110, y: 60 };
      const shape = createShape('rectangle', 'test-rect', startPoint, endPoint);
      
      expect(shape?.hitTest({ x: 50, y: 30 })).toBe(true);  // 内部点
      expect(shape?.hitTest({ x: 10, y: 10 })).toBe(true);  // 边界点
      expect(shape?.hitTest({ x: 110, y: 60 })).toBe(true); // 边界点
      expect(shape?.hitTest({ x: 5, y: 30 })).toBe(false);  // 外部点
      expect(shape?.hitTest({ x: 50, y: 5 })).toBe(false);  // 外部点
    });

    it('应该能够克隆', () => {
      const shape = createShape('rectangle', 'original', { x: 10, y: 10 }, { x: 60, y: 60 });
      const cloned = shape?.clone();
      
      expect(cloned).toBeTruthy();
      expect(cloned?.id).toBe('original_clone');
      expect(cloned?.type).toBe('rectangle');
      expect(cloned?.position.x).toBe(shape?.position.x);
      expect(cloned?.position.y).toBe(shape?.position.y);
      expect(cloned?.size.width).toBe(shape?.size.width);
      expect(cloned?.size.height).toBe(shape?.size.height);
    });

    it('应该有正确的边界', () => {
      const shape = createShape('rectangle', 'test', { x: 20, y: 30 }, { x: 120, y: 80 });
      const bounds = shape?.getBounds();
      
      expect(bounds).toEqual({
        x: 20,
        y: 30,
        width: 100,
        height: 50
      });
    });
  });

  describe('CircleShape', () => {
    it('应该正确执行圆形碰撞检测', () => {
      const shape = createShape('circle', 'test-circle', { x: 0, y: 0 }, { x: 100, y: 100 });
      const center = { x: 50, y: 50 };
      
      expect(shape?.hitTest(center)).toBe(true);        // 圆心
      expect(shape?.hitTest({ x: 75, y: 50 })).toBe(true);  // 半径内
      expect(shape?.hitTest({ x: 90, y: 90 })).toBe(false); // 半径外
    });

    it('应该能够克隆圆形', () => {
      const shape = createShape('circle', 'original-circle', { x: 25, y: 25 }, { x: 75, y: 75 });
      const cloned = shape?.clone();
      
      expect(cloned).toBeTruthy();
      expect(cloned?.id).toBe('original-circle_clone');
      expect(cloned?.type).toBe('circle');
    });
  });

  describe('LineShape', () => {
    it('应该正确执行线条碰撞检测', () => {
      const shape = createShape('line', 'test-line', { x: 0, y: 0 }, { x: 100, y: 100 });
      
      // 线条碰撞检测使用边界框+阈值的简化算法
      expect(shape?.hitTest({ x: 50, y: 50 })).toBe(true);   // 线上的点
      expect(shape?.hitTest({ x: -10, y: -10 })).toBe(false); // 远离线的点
    });

    it('应该能够克隆线条', () => {
      const shape = createShape('line', 'original-line', { x: 10, y: 20 }, { x: 90, y: 80 });
      const cloned = shape?.clone();
      
      expect(cloned).toBeTruthy();
      expect(cloned?.id).toBe('original-line_clone');
      expect(cloned?.type).toBe('line');
    });
  });

  it('所有形状都应该有基础属性', () => {
    const shapes = [
      createShape('rectangle', 'rect', { x: 0, y: 0 }, { x: 50, y: 50 }),
      createShape('circle', 'circle', { x: 0, y: 0 }, { x: 50, y: 50 }),
      createShape('line', 'line', { x: 0, y: 0 }, { x: 50, y: 50 })
    ];

    shapes.forEach(shape => {
      expect(shape?.visible).toBe(true);
      expect(shape?.zIndex).toBe(0);
      expect(typeof shape?.dispose).toBe('function');
      expect(typeof shape?.render).toBe('function');
      expect(typeof shape?.getBounds).toBe('function');
      expect(typeof shape?.hitTest).toBe('function');
      expect(typeof shape?.clone).toBe('function');
    });
  });
});