/**
 * Rectangle 类的单元测试
 * 测试矩形几何类型的所有功能
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Rectangle } from '../Rectangle';
import { Vector2 } from '../Vector2';

describe('Rectangle', () => {
  let rect: Rectangle;

  beforeEach(() => {
    rect = new Rectangle(10, 20, 30, 40);
  });

  describe('构造函数', () => {
    it('应该正确创建默认矩形', () => {
      // Arrange & Act
      const defaultRect = new Rectangle();

      // Assert
      expect(defaultRect.x).toBe(0);
      expect(defaultRect.y).toBe(0);
      expect(defaultRect.width).toBe(0);
      expect(defaultRect.height).toBe(0);
    });

    it('应该正确创建自定义矩形', () => {
      // Arrange & Act
      const customRect = new Rectangle(5, 10, 15, 20);

      // Assert
      expect(customRect.x).toBe(5);
      expect(customRect.y).toBe(10);
      expect(customRect.width).toBe(15);
      expect(customRect.height).toBe(20);
    });

    it('应该正确处理负值', () => {
      // Arrange & Act
      const negativeRect = new Rectangle(-5, -10, 15, 20);

      // Assert
      expect(negativeRect.x).toBe(-5);
      expect(negativeRect.y).toBe(-10);
      expect(negativeRect.width).toBe(15);
      expect(negativeRect.height).toBe(20);
    });
  });

  describe('边界属性', () => {
    it('应该正确计算左边界', () => {
      // Arrange & Act
      const left = rect.left;

      // Assert
      expect(left).toBe(10);
    });

    it('应该正确计算右边界', () => {
      // Arrange & Act
      const right = rect.right;

      // Assert
      expect(right).toBe(40); // 10 + 30
    });

    it('应该正确计算上边界', () => {
      // Arrange & Act
      const top = rect.top;

      // Assert
      expect(top).toBe(20);
    });

    it('应该正确计算下边界', () => {
      // Arrange & Act
      const bottom = rect.bottom;

      // Assert
      expect(bottom).toBe(60); // 20 + 40
    });
  });

  describe('角点属性', () => {
    it('应该正确计算中心点', () => {
      // Arrange & Act
      const center = rect.center;

      // Assert
      expect(center.x).toBe(25); // 10 + 30/2
      expect(center.y).toBe(40); // 20 + 40/2
    });

    it('应该正确计算左上角', () => {
      // Arrange & Act
      const topLeft = rect.topLeft;

      // Assert
      expect(topLeft.x).toBe(10);
      expect(topLeft.y).toBe(20);
    });

    it('应该正确计算右上角', () => {
      // Arrange & Act
      const topRight = rect.topRight;

      // Assert
      expect(topRight.x).toBe(40); // 10 + 30
      expect(topRight.y).toBe(20);
    });

    it('应该正确计算左下角', () => {
      // Arrange & Act
      const bottomLeft = rect.bottomLeft;

      // Assert
      expect(bottomLeft.x).toBe(10);
      expect(bottomLeft.y).toBe(60); // 20 + 40
    });

    it('应该正确计算右下角', () => {
      // Arrange & Act
      const bottomRight = rect.bottomRight;

      // Assert
      expect(bottomRight.x).toBe(40); // 10 + 30
      expect(bottomRight.y).toBe(60); // 20 + 40
    });
  });

  describe('包含检测', () => {
    it('应该正确检测包含的点（Vector2）', () => {
      // Arrange
      const insidePoint = new Vector2(25, 40);
      const outsidePoint = new Vector2(5, 10);
      const borderPoint = new Vector2(10, 20);

      // Act & Assert
      expect(rect.contains(insidePoint)).toBe(true);
      expect(rect.contains(outsidePoint)).toBe(false);
      expect(rect.contains(borderPoint)).toBe(true);
    });

    it('应该正确检测包含的点（坐标）', () => {
      // Arrange & Act & Assert
      expect(rect.contains(25, 40)).toBe(true);
      expect(rect.contains(5, 10)).toBe(false);
      expect(rect.contains(10, 20)).toBe(true);
      expect(rect.contains(40, 60)).toBe(true);
      expect(rect.contains(41, 61)).toBe(false);
    });

    it('应该正确处理边界情况', () => {
      // Arrange & Act & Assert
      expect(rect.contains(10, 20)).toBe(true); // 左上角
      expect(rect.contains(40, 20)).toBe(true); // 右上角
      expect(rect.contains(10, 60)).toBe(true); // 左下角
      expect(rect.contains(40, 60)).toBe(true); // 右下角
    });
  });

  describe('相交检测', () => {
    it('应该正确检测相交的矩形', () => {
      // Arrange
      const intersectingRect = new Rectangle(30, 40, 20, 30);

      // Act
      const intersects = rect.intersects(intersectingRect);

      // Assert
      expect(intersects).toBe(true);
    });

    it('应该正确检测不相交的矩形', () => {
      // Arrange
      const nonIntersectingRect = new Rectangle(50, 70, 20, 30);

      // Act
      const intersects = rect.intersects(nonIntersectingRect);

      // Assert
      expect(intersects).toBe(false);
    });

    it('应该正确检测相邻的矩形', () => {
      // Arrange
      const adjacentRect = new Rectangle(40, 20, 20, 40);

      // Act
      const intersects = rect.intersects(adjacentRect);

      // Assert
      expect(intersects).toBe(true); // 边界接触算相交
    });

    it('应该正确检测包含的矩形', () => {
      // Arrange
      const containedRect = new Rectangle(15, 25, 10, 15);

      // Act
      const intersects = rect.intersects(containedRect);

      // Assert
      expect(intersects).toBe(true);
    });
  });

  describe('并集操作', () => {
    it('应该正确计算两个矩形的并集', () => {
      // Arrange
      const otherRect = new Rectangle(30, 40, 20, 30);

      // Act
      const union = rect.union(otherRect);

      // Assert
      expect(union.x).toBe(10); // min(10, 30)
      expect(union.y).toBe(20); // min(20, 40)
      expect(union.width).toBe(40); // max(40, 50) - 10
      expect(union.height).toBe(50); // max(60, 70) - 20
    });

    it('应该正确处理不相交矩形的并集', () => {
      // Arrange
      const separateRect = new Rectangle(60, 80, 20, 30);

      // Act
      const union = rect.union(separateRect);

      // Assert
      expect(union.x).toBe(10);
      expect(union.y).toBe(20);
      expect(union.width).toBe(70); // 80 - 10
      expect(union.height).toBe(90); // 110 - 20
    });

    it('应该正确处理包含关系的并集', () => {
      // Arrange
      const containedRect = new Rectangle(15, 25, 10, 15);

      // Act
      const union = rect.union(containedRect);

      // Assert
      expect(union.x).toBe(rect.x);
      expect(union.y).toBe(rect.y);
      expect(union.width).toBe(rect.width);
      expect(union.height).toBe(rect.height);
    });
  });

  describe('交集操作', () => {
    it('应该正确计算相交矩形的交集', () => {
      // Arrange
      const intersectingRect = new Rectangle(30, 40, 20, 30);

      // Act
      const intersection = rect.intersection(intersectingRect);

      // Assert
      expect(intersection).not.toBeNull();
      expect(intersection!.x).toBe(30); // max(10, 30)
      expect(intersection!.y).toBe(40); // max(20, 40)
      expect(intersection!.width).toBe(10); // min(40, 50) - 30
      expect(intersection!.height).toBe(20); // min(60, 70) - 40
    });

    it('应该在不相交时返回null', () => {
      // Arrange
      const nonIntersectingRect = new Rectangle(50, 70, 20, 30);

      // Act
      const intersection = rect.intersection(nonIntersectingRect);

      // Assert
      expect(intersection).toBeNull();
    });

    it('应该正确处理包含关系的交集', () => {
      // Arrange
      const containedRect = new Rectangle(15, 25, 10, 15);

      // Act
      const intersection = rect.intersection(containedRect);

      // Assert
      expect(intersection).not.toBeNull();
      expect(intersection!.x).toBe(15);
      expect(intersection!.y).toBe(25);
      expect(intersection!.width).toBe(10);
      expect(intersection!.height).toBe(15);
    });

    it('应该正确处理边界接触的情况', () => {
      // Arrange
      const touchingRect = new Rectangle(40, 20, 20, 40);

      // Act
      const intersection = rect.intersection(touchingRect);

      // Assert
      expect(intersection).not.toBeNull();
      expect(intersection!.width).toBe(0);
      expect(intersection!.height).toBe(40);
    });
  });

  describe('扩展操作', () => {
    it('应该正确扩展矩形', () => {
      // Arrange & Act
      const expanded = rect.expand(5);

      // Assert
      expect(expanded.x).toBe(5); // 10 - 5
      expect(expanded.y).toBe(15); // 20 - 5
      expect(expanded.width).toBe(40); // 30 + 10
      expect(expanded.height).toBe(50); // 40 + 10
    });

    it('应该正确处理负扩展（收缩）', () => {
      // Arrange & Act
      const shrunk = rect.expand(-5);

      // Assert
      expect(shrunk.x).toBe(15); // 10 + 5
      expect(shrunk.y).toBe(25); // 20 + 5
      expect(shrunk.width).toBe(20); // 30 - 10
      expect(shrunk.height).toBe(30); // 40 - 10
    });

    it('应该正确处理过度收缩', () => {
      // Arrange & Act
      const overShrunk = rect.expand(-20);

      // Assert
      expect(overShrunk.width).toBe(0); // 不能为负
      expect(overShrunk.height).toBe(0); // 不能为负
    });
  });

  describe('缩放操作', () => {
    it('应该正确缩放矩形', () => {
      // Arrange & Act
      const scaled = rect.scale(2);

      // Assert
      expect(scaled.x).toBe(10); // 位置不变
      expect(scaled.y).toBe(20);
      expect(scaled.width).toBe(60); // 30 * 2
      expect(scaled.height).toBe(80); // 40 * 2
    });

    it('应该正确处理小数缩放', () => {
      // Arrange & Act
      const scaled = rect.scale(0.5);

      // Assert
      expect(scaled.x).toBe(10);
      expect(scaled.y).toBe(20);
      expect(scaled.width).toBe(15); // 30 * 0.5
      expect(scaled.height).toBe(20); // 40 * 0.5
    });

    it('应该正确处理负缩放', () => {
      // Arrange & Act
      const scaled = rect.scale(-1);

      // Assert
      expect(scaled.width).toBe(0); // 负值被限制为0
      expect(scaled.height).toBe(0);
    });

    it('应该正确处理零缩放', () => {
      // Arrange & Act
      const scaled = rect.scale(0);

      // Assert
      expect(scaled.width).toBe(0);
      expect(scaled.height).toBe(0);
    });
  });

  describe('平移操作', () => {
    it('应该正确平移矩形', () => {
      // Arrange
      const offset = new Vector2(5, -10);

      // Act
      const translated = rect.translate(offset);

      // Assert
      expect(translated.x).toBe(15); // 10 + 5
      expect(translated.y).toBe(10); // 20 - 10
      expect(translated.width).toBe(30); // 尺寸不变
      expect(translated.height).toBe(40);
    });

    it('应该正确处理零偏移', () => {
      // Arrange
      const offset = new Vector2(0, 0);

      // Act
      const translated = rect.translate(offset);

      // Assert
      expect(translated.x).toBe(rect.x);
      expect(translated.y).toBe(rect.y);
      expect(translated.width).toBe(rect.width);
      expect(translated.height).toBe(rect.height);
    });

    it('应该正确处理负偏移', () => {
      // Arrange
      const offset = new Vector2(-15, -25);

      // Act
      const translated = rect.translate(offset);

      // Assert
      expect(translated.x).toBe(-5); // 10 - 15
      expect(translated.y).toBe(-5); // 20 - 25
    });
  });

  describe('基础操作', () => {
    it('应该正确克隆矩形', () => {
      // Arrange & Act
      const cloned = rect.clone();

      // Assert
      expect(cloned.x).toBe(rect.x);
      expect(cloned.y).toBe(rect.y);
      expect(cloned.width).toBe(rect.width);
      expect(cloned.height).toBe(rect.height);
      expect(cloned).not.toBe(rect);
    });

    it('应该正确比较矩形相等性', () => {
      // Arrange
      const equalRect = new Rectangle(10, 20, 30, 40);
      const differentRect = new Rectangle(10, 20, 30, 41);

      // Act & Assert
      expect(rect.equals(equalRect)).toBe(true);
      expect(rect.equals(differentRect)).toBe(false);
    });

    it('应该正确检测空矩形', () => {
      // Arrange
      const emptyRect1 = new Rectangle(10, 20, 0, 40);
      const emptyRect2 = new Rectangle(10, 20, 30, 0);
      const emptyRect3 = new Rectangle(10, 20, 0, 0);
      const nonEmptyRect = new Rectangle(10, 20, 30, 40);

      // Act & Assert
      expect(emptyRect1.isEmpty()).toBe(true);
      expect(emptyRect2.isEmpty()).toBe(true);
      expect(emptyRect3.isEmpty()).toBe(true);
      expect(nonEmptyRect.isEmpty()).toBe(false);
    });
  });

  describe('几何计算', () => {
    it('应该正确计算面积', () => {
      // Arrange & Act
      const area = rect.getArea();

      // Assert
      expect(area).toBe(1200); // 30 * 40
    });

    it('应该正确计算周长', () => {
      // Arrange & Act
      const perimeter = rect.getPerimeter();

      // Assert
      expect(perimeter).toBe(140); // 2 * (30 + 40)
    });

    it('应该正确处理零尺寸的面积和周长', () => {
      // Arrange
      const zeroRect = new Rectangle(0, 0, 0, 0);

      // Act & Assert
      expect(zeroRect.getArea()).toBe(0);
      expect(zeroRect.getPerimeter()).toBe(0);
    });
  });

  describe('格式转换', () => {
    it('应该正确转换为字符串', () => {
      // Arrange & Act
      const str = rect.toString();

      // Assert
      expect(str).toContain('Rectangle');
      expect(str).toContain('10');
      expect(str).toContain('20');
      expect(str).toContain('30');
      expect(str).toContain('40');
    });

    it('应该正确转换为JSON', () => {
      // Arrange & Act
      const json = rect.toJSON();

      // Assert
      expect(json).toEqual({
        x: 10,
        y: 20,
        width: 30,
        height: 40
      });
    });
  });

  describe('静态方法', () => {
    it('应该正确从JSON创建矩形', () => {
      // Arrange
      const data = { x: 5, y: 10, width: 15, height: 20 };

      // Act
      const fromJson = Rectangle.fromJSON(data);

      // Assert
      expect(fromJson.x).toBe(5);
      expect(fromJson.y).toBe(10);
      expect(fromJson.width).toBe(15);
      expect(fromJson.height).toBe(20);
    });

    it('应该正确从两点创建矩形', () => {
      // Arrange
      const p1 = new Vector2(5, 10);
      const p2 = new Vector2(25, 30);

      // Act
      const fromPoints = Rectangle.fromPoints(p1, p2);

      // Assert
      expect(fromPoints.x).toBe(5);
      expect(fromPoints.y).toBe(10);
      expect(fromPoints.width).toBe(20); // 25 - 5
      expect(fromPoints.height).toBe(20); // 30 - 10
    });

    it('应该正确处理反向点顺序', () => {
      // Arrange
      const p1 = new Vector2(25, 30);
      const p2 = new Vector2(5, 10);

      // Act
      const fromPoints = Rectangle.fromPoints(p1, p2);

      // Assert
      expect(fromPoints.x).toBe(5); // min(25, 5)
      expect(fromPoints.y).toBe(10); // min(30, 10)
      expect(fromPoints.width).toBe(20); // |25 - 5|
      expect(fromPoints.height).toBe(20); // |30 - 10|
    });

    it('应该正确从中心点创建矩形', () => {
      // Arrange
      const center = new Vector2(20, 30);

      // Act
      const fromCenter = Rectangle.fromCenter(center, 40, 60);

      // Assert
      expect(fromCenter.x).toBe(0); // 20 - 40/2
      expect(fromCenter.y).toBe(0); // 30 - 60/2
      expect(fromCenter.width).toBe(40);
      expect(fromCenter.height).toBe(60);
      expect(fromCenter.center.x).toBeCloseTo(20);
      expect(fromCenter.center.y).toBeCloseTo(30);
    });

    it('应该正确创建零矩形', () => {
      // Arrange & Act
      const zero = Rectangle.zero();

      // Assert
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
      expect(zero.width).toBe(0);
      expect(zero.height).toBe(0);
    });

    it('应该正确创建单位矩形', () => {
      // Arrange & Act
      const unit = Rectangle.unit();

      // Assert
      expect(unit.x).toBe(0);
      expect(unit.y).toBe(0);
      expect(unit.width).toBe(1);
      expect(unit.height).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理极小矩形', () => {
      // Arrange
      const tinyRect = new Rectangle(0, 0, 0.001, 0.001);

      // Act & Assert
      expect(tinyRect.getArea()).toBeCloseTo(0.000001);
      expect(tinyRect.isEmpty()).toBe(false);
    });

    it('应该正确处理极大矩形', () => {
      // Arrange
      const hugeRect = new Rectangle(0, 0, 1e6, 1e6);

      // Act & Assert
      expect(hugeRect.getArea()).toBe(1e12);
      expect(hugeRect.getPerimeter()).toBe(4e6);
    });

    it('应该正确处理负坐标矩形', () => {
      // Arrange
      const negativeRect = new Rectangle(-100, -200, 50, 75);

      // Act & Assert
      expect(negativeRect.left).toBe(-100);
      expect(negativeRect.right).toBe(-50);
      expect(negativeRect.top).toBe(-200);
      expect(negativeRect.bottom).toBe(-125);
      expect(negativeRect.center.x).toBe(-75);
      expect(negativeRect.center.y).toBe(-162.5);
    });

    it('应该正确处理浮点数精度', () => {
      // Arrange
      const floatRect = new Rectangle(0.1, 0.2, 0.3, 0.4);

      // Act & Assert
      expect(floatRect.right).toBeCloseTo(0.4);
      expect(floatRect.bottom).toBeCloseTo(0.6);
      expect(floatRect.getArea()).toBeCloseTo(0.12);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量包含检测', () => {
      // Arrange
      const points = Array.from({ length: 1000 }, (_, i) => 
        new Vector2(Math.random() * 100, Math.random() * 100)
      );

      // Act
      const start = performance.now();
      const results = points.map(point => rect.contains(point));
      const end = performance.now();

      // Assert
      expect(results).toHaveLength(1000);
      expect(end - start).toBeLessThan(10); // 应该在10ms内完成
    });

    it('应该高效处理大量相交检测', () => {
      // Arrange
      const rectangles = Array.from({ length: 100 }, (_, i) => 
        new Rectangle(i * 5, i * 5, 20, 20)
      );

      // Act
      const start = performance.now();
      const results = rectangles.map(r => rect.intersects(r));
      const end = performance.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(end - start).toBeLessThan(5); // 应该在5ms内完成
    });
  });
});