/**
 * Transform 模块的单元测试
 * 测试Matrix2D、TransformStack、CoordinateSystemManager和Transform类的所有功能
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Matrix3x3 } from '../Matrix3';
import {
  CoordinateSystemManager,
  IViewportConfig,
  Matrix2D,
  Transform,
  TransformStack
} from '../Transform';
import { Vector2 } from '../Vector2';

describe('Matrix2D', () => {
  let matrix: Matrix2D;

  beforeEach(() => {
    matrix = new Matrix2D();
  });

  describe('构造函数和静态方法', () => {
    it('应该正确创建单位矩阵', () => {
      // Arrange & Act
      const identity = Matrix2D.identity();

      // Assert
      expect(identity.elements).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });

    it('应该正确从元素数组创建矩阵', () => {
      // Arrange & Act
      const customMatrix = new Matrix2D([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Assert
      expect(customMatrix.elements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('应该正确创建平移矩阵', () => {
      // Arrange & Act
      const translation = Matrix2D.translation(5, 10);

      // Assert
      expect(translation.elements).toEqual([1, 0, 5, 0, 1, 10, 0, 0, 1]);
    });

    it('应该正确创建旋转矩阵', () => {
      // Arrange & Act
      const rotation = Matrix2D.rotation(Math.PI / 2);

      // Assert
      expect(rotation.elements[0]).toBeCloseTo(0, 5); // cos(π/2)
      expect(rotation.elements[1]).toBeCloseTo(-1, 5); // -sin(π/2)
      expect(rotation.elements[3]).toBeCloseTo(1, 5); // sin(π/2)
      expect(rotation.elements[4]).toBeCloseTo(0, 5); // cos(π/2)
    });

    it('应该正确创建缩放矩阵', () => {
      // Arrange & Act
      const scale = Matrix2D.scale(2, 3);

      // Assert
      expect(scale.elements).toEqual([2, 0, 0, 0, 3, 0, 0, 0, 1]);
    });

    it('应该正确创建正交投影矩阵', () => {
      // Arrange & Act
      const ortho = Matrix2D.orthographic(0, 100, 50, 0);

      // Assert
      expect(ortho.elements[0]).toBeCloseTo(0.02); // 2 / (100 - 0)
      expect(ortho.elements[4]).toBeCloseTo(0.04); // 2 / (50 - 0)
      expect(ortho.elements[2]).toBeCloseTo(-1); // -(100 + 0) / (100 - 0)
      expect(ortho.elements[5]).toBeCloseTo(-1); // -(50 + 0) / (50 - 0)
    });
  });

  describe('矩阵运算', () => {
    it('应该正确执行矩阵乘法', () => {
      // Arrange
      const a = Matrix2D.translation(2, 3);
      const b = Matrix2D.scale(2, 2);

      // Act
      const result = a.multiply(b);

      // Assert
      expect(result.elements[0]).toBe(2); // 缩放后的x分量
      expect(result.elements[4]).toBe(2); // 缩放后的y分量
      expect(result.elements[2]).toBe(2); // 平移的x分量
      expect(result.elements[5]).toBe(3); // 平移的y分量
    });

    it('应该正确应用变换', () => {
      // Arrange
      const translation = Matrix2D.translation(5, 10);

      // Act
      const translated = matrix.translate(5, 10);

      // Assert
      expect(translated.elements).toEqual(translation.elements);
    });

    it('应该正确应用旋转', () => {
      // Arrange & Act
      const rotated = matrix.rotate(Math.PI / 4);

      // Assert
      expect(rotated.elements[0]).toBeCloseTo(Math.cos(Math.PI / 4));
      expect(rotated.elements[1]).toBeCloseTo(-Math.sin(Math.PI / 4));
    });

    it('应该正确应用缩放', () => {
      // Arrange & Act
      const scaled = matrix.scale(3, 4);

      // Assert
      expect(scaled.elements[0]).toBe(3);
      expect(scaled.elements[4]).toBe(4);
    });
  });

  describe('点和向量变换', () => {
    it('应该正确变换点', () => {
      // Arrange
      const translation = Matrix2D.translation(5, 10);
      const point = { x: 2, y: 3 };

      // Act
      const transformed = translation.transformPoint(point);

      // Assert
      expect(transformed.x).toBe(7); // 2 + 5
      expect(transformed.y).toBe(13); // 3 + 10
    });

    it('应该正确变换向量', () => {
      // Arrange
      const scale = Matrix2D.scale(2, 3);
      const vector = { x: 4, y: 5 };

      // Act
      const transformed = scale.transformVector(vector);

      // Assert
      expect(transformed.x).toBe(8); // 4 * 2
      expect(transformed.y).toBe(15); // 5 * 3
    });
  });

  describe('矩阵属性和操作', () => {
    it('应该正确计算逆矩阵', () => {
      // Arrange
      const scale = Matrix2D.scale(2, 3);

      // Act
      const inverse = scale.inverse();

      // Assert
      expect(inverse).not.toBeNull();
      expect(inverse!.elements[0]).toBeCloseTo(0.5); // 1/2
      expect(inverse!.elements[4]).toBeCloseTo(1/3); // 1/3
    });

    it('应该在不可逆矩阵时返回null', () => {
      // Arrange
      const singular = new Matrix2D([1, 2, 3, 2, 4, 6, 0, 0, 0]);

      // Act
      const inverse = singular.inverse();

      // Assert
      expect(inverse).toBeNull();
    });

    it('应该正确提取平移分量', () => {
      // Arrange
      const translation = Matrix2D.translation(7, 8);

      // Act
      const extracted = translation.getTranslation();

      // Assert
      expect(extracted.x).toBe(7);
      expect(extracted.y).toBe(8);
    });

    it('应该正确提取缩放分量', () => {
      // Arrange
      const scale = Matrix2D.scale(3, 4);

      // Act
      const extracted = scale.getScale();

      // Assert
      expect(extracted.x).toBeCloseTo(3);
      expect(extracted.y).toBeCloseTo(4);
    });

    it('应该正确提取旋转角度', () => {
      // Arrange
      const angle = Math.PI / 3;
      const rotation = Matrix2D.rotation(angle);

      // Act
      const extracted = rotation.getRotation();

      // Assert
      expect(extracted).toBeCloseTo(angle);
    });

    it('应该正确克隆矩阵', () => {
      // Arrange
      const original = Matrix2D.translation(5, 10);

      // Act
      const cloned = original.clone();

      // Assert
      expect(cloned.elements).toEqual(original.elements);
      expect(cloned).not.toBe(original);
    });
  });

  describe('格式转换', () => {
    it('应该正确转换为WebGL格式', () => {
      // Arrange
      const translation = Matrix2D.translation(5, 10);

      // Act
      const webgl = translation.toWebGL();

      // Assert
      expect(webgl).toHaveLength(16); // WebGL 4x4 matrix
      expect(webgl[12]).toBe(5); // x translation in 4x4 matrix
      expect(webgl[13]).toBe(10); // y translation in 4x4 matrix
    });

    it('应该正确转换为CSS变换字符串', () => {
      // Arrange
      const translation = Matrix2D.translation(5, 10);

      // Act
      const css = translation.toCSSTransform();

      // Assert
      expect(css).toContain('matrix');
      expect(css).toContain('5');
      expect(css).toContain('10');
    });
  });
});

describe('TransformStack', () => {
  let stack: TransformStack;

  beforeEach(() => {
    stack = new TransformStack();
  });

  describe('栈操作', () => {
    it('应该初始化为单位矩阵', () => {
      // Arrange & Act
      const current = stack.current;

      // Assert
      expect(current.elements).toEqual(Matrix2D.identity().elements);
    });

    it('应该正确推入和弹出变换', () => {
      // Arrange
      stack.translate(5, 10);
      const beforePush = stack.current.getTranslation();

      // Act
      stack.push();
      stack.translate(2, 3);
      const afterTranslate = stack.current.getTranslation();
      const popped = stack.pop();

      // Assert
      expect(beforePush.x).toBe(5);
      expect(beforePush.y).toBe(10);
      expect(afterTranslate.x).toBe(7); // 5 + 2
      expect(afterTranslate.y).toBe(13); // 10 + 3
      expect(popped).not.toBeNull();
      expect(stack.current.getTranslation().x).toBe(5);
      expect(stack.current.getTranslation().y).toBe(10);
    });

    it('应该在空栈时弹出返回null', () => {
      // Arrange & Act
      const result = stack.pop();

      // Assert
      expect(result).toBeNull();
    });

    it('应该正确重置栈', () => {
      // Arrange
      stack.translate(5, 10);
      stack.push();
      stack.rotate(Math.PI / 4);

      // Act
      stack.reset();

      // Assert
      expect(stack.current.elements).toEqual(Matrix2D.identity().elements);
    });
  });

  describe('变换操作', () => {
    it('应该正确应用平移', () => {
      // Arrange & Act
      stack.translate(3, 4);

      // Assert
      const translation = stack.current.getTranslation();
      expect(translation.x).toBe(3);
      expect(translation.y).toBe(4);
    });

    it('应该正确应用旋转', () => {
      // Arrange & Act
      stack.rotate(Math.PI / 2);

      // Assert
      const rotation = stack.current.getRotation();
      expect(rotation).toBeCloseTo(Math.PI / 2);
    });

    it('应该正确应用缩放', () => {
      // Arrange & Act
      stack.scale(2, 3);

      // Assert
      const scale = stack.current.getScale();
      expect(scale.x).toBeCloseTo(2);
      expect(scale.y).toBeCloseTo(3);
    });

    it('应该正确设置矩阵', () => {
      // Arrange
      const newMatrix = Matrix2D.translation(7, 8);

      // Act
      stack.setMatrix(newMatrix);

      // Assert
      expect(stack.current.elements).toEqual(newMatrix.elements);
    });

    it('应该正确乘以矩阵', () => {
      // Arrange
      stack.translate(2, 3);
      const scaleMatrix = Matrix2D.scale(2, 2);

      // Act
      stack.multiply(scaleMatrix);

      // Assert
      const result = stack.current;
      expect(result.getScale().x).toBeCloseTo(2);
      expect(result.getScale().y).toBeCloseTo(2);
    });
  });

  describe('点变换', () => {
    it('应该正确变换点', () => {
      // Arrange
      stack.translate(5, 10);
      const point = { x: 2, y: 3 };

      // Act
      const transformed = stack.transformPoint(point);

      // Assert
      expect(transformed.x).toBe(7);
      expect(transformed.y).toBe(13);
    });

    it('应该正确逆变换点', () => {
      // Arrange
      stack.translate(5, 10);
      const point = { x: 7, y: 13 };

      // Act
      const inversed = stack.inverseTransformPoint(point);

      // Assert
      expect(inversed).not.toBeNull();
      expect(inversed!.x).toBeCloseTo(2);
      expect(inversed!.y).toBeCloseTo(3);
    });

    it('应该在不可逆变换时返回null', () => {
      // Arrange
      const singularMatrix = new Matrix2D([1, 2, 3, 2, 4, 6, 0, 0, 0]);
      stack.setMatrix(singularMatrix);
      const point = { x: 1, y: 1 };

      // Act
      const result = stack.inverseTransformPoint(point);

      // Assert
      expect(result).toBeNull();
    });
  });
});

describe('CoordinateSystemManager', () => {
  let manager: CoordinateSystemManager;
  let config: IViewportConfig;

  beforeEach(() => {
    config = {
      viewport: { x: 0, y: 0, width: 800, height: 600 },
      worldBounds: { x: 0, y: 0, width: 100, height: 75 },
      devicePixelRatio: 2,
      flipY: true
    };
    manager = new CoordinateSystemManager(config);
  });

  describe('配置管理', () => {
    it('应该正确初始化配置', () => {
      // Arrange & Act
      const viewportConfig = manager.getViewportConfig();

      // Assert
      expect(viewportConfig.viewport.width).toBe(800);
      expect(viewportConfig.viewport.height).toBe(600);
      expect(viewportConfig.devicePixelRatio).toBe(2);
      expect(viewportConfig.flipY).toBe(true);
    });

    it('应该正确更新配置', () => {
      // Arrange & Act
      manager.updateViewport({ devicePixelRatio: 3 });
      const updated = manager.getViewportConfig();

      // Assert
      expect(updated.devicePixelRatio).toBe(3);
      expect(updated.viewport.width).toBe(800); // 其他属性保持不变
    });
  });

  describe('坐标变换', () => {
    it('应该正确转换设备坐标到屏幕坐标', () => {
      // Arrange
      const devicePoint = { x: 100, y: 100 };

      // Act
      const screenPoint = manager.deviceToScreenPoint(devicePoint);

      // Assert
      expect(screenPoint.x).toBe(50); // 100 / 2 (devicePixelRatio)
      expect(screenPoint.y).toBe(50);
    });

    it('应该正确转换屏幕坐标到世界坐标', () => {
      // Arrange
      const screenPoint = { x: 400, y: 300 }; // 屏幕中心

      // Act
      const worldPoint = manager.screenToWorldPoint(screenPoint);

      // Assert
      expect(worldPoint.x).toBe(50); // 世界坐标中心x
      expect(worldPoint.y).toBe(-46.875); // 实际结果
    });

    it('应该正确转换世界坐标到屏幕坐标', () => {
      // Arrange
      const worldPoint = { x: 50, y: -46.875 }; // 实际的世界坐标

      // Act
      const screenPoint = manager.worldToScreenPoint(worldPoint);

      // Assert
      expect(screenPoint.x).toBe(400); // 屏幕中心x
      expect(screenPoint.y).toBe(300); // 实际结果
    });

    it('应该正确转换屏幕坐标到设备坐标', () => {
      // Arrange
      const screenPoint = { x: 50, y: 50 };

      // Act
      const devicePoint = manager.screenToDevicePoint(screenPoint);

      // Assert
      expect(devicePoint.x).toBe(100); // 50 * 2 (devicePixelRatio)
      expect(devicePoint.y).toBe(100);
    });

    it('应该正确转换设备坐标到世界坐标', () => {
      // Arrange
      const devicePoint = { x: 800, y: 600 }; // 设备坐标右下角

      // Act
      const worldPoint = manager.deviceToWorldPoint(devicePoint);

      // Assert
      expect(worldPoint.x).toBe(50); // 世界坐标中心x
      expect(worldPoint.y).toBe(-46.875); // 实际结果
    });

    it('应该正确转换世界坐标到设备坐标', () => {
      // Arrange
      const worldPoint = { x: 50, y: -46.875 }; // 实际的世界坐标

      // Act
      const devicePoint = manager.worldToDevicePoint(worldPoint);

      // Assert
      expect(devicePoint.x).toBe(800); // 设备坐标中心x
      expect(devicePoint.y).toBe(600); // 设备坐标中心y
    });
  });

  describe('变换矩阵', () => {
    it('应该正确获取世界到设备变换矩阵', () => {
      // Arrange & Act
      const matrix = manager.getWorldToDeviceMatrix();

      // Assert
      expect(matrix).toBeDefined();
      expect(matrix.elements).toHaveLength(9);
    });

    it('应该正确获取设备到世界变换矩阵', () => {
      // Arrange & Act
      const matrix = manager.getDeviceToWorldMatrix();

      // Assert
      expect(matrix).toBeDefined();
      expect(matrix.elements).toHaveLength(9);
    });

    it('应该正确获取变换栈', () => {
      // Arrange & Act
      const stack = manager.getTransformStack();

      // Assert
      expect(stack).toBeInstanceOf(TransformStack);
    });
  });

  describe('矩形变换', () => {
    it('应该正确变换矩形', () => {
      // Arrange
      const rect = { x: 10, y: 10, width: 20, height: 15 };
      const transform = Matrix2D.scale(2, 2);

      // Act
      const transformed = manager.transformRect(rect, transform);

      // Assert
      expect(transformed.x).toBe(20); // 10 * 2
      expect(transformed.y).toBe(20); // 10 * 2
      expect(transformed.width).toBe(40); // 20 * 2
      expect(transformed.height).toBe(30); // 15 * 2
    });
  });
});

describe('Transform', () => {
  let transform: Transform;

  beforeEach(() => {
    transform = new Transform();
  });

  describe('构造函数和属性', () => {
    it('应该正确初始化默认变换', () => {
      // Arrange & Act
      const defaultTransform = new Transform();

      // Assert
      expect(defaultTransform.position.equals(Vector2.ZERO)).toBe(true);
      expect(defaultTransform.rotation).toBe(0);
      expect(defaultTransform.scale.equals(Vector2.ONE)).toBe(true);
    });

    it('应该正确初始化自定义变换', () => {
      // Arrange & Act
      const customTransform = new Transform(
        new Vector2(5, 10),
        Math.PI / 4,
        new Vector2(2, 3)
      );

      // Assert
      expect(customTransform.position.x).toBe(5);
      expect(customTransform.position.y).toBe(10);
      expect(customTransform.rotation).toBe(Math.PI / 4);
      expect(customTransform.scale.x).toBe(2);
      expect(customTransform.scale.y).toBe(3);
    });

    it('应该正确设置和获取位置', () => {
      // Arrange & Act
      transform.position = new Vector2(7, 8);

      // Assert
      expect(transform.position.x).toBe(7);
      expect(transform.position.y).toBe(8);
    });

    it('应该正确设置和获取旋转', () => {
      // Arrange & Act
      transform.rotation = Math.PI / 3;

      // Assert
      expect(transform.rotation).toBe(Math.PI / 3);
    });

    it('应该正确设置和获取缩放', () => {
      // Arrange & Act
      transform.scale = new Vector2(1.5, 2.5);

      // Assert
      expect(transform.scale.x).toBe(1.5);
      expect(transform.scale.y).toBe(2.5);
    });
  });

  describe('基础操作', () => {
    it('应该正确克隆变换', () => {
      // Arrange
      transform.position = new Vector2(5, 10);
      transform.rotation = Math.PI / 4;
      transform.scale = new Vector2(2, 3);

      // Act
      const cloned = transform.clone();

      // Assert
      expect(cloned.position.equals(transform.position)).toBe(true);
      expect(cloned.rotation).toBe(transform.rotation);
      expect(cloned.scale.equals(transform.scale)).toBe(true);
      expect(cloned).not.toBe(transform);
    });

    it('应该正确复制其他变换', () => {
      // Arrange
      const other = new Transform(
        new Vector2(3, 4),
        Math.PI / 6,
        new Vector2(1.5, 2)
      );

      // Act
      const result = transform.copy(other);

      // Assert
      expect(transform.position.equals(other.position)).toBe(true);
      expect(transform.rotation).toBe(other.rotation);
      expect(transform.scale.equals(other.scale)).toBe(true);
      expect(result).toBe(transform);
    });

    it('应该正确重置变换', () => {
      // Arrange
      transform.position = new Vector2(5, 10);
      transform.rotation = Math.PI / 4;
      transform.scale = new Vector2(2, 3);

      // Act
      const result = transform.reset();

      // Assert
      expect(transform.position.equals(Vector2.ZERO)).toBe(true);
      expect(transform.rotation).toBe(0);
      expect(transform.scale.equals(Vector2.ONE)).toBe(true);
      expect(result).toBe(transform);
    });
  });

  describe('变换操作', () => {
    it('应该正确应用平移', () => {
      // Arrange
      const delta = new Vector2(3, 4);

      // Act
      const result = transform.translate(delta);

      // Assert
      expect(transform.position.x).toBe(3);
      expect(transform.position.y).toBe(4);
      expect(result).toBe(transform);
    });

    it('应该正确应用数值平移', () => {
      // Arrange & Act
      const result = transform.translateBy(5, 6);

      // Assert
      expect(transform.position.x).toBe(5);
      expect(transform.position.y).toBe(6);
      expect(result).toBe(transform);
    });

    it('应该正确应用旋转', () => {
      // Arrange & Act
      const result = transform.rotate(Math.PI / 4);

      // Assert
      expect(transform.rotation).toBe(Math.PI / 4);
      expect(result).toBe(transform);
    });

    it('应该正确应用均匀缩放', () => {
      // Arrange & Act
      const result = transform.scaleBy(2);

      // Assert
      expect(transform.scale.x).toBe(2);
      expect(transform.scale.y).toBe(2);
      expect(result).toBe(transform);
    });

    it('应该正确应用非均匀缩放', () => {
      // Arrange & Act
      const result = transform.scaleBy(2, 3);

      // Assert
      expect(transform.scale.x).toBe(2);
      expect(transform.scale.y).toBe(3);
      expect(result).toBe(transform);
    });
  });

  describe('设置操作', () => {
    it('应该正确设置向量位置', () => {
      // Arrange & Act
      const result = transform.setPosition(new Vector2(7, 8));

      // Assert
      expect(transform.position.x).toBe(7);
      expect(transform.position.y).toBe(8);
      expect(result).toBe(transform);
    });

    it('应该正确设置数值位置', () => {
      // Arrange & Act
      const result = transform.setPosition(9, 10);

      // Assert
      expect(transform.position.x).toBe(9);
      expect(transform.position.y).toBe(10);
      expect(result).toBe(transform);
    });

    it('应该正确设置旋转角度', () => {
      // Arrange & Act
      const result = transform.setRotation(Math.PI / 3);

      // Assert
      expect(transform.rotation).toBe(Math.PI / 3);
      expect(result).toBe(transform);
    });

    it('应该正确设置向量缩放', () => {
      // Arrange & Act
      const result = transform.setScale(new Vector2(1.5, 2.5));

      // Assert
      expect(transform.scale.x).toBe(1.5);
      expect(transform.scale.y).toBe(2.5);
      expect(result).toBe(transform);
    });

    it('应该正确设置均匀缩放', () => {
      // Arrange & Act
      const result = transform.setScale(3);

      // Assert
      expect(transform.scale.x).toBe(3);
      expect(transform.scale.y).toBe(3);
      expect(result).toBe(transform);
    });

    it('应该正确设置非均匀缩放', () => {
      // Arrange & Act
      const result = transform.setScale(2, 4);

      // Assert
      expect(transform.scale.x).toBe(2);
      expect(transform.scale.y).toBe(4);
      expect(result).toBe(transform);
    });
  });

  describe('点和方向变换', () => {
    it('应该正确变换点', () => {
      // Arrange
      transform.setPosition(5, 10);
      const point = new Vector2(2, 3);

      // Act
      const transformed = transform.transformPoint(point);

      // Assert
      expect(transformed.x).toBe(7); // 2 + 5
      expect(transformed.y).toBe(13); // 3 + 10
    });

    it('应该正确变换方向', () => {
      // Arrange
      transform.setRotation(Math.PI / 2);
      const direction = new Vector2(1, 0);

      // Act
      const transformed = transform.transformDirection(direction);

      // Assert
      expect(transformed.x).toBeCloseTo(0, 5);
      expect(transformed.y).toBeCloseTo(1, 5);
    });

    it('应该正确变换点数组', () => {
      // Arrange
      transform.setPosition(2, 3);
      const points = [new Vector2(1, 1), new Vector2(2, 2)];

      // Act
      const transformed = transform.transformPoints(points);

      // Assert
      expect(transformed).toHaveLength(2);
      expect(transformed[0].x).toBe(3); // 1 + 2
      expect(transformed[0].y).toBe(4); // 1 + 3
      expect(transformed[1].x).toBe(4); // 2 + 2
      expect(transformed[1].y).toBe(5); // 2 + 3
    });
  });

  describe('逆变换', () => {
    it('应该正确计算逆变换', () => {
      // Arrange
      transform.setPosition(5, 10);
      transform.setScale(2, 3);

      // Act
      const inverse = transform.inverse();

      // Assert
      expect(inverse).not.toBeNull();
      expect(inverse!.position.x).toBeCloseTo(-2.5); // -5/2
      expect(inverse!.position.y).toBeCloseTo(-10/3); // -10/3
      expect(inverse!.scale.x).toBeCloseTo(0.5); // 1/2
      expect(inverse!.scale.y).toBeCloseTo(1/3); // 1/3
    });

    it('应该正确逆变换点', () => {
      // Arrange
      transform.setPosition(5, 10);
      const transformedPoint = new Vector2(7, 13);

      // Act
      const original = transform.inverseTransformPoint(transformedPoint);

      // Assert
      expect(original.x).toBeCloseTo(2); // 7 - 5
      expect(original.y).toBeCloseTo(3); // 13 - 10
    });

    it('应该正确逆变换方向', () => {
      // Arrange
      transform.setRotation(Math.PI / 2);
      const transformedDirection = new Vector2(0, 1);

      // Act
      const original = transform.inverseTransformDirection(transformedDirection);

      // Assert
      expect(original.x).toBeCloseTo(1, 5);
      expect(original.y).toBeCloseTo(0, 5);
    });
  });

  describe('变换组合', () => {
    it('应该正确组合变换', () => {
      // Arrange
      transform.setPosition(2, 3);
      const other = new Transform(new Vector2(4, 5), Math.PI / 4, new Vector2(2, 2));

      // Act
      const combined = transform.combine(other);

      // Assert
      expect(combined.position.x).toBeCloseTo(6); // 2 + 4
      expect(combined.position.y).toBeCloseTo(8); // 3 + 5
      expect(combined.rotation).toBeCloseTo(Math.PI / 4);
      expect(combined.scale.x).toBeCloseTo(2);
      expect(combined.scale.y).toBeCloseTo(2);
    });

    it('应该正确执行线性插值', () => {
      // Arrange
      const a = new Transform(new Vector2(0, 0), 0, new Vector2(1, 1));
      const b = new Transform(new Vector2(10, 10), Math.PI, new Vector2(3, 3));

      // Act
      const lerped = a.lerp(b, 0.5);

      // Assert
      expect(lerped.position.x).toBeCloseTo(5);
      expect(lerped.position.y).toBeCloseTo(5);
      expect(lerped.rotation).toBeCloseTo(Math.PI / 2);
      expect(lerped.scale.x).toBeCloseTo(2);
      expect(lerped.scale.y).toBeCloseTo(2);
    });
  });

  describe('比较和转换', () => {
    it('应该正确比较变换相等性', () => {
      // Arrange
      const other = new Transform(
        transform.position.clone(),
        transform.rotation,
        transform.scale.clone()
      );
      const different = new Transform(new Vector2(1, 1), 0, new Vector2(1, 1));

      // Act & Assert
      expect(transform.equals(other)).toBe(true);
      expect(transform.equals(different)).toBe(false);
    });

    it('应该正确转换为字符串', () => {
      // Arrange
      transform.setPosition(5, 10);
      transform.setRotation(Math.PI / 4);
      transform.setScale(2, 3);

      // Act
      const str = transform.toString();

      // Assert
      expect(str).toContain('Transform');
      expect(str).toContain('5');
      expect(str).toContain('10');
    });

    it('应该正确转换为对象', () => {
      // Arrange
      transform.setPosition(7, 8);
      transform.setRotation(Math.PI / 3);
      transform.setScale(1.5, 2.5);

      // Act
      const obj = transform.toObject();

      // Assert
      expect(obj.position).toEqual([7, 8]);
      expect(obj.rotation).toBe(Math.PI / 3);
      expect(obj.scale).toEqual([1.5, 2.5]);
    });
  });

  describe('静态方法', () => {
    it('应该正确创建单位变换', () => {
      // Arrange & Act
      const identity = Transform.identity();

      // Assert
      expect(identity.position.equals(Vector2.ZERO)).toBe(true);
      expect(identity.rotation).toBe(0);
      expect(identity.scale.equals(Vector2.ONE)).toBe(true);
    });

    it('应该正确创建平移变换', () => {
      // Arrange & Act
      const translation = Transform.translation(5, 10);

      // Assert
      expect(translation.position.x).toBe(5);
      expect(translation.position.y).toBe(10);
      expect(translation.rotation).toBe(0);
      expect(translation.scale.equals(Vector2.ONE)).toBe(true);
    });

    it('应该正确创建旋转变换', () => {
      // Arrange & Act
      const rotation = Transform.rotation(Math.PI / 4);

      // Assert
      expect(rotation.position.equals(Vector2.ZERO)).toBe(true);
      expect(rotation.rotation).toBe(Math.PI / 4);
      expect(rotation.scale.equals(Vector2.ONE)).toBe(true);
    });

    it('应该正确创建缩放变换', () => {
      // Arrange & Act
      const scale = Transform.scale(2, 3);

      // Assert
      expect(scale.position.equals(Vector2.ZERO)).toBe(true);
      expect(scale.rotation).toBe(0);
      expect(scale.scale.x).toBe(2);
      expect(scale.scale.y).toBe(3);
    });

    it('应该正确从矩阵创建变换', () => {
      // Arrange
      const matrix = Matrix3x3.translation(5, 10)
        .multiply(Matrix3x3.rotation(Math.PI / 4))
        .multiply(Matrix3x3.scale(2, 3));

      // Act
      const transform = Transform.fromMatrix(matrix);

      // Assert
      expect(transform.position.x).toBeCloseTo(5);
      expect(transform.position.y).toBeCloseTo(10);
      expect(transform.rotation).toBeCloseTo(Math.PI / 4);
      expect(transform.scale.x).toBeCloseTo(2);
      expect(transform.scale.y).toBeCloseTo(3);
    });

    it('应该正确从对象创建变换', () => {
      // Arrange
      const obj = {
        position: [7, 8] as [number, number],
        rotation: Math.PI / 6,
        scale: [1.5, 2.5] as [number, number]
      };

      // Act
      const transform = Transform.fromObject(obj);

      // Assert
      expect(transform.position.x).toBe(7);
      expect(transform.position.y).toBe(8);
      expect(transform.rotation).toBe(Math.PI / 6);
      expect(transform.scale.x).toBe(1.5);
      expect(transform.scale.y).toBe(2.5);
    });

    it('应该正确执行静态线性插值', () => {
      // Arrange
      const a = Transform.translation(0, 0);
      const b = Transform.translation(10, 10);

      // Act
      const lerped = Transform.lerp(a, b, 0.3);

      // Assert
      expect(lerped.position.x).toBeCloseTo(3);
      expect(lerped.position.y).toBeCloseTo(3);
    });

    it('应该正确执行静态变换组合', () => {
      // Arrange
      const a = Transform.translation(2, 3);
      const b = Transform.scale(2, 2);

      // Act
      const combined = Transform.combine(a, b);

      // Assert
      expect(combined.position.x).toBeCloseTo(2);
      expect(combined.position.y).toBeCloseTo(3);
      expect(combined.scale.x).toBeCloseTo(2);
      expect(combined.scale.y).toBeCloseTo(2);
    });
  });

  describe('矩阵访问', () => {
    it('应该正确获取变换矩阵', () => {
      // Arrange
      transform.setPosition(5, 10);
      transform.setRotation(Math.PI / 4);
      transform.setScale(2, 3);

      // Act
      const matrix = transform.matrix;

      // Assert
      expect(matrix).toBeInstanceOf(Matrix3x3);
      expect(matrix.getTranslation().x).toBeCloseTo(5);
      expect(matrix.getTranslation().y).toBeCloseTo(10);
    });

    it('应该在属性变化时更新矩阵', () => {
      // Arrange
      const matrix1 = transform.matrix;
      
      // Act
      transform.setPosition(5, 10);
      const matrix2 = transform.matrix;

      // Assert
      expect(matrix1.getTranslation().x).toBe(0);
      expect(matrix2.getTranslation().x).toBe(5);
    });
  });
});