/**
 * Shape 基类测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Shape, ShapeConfig } from '../Shape';
import { IGraphicsContext, IPoint, IRect } from '../../core/interface/IGraphicsContext';
import { Vector2 } from '../../math/Vector2';

// 创建测试用的具体 Shape 实现
class TestShape extends Shape {
  constructor(config: ShapeConfig = {}) {
    super(config);
  }

  get type(): string {
    return 'test';
  }

  render(context: IGraphicsContext): void {
    if (!this.visible) return;

    this.saveAndRestore(context, () => {
      this.applyTransform(context);
      this.applyStyle(context);
      // 简单的测试渲染逻辑
      context.beginPath();
      context.rect(0, 0, 50, 50);
      this.fillAndStroke(context);
    });
  }

  hitTest(point: IPoint): boolean {
    if (!this.visible) return false;
    const localPoint = this.transform.inverseTransformPoint(new Vector2(point.x, point.y));
    return localPoint.x >= 0 && localPoint.x <= 50 && localPoint.y >= 0 && localPoint.y <= 50;
  }

  getBounds(): IRect {
    if (!this.visible) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: this.x, y: this.y, width: 50, height: 50 };
  }

  clone(): TestShape {
    return new TestShape({
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      visible: this.visible,
      zIndex: this.zIndex,
      style: this.style()
    });
  }
}

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
  fill: vi.fn(),
  stroke: vi.fn(),
  // 其他需要的方法...
});

describe('Shape', () => {
  let shape: TestShape;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    shape = new TestShape();
    mockContext = createMockContext();
  });

  describe('构造和基础属性', () => {
    it('应该使用默认配置创建形状', () => {
      expect(shape.id).toBeDefined();
      expect(shape.visible).toBe(true);
      expect(shape.zIndex).toBe(0);
      expect(shape.x).toBe(0);
      expect(shape.y).toBe(0);
      expect(shape.rotation).toBe(0);
      expect(shape.scaleX).toBe(1);
      expect(shape.scaleY).toBe(1);
      expect(shape.opacity).toBe(1);
    });

    it('应该使用自定义配置创建形状', () => {
      const config: ShapeConfig = {
        x: 100,
        y: 200,
        rotation: Math.PI / 4,
        scaleX: 2,
        scaleY: 1.5,
        visible: false,
        zIndex: 10,
        style: {
          fill: '#ff0000',
          stroke: '#0000ff',
          strokeWidth: 3,
          opacity: 0.8
        }
      };

      const customShape = new TestShape(config);

      expect(customShape.x).toBe(100);
      expect(customShape.y).toBe(200);
      expect(customShape.rotation).toBe(Math.PI / 4);
      expect(customShape.scaleX).toBe(2);
      expect(customShape.scaleY).toBe(1.5);
      expect(customShape.visible).toBe(false);
      expect(customShape.zIndex).toBe(10);
      expect(customShape.fill).toBe('#ff0000');
      expect(customShape.stroke).toBe('#0000ff');
      expect(customShape.strokeWidth).toBe(3);
      expect(customShape.opacity).toBe(0.8);
    });
  });

  describe('位置和变换', () => {
    it('应该正确设置和获取位置', () => {
      shape.x = 50;
      shape.y = 100;

      expect(shape.x).toBe(50);
      expect(shape.y).toBe(100);
      expect(shape.position()).toEqual({ x: 50, y: 100 });
    });

    it('应该通过 position 方法设置位置', () => {
      shape.position(75, 125);
      expect(shape.x).toBe(75);
      expect(shape.y).toBe(125);

      shape.position({ x: 200, y: 300 });
      expect(shape.x).toBe(200);
      expect(shape.y).toBe(300);
    });

    it('应该正确设置和获取旋转', () => {
      const angle = Math.PI / 3;
      shape.rotation = angle;
      expect(shape.rotation).toBe(angle);
    });

    it('应该正确设置和获取缩放', () => {
      shape.scaleX = 2;
      shape.scaleY = 3;

      expect(shape.scaleX).toBe(2);
      expect(shape.scaleY).toBe(3);
      expect(shape.scale()).toEqual({ x: 2, y: 3 });

      shape.scale(1.5);
      expect(shape.scaleX).toBe(1.5);
      expect(shape.scaleY).toBe(1.5);

      shape.scale(2, 4);
      expect(shape.scaleX).toBe(2);
      expect(shape.scaleY).toBe(4);
    });
  });

  describe('变换方法', () => {
    it('应该正确执行移动操作', () => {
      shape.moveTo(100, 200);
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(200);

      shape.move(50, -50);
      expect(shape.x).toBe(150);
      expect(shape.y).toBe(150);
    });

    it('应该正确执行旋转操作', () => {
      shape.rotateTo(Math.PI / 2);
      expect(shape.rotation).toBe(Math.PI / 2);

      shape.rotate(Math.PI / 4);
      expect(shape.rotation).toBe(Math.PI * 3 / 4);
    });

    it('应该正确执行缩放操作', () => {
      shape.scaleTo(2);
      expect(shape.scaleX).toBe(2);
      expect(shape.scaleY).toBe(2);

      shape.scaleTo(1.5, 3);
      expect(shape.scaleX).toBe(1.5);
      expect(shape.scaleY).toBe(3);

      shape.scaleBy(2);
      expect(shape.scaleX).toBe(3);
      expect(shape.scaleY).toBe(6);

      shape.scaleBy(0.5, 0.25);
      expect(shape.scaleX).toBe(1.5);
      expect(shape.scaleY).toBe(1.5);
    });
  });

  describe('样式管理', () => {
    it('应该正确设置和获取样式', () => {
      shape.fill = '#ff0000';
      shape.stroke = '#00ff00';
      shape.strokeWidth = 5;
      shape.opacity = 0.7;

      expect(shape.fill).toBe('#ff0000');
      expect(shape.stroke).toBe('#00ff00');
      expect(shape.strokeWidth).toBe(5);
      expect(shape.opacity).toBe(0.7);
    });

    it('应该通过 style 方法批量设置样式', () => {
      shape.style({
        fill: '#0000ff',
        stroke: '#ff00ff',
        strokeWidth: 3,
        opacity: 0.5
      });

      expect(shape.fill).toBe('#0000ff');
      expect(shape.stroke).toBe('#ff00ff');
      expect(shape.strokeWidth).toBe(3);
      expect(shape.opacity).toBe(0.5);
    });

    it('应该正确获取当前样式', () => {
      shape.fill = '#ff0000';
      shape.stroke = '#00ff00';
      shape.strokeWidth = 2;

      const currentStyle = shape.style();
      expect(currentStyle.fill).toBe('#ff0000');
      expect(currentStyle.stroke).toBe('#00ff00');
      expect(currentStyle.strokeWidth).toBe(2);
    });
  });

  describe('可见性和层级', () => {
    it('应该正确设置可见性', () => {
      expect(shape.visible).toBe(true);

      shape.setVisible(false);
      expect(shape.visible).toBe(false);
    });

    it('应该正确设置 Z 轴层级', () => {
      expect(shape.zIndex).toBe(0);

      shape.setZIndex(5);
      expect(shape.zIndex).toBe(5);
    });
  });

  describe('渲染', () => {
    it('应该在可见时调用渲染方法', () => {
      shape.render(mockContext as any);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.rect).toHaveBeenCalledWith(0, 0, 50, 50);
    });

    it('应该在不可见时跳过渲染', () => {
      shape.setVisible(false);
      shape.render(mockContext as any);

      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.beginPath).not.toHaveBeenCalled();
    });

    it('应该正确应用样式', () => {
      shape.fill = '#ff0000';
      shape.stroke = '#00ff00';
      shape.strokeWidth = 3;
      shape.opacity = 0.8;

      shape.render(mockContext as any);

      expect(mockContext.setGlobalAlpha).toHaveBeenCalledWith(0.8);
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#ff0000');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#00ff00');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(3);
    });
  });

  describe('碰撞检测', () => {
    it('应该正确检测点击', () => {
      shape.moveTo(0, 0);

      expect(shape.hitTest({ x: 25, y: 25 })).toBe(true);
      expect(shape.hitTest({ x: 60, y: 60 })).toBe(false);
      expect(shape.hitTest({ x: -10, y: 25 })).toBe(false);
    });

    it('应该在不可见时返回 false', () => {
      shape.setVisible(false);
      expect(shape.hitTest({ x: 25, y: 25 })).toBe(false);
    });
  });

  describe('边界框', () => {
    it('应该返回正确的边界框', () => {
      shape.moveTo(100, 200);
      const bounds = shape.getBounds();

      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(200);
      expect(bounds.width).toBe(50);
      expect(bounds.height).toBe(50);
    });

    it('应该在不可见时返回空边界框', () => {
      shape.setVisible(false);
      const bounds = shape.getBounds();

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆形状', () => {
      shape.moveTo(100, 200);
      shape.rotateTo(Math.PI / 4);
      shape.scaleTo(2, 3);
      shape.fill = '#ff0000';
      shape.stroke = '#00ff00';
      shape.strokeWidth = 5;
      shape.setZIndex(10);

      const cloned = shape.clone();

      expect(cloned.id).not.toBe(shape.id); // ID 应该不同
      expect(cloned.x).toBe(shape.x);
      expect(cloned.y).toBe(shape.y);
      expect(cloned.rotation).toBe(shape.rotation);
      expect(cloned.scaleX).toBe(shape.scaleX);
      expect(cloned.scaleY).toBe(shape.scaleY);
      expect(cloned.fill).toBe(shape.fill);
      expect(cloned.stroke).toBe(shape.stroke);
      expect(cloned.strokeWidth).toBe(shape.strokeWidth);
      expect(cloned.zIndex).toBe(shape.zIndex);
    });
  });

  describe('销毁', () => {
    it('应该能正确销毁', () => {
      expect(() => shape.dispose()).not.toThrow();
    });
  });
});