/**
 * Rectangle 矩形图形测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Rectangle, RectangleConfig } from '../Rectangle';
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
  rect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
});

describe('Rectangle', () => {
  let rectangle: Rectangle;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    rectangle = new Rectangle();
    mockContext = createMockContext();
  });

  describe('构造和基础属性', () => {
    it('应该使用默认配置创建矩形', () => {
      expect(rectangle.width).toBe(100);
      expect(rectangle.height).toBe(100);
      expect(rectangle.cornerRadius).toBe(0);
      expect(rectangle.x).toBe(0);
      expect(rectangle.y).toBe(0);
      expect(rectangle.visible).toBe(true);
    });

    it('应该使用自定义配置创建矩形', () => {
      const config: RectangleConfig = {
        x: 50,
        y: 75,
        width: 200,
        height: 150,
        cornerRadius: 10,
        style: {
          fill: '#ff0000',
          stroke: '#0000ff',
          strokeWidth: 2
        }
      };

      const customRectangle = new Rectangle(config);

      expect(customRectangle.x).toBe(50);
      expect(customRectangle.y).toBe(75);
      expect(customRectangle.width).toBe(200);
      expect(customRectangle.height).toBe(150);
      expect(customRectangle.cornerRadius).toBe(10);
      expect(customRectangle.fill).toBe('#ff0000');
      expect(customRectangle.stroke).toBe('#0000ff');
      expect(customRectangle.strokeWidth).toBe(2);
    });
  });

  describe('尺寸属性', () => {
    it('应该正确设置和获取宽高', () => {
      rectangle.width = 250;
      rectangle.height = 180;

      expect(rectangle.width).toBe(250);
      expect(rectangle.height).toBe(180);
    });

    it('应该防止尺寸为负值', () => {
      rectangle.width = -50;
      rectangle.height = -30;

      expect(rectangle.width).toBe(0);
      expect(rectangle.height).toBe(0);
    });

    it('应该通过 size 方法设置尺寸', () => {
      rectangle.size(300, 200);
      expect(rectangle.width).toBe(300);
      expect(rectangle.height).toBe(200);

      const currentSize = rectangle.size();
      expect(currentSize.width).toBe(300);
      expect(currentSize.height).toBe(200);
    });

    it('应该正确设置圆角半径', () => {
      rectangle.cornerRadius = 15;
      expect(rectangle.cornerRadius).toBe(15);

      rectangle.setCornerRadius(20);
      expect(rectangle.cornerRadius).toBe(20);
    });

    it('应该防止圆角半径为负值', () => {
      rectangle.cornerRadius = -10;
      expect(rectangle.cornerRadius).toBe(0);
    });
  });

  describe('渲染', () => {
    it('应该正确渲染普通矩形', () => {
      rectangle.width = 100;
      rectangle.height = 80;
      rectangle.render(mockContext as any);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.rect).toHaveBeenCalledWith(0, 0, 100, 80);
    });

    it('应该正确渲染圆角矩形', () => {
      rectangle.width = 100;
      rectangle.height = 80;
      rectangle.cornerRadius = 10;
      rectangle.render(mockContext as any);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.closePath).toHaveBeenCalled();
    });

    it('应该在尺寸为0时跳过渲染', () => {
      rectangle.width = 0;
      rectangle.height = 100;
      rectangle.render(mockContext as any);

      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });

    it('应该在不可见时跳过渲染', () => {
      rectangle.setVisible(false);
      rectangle.render(mockContext as any);

      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });

    it('应该应用填充和描边样式', () => {
      rectangle.width = 100;
      rectangle.height = 80;
      rectangle.fill = '#ff0000';
      rectangle.stroke = '#00ff00';
      rectangle.strokeWidth = 3;

      rectangle.render(mockContext as any);

      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#ff0000');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#00ff00');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(3);
    });
  });

  describe('碰撞检测', () => {
    beforeEach(() => {
      rectangle.moveTo(100, 100);
      rectangle.width = 80;
      rectangle.height = 60;
    });

    it('应该检测到矩形内部的点', () => {
      expect(rectangle.hitTest({ x: 140, y: 130 })).toBe(true); // 中心
      expect(rectangle.hitTest({ x: 110, y: 110 })).toBe(true); // 左上角附近
    });

    it('应该检测到矩形边界上的点', () => {
      expect(rectangle.hitTest({ x: 100, y: 130 })).toBe(true); // 左边界
      expect(rectangle.hitTest({ x: 180, y: 130 })).toBe(true); // 右边界
      expect(rectangle.hitTest({ x: 140, y: 100 })).toBe(true); // 上边界
      expect(rectangle.hitTest({ x: 140, y: 160 })).toBe(true); // 下边界
    });

    it('应该拒绝矩形外部的点', () => {
      expect(rectangle.hitTest({ x: 50, y: 50 })).toBe(false);   // 左上外
      expect(rectangle.hitTest({ x: 200, y: 200 })).toBe(false); // 右下外
      expect(rectangle.hitTest({ x: 90, y: 130 })).toBe(false);  // 左外
      expect(rectangle.hitTest({ x: 190, y: 130 })).toBe(false); // 右外
    });

    it('应该考虑描边宽度', () => {
      rectangle.stroke = '#000000';
      rectangle.strokeWidth = 10;

      // 描边外边缘应该被检测到
      expect(rectangle.hitTest({ x: 95, y: 130 })).toBe(true);  // 左侧描边
      expect(rectangle.hitTest({ x: 185, y: 130 })).toBe(true); // 右侧描边
    });

    it('应该在不可见时返回 false', () => {
      rectangle.setVisible(false);
      expect(rectangle.hitTest({ x: 140, y: 130 })).toBe(false);
    });
  });

  describe('边界框', () => {
    it('应该返回正确的边界框', () => {
      rectangle.moveTo(50, 75);
      rectangle.width = 100;
      rectangle.height = 80;

      const bounds = rectangle.getBounds();

      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(75);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(80);
    });

    it('应该考虑描边宽度', () => {
      rectangle.moveTo(50, 75);
      rectangle.width = 100;
      rectangle.height = 80;
      rectangle.stroke = '#000000';
      rectangle.strokeWidth = 6;

      const bounds = rectangle.getBounds();

      expect(bounds.x).toBe(47);   // 50 - 3
      expect(bounds.y).toBe(72);   // 75 - 3
      expect(bounds.width).toBe(106);  // 100 + 6
      expect(bounds.height).toBe(86);  // 80 + 6
    });

    it('应该在不可见时返回空边界框', () => {
      rectangle.setVisible(false);
      const bounds = rectangle.getBounds();

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it('应该在尺寸为0时返回空边界框', () => {
      rectangle.width = 0;
      rectangle.height = 100;
      const bounds = rectangle.getBounds();

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('变换影响', () => {
    it('应该正确处理缩放变换的边界框', () => {
      rectangle.moveTo(0, 0);
      rectangle.width = 100;
      rectangle.height = 80;
      rectangle.scaleX = 2;
      rectangle.scaleY = 1.5;

      const bounds = rectangle.getBounds();

      // 由于缩放，边界框应该相应变化
      expect(bounds.width).toBeGreaterThan(100);
      expect(bounds.height).toBeGreaterThan(80);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆矩形', () => {
      rectangle.moveTo(100, 200);
      rectangle.width = 150;
      rectangle.height = 120;
      rectangle.cornerRadius = 8;
      rectangle.fill = '#ff0000';
      rectangle.stroke = '#00ff00';
      rectangle.strokeWidth = 4;

      const cloned = rectangle.clone();

      expect(cloned.id).not.toBe(rectangle.id);
      expect(cloned.x).toBe(100);
      expect(cloned.y).toBe(200);
      expect(cloned.width).toBe(150);
      expect(cloned.height).toBe(120);
      expect(cloned.cornerRadius).toBe(8);
      expect(cloned.fill).toBe('#ff0000');
      expect(cloned.stroke).toBe('#00ff00');
      expect(cloned.strokeWidth).toBe(4);
    });
  });

  describe('静态工厂方法', () => {
    it('应该通过 create 方法创建矩形', () => {
      const config: RectangleConfig = { x: 50, y: 75, width: 120, height: 90 };
      const created = Rectangle.create(config);

      expect(created.x).toBe(50);
      expect(created.y).toBe(75);
      expect(created.width).toBe(120);
      expect(created.height).toBe(90);
    });

    it('应该通过 createAt 方法创建矩形', () => {
      const created = Rectangle.createAt(80, 120, 160, 100);

      expect(created.x).toBe(80);
      expect(created.y).toBe(120);
      expect(created.width).toBe(160);
      expect(created.height).toBe(100);
    });

    it('应该通过 createSquare 方法创建正方形', () => {
      const created = Rectangle.createSquare(60, 90, 50);

      expect(created.x).toBe(60);
      expect(created.y).toBe(90);
      expect(created.width).toBe(50);
      expect(created.height).toBe(50);
    });

    it('应该通过 createRounded 方法创建圆角矩形', () => {
      const created = Rectangle.createRounded(40, 60, 100, 80, 12);

      expect(created.x).toBe(40);
      expect(created.y).toBe(60);
      expect(created.width).toBe(100);
      expect(created.height).toBe(80);
      expect(created.cornerRadius).toBe(12);
    });
  });

  describe('便利方法', () => {
    it('应该通过便利方法设置属性', () => {
      rectangle.setWidth(200);
      rectangle.setHeight(150);
      rectangle.setCornerRadius(15);

      expect(rectangle.width).toBe(200);
      expect(rectangle.height).toBe(150);
      expect(rectangle.cornerRadius).toBe(15);
    });
  });
});