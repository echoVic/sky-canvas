import { describe, test, expect } from 'vitest';
import { Vector2 } from '../src/math/Vector2';

describe('Vector2', () => {
  describe('构造函数', () => {
    test('默认构造应该为 (0, 0)', () => {
      const v1 = new Vector2();
      expect(v1.x).toBe(0);
      expect(v1.y).toBe(0);
    });

    test('参数构造应该正确设置值', () => {
      const v2 = new Vector2(3, 4);
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
    });

    test('克隆应该创建相同的向量', () => {
      const v2 = new Vector2(3, 4);
      const v3 = v2.clone();
      expect(v3.x).toBe(3);
      expect(v3.y).toBe(4);
      expect(v3).not.toBe(v2);
    });
  });

  describe('基础运算', () => {
    test('向量加法应该正确', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const sum = v1.add(v2);
      expect(sum.x).toBe(4);
      expect(sum.y).toBe(6);
    });

    test('向量减法应该正确', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const diff = v2.subtract(v1);
      expect(diff.x).toBe(2);
      expect(diff.y).toBe(2);
    });

    test('标量乘法应该正确', () => {
      const v1 = new Vector2(1, 2);
      const scaled = v1.multiply(2);
      expect(scaled.x).toBe(2);
      expect(scaled.y).toBe(4);
    });

    test('标量除法应该正确', () => {
      const scaled = new Vector2(2, 4);
      const divided = scaled.divide(2);
      expect(divided.x).toBe(1);
      expect(divided.y).toBe(2);
    });
  });

  describe('向量数学运算', () => {
    test('向量长度应该正确计算', () => {
      const v1 = new Vector2(3, 4);
      const length = v1.length();
      expect(Math.abs(length - 5)).toBeLessThan(1e-10);
    });

    test('向量长度平方应该正确计算', () => {
      const v1 = new Vector2(3, 4);
      const lengthSq = v1.lengthSquared();
      expect(lengthSq).toBe(25);
    });

    test('归一化向量长度应该为 1', () => {
      const v1 = new Vector2(3, 4);
      const normalized = v1.normalize();
      expect(Math.abs(normalized.length() - 1)).toBeLessThan(1e-10);
    });

    test('点积应该正确计算', () => {
      const v1 = new Vector2(3, 4);
      const v2 = new Vector2(1, 0);
      const dot = v1.dot(v2);
      expect(dot).toBe(3);
    });

    test('叉积应该正确计算', () => {
      const v1 = new Vector2(3, 4);
      const v2 = new Vector2(1, 0);
      const cross = v1.cross(v2);
      expect(cross).toBe(-4);
    });

    test('距离计算应该正确', () => {
      const v1 = new Vector2(3, 4);
      const distance = v1.distance(Vector2.ZERO);
      expect(Math.abs(distance - 5)).toBeLessThan(1e-10);
    });
  });

  describe('向量变换', () => {
    test('90度旋转应该正确', () => {
      const v1 = new Vector2(1, 0);
      const rotated = v1.rotate(Math.PI / 2);
      expect(Math.abs(rotated.x)).toBeLessThan(1e-10);
      expect(Math.abs(rotated.y - 1)).toBeLessThan(1e-10);
    });

    test('垂直向量应该正确', () => {
      const v1 = new Vector2(1, 0);
      const perp = v1.perpendicular();
      expect(perp.x).toBe(0);
      expect(perp.y).toBe(1);
    });

    test('反射应该正确', () => {
      const normal = new Vector2(0, 1);
      const reflected = new Vector2(1, -1).reflect(normal);
      expect(Math.abs(reflected.x - 1)).toBeLessThan(1e-10);
      expect(Math.abs(reflected.y - 1)).toBeLessThan(1e-10);
    });
  });

  describe('静态方法', () => {
    test('从角度创建应该正确', () => {
      const v1 = Vector2.fromAngle(0, 5);
      expect(Math.abs(v1.x - 5)).toBeLessThan(1e-10);
      expect(Math.abs(v1.y)).toBeLessThan(1e-10);
    });

    test('从数组创建应该正确', () => {
      const v2 = Vector2.fromArray([3, 4]);
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
    });

    test('插值应该正确', () => {
      const v3 = new Vector2(0, 0);
      const v4 = new Vector2(10, 10);
      const lerped = Vector2.lerp(v3, v4, 0.5);
      expect(lerped.x).toBe(5);
      expect(lerped.y).toBe(5);
    });
  });

  describe('工具方法', () => {
    test('转换为数组应该正确', () => {
      const v1 = new Vector2(3.14159, 2.71828);
      const arr = v1.toArray();
      expect(arr[0]).toBe(v1.x);
      expect(arr[1]).toBe(v1.y);
    });

    test('相等比较应该正确', () => {
      const v1 = new Vector2(3.14159, 2.71828);
      const v2 = new Vector2(3.14159, 2.71828);
      expect(v1.equals(v2)).toBe(true);
    });

    test('字符串表示应该包含正确值', () => {
      const v1 = new Vector2(3.14159, 2.71828);
      const str = v1.toString();
      expect(str).toContain('3.142');
      expect(str).toContain('2.718');
    });
  });
});