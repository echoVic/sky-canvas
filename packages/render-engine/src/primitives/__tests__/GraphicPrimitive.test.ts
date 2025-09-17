/**
 * GraphicPrimitive 基类的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphicPrimitive } from '../GraphicPrimitive';
import { IGraphicsContext, IPoint, IRect } from '../../core/interface/IGraphicsContext';
import { GraphicPrimitiveType } from '../IGraphicPrimitive';

// 创建测试用的具体实现类
class TestPrimitive extends GraphicPrimitive {
  constructor(id?: string) {
    super('rectangle', id);
  }

  render(context: IGraphicsContext): void {
    this.applyTransform(context);
    this.applyStyle(context);
    // 模拟渲染逻辑
    context.fillRect(0, 0, 100, 100);
    this.restoreTransform(context);
  }

  getBounds(): IRect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: 100,
      height: 100
    };
  }

  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  clone(): TestPrimitive {
    const cloned = new TestPrimitive();
    cloned.setPosition(this.position);
    cloned.setTransform(this.transform);
    cloned.setStyle(this.style);
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }
}

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
  stroke: vi.fn()
} as any);

describe('GraphicPrimitive', () => {
  let primitive: TestPrimitive;
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    primitive = new TestPrimitive();
    mockContext = createMockContext();
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化基本属性', () => {
      expect(primitive.type).toBe('rectangle');
      expect(primitive.visible).toBe(true);
      expect(primitive.zIndex).toBe(0);
      expect(primitive.position).toEqual({ x: 0, y: 0 });
    });

    it('应该生成唯一的ID', () => {
      const primitive1 = new TestPrimitive();
      const primitive2 = new TestPrimitive();
      expect(primitive1.id).not.toBe(primitive2.id);
      expect(primitive1.id).toMatch(/^rectangle_\d+_[a-z0-9]+$/);
    });

    it('应该接受自定义ID', () => {
      const customId = 'custom-test-id';
      const primitiveWithId = new TestPrimitive(customId);
      expect(primitiveWithId.id).toBe(customId);
    });
  });

  describe('位置管理', () => {
    it('应该正确设置和获取位置', () => {
      const newPosition = { x: 100, y: 200 };
      primitive.setPosition(newPosition);
      expect(primitive.position).toEqual(newPosition);
    });

    it('应该通过属性设置位置', () => {
      const newPosition = { x: 50, y: 75 };
      primitive.position = newPosition;
      expect(primitive.position).toEqual(newPosition);
    });

    it('位置应该是不可变的副本', () => {
      const originalPosition = { x: 10, y: 20 };
      primitive.setPosition(originalPosition);
      
      const retrievedPosition = primitive.position;
      retrievedPosition.x = 999;
      
      expect(primitive.position.x).toBe(10);
    });
  });

  describe('变换管理', () => {
    it('应该正确设置和获取变换', () => {
      const newTransform = {
        rotation: Math.PI / 4,
        scaleX: 2,
        scaleY: 1.5
      };
      
      primitive.setTransform(newTransform);
      expect(primitive.transform).toEqual(newTransform);
    });

    it('应该支持部分变换更新', () => {
      primitive.setTransform({ rotation: Math.PI / 2 });
      expect(primitive.transform.rotation).toBe(Math.PI / 2);
      expect(primitive.transform.scaleX).toBe(1);
      expect(primitive.transform.scaleY).toBe(1);
    });

    it('变换应该是不可变的副本', () => {
      const originalTransform = { rotation: 0, scaleX: 1, scaleY: 1 };
      primitive.setTransform(originalTransform);
      
      const retrievedTransform = primitive.transform;
      retrievedTransform.rotation = 999;
      
      expect(primitive.transform.rotation).toBe(0);
    });
  });

  describe('样式管理', () => {
    it('应该正确设置和获取样式', () => {
      const newStyle = {
        fillColor: '#ff0000',
        strokeColor: '#00ff00',
        strokeWidth: 3,
        opacity: 0.8
      };
      
      primitive.setStyle(newStyle);
      expect(primitive.style).toEqual(newStyle);
    });

    it('应该支持部分样式更新', () => {
      primitive.setStyle({ fillColor: '#blue' });
      expect(primitive.style.fillColor).toBe('#blue');
      expect(primitive.style.strokeColor).toBe('#000000');
    });

    it('样式应该是不可变的副本', () => {
      const originalStyle = { fillColor: '#red', strokeColor: '#blue', strokeWidth: 1, opacity: 1 };
      primitive.setStyle(originalStyle);
      
      const retrievedStyle = primitive.style;
      retrievedStyle.fillColor = '#green';
      
      expect(primitive.style.fillColor).toBe('#red');
    });
  });

  describe('可见性和层级', () => {
    it('应该正确设置可见性', () => {
      primitive.visible = false;
      expect(primitive.visible).toBe(false);
      
      primitive.visible = true;
      expect(primitive.visible).toBe(true);
    });

    it('应该正确设置z-index', () => {
      primitive.zIndex = 10;
      expect(primitive.zIndex).toBe(10);
      
      primitive.zIndex = -5;
      expect(primitive.zIndex).toBe(-5);
    });
  });

  describe('渲染相关方法', () => {
    it('应该正确应用变换', () => {
      primitive.setPosition({ x: 100, y: 200 });
      primitive.setTransform({ rotation: Math.PI / 4, scaleX: 2, scaleY: 1.5 });
      
      // 调用受保护的方法进行测试
      (primitive as any).applyTransform(mockContext);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(100, 200);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 1.5);
    });

    it('应该正确恢复变换', () => {
      (primitive as any).restoreTransform(mockContext);
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该正确应用样式', () => {
      primitive.setStyle({
        fillColor: '#ff0000',
        strokeColor: '#00ff00',
        strokeWidth: 3,
        opacity: 0.8
      });
      
      (primitive as any).applyStyle(mockContext);
      
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#ff0000');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#00ff00');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(3);
      expect(mockContext.setOpacity).toHaveBeenCalledWith(0.8);
    });

    it('应该跳过未定义的样式属性', () => {
      primitive.setStyle({ fillColor: '#red' });
      
      (primitive as any).applyStyle(mockContext);
      
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#red');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#000000');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(1);
      expect(mockContext.setOpacity).not.toHaveBeenCalled(); // opacity = 1 时不调用
    });
  });

  describe('边界和碰撞检测', () => {
    it('应该返回正确的边界', () => {
      primitive.setPosition({ x: 50, y: 100 });
      const bounds = primitive.bounds;
      
      expect(bounds).toEqual({
        x: 50,
        y: 100,
        width: 100,
        height: 100
      });
    });

    it('应该正确进行碰撞检测', () => {
      primitive.setPosition({ x: 0, y: 0 });
      
      expect(primitive.hitTest({ x: 50, y: 50 })).toBe(true);
      expect(primitive.hitTest({ x: 150, y: 150 })).toBe(false);
      expect(primitive.hitTest({ x: -10, y: 50 })).toBe(false);
    });
  });

  describe('克隆和销毁', () => {
    it('应该正确克隆图形原语', () => {
      primitive.setPosition({ x: 100, y: 200 });
      primitive.setTransform({ rotation: Math.PI / 4, scaleX: 2, scaleY: 1.5 });
      primitive.setStyle({ fillColor: '#red', opacity: 0.8 });
      primitive.visible = false;
      primitive.zIndex = 5;
      
      const cloned = primitive.clone();
      
      expect(cloned.id).not.toBe(primitive.id);
      expect(cloned.position).toEqual(primitive.position);
      expect(cloned.transform).toEqual(primitive.transform);
      expect(cloned.style).toEqual(primitive.style);
      expect(cloned.visible).toBe(primitive.visible);
      expect(cloned.zIndex).toBe(primitive.zIndex);
    });

    it('应该正确销毁图形原语', () => {
      expect(() => primitive.dispose()).not.toThrow();
    });
  });

  describe('完整渲染流程', () => {
    it('应该按正确顺序执行渲染步骤', () => {
      primitive.setPosition({ x: 50, y: 100 });
      primitive.setTransform({ rotation: Math.PI / 6 });
      primitive.setStyle({ fillColor: '#blue' });
      
      primitive.render(mockContext);
      
      // 验证调用顺序
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(50, 100);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 6);
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#blue');
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });
});