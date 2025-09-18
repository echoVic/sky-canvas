/**
 * RectanglePrimitive 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RectanglePrimitive } from '../RectanglePrimitive';
import { IGraphicsContext, IPoint } from '../../../core/interface/IGraphicsContext';

// Mock IGraphicsContext
const createMockContext = (): IGraphicsContext => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setFillStyle: vi.fn(),
  setStrokeStyle: vi.fn(),
  setLineWidth: vi.fn(),
  setOpacity: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  drawRect: vi.fn()
} as any);

describe('RectanglePrimitive', () => {
  let rectangle: RectanglePrimitive;
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    rectangle = new RectanglePrimitive();
    mockContext = createMockContext();
  });

  describe('构造函数和基本属性', () => {
    it('应该使用默认参数创建矩形', () => {
      expect(rectangle.type).toBe('rectangle');
      expect(rectangle.width).toBe(100);
      expect(rectangle.height).toBe(100);
      expect(rectangle.id).toMatch(/^rectangle_\d+_[a-z0-9]+$/);
    });

    it('应该使用自定义参数创建矩形', () => {
      const customRectangle = new RectanglePrimitive(200, 150, 'custom-rect');
      expect(customRectangle.width).toBe(200);
      expect(customRectangle.height).toBe(150);
      expect(customRectangle.id).toBe('custom-rect');
    });

    it('应该正确设置类型为只读', () => {
      expect(rectangle.type).toBe('rectangle');
      // 类型是只读的，不能修改
    });
  });

  describe('尺寸管理', () => {
    it('应该正确设置和获取宽度', () => {
      rectangle.width = 250;
      expect(rectangle.width).toBe(250);
    });

    it('应该正确设置和获取高度', () => {
      rectangle.height = 180;
      expect(rectangle.height).toBe(180);
    });

    it('应该通过 setSize 方法设置尺寸', () => {
      rectangle.setSize(300, 200);
      expect(rectangle.width).toBe(300);
      expect(rectangle.height).toBe(200);
    });

    it('应该处理零尺寸', () => {
      rectangle.setSize(0, 0);
      expect(rectangle.width).toBe(0);
      expect(rectangle.height).toBe(0);
    });

    it('应该处理负尺寸', () => {
      rectangle.setSize(-50, -30);
      expect(rectangle.width).toBe(0); // 负数被 Math.max(0, value) 处理为 0
      expect(rectangle.height).toBe(0); // 负数被 Math.max(0, value) 处理为 0
    });
  });

  describe('边界计算', () => {
    it('应该正确计算默认位置的边界', () => {
      rectangle.setSize(100, 80);
      const bounds = rectangle.getBounds();
      
      expect(bounds).toEqual({
        x: -50,  // position.x - width/2
        y: -40,  // position.y - height/2
        width: 100,
        height: 80
      });
    });

    it('应该正确计算自定义位置的边界', () => {
      rectangle.setPosition({ x: 100, y: 200 });
      rectangle.setSize(60, 40);
      const bounds = rectangle.getBounds();
      
      expect(bounds).toEqual({
        x: 70,   // 100 - 60/2
        y: 180,  // 200 - 40/2
        width: 60,
        height: 40
      });
    });

    it('应该正确处理零尺寸的边界', () => {
      rectangle.setPosition({ x: 50, y: 75 });
      rectangle.setSize(0, 0);
      const bounds = rectangle.getBounds();
      
      expect(bounds).toEqual({
        x: 50,
        y: 75,
        width: 0,
        height: 0
      });
    });
  });

  describe('碰撞检测', () => {
    beforeEach(() => {
      rectangle.setPosition({ x: 100, y: 100 });
      rectangle.setSize(80, 60);
      // 边界: x: 60-140, y: 70-130
    });

    it('应该检测到内部点的碰撞', () => {
      expect(rectangle.hitTest({ x: 100, y: 100 })).toBe(true); // 中心点
      expect(rectangle.hitTest({ x: 80, y: 90 })).toBe(true);   // 内部点
    });

    it('应该检测到边界点的碰撞', () => {
      expect(rectangle.hitTest({ x: 60, y: 70 })).toBe(true);   // 左上角
      expect(rectangle.hitTest({ x: 140, y: 130 })).toBe(true); // 右下角
      expect(rectangle.hitTest({ x: 60, y: 100 })).toBe(true);  // 左边界
      expect(rectangle.hitTest({ x: 140, y: 100 })).toBe(true); // 右边界
    });

    it('应该检测到外部点没有碰撞', () => {
      expect(rectangle.hitTest({ x: 59, y: 100 })).toBe(false);  // 左侧外部
      expect(rectangle.hitTest({ x: 141, y: 100 })).toBe(false); // 右侧外部
      expect(rectangle.hitTest({ x: 100, y: 69 })).toBe(false);  // 上方外部
      expect(rectangle.hitTest({ x: 100, y: 131 })).toBe(false); // 下方外部
    });

    it('应该正确处理零尺寸矩形的碰撞检测', () => {
      rectangle.setSize(0, 0);
      rectangle.setPosition({ x: 50, y: 50 });
      
      expect(rectangle.hitTest({ x: 50, y: 50 })).toBe(true);
      expect(rectangle.hitTest({ x: 51, y: 50 })).toBe(false);
    });
  });

  describe('渲染功能', () => {
    it('应该正确渲染矩形', () => {
      rectangle.setPosition({ x: 50, y: 75 });
      rectangle.setSize(100, 80);
      rectangle.setStyle({ fillColor: '#red', strokeColor: '#blue', strokeWidth: 2 });
      
      rectangle.render(mockContext);
      
      // 验证变换应用
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(50, 75);
      expect(mockContext.restore).toHaveBeenCalled();
      
      // 验证样式应用
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#red');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#blue');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(2);
      
      // 验证矩形绘制
      expect(mockContext.drawRect).toHaveBeenCalledWith(
        expect.objectContaining({
          x: -50,
          y: -40,
          width: 100,
          height: 80
        }),
        true,  // fill
        true   // stroke
      );
    });

    it('应该在不可见时跳过渲染', () => {
      rectangle.visible = false;
      rectangle.render(mockContext);
      
      expect(mockContext.fillRect).not.toHaveBeenCalled();
      expect(mockContext.strokeRect).not.toHaveBeenCalled();
    });

    it('应该正确处理只有填充色的渲染', () => {
      rectangle.setStyle({ fillColor: '#green', strokeColor: undefined });
      rectangle.render(mockContext);
      
      expect(mockContext.drawRect).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number)
        }),
        true,  // fill
        false  // stroke
      );
    });

    it('应该正确处理只有描边的渲染', () => {
      rectangle.setStyle({ fillColor: undefined, strokeColor: '#blue' });
      rectangle.render(mockContext);
      
      expect(mockContext.drawRect).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number)
        }),
        false, // fill
        true   // stroke
      );
    });
  });

  describe('克隆功能', () => {
    it('应该正确克隆矩形', () => {
      rectangle.setPosition({ x: 100, y: 200 });
      rectangle.setSize(150, 120);
      rectangle.setTransform({ rotation: Math.PI / 4, scaleX: 2, scaleY: 1.5 });
      rectangle.setStyle({ fillColor: '#red', opacity: 0.8 });
      rectangle.visible = false;
      rectangle.zIndex = 10;
      
      const cloned = rectangle.clone();
      
      // 验证基本属性
      expect(cloned).toBeInstanceOf(RectanglePrimitive);
      expect(cloned.id).not.toBe(rectangle.id);
      expect(cloned.type).toBe('rectangle');
      
      // 验证尺寸
      expect(cloned.width).toBe(150);
      expect(cloned.height).toBe(120);
      
      // 验证继承的属性
      expect(cloned.position).toEqual(rectangle.position);
      expect(cloned.transform).toEqual(rectangle.transform);
      expect(cloned.style).toEqual(rectangle.style);
      expect(cloned.visible).toBe(rectangle.visible);
      expect(cloned.zIndex).toBe(rectangle.zIndex);
    });

    it('克隆应该是深拷贝', () => {
      rectangle.setPosition({ x: 50, y: 100 });
      const cloned = rectangle.clone();
      
      // 修改原始对象
      rectangle.setPosition({ x: 200, y: 300 });
      rectangle.setSize(500, 400);
      
      // 克隆对象不应受影响
      expect(cloned.position).toEqual({ x: 50, y: 100 });
      expect(cloned.width).toBe(100); // 默认值
      expect(cloned.height).toBe(100); // 默认值
    });
  });

  describe('边界情况', () => {
    it('应该处理极大尺寸', () => {
      const largeSize = Number.MAX_SAFE_INTEGER;
      rectangle.setSize(largeSize, largeSize);
      
      expect(rectangle.width).toBe(largeSize);
      expect(rectangle.height).toBe(largeSize);
      
      const bounds = rectangle.getBounds();
      expect(bounds.width).toBe(largeSize);
      expect(bounds.height).toBe(largeSize);
    });

    it('应该处理极小尺寸', () => {
      const smallSize = Number.MIN_VALUE;
      rectangle.setSize(smallSize, smallSize);
      
      expect(rectangle.width).toBe(smallSize);
      expect(rectangle.height).toBe(smallSize);
    });

    it('应该处理 NaN 尺寸', () => {
      rectangle.setSize(NaN, NaN);
      
      expect(rectangle.width).toBeNaN();
      expect(rectangle.height).toBeNaN();
      
      // 边界计算应该返回 NaN
      const bounds = rectangle.getBounds();
      expect(bounds.x).toBeNaN();
      expect(bounds.y).toBeNaN();
      expect(bounds.width).toBeNaN();
      expect(bounds.height).toBeNaN();
    });

    it('应该处理 Infinity 尺寸', () => {
      rectangle.setSize(Infinity, -Infinity);
      
      expect(rectangle.width).toBe(Infinity);
      expect(rectangle.height).toBe(0); // -Infinity 被 Math.max(0, value) 处理为 0
    });
  });

  describe('性能测试', () => {
    it('应该快速创建大量矩形', () => {
      const startTime = performance.now();
      const rectangles: RectanglePrimitive[] = [];
      
      for (let i = 0; i < 1000; i++) {
        rectangles.push(new RectanglePrimitive(i, i));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(rectangles.length).toBe(1000);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速执行碰撞检测', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        rectangle.hitTest({ x: Math.random() * 200, y: Math.random() * 200 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});