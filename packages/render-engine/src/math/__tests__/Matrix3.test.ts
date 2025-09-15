/**
 * Matrix3x3 类的单元测试
 * 测试3x3矩阵的所有数学运算和变换功能
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Matrix3, Matrix3x3 } from '../Matrix3';
import { Vector2 } from '../Vector2';

describe('Matrix3x3', () => {
  let matrix: Matrix3x3;
  let identityMatrix: Matrix3x3;
  let otherMatrix: Matrix3x3;

  beforeEach(() => {
    matrix = new Matrix3x3(
      1, 2, 3,
      4, 5, 6,
      7, 8, 9
    );
    identityMatrix = new Matrix3x3();
    otherMatrix = new Matrix3x3(
      2, 0, 1,
      0, 2, 0,
      1, 0, 2
    );
  });

  describe('构造函数和静态常量', () => {
    it('应该正确创建默认单位矩阵', () => {
      // Arrange & Act
      const defaultMatrix = new Matrix3x3();

      // Assert
      expect(defaultMatrix.elements).toEqual(new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]));
    });

    it('应该正确创建指定元素的矩阵', () => {
      // Arrange & Act
      const customMatrix = new Matrix3x3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );

      // Assert
      expect(customMatrix.elements).toEqual(new Float32Array([
        1, 4, 7,
        2, 5, 8,
        3, 6, 9
      ]));
    });

    it('应该正确从数组创建矩阵', () => {
      // Arrange & Act
      const arrayMatrix = new Matrix3x3([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Assert
      expect(arrayMatrix.elements).toEqual(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it('应该在数组长度不正确时抛出错误', () => {
      // Arrange & Act & Assert
      expect(() => new Matrix3x3([1, 2, 3])).toThrow('Array must have 9 elements');
    });

    it('应该提供正确的静态常量', () => {
      // Arrange & Act & Assert
      expect(Matrix3x3.IDENTITY.elements).toEqual(new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]));
      expect(Matrix3x3.ZERO.elements).toEqual(new Float32Array([
        0, 0, 0,
        0, 0, 0,
        0, 0, 0
      ]));
    });
  });

  describe('基础操作', () => {
    it('应该正确克隆矩阵', () => {
      // Arrange & Act
      const cloned = matrix.clone();

      // Assert
      expect(cloned.elements).toEqual(matrix.elements);
      expect(cloned).not.toBe(matrix); // 确保是新实例
      expect(cloned.elements).not.toBe(matrix.elements); // 确保是新数组
    });

    it('应该正确复制其他矩阵', () => {
      // Arrange & Act
      const result = matrix.copy(otherMatrix);

      // Assert
      expect(matrix.elements).toEqual(otherMatrix.elements);
      expect(result).toBe(matrix); // 返回自身
    });

    it('应该正确设置矩阵元素', () => {
      // Arrange & Act
      const result = matrix.set(
        9, 8, 7,
        6, 5, 4,
        3, 2, 1
      );

      // Assert
      expect(matrix.elements).toEqual(new Float32Array([
        9, 6, 3,
        8, 5, 2,
        7, 4, 1
      ]));
      expect(result).toBe(matrix); // 返回自身
    });

    it('应该正确重置为单位矩阵', () => {
      // Arrange & Act
      const result = matrix.identity();

      // Assert
      expect(matrix.elements).toEqual(Matrix3x3.IDENTITY.elements);
      expect(result).toBe(matrix); // 返回自身
    });
  });

  describe('矩阵运算', () => {
    it('应该正确执行矩阵乘法', () => {
      // Arrange
      const a = new Matrix3x3(
        1, 0, 0,
        0, 1, 0,
        2, 3, 1
      );
      const b = new Matrix3x3(
        1, 0, 0,
        0, 1, 0,
        4, 5, 1
      );

      // Act
      const result = a.multiply(b);

      // Assert
      expect(result.elements[6]).toBeCloseTo(6); // 2 + 4
      expect(result.elements[7]).toBeCloseTo(8); // 3 + 5
      expect(result).not.toBe(a); // 返回新实例
    });

    it('应该正确执行就地矩阵乘法', () => {
      // Arrange
      const original = identityMatrix.clone();

      // Act
      const result = identityMatrix.multiplyInPlace(otherMatrix);

      // Assert
      expect(identityMatrix.elements).toEqual(otherMatrix.elements);
      expect(result).toBe(identityMatrix); // 返回自身
    });

    it('应该正确执行标量乘法', () => {
      // Arrange & Act
      const result = matrix.multiplyScalar(2);

      // Assert
      for (let i = 0; i < 9; i++) {
        expect(result.elements[i]).toBe(matrix.elements[i] * 2);
      }
      expect(result).not.toBe(matrix); // 返回新实例
    });

    it('应该正确执行就地标量乘法', () => {
      // Arrange
      const original = matrix.clone();

      // Act
      const result = matrix.multiplyScalarInPlace(3);

      // Assert
      for (let i = 0; i < 9; i++) {
        expect(matrix.elements[i]).toBe(original.elements[i] * 3);
      }
      expect(result).toBe(matrix); // 返回自身
    });

    it('应该正确执行矩阵加法', () => {
      // Arrange & Act
      const result = matrix.add(otherMatrix);

      // Assert
      for (let i = 0; i < 9; i++) {
        expect(result.elements[i]).toBe(matrix.elements[i] + otherMatrix.elements[i]);
      }
      expect(result).not.toBe(matrix); // 返回新实例
    });

    it('应该正确执行就地矩阵加法', () => {
      // Arrange
      const original = matrix.clone();

      // Act
      const result = matrix.addInPlace(otherMatrix);

      // Assert
      for (let i = 0; i < 9; i++) {
        expect(matrix.elements[i]).toBe(original.elements[i] + otherMatrix.elements[i]);
      }
      expect(result).toBe(matrix); // 返回自身
    });
  });

  describe('矩阵属性计算', () => {
    it('应该正确计算行列式', () => {
      // Arrange
      const testMatrix = new Matrix3x3(
        1, 2, 3,
        0, 1, 4,
        5, 6, 0
      );

      // Act
      const det = testMatrix.determinant();

      // Assert
      expect(det).toBe(1); // 1*(1*0-4*6) - 2*(0*0-4*5) + 3*(0*6-1*5) = 0 + 40 - 15 = 25
    });

    it('应该正确计算转置矩阵', () => {
      // Arrange & Act
      const transposed = matrix.transpose();

      // Assert
      expect(transposed.elements).toEqual(new Float32Array([
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      ]));
      expect(transposed).not.toBe(matrix); // 返回新实例
    });

    it('应该正确就地转置矩阵', () => {
      // Arrange
      const original = matrix.clone();

      // Act
      const result = matrix.transposeInPlace();

      // Assert
      expect(matrix.get(0, 1)).toBe(original.get(1, 0));
      expect(matrix.get(1, 0)).toBe(original.get(0, 1));
      expect(result).toBe(matrix); // 返回自身
    });

    it('应该正确计算逆矩阵', () => {
      // Arrange
      const invertibleMatrix = new Matrix3x3(
        1, 0, 0,
        0, 2, 0,
        0, 0, 3
      );

      // Act
      const inverse = invertibleMatrix.inverse();

      // Assert
      expect(inverse).not.toBeNull();
      expect(inverse!.get(0, 0)).toBeCloseTo(1);
      expect(inverse!.get(1, 1)).toBeCloseTo(0.5);
      expect(inverse!.get(2, 2)).toBeCloseTo(1/3);
    });

    it('应该在不可逆矩阵时返回null', () => {
      // Arrange
      const singularMatrix = new Matrix3x3(
        1, 2, 3,
        2, 4, 6,
        3, 6, 9
      );

      // Act
      const inverse = singularMatrix.inverse();

      // Assert
      expect(inverse).toBeNull();
    });
  });

  describe('向量变换', () => {
    it('应该正确变换向量', () => {
      // Arrange
      const vector = new Vector2(1, 1);
      const transformMatrix = new Matrix3x3(
        2, 0, 1,
        0, 2, 1,
        0, 0, 1
      );

      // Act
      const transformed = transformMatrix.transformVector(vector);

      // Assert
      expect(transformed.x).toBeCloseTo(3); // 2*1 + 0*1 + 1*1
      expect(transformed.y).toBeCloseTo(3); // 0*1 + 2*1 + 1*1
    });

    it('应该正确变换方向向量', () => {
      // Arrange
      const direction = new Vector2(1, 0);
      const rotationMatrix = Matrix3x3.rotation(Math.PI / 2);

      // Act
      const transformed = rotationMatrix.transformDirection(direction);

      // Assert
      expect(transformed.x).toBeCloseTo(0, 5);
      expect(transformed.y).toBeCloseTo(1, 5);
    });

    it('应该正确变换点', () => {
      // Arrange
      const point = new Vector2(1, 1);
      const translationMatrix = Matrix3x3.translation(2, 3);

      // Act
      const transformed = translationMatrix.transformPoint(point);

      // Assert
      expect(transformed.x).toBeCloseTo(3); // 1 + 2
      expect(transformed.y).toBeCloseTo(4); // 1 + 3
    });
  });

  describe('静态变换矩阵创建', () => {
    it('应该正确创建平移矩阵', () => {
      // Arrange & Act
      const translation = Matrix3x3.translation(5, 10);

      // Assert
      expect(translation.get(0, 2)).toBe(5);
      expect(translation.get(1, 2)).toBe(10);
      expect(translation.get(2, 2)).toBe(1);
    });

    it('应该正确创建旋转矩阵', () => {
      // Arrange & Act
      const rotation = Matrix3x3.rotation(Math.PI / 2);

      // Assert
      expect(rotation.get(0, 0)).toBeCloseTo(0, 5);
      expect(rotation.get(0, 1)).toBeCloseTo(-1, 5);
      expect(rotation.get(1, 0)).toBeCloseTo(1, 5);
      expect(rotation.get(1, 1)).toBeCloseTo(0, 5);
    });

    it('应该正确创建缩放矩阵', () => {
      // Arrange & Act
      const scale = Matrix3x3.scale(2, 3);

      // Assert
      expect(scale.get(0, 0)).toBe(2);
      expect(scale.get(1, 1)).toBe(3);
      expect(scale.get(2, 2)).toBe(1);
    });

    it('应该正确创建均匀缩放矩阵', () => {
      // Arrange & Act
      const uniformScale = Matrix3x3.scale(2);

      // Assert
      expect(uniformScale.get(0, 0)).toBe(2);
      expect(uniformScale.get(1, 1)).toBe(2);
    });

    it('应该正确创建剪切矩阵', () => {
      // Arrange & Act
      const shear = Matrix3x3.shear(0.5, 0.3);

      // Assert
      expect(shear.get(0, 1)).toBe(0.5);
      expect(shear.get(1, 0)).toBe(0.3);
    });
  });

  describe('变换操作', () => {
    it('应该正确应用平移变换', () => {
      // Arrange & Act
      const translated = identityMatrix.translate(3, 4);

      // Assert
      expect(translated.get(0, 2)).toBe(3);
      expect(translated.get(1, 2)).toBe(4);
      expect(translated).not.toBe(identityMatrix); // 返回新实例
    });

    it('应该正确就地应用平移变换', () => {
      // Arrange & Act
      const result = identityMatrix.translateInPlace(3, 4);

      // Assert
      expect(identityMatrix.get(0, 2)).toBe(3);
      expect(identityMatrix.get(1, 2)).toBe(4);
      expect(result).toBe(identityMatrix); // 返回自身
    });

    it('应该正确应用旋转变换', () => {
      // Arrange & Act
      const rotated = identityMatrix.rotate(Math.PI / 4);

      // Assert
      expect(rotated.get(0, 0)).toBeCloseTo(Math.cos(Math.PI / 4));
      expect(rotated.get(0, 1)).toBeCloseTo(-Math.sin(Math.PI / 4));
      expect(rotated).not.toBe(identityMatrix); // 返回新实例
    });

    it('应该正确应用缩放变换', () => {
      // Arrange & Act
      const scaled = identityMatrix.scale(2, 3);

      // Assert
      expect(scaled.get(0, 0)).toBe(2);
      expect(scaled.get(1, 1)).toBe(3);
      expect(scaled).not.toBe(identityMatrix); // 返回新实例
    });
  });

  describe('变换属性提取', () => {
    it('应该正确提取平移分量', () => {
      // Arrange
      const transformMatrix = Matrix3x3.translation(5, 7);

      // Act
      const translation = transformMatrix.getTranslation();

      // Assert
      expect(translation.x).toBe(5);
      expect(translation.y).toBe(7);
    });

    it('应该正确提取缩放分量', () => {
      // Arrange
      const transformMatrix = Matrix3x3.scale(3, 4);

      // Act
      const scale = transformMatrix.getScale();

      // Assert
      expect(scale.x).toBeCloseTo(3);
      expect(scale.y).toBeCloseTo(4);
    });

    it('应该正确提取旋转角度', () => {
      // Arrange
      const angle = Math.PI / 3;
      const transformMatrix = Matrix3x3.rotation(angle);

      // Act
      const extractedAngle = transformMatrix.getRotation();

      // Assert
      expect(extractedAngle).toBeCloseTo(angle);
    });
  });

  describe('矩阵比较和转换', () => {
    it('应该正确比较矩阵相等性', () => {
      // Arrange
      const sameMatrix = matrix.clone();
      const differentMatrix = otherMatrix;
      const almostSameMatrix = matrix.clone();
      almostSameMatrix.elements[0] += 1e-12;

      // Act & Assert
      expect(matrix.equals(sameMatrix)).toBe(true);
      expect(matrix.equals(differentMatrix)).toBe(false);
      expect(matrix.equals(almostSameMatrix, 1e-10)).toBe(true);
    });

    it('应该正确获取矩阵元素', () => {
      // Arrange & Act & Assert
      expect(matrix.get(0, 0)).toBe(1);
      expect(matrix.get(0, 1)).toBe(2);
      expect(matrix.get(1, 0)).toBe(4);
      expect(matrix.get(2, 2)).toBe(9);
    });

    it('应该正确转换为字符串', () => {
      // Arrange & Act
      const str = identityMatrix.toString();

      // Assert
      expect(str).toContain('Matrix3x3');
      expect(str).toContain('1');
      expect(str).toContain('0');
    });

    it('应该正确转换为数组', () => {
      // Arrange & Act
      const array = identityMatrix.toArray();

      // Assert
      expect(array).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(Array.isArray(array)).toBe(true);
    });

    it('应该正确转换为WebGL格式', () => {
      // Arrange & Act
      const webglArray = identityMatrix.toWebGL();

      // Assert
      expect(webglArray).toBeInstanceOf(Float32Array);
      expect(webglArray.length).toBe(9);
    });
  });

  describe('静态方法', () => {
    it('应该正确从数组创建矩阵', () => {
      // Arrange & Act
      const fromArray = Matrix3x3.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Assert
      expect(fromArray.elements).toEqual(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it('应该在数组长度不正确时抛出错误', () => {
      // Arrange & Act & Assert
      expect(() => Matrix3x3.fromArray([1, 2, 3])).toThrow('Array must have 9 elements');
    });

    it('应该正确执行静态矩阵乘法', () => {
      // Arrange & Act
      const result = Matrix3x3.multiply(identityMatrix, otherMatrix);

      // Assert
      expect(result.elements).toEqual(otherMatrix.elements);
    });

    it('应该正确执行矩阵线性插值', () => {
      // Arrange
      const a = Matrix3x3.IDENTITY;
      const b = Matrix3x3.scale(2);

      // Act
      const lerped = Matrix3x3.lerp(a, b, 0.5);

      // Assert
      expect(lerped.get(0, 0)).toBeCloseTo(1.5); // (1 + 2) / 2
      expect(lerped.get(1, 1)).toBeCloseTo(1.5);
    });

    it('应该正确创建静态单位矩阵', () => {
      // Arrange & Act
      const identity = Matrix3x3.identity();

      // Assert
      expect(identity.elements).toEqual(Matrix3x3.IDENTITY.elements);
    });

    it('应该正确创建正交投影矩阵', () => {
      // Arrange & Act
      const ortho = Matrix3x3.orthographic(0, 100, 0, 100);

      // Assert
      expect(ortho.get(0, 0)).toBeCloseTo(0.02); // 2 / (100 - 0)
      expect(ortho.get(1, 1)).toBeCloseTo(0.02);
      expect(ortho.get(0, 2)).toBeCloseTo(-1); // -(100 + 0) / (100 - 0)
      expect(ortho.get(1, 2)).toBeCloseTo(-1);
    });
  });

  describe('Matrix3 别名', () => {
    it('应该正确导出Matrix3别名', () => {
      // Arrange & Act
      const matrix3 = new Matrix3();

      // Assert
      expect(matrix3).toBeInstanceOf(Matrix3x3);
      expect(Matrix3).toBe(Matrix3x3);
    });
  });

  describe('边界情况', () => {
    it('应该处理极小值', () => {
      // Arrange
      const tinyMatrix = new Matrix3x3(
        1e-15, 0, 0,
        0, 1e-15, 0,
        0, 0, 1
      );

      // Act & Assert
      expect(tinyMatrix.determinant()).toBeCloseTo(1e-30);
      expect(tinyMatrix.inverse()).not.toBeNull();
    });

    it('应该处理极大值', () => {
      // Arrange
      const hugeMatrix = new Matrix3x3(
        1e15, 0, 0,
        0, 1e15, 0,
        0, 0, 1
      );

      // Act & Assert
      expect(hugeMatrix.determinant()).toBeCloseTo(1e30);
      expect(hugeMatrix.inverse()).not.toBeNull();
    });

    it('应该处理负值', () => {
      // Arrange
      const negativeMatrix = new Matrix3x3(
        -1, 0, 0,
        0, -1, 0,
        0, 0, 1
      );

      // Act & Assert
      expect(negativeMatrix.determinant()).toBe(1);
      expect(negativeMatrix.inverse()).not.toBeNull();
    });
  });
});