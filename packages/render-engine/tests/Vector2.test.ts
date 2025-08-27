/**
 * 2D向量数学库测试
 */
import { describe, test, expect } from 'vitest';
import { Vector2 } from '../src/math/Vector2';

describe('Vector2', () => {
  describe('构造函数', () => {
    test('应该能创建零向量', () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    test('应该能创建指定坐标的向量', () => {
      const v = new Vector2(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('基本运算', () => {
    test('应该能进行向量加法', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const result = v1.add(v2);
      
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      expect(v1.x).toBe(1); // 原向量不变
      expect(v1.y).toBe(2);
    });

    test('应该能进行向量减法', () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(2, 3);
      const result = v1.subtract(v2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    test('应该能进行标量乘法', () => {
      const v = new Vector2(2, 3);
      const result = v.multiply(2);
      
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    test('应该能进行标量除法', () => {
      const v = new Vector2(6, 8);
      const result = v.divide(2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    test('除以零应该抛出错误', () => {
      const v = new Vector2(1, 1);
      expect(() => v.divide(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('长度计算', () => {
    test('应该能计算向量长度', () => {
      const v = new Vector2(3, 4);
      expect(v.length()).toBe(5);
    });

    test('应该能计算向量长度平方', () => {
      const v = new Vector2(3, 4);
      expect(v.lengthSquared()).toBe(25);
    });

    test('零向量长度应该为0', () => {
      const v = new Vector2(0, 0);
      expect(v.length()).toBe(0);
    });
  });

  describe('单位向量', () => {
    test('应该能归一化向量', () => {
      const v = new Vector2(3, 4);
      const normalized = v.normalize();
      
      expect(normalized.length()).toBeCloseTo(1, 5);
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    test('归一化零向量应该返回零向量', () => {
      const v = new Vector2(0, 0);
      const normalized = v.normalize();
      
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('点积和距离', () => {
    test('应该能计算点积', () => {
      const v1 = new Vector2(2, 3);
      const v2 = new Vector2(4, 5);
      const dot = v1.dot(v2);
      
      expect(dot).toBe(23); // 2*4 + 3*5 = 23
    });

    test('应该能计算两点距离', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);
      const distance = v1.distanceTo(v2);
      
      expect(distance).toBe(5);
    });

    test('应该能计算两点距离平方', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);
      const distanceSquared = v1.distanceToSquared(v2);
      
      expect(distanceSquared).toBe(25);
    });
  });

  describe('角度计算', () => {
    test('应该能计算向量角度', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);
      
      expect(v1.angle()).toBe(0);
      expect(v2.angle()).toBeCloseTo(Math.PI / 2, 5);
    });

    test('应该能计算两向量夹角', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);
      const angle = v1.angleTo(v2);
      
      expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('工具方法', () => {
    test('应该能克隆向量', () => {
      const v1 = new Vector2(3, 4);
      const v2 = v1.clone();
      
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
      expect(v2).not.toBe(v1); // 不是同一个对象
    });

    test('应该能判断向量相等', () => {
      const v1 = new Vector2(3, 4);
      const v2 = new Vector2(3, 4);
      const v3 = new Vector2(3, 5);
      
      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });

    test('应该能转换为数组', () => {
      const v = new Vector2(3, 4);
      const array = v.toArray();
      
      expect(array).toEqual([3, 4]);
    });

    test('应该有正确的字符串表示', () => {
      const v = new Vector2(3, 4);
      expect(v.toString()).toBe('Vector2(3, 4)');
    });
  });

  describe('静态方法', () => {
    test('应该能创建零向量', () => {
      const zero = Vector2.zero();
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
    });

    test('应该能创建单位向量', () => {
      const one = Vector2.one();
      expect(one.x).toBe(1);
      expect(one.y).toBe(1);
    });

    test('应该能插值两个向量', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(10, 10);
      const lerp = Vector2.lerp(v1, v2, 0.5);
      
      expect(lerp.x).toBe(5);
      expect(lerp.y).toBe(5);
    });
  });
});