/**
 * PrimitiveFactory 的单元测试
 */
import { describe, expect, it } from 'vitest';
import { CirclePrimitive } from '../CirclePrimitive';
import { GraphicPrimitiveType } from '../IGraphicPrimitive';
import { PathPrimitive } from '../PathPrimitive';
import { PrimitiveCreateOptions, PrimitiveFactory } from '../PrimitiveFactory';
import { RectanglePrimitive } from '../RectanglePrimitive';

describe('PrimitiveFactory', () => {
  describe('create 方法', () => {
    it('应该创建矩形原语', () => {
      const rectangle = PrimitiveFactory.create('rectangle', {
        width: 100,
        height: 50,
        id: 'test-rect'
      });
      
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(rectangle.type).toBe('rectangle');
      expect(rectangle.id).toBe('test-rect');
      expect((rectangle as RectanglePrimitive).width).toBe(100);
      expect((rectangle as RectanglePrimitive).height).toBe(50);
    });

    it('应该创建圆形原语', () => {
      const circle = PrimitiveFactory.create('circle', {
        radius: 75,
        id: 'test-circle'
      });
      
      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(circle.type).toBe('circle');
      expect(circle.id).toBe('test-circle');
      expect((circle as CirclePrimitive).radius).toBe(75);
    });

    it('应该创建路径原语', () => {
      const pathData = 'M 10 10 L 20 20 Z';
      const path = PrimitiveFactory.create('path', {
        pathData,
        id: 'test-path'
      });
      
      expect(path).toBeInstanceOf(PathPrimitive);
      expect(path.type).toBe('path');
      expect(path.id).toBe('test-path');
      expect((path as PathPrimitive).pathData).toBe(pathData);
    });

    it('应该使用默认参数创建原语', () => {
      const rectangle = PrimitiveFactory.create('rectangle');
      const circle = PrimitiveFactory.create('circle');
      const path = PrimitiveFactory.create('path');
      
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(path).toBeInstanceOf(PathPrimitive);
    });

    it('应该抛出不支持类型的错误', () => {
      expect(() => {
        PrimitiveFactory.create('unsupported' as GraphicPrimitiveType);
      }).toThrow('Unsupported primitive type: unsupported');
    });
  });

  describe('createRectangle 方法', () => {
    it('应该创建矩形原语', () => {
      const rectangle = PrimitiveFactory.createRectangle(200, 100, 'rect-1');
      
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(rectangle.type).toBe('rectangle');
      expect(rectangle.id).toBe('rect-1');
      expect(rectangle.width).toBe(200);
      expect(rectangle.height).toBe(100);
    });

    it('应该使用默认参数创建矩形', () => {
      const rectangle = PrimitiveFactory.createRectangle();
      
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(rectangle.type).toBe('rectangle');
      expect(rectangle.width).toBe(100); // 默认值
      expect(rectangle.height).toBe(100); // 默认值
    });
  });

  describe('createCircle 方法', () => {
    it('应该创建圆形原语', () => {
      const circle = PrimitiveFactory.createCircle(80, 'circle-1');
      
      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(circle.type).toBe('circle');
      expect(circle.id).toBe('circle-1');
      expect(circle.radius).toBe(80);
    });

    it('应该使用默认参数创建圆形', () => {
      const circle = PrimitiveFactory.createCircle();
      
      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(circle.type).toBe('circle');
      expect(circle.radius).toBe(50); // 默认值
    });
  });

  describe('createPath 方法', () => {
    it('应该创建路径原语', () => {
      const pathData = 'M 0 0 L 100 100 L 0 100 Z';
      const path = PrimitiveFactory.createPath(pathData, 'path-1');
      
      expect(path).toBeInstanceOf(PathPrimitive);
      expect(path.type).toBe('path');
      expect(path.id).toBe('path-1');
      expect(path.pathData).toBe(pathData);
    });

    it('应该使用默认参数创建路径', () => {
      const path = PrimitiveFactory.createPath();
      
      expect(path).toBeInstanceOf(PathPrimitive);
      expect(path.type).toBe('path');
      expect(path.pathData).toBe(''); // 默认值
    });
  });

  describe('isSupported 方法', () => {
    it('应该识别支持的类型', () => {
      expect(PrimitiveFactory.isSupported('rectangle')).toBe(true);
      expect(PrimitiveFactory.isSupported('circle')).toBe(true);
      expect(PrimitiveFactory.isSupported('path')).toBe(true);
      expect(PrimitiveFactory.isSupported('line')).toBe(true);
    });

    it('应该识别不支持的类型', () => {
      expect(PrimitiveFactory.isSupported('triangle')).toBe(false);
      expect(PrimitiveFactory.isSupported('polygon')).toBe(false);
      expect(PrimitiveFactory.isSupported('')).toBe(false);
      expect(PrimitiveFactory.isSupported('invalid')).toBe(false);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空选项对象', () => {
      const options: PrimitiveCreateOptions = {};
      
      const rectangle = PrimitiveFactory.create('rectangle', options);
      const circle = PrimitiveFactory.create('circle', options);
      const path = PrimitiveFactory.create('path', options);
      
      expect(rectangle).toBeInstanceOf(RectanglePrimitive);
      expect(circle).toBeInstanceOf(CirclePrimitive);
      expect(path).toBeInstanceOf(PathPrimitive);
    });

    it('应该处理部分选项', () => {
      const rectangle = PrimitiveFactory.create('rectangle', { width: 150 });
      const circle = PrimitiveFactory.create('circle', { id: 'partial-circle' });
      const path = PrimitiveFactory.create('path', { pathData: 'M 0 0' });
      
      expect((rectangle as RectanglePrimitive).width).toBe(150);
      expect(circle.id).toBe('partial-circle');
      expect((path as PathPrimitive).pathData).toBe('M 0 0');
    });

    it('应该处理零值参数', () => {
      const rectangle = PrimitiveFactory.create('rectangle', {
        width: 0,
        height: 0
      });
      const circle = PrimitiveFactory.create('circle', { radius: 0 });
      
      expect((rectangle as RectanglePrimitive).width).toBe(0);
      expect((rectangle as RectanglePrimitive).height).toBe(0);
      expect((circle as CirclePrimitive).radius).toBe(0);
    });

    it('应该处理负值参数', () => {
      const rectangle = PrimitiveFactory.create('rectangle', {
        width: -10,
        height: -20
      });
      const circle = PrimitiveFactory.create('circle', { radius: -5 });
      
      expect((rectangle as RectanglePrimitive).width).toBe(-10);
      expect((rectangle as RectanglePrimitive).height).toBe(-20);
      expect((circle as CirclePrimitive).radius).toBe(-5);
    });
  });

  describe('类型安全测试', () => {
    it('应该返回正确的类型实例', () => {
      const primitives = [
        PrimitiveFactory.create('rectangle'),
        PrimitiveFactory.create('circle'),
        PrimitiveFactory.create('path')
      ];
      
      expect(primitives[0].type).toBe('rectangle');
      expect(primitives[1].type).toBe('circle');
      expect(primitives[2].type).toBe('path');
    });

    it('应该保持类型一致性', () => {
      const rectangle1 = PrimitiveFactory.create('rectangle');
      const rectangle2 = PrimitiveFactory.createRectangle();
      
      expect(rectangle1.constructor).toBe(rectangle2.constructor);
      expect(rectangle1.type).toBe(rectangle2.type);
    });
  });
});