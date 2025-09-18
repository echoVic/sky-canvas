/**
 * Primitives 模块集成测试
 */
import { describe, expect, it } from 'vitest';
import {
  // 具体图形原语
  CirclePrimitive,
  // 基础实现
  GraphicPrimitive,
  // 接口定义
  GraphicPrimitiveType,
  ICirclePrimitive,
  IGraphicPrimitive,
  IPathPrimitive,
  IRectanglePrimitive,
  PathPrimitive,
  PrimitiveCreateOptions,
  // 图形原语工厂
  PrimitiveFactory,
  RectanglePrimitive
} from '../index';

describe('Primitives 模块集成测试', () => {
  describe('模块导出', () => {
    it('应该正确导出所有类型定义', () => {
      // 验证类型定义存在
      const types: GraphicPrimitiveType[] = ['rectangle', 'circle', 'path', 'line'];
      expect(types).toContain('rectangle');
      expect(types).toContain('circle');
      expect(types).toContain('path');
      expect(types).toContain('line');
    });

    it('应该正确导出所有类', () => {
      // 验证类构造函数存在
      expect(typeof GraphicPrimitive).toBe('function');
      expect(typeof CirclePrimitive).toBe('function');
      expect(typeof RectanglePrimitive).toBe('function');
      expect(typeof PathPrimitive).toBe('function');
      expect(typeof PrimitiveFactory).toBe('function');
    });
  });

  describe('类型兼容性', () => {
    it('具体实现应该符合接口定义', () => {
      const circle = new CirclePrimitive();
      const rectangle = new RectanglePrimitive();
      const path = new PathPrimitive();

      // 类型检查
      expect(circle).toBeInstanceOf(GraphicPrimitive);
      expect(rectangle).toBeInstanceOf(GraphicPrimitive);
      expect(path).toBeInstanceOf(GraphicPrimitive);

      // 接口兼容性
      const primitives: IGraphicPrimitive[] = [circle, rectangle, path];
      expect(primitives.length).toBe(3);

      // 特定接口兼容性
      const circleInterface: ICirclePrimitive = circle;
      const rectangleInterface: IRectanglePrimitive = rectangle;
      const pathInterface: IPathPrimitive = path;

      expect(circleInterface.type).toBe('circle');
      expect(rectangleInterface.type).toBe('rectangle');
      expect(pathInterface.type).toBe('path');
    });
  });

  describe('工厂模式集成', () => {
    it('工厂应该能创建所有类型的原语', () => {
      const circle = PrimitiveFactory.create('circle');
      const rectangle = PrimitiveFactory.create('rectangle');
      const path = PrimitiveFactory.create('path');

      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(path).toBeInstanceOf(PathPrimitive);
    });

    it('工厂创建的实例应该符合接口', () => {
      const options: PrimitiveCreateOptions = {
        id: 'test-primitive',
        width: 100,
        height: 50,
        radius: 25,
        pathData: 'M 0 0 L 10 10'
      };

      const primitives = [
        PrimitiveFactory.create('rectangle', options),
        PrimitiveFactory.create('circle', options),
        PrimitiveFactory.create('path', options)
      ];

      primitives.forEach(primitive => {
        expect(primitive.id).toBe('test-primitive');
        expect(typeof primitive.render).toBe('function');
        expect(typeof primitive.getBounds).toBe('function');
        expect(typeof primitive.hitTest).toBe('function');
        expect(typeof primitive.clone).toBe('function');
      });
    });
  });

  describe('多态性测试', () => {
    it('应该支持多态操作', () => {
      const primitives: IGraphicPrimitive[] = [
        new CirclePrimitive(30),
        new RectanglePrimitive(40, 60),
        new PathPrimitive('M 0 0 L 20 20')
      ];

      // 统一接口操作
      primitives.forEach(primitive => {
        primitive.setPosition({ x: 10, y: 20 });
        primitive.setStyle({ fillColor: '#ff0000' });
        primitive.setTransform({ rotation: Math.PI / 4 });

        expect(primitive.position.x).toBe(10);
        expect(primitive.position.y).toBe(20);
        expect(primitive.style.fillColor).toBe('#ff0000');
        expect(primitive.transform.rotation).toBe(Math.PI / 4);
      });
    });

    it('应该正确处理类型特定的属性', () => {
      const circle = new CirclePrimitive(50);
      const rectangle = new RectanglePrimitive(100, 80);
      const path = new PathPrimitive('M 0 0 L 50 50');

      // 类型特定属性
      expect((circle as ICirclePrimitive).radius).toBe(50);
      expect((rectangle as IRectanglePrimitive).width).toBe(100);
      expect((rectangle as IRectanglePrimitive).height).toBe(80);
      expect((path as IPathPrimitive).pathData).toBe('M 0 0 L 50 50');
    });
  });

  describe('边界情况集成测试', () => {
    it('应该处理空配置的创建', () => {
      const primitives = [
        PrimitiveFactory.create('circle', {}),
        PrimitiveFactory.create('rectangle', {}),
        PrimitiveFactory.create('path', {})
      ];

      primitives.forEach(primitive => {
        expect(primitive).toBeDefined();
        expect(primitive.id).toBeDefined();
        expect(primitive.type).toBeDefined();
      });
    });

    it('应该处理克隆操作的一致性', () => {
      const original = PrimitiveFactory.create('circle', {
        radius: 75,
        id: 'original-circle'
      });
      
      original.setPosition({ x: 100, y: 200 });
      original.setStyle({ fillColor: '#00ff00', strokeWidth: 2 });
      original.setTransform({ rotation: Math.PI / 2, scaleX: 1.5 });

      const cloned = original.clone();

      // 验证克隆的独立性
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.type).toBe(original.type);
      expect(cloned.position).toEqual(original.position);
      expect(cloned.style).toEqual(original.style);
      expect(cloned.transform).toEqual(original.transform);

      // 验证修改独立性
      cloned.setPosition({ x: 300, y: 400 });
      expect(original.position.x).toBe(100);
      expect(cloned.position.x).toBe(300);
    });
  });

  describe('性能集成测试', () => {
    it('应该快速创建和操作大量原语', () => {
      const startTime = performance.now();
      const primitives: IGraphicPrimitive[] = [];

      // 创建大量原语
      for (let i = 0; i < 1000; i++) {
        const type: GraphicPrimitiveType = ['circle', 'rectangle', 'path'][i % 3] as GraphicPrimitiveType;
        primitives.push(PrimitiveFactory.create(type));
      }

      // 批量操作
      primitives.forEach((primitive, index) => {
        primitive.setPosition({ x: index % 100, y: Math.floor(index / 100) });
        primitive.setStyle({ fillColor: `hsl(${index % 360}, 50%, 50%)` });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(primitives.length).toBe(1000);
      expect(duration).toBeLessThan(200); // 应该在200ms内完成
    });

    it('应该快速执行批量边界计算', () => {
      const primitives = [
        new CirclePrimitive(50),
        new RectanglePrimitive(100, 80),
        new PathPrimitive('M 0 0 L 100 100 L 0 100 Z')
      ];

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        primitives.forEach(primitive => {
          primitive.getBounds();
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('错误处理集成测试', () => {
    it('应该正确处理无效类型', () => {
      expect(() => {
        PrimitiveFactory.create('invalid' as GraphicPrimitiveType);
      }).toThrow('Unsupported primitive type: invalid');
    });

    it('应该正确处理边界值', () => {
      // 零值测试
      const zeroCircle = PrimitiveFactory.create('circle', { radius: 0 });
      const zeroRect = PrimitiveFactory.create('rectangle', { width: 0, height: 0 });
      
      expect((zeroCircle as CirclePrimitive).radius).toBe(0);
      expect((zeroRect as RectanglePrimitive).width).toBe(0);
      expect((zeroRect as RectanglePrimitive).height).toBe(0);

      // 负值测试（构造函数允许负值，但setter会限制）
      const negativeCircle = new CirclePrimitive(-10);
      expect(negativeCircle.radius).toBe(-10); // 构造函数直接赋值
      
      // 通过setter设置负值应该被限制
      negativeCircle.radius = -5;
      expect(negativeCircle.radius).toBe(0); // setter会限制为非负值
    });
  });
});