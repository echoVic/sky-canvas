import { describe, test, expect } from 'vitest';
import { Matrix3x3 } from '../engine/math/Matrix3x3';
import { Vector2 } from '../engine/math/Vector2';

describe('Matrix3x3', () => {
  describe('构造函数', () => {
    test('默认构造应该创建单位矩阵', () => {
      const m = new Matrix3x3();
      const identity = Matrix3x3.identity();
      expect(m.equals(identity)).toBe(true);
    });

    test('应该能用数组创建矩阵', () => {
      const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const m = new Matrix3x3(elements);
      expect(m.get(0, 0)).toBe(1);
      expect(m.get(1, 1)).toBe(5);
      expect(m.get(2, 2)).toBe(9);
    });
  });

  describe('基础运算', () => {
    test('矩阵加法应该正确', () => {
      const m1 = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const m2 = new Matrix3x3([9, 8, 7, 6, 5, 4, 3, 2, 1]);
      const result = m1.add(m2);
      
      expect(result.get(0, 0)).toBe(10);
      expect(result.get(1, 1)).toBe(10);
      expect(result.get(2, 2)).toBe(10);
    });

    test('矩阵乘法应该正确', () => {
      const m1 = Matrix3x3.identity();
      const m2 = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const result = m1.multiply(m2);
      
      expect(result.equals(m2)).toBe(true);
    });

    test('标量乘法应该正确', () => {
      const m = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const result = m.scale(2);
      
      expect(result.get(0, 0)).toBe(2);
      expect(result.get(1, 1)).toBe(10);
      expect(result.get(2, 2)).toBe(18);
    });
  });

  describe('变换测试', () => {
    test('平移变换应该正确', () => {
      const translate = Matrix3x3.translation(new Vector2(10, 20));
      const point = new Vector2(0, 0);
      const transformed = translate.transformVector(point);
      
      expect(transformed.x).toBe(10);
      expect(transformed.y).toBe(20);
    });

    test('旋转变换应该正确', () => {
      const rotate90 = Matrix3x3.rotation(Math.PI / 2);
      const point = new Vector2(1, 0);
      const transformed = rotate90.transformVector(point);
      
      expect(Math.abs(transformed.x)).toBeLessThan(1e-10);
      expect(Math.abs(transformed.y - 1)).toBeLessThan(1e-10);
    });

    test('缩放变换应该正确', () => {
      const scale = Matrix3x3.scaling(new Vector2(2, 3));
      const point = new Vector2(1, 1);
      const transformed = scale.transformVector(point);
      
      expect(transformed.x).toBe(2);
      expect(transformed.y).toBe(3);
    });
  });

  describe('工具方法', () => {
    test('转置应该正确', () => {
      const m = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const transposed = m.transpose();
      
      expect(transposed.get(0, 1)).toBe(4);
      expect(transposed.get(1, 0)).toBe(2);
      expect(transposed.get(2, 0)).toBe(3);
    });

    test('行列式计算应该正确', () => {
      const m = Matrix3x3.identity();
      const det = m.determinant();
      expect(det).toBe(1);
    });

    test('相等比较应该正确', () => {
      const m1 = Matrix3x3.identity();
      const m2 = Matrix3x3.identity();
      expect(m1.equals(m2)).toBe(true);
    });
  });
});
