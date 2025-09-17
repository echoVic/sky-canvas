/**
 * CirclePrimitive 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CirclePrimitive } from '../CirclePrimitive';
import { IGraphicsContext, IPoint } from '../../core/interface/IGraphicsContext';

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
  drawCircle: vi.fn()
} as any);

describe('CirclePrimitive', () => {
  let circle: CirclePrimitive;
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    circle = new CirclePrimitive();
    mockContext = createMockContext();
  });

  describe('构造函数和基本属性', () => {
    it('应该使用默认参数创建圆形', () => {
      expect(circle.type).toBe('circle');
      expect(circle.radius).toBe(50);
      expect(circle.id).toMatch(/^circle_\d+_[a-z0-9]+$/);
    });

    it('应该使用自定义参数创建圆形', () => {
      const customCircle = new CirclePrimitive(75, 'custom-circle');
      expect(customCircle.radius).toBe(75);
      expect(customCircle.id).toBe('custom-circle');
    });

    it('应该正确设置类型为只读', () => {
      expect(circle.type).toBe('circle');
      // 类型是只读的，不能修改
    });
  });

  describe('半径管理', () => {
    it('应该正确设置和获取半径', () => {
      circle.radius = 100;
      expect(circle.radius).toBe(100);
    });

    it('应该通过 setRadius 方法设置半径', () => {
      circle.setRadius(80);
      expect(circle.radius).toBe(80);
    });

    it('应该处理零半径', () => {
      circle.setRadius(0);
      expect(circle.radius).toBe(0);
    });

    it('应该处理负半径', () => {
      circle.setRadius(-25);
      expect(circle.radius).toBe(0); // 负半径被转换为 0
    });

    it('应该处理小数半径', () => {
      circle.setRadius(33.5);
      expect(circle.radius).toBe(33.5);
    });
  });

  describe('边界计算', () => {
    it('应该正确计算默认位置的边界', () => {
      circle.setRadius(60);
      const bounds = circle.getBounds();
      
      expect(bounds).toEqual({
        x: -60,  // position.x - radius
        y: -60,  // position.y - radius
        width: 120,  // radius * 2
        height: 120  // radius * 2
      });
    });

    it('应该正确计算自定义位置的边界', () => {
      circle.setPosition({ x: 100, y: 200 });
      circle.setRadius(40);
      const bounds = circle.getBounds();
      
      expect(bounds).toEqual({
        x: 60,   // 100 - 40
        y: 160,  // 200 - 40
        width: 80,   // 40 * 2
        height: 80   // 40 * 2
      });
    });

    it('应该正确处理零半径的边界', () => {
      circle.setPosition({ x: 50, y: 75 });
      circle.setRadius(0);
      const bounds = circle.getBounds();
      
      expect(bounds).toEqual({
        x: 50,
        y: 75,
        width: 0,
        height: 0
      });
    });

    it('应该正确处理负半径的边界', () => {
      circle.setRadius(-30);
      circle.setPosition({ x: 100, y: 100 });
      
      const bounds = circle.getBounds();
      
      expect(bounds).toEqual({
        x: 100,  // 100 - 0 (负半径被转换为 0)
        y: 100,  // 100 - 0
        width: 0,  // 0 * 2
        height: 0  // 0 * 2
      });
    });
  });

  describe('碰撞检测', () => {
    beforeEach(() => {
      circle.setPosition({ x: 100, y: 100 });
      circle.setRadius(50);
    });

    it('应该检测到圆心的碰撞', () => {
      expect(circle.hitTest({ x: 100, y: 100 })).toBe(true);
    });

    it('应该检测到圆内点的碰撞', () => {
      expect(circle.hitTest({ x: 120, y: 120 })).toBe(true); // 距离约28.28
      expect(circle.hitTest({ x: 110, y: 100 })).toBe(true); // 距离10
      expect(circle.hitTest({ x: 100, y: 130 })).toBe(true); // 距离30
    });

    it('应该检测到圆边界上点的碰撞', () => {
      expect(circle.hitTest({ x: 150, y: 100 })).toBe(true); // 距离50
      expect(circle.hitTest({ x: 50, y: 100 })).toBe(true);  // 距离50
      expect(circle.hitTest({ x: 100, y: 150 })).toBe(true); // 距离50
      expect(circle.hitTest({ x: 100, y: 50 })).toBe(true);  // 距离50
    });

    it('应该检测到圆外点没有碰撞', () => {
      expect(circle.hitTest({ x: 151, y: 100 })).toBe(false); // 距离51
      expect(circle.hitTest({ x: 49, y: 100 })).toBe(false);  // 距离51
      expect(circle.hitTest({ x: 100, y: 151 })).toBe(false); // 距离51
      expect(circle.hitTest({ x: 100, y: 49 })).toBe(false);  // 距离51
      expect(circle.hitTest({ x: 200, y: 200 })).toBe(false); // 距离约141.42
    });

    it('应该正确处理对角线上的点', () => {
      // 45度角上的点，距离 = radius / sqrt(2) ≈ 35.36
      const offset = 35;
      expect(circle.hitTest({ x: 100 + offset, y: 100 + offset })).toBe(true);
      expect(circle.hitTest({ x: 100 - offset, y: 100 - offset })).toBe(true);
      
      // 超出范围的对角线点
      const farOffset = 40;
      expect(circle.hitTest({ x: 100 + farOffset, y: 100 + farOffset })).toBe(false);
    });

    it('应该正确处理零半径圆的碰撞检测', () => {
      circle.setRadius(0);
      circle.setPosition({ x: 50, y: 50 });
      
      expect(circle.hitTest({ x: 50, y: 50 })).toBe(true);
      expect(circle.hitTest({ x: 50.1, y: 50 })).toBe(false);
      expect(circle.hitTest({ x: 50, y: 50.1 })).toBe(false);
    });

    it('应该正确处理负半径圆的碰撞检测', () => {
      circle.setRadius(-30);
      circle.setPosition({ x: 100, y: 100 });
      
      // 负半径应该被转换为 0 (Math.max(0, value))
      expect(circle.hitTest({ x: 100, y: 100 })).toBe(true); // 距离0时总是命中
      expect(circle.hitTest({ x: 100.1, y: 100 })).toBe(false); // 任何距离 > 0 都不命中
      expect(circle.hitTest({ x: 99.9, y: 100 })).toBe(false); // 任何距离 > 0 都不命中
    });
  });

  describe('渲染功能', () => {
    it('应该正确渲染圆形', () => {
      circle.setPosition({ x: 50, y: 75 });
      circle.setRadius(40);
      circle.setStyle({ fillColor: '#red', strokeColor: '#blue', strokeWidth: 2 });
      
      circle.render(mockContext);
      
      // 验证变换应用
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(50, 75);
      expect(mockContext.restore).toHaveBeenCalled();
      
      // 验证样式应用
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#red');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#blue');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(2);
      
      // 验证圆形绘制
      expect(mockContext.drawCircle).toHaveBeenCalledWith(
        { x: 0, y: 0 }, // center
        40, // radius
        true, // fill
        true  // stroke
      );
    });

    it('应该在不可见时跳过渲染', () => {
      circle.visible = false;
      circle.render(mockContext);
      
      expect(mockContext.drawCircle).not.toHaveBeenCalled();
    });

    it('应该正确处理只有填充色的渲染', () => {
      circle.setStyle({ fillColor: '#green', strokeColor: undefined });
      circle.render(mockContext);
      
      expect(mockContext.drawCircle).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        50,
        true,
        false
      );
    });

    it('应该正确处理只有描边的渲染', () => {
      circle.setStyle({ fillColor: undefined, strokeColor: '#blue' });
      circle.render(mockContext);
      
      expect(mockContext.drawCircle).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        50,
        false,
        true
      );
    });

    it('应该正确处理零半径的渲染', () => {
      circle.setRadius(0);
      circle.render(mockContext);
      
      expect(mockContext.drawCircle).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        0,
        true,
        true
      );
    });

    it('应该正确处理负半径的渲染', () => {
      circle.setRadius(-25);
      circle.render(mockContext);
      
      // 负半径应该被转换为 0 (Math.max(0, value))
      expect(mockContext.drawCircle).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        0,
        true,
        true
      );
    });
  });

  describe('克隆功能', () => {
    it('应该正确克隆圆形', () => {
      circle.setPosition({ x: 100, y: 200 });
      circle.setRadius(75);
      circle.setTransform({ rotation: Math.PI / 4, scaleX: 2, scaleY: 1.5 });
      circle.setStyle({ fillColor: '#red', opacity: 0.8 });
      circle.visible = false;
      circle.zIndex = 10;
      
      const cloned = circle.clone();
      
      // 验证基本属性
      expect(cloned).toBeInstanceOf(CirclePrimitive);
      expect(cloned.id).not.toBe(circle.id);
      expect(cloned.type).toBe('circle');
      
      // 验证半径
      expect(cloned.radius).toBe(75);
      
      // 验证继承的属性
      expect(cloned.position).toEqual(circle.position);
      expect(cloned.transform).toEqual(circle.transform);
      expect(cloned.style).toEqual(circle.style);
      expect(cloned.visible).toBe(circle.visible);
      expect(cloned.zIndex).toBe(circle.zIndex);
    });

    it('克隆应该是深拷贝', () => {
      circle.setPosition({ x: 50, y: 100 });
      circle.setRadius(60);
      const cloned = circle.clone();
      
      // 修改原始对象
      circle.setPosition({ x: 200, y: 300 });
      circle.setRadius(120);
      
      // 克隆对象不应受影响
      expect(cloned.position).toEqual({ x: 50, y: 100 });
      expect(cloned.radius).toBe(60);
    });
  });

  describe('边界情况', () => {
    it('应该处理极大半径', () => {
      const largeRadius = Number.MAX_SAFE_INTEGER;
      circle.setRadius(largeRadius);
      
      expect(circle.radius).toBe(largeRadius);
      
      const bounds = circle.getBounds();
      expect(bounds.width).toBe(largeRadius * 2);
      expect(bounds.height).toBe(largeRadius * 2);
    });

    it('应该处理极小半径', () => {
      const smallRadius = Number.MIN_VALUE;
      circle.setRadius(smallRadius);
      
      expect(circle.radius).toBe(smallRadius);
    });

    it('应该处理 NaN 半径', () => {
      circle.setRadius(NaN);
      
      expect(circle.radius).toBeNaN();
      
      // 边界计算应该返回 NaN
      const bounds = circle.getBounds();
      expect(bounds.x).toBeNaN();
      expect(bounds.y).toBeNaN();
      expect(bounds.width).toBeNaN();
      expect(bounds.height).toBeNaN();
    });

    it('应该处理 Infinity 半径', () => {
      circle.setRadius(Infinity);
      
      expect(circle.radius).toBe(Infinity);
      
      const bounds = circle.getBounds();
      expect(bounds.width).toBe(Infinity);
      expect(bounds.height).toBe(Infinity);
    });

    it('应该处理碰撞检测中的极端距离', () => {
      circle.setRadius(50);
      circle.setPosition({ x: 0, y: 0 });
      
      // 测试极远的点
      expect(circle.hitTest({ x: 1000000, y: 1000000 })).toBe(false);
      
      // 测试极近但在边界外的点
      expect(circle.hitTest({ x: 50.000001, y: 0 })).toBe(false);
    });
  });

  describe('数学精度测试', () => {
    it('应该正确处理浮点数精度问题', () => {
      circle.setPosition({ x: 0, y: 0 });
      circle.setRadius(1);
      
      // 测试边界上的点（可能有浮点数精度问题）
      const testPoints = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: Math.cos(Math.PI / 4), y: Math.sin(Math.PI / 4) }
      ];
      
      testPoints.forEach(point => {
        expect(circle.hitTest(point)).toBe(true);
      });
    });

    it('应该正确计算复杂角度的碰撞', () => {
      circle.setPosition({ x: 100, y: 100 });
      circle.setRadius(50);
      
      // 测试各种角度的边界点
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
        const x = 100 + 49.9 * Math.cos(angle); // 稍微小于半径以避免浮点精度问题
        const y = 100 + 49.9 * Math.sin(angle);
        expect(circle.hitTest({ x, y })).toBe(true);
        
        // 稍微超出边界的点
        const x2 = 100 + 50.1 * Math.cos(angle);
        const y2 = 100 + 50.1 * Math.sin(angle);
        expect(circle.hitTest({ x: x2, y: y2 })).toBe(false);
      }
    });
  });

  describe('性能测试', () => {
    it('应该快速创建大量圆形', () => {
      const startTime = performance.now();
      const circles: CirclePrimitive[] = [];
      
      for (let i = 0; i < 1000; i++) {
        circles.push(new CirclePrimitive(i));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(circles.length).toBe(1000);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速执行碰撞检测', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        circle.hitTest({ x: Math.random() * 200, y: Math.random() * 200 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});