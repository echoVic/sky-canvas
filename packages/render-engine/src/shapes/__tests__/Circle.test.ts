/**
 * Circle 圆形图形测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Circle, CircleConfig } from '../Circle';
import { IGraphicsContext } from '../../core/interface/IGraphicsContext';

// 模拟 IGraphicsContext
const createMockContext = () => ({
  width: 800,
  height: 600,
  devicePixelRatio: 1,
  save: vi.fn(),
  restore: vi.fn(),
  setGlobalAlpha: vi.fn(),
  setFillStyle: vi.fn(),
  setStrokeStyle: vi.fn(),
  setLineWidth: vi.fn(),
  setStyle: vi.fn(),
  setLineDash: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
});

describe('Circle', () => {
  let circle: Circle;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    circle = new Circle();
    mockContext = createMockContext();
  });

  describe('构造和基础属性', () => {
    it('应该使用默认配置创建圆形', () => {
      expect(circle.radius).toBe(10);
      expect(circle.x).toBe(0);
      expect(circle.y).toBe(0);
      expect(circle.visible).toBe(true);
    });

    it('应该使用自定义配置创建圆形', () => {
      const config: CircleConfig = {
        x: 100,
        y: 200,
        radius: 50,
        style: {
          fill: '#ff0000',
          stroke: '#0000ff',
          strokeWidth: 3
        }
      };

      const customCircle = new Circle(config);

      expect(customCircle.x).toBe(100);
      expect(customCircle.y).toBe(200);
      expect(customCircle.radius).toBe(50);
      expect(customCircle.fill).toBe('#ff0000');
      expect(customCircle.stroke).toBe('#0000ff');
      expect(customCircle.strokeWidth).toBe(3);
    });
  });

  describe('半径属性', () => {
    it('应该正确设置和获取半径', () => {
      circle.radius = 25;
      expect(circle.radius).toBe(25);

      circle.setRadius(40);
      expect(circle.radius).toBe(40);
    });

    it('应该防止半径为负值', () => {
      circle.radius = -10;
      expect(circle.radius).toBe(0);

      circle.setRadius(-5);
      expect(circle.radius).toBe(0);
    });
  });

  describe('渲染', () => {
    it('应该正确渲染圆形', () => {
      circle.radius = 30;
      circle.render(mockContext as any);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalledWith(0, 0, 30, 0, Math.PI * 2);
    });

    it('应该在半径为0时跳过渲染', () => {
      circle.radius = 0;
      circle.render(mockContext as any);

      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });

    it('应该在不可见时跳过渲染', () => {
      circle.setVisible(false);
      circle.render(mockContext as any);

      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });

    it('应该应用填充和描边样式', () => {
      circle.radius = 25;
      circle.fill = '#ff0000';
      circle.stroke = '#00ff00';
      circle.strokeWidth = 2;

      circle.render(mockContext as any);

      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#ff0000');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#00ff00');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(2);
    });
  });

  describe('碰撞检测', () => {
    beforeEach(() => {
      circle.moveTo(100, 100);
      circle.radius = 50;
    });

    it('应该检测到圆形内部的点', () => {
      expect(circle.hitTest({ x: 100, y: 100 })).toBe(true); // 圆心
      expect(circle.hitTest({ x: 120, y: 120 })).toBe(true); // 圆内
    });

    it('应该检测到圆形边界上的点', () => {
      expect(circle.hitTest({ x: 150, y: 100 })).toBe(true); // 右边界
      expect(circle.hitTest({ x: 100, y: 50 })).toBe(true);  // 上边界
    });

    it('应该拒绝圆形外部的点', () => {
      expect(circle.hitTest({ x: 200, y: 200 })).toBe(false); // 外部
      expect(circle.hitTest({ x: 160, y: 160 })).toBe(false); // 对角线外
    });

    it('应该考虑描边宽度', () => {
      circle.stroke = '#000000';
      circle.strokeWidth = 10;

      // 描边外边缘应该被检测到
      expect(circle.hitTest({ x: 155, y: 100 })).toBe(true);
    });

    it('应该在不可见时返回 false', () => {
      circle.setVisible(false);
      expect(circle.hitTest({ x: 100, y: 100 })).toBe(false);
    });
  });

  describe('边界框', () => {
    it('应该返回正确的边界框', () => {
      circle.moveTo(100, 100);
      circle.radius = 30;

      const bounds = circle.getBounds();

      expect(bounds.x).toBe(70);  // 100 - 30
      expect(bounds.y).toBe(70);  // 100 - 30
      expect(bounds.width).toBe(60);  // 30 * 2
      expect(bounds.height).toBe(60); // 30 * 2
    });

    it('应该考虑描边宽度', () => {
      circle.moveTo(100, 100);
      circle.radius = 30;
      circle.stroke = '#000000';
      circle.strokeWidth = 4;

      const bounds = circle.getBounds();

      expect(bounds.x).toBe(68);  // 100 - 30 - 2
      expect(bounds.y).toBe(68);  // 100 - 30 - 2
      expect(bounds.width).toBe(64);  // (30 + 2) * 2
      expect(bounds.height).toBe(64); // (30 + 2) * 2
    });

    it('应该在不可见时返回空边界框', () => {
      circle.setVisible(false);
      const bounds = circle.getBounds();

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it('应该在半径为0时返回空边界框', () => {
      circle.radius = 0;
      const bounds = circle.getBounds();

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('变换影响', () => {
    it('应该正确处理缩放变换的边界框', () => {
      circle.moveTo(0, 0);
      circle.radius = 20;
      circle.scaleX = 2;
      circle.scaleY = 1.5;

      const bounds = circle.getBounds();

      // 由于缩放，边界框应该相应变化
      expect(bounds.width).toBeGreaterThan(40);
      expect(bounds.height).toBeGreaterThan(30);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆圆形', () => {
      circle.moveTo(100, 200);
      circle.radius = 35;
      circle.fill = '#ff0000';
      circle.stroke = '#00ff00';
      circle.strokeWidth = 3;

      const cloned = circle.clone();

      expect(cloned.id).not.toBe(circle.id);
      expect(cloned.x).toBe(100);
      expect(cloned.y).toBe(200);
      expect(cloned.radius).toBe(35);
      expect(cloned.fill).toBe('#ff0000');
      expect(cloned.stroke).toBe('#00ff00');
      expect(cloned.strokeWidth).toBe(3);
    });
  });

  describe('静态工厂方法', () => {
    it('应该通过 create 方法创建圆形', () => {
      const config: CircleConfig = { x: 50, y: 75, radius: 25 };
      const created = Circle.create(config);

      expect(created.x).toBe(50);
      expect(created.y).toBe(75);
      expect(created.radius).toBe(25);
    });

    it('应该通过 createAt 方法创建圆形', () => {
      const created = Circle.createAt(80, 120, 40);

      expect(created.x).toBe(80);
      expect(created.y).toBe(120);
      expect(created.radius).toBe(40);
    });
  });
});