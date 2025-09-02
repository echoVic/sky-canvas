import { describe, test, expect } from 'vitest';
import { Transform } from '../src/math/Transform';
import { Vector2 } from '../src/math/Vector2';

describe('Transform', () => {
  describe('构造函数', () => {
    test('默认构造应该创建恒等变换', () => {
      const transform = new Transform();
      expect(transform.position.equals(Vector2.ZERO)).toBe(true);
      expect(transform.rotation).toBe(0);
      expect(transform.scale.equals(Vector2.ONE)).toBe(true);
    });

    test('应该能指定初始值', () => {
      const position = new Vector2(10, 20);
      const rotation = Math.PI / 4;
      const scale = new Vector2(2, 3);
      const transform = new Transform(position, rotation, scale);
      
      expect(transform.position.equals(position)).toBe(true);
      expect(transform.rotation).toBe(rotation);
      expect(transform.scale.equals(scale)).toBe(true);
    });
  });

  describe('变换操作', () => {
    test('应该能平移', () => {
      const transform = new Transform();
      const offset = new Vector2(5, 10);
      transform.translate(offset);
      
      expect(transform.position.equals(offset)).toBe(true);
    });

    test('应该能旋转', () => {
      const transform = new Transform();
      const angle = Math.PI / 2;
      transform.rotate(angle);
      
      expect(transform.rotation).toBe(angle);
    });

    test('应该能缩放', () => {
      const transform = new Transform();
      const scaleVec = new Vector2(2, 3);
      transform.setScale(scaleVec);
      
      expect(transform.scale.equals(scaleVec)).toBe(true);
    });
  });

  describe('矩阵变换', () => {
    test('应该能获取变换矩阵', () => {
      const transform = new Transform();
      const matrix = transform.matrix;
      
      expect(matrix).toBeDefined();
    });

    test('应该能从矩阵设置变换', () => {
      const transform = new Transform();
      const position = new Vector2(10, 20);
      const rotation = Math.PI / 4;
      const scale = new Vector2(2, 2);
      
      transform.position = position.clone();
      transform.rotation = rotation;
      transform.scale = scale.clone();
      
      const matrix = transform.matrix;
      const newTransform = Transform.fromMatrix(matrix);
      
      expect(newTransform.position.x).toBeCloseTo(position.x, 5);
      expect(newTransform.position.y).toBeCloseTo(position.y, 5);
      expect(newTransform.rotation).toBeCloseTo(rotation, 5);
      expect(newTransform.scale.x).toBeCloseTo(scale.x, 5);
      expect(newTransform.scale.y).toBeCloseTo(scale.y, 5);
    });
  });
});