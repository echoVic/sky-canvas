/**
 * Geometry 模块的单元测试
 * 测试几何运算库的所有功能
 */
import { describe, expect, it } from 'vitest';
import {
  GeometryType,
  GeometryUtils,
  ICircleGeometry,
  IPoint,
  IRect,
  IRectGeometry
} from '../Geometry';
import { Vector2 } from '../Vector2';

describe('GeometryType', () => {
  it('应该定义正确的几何类型枚举', () => {
    // Arrange & Act & Assert
    expect(GeometryType.POINT).toBe('point');
    expect(GeometryType.CIRCLE).toBe('circle');
    expect(GeometryType.RECT).toBe('rect');
    expect(GeometryType.POLYGON).toBe('polygon');
  });
});

describe('GeometryUtils', () => {
  describe('边界相交检测', () => {
    it('应该正确检测相交的边界', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const boundsB: IRect = { x: 5, y: 5, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.boundsIntersect(boundsA, boundsB);

      // Assert
      expect(result).toBe(true);
    });

    it('应该正确检测不相交的边界', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const boundsB: IRect = { x: 20, y: 20, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.boundsIntersect(boundsA, boundsB);

      // Assert
      expect(result).toBe(false);
    });

    it('应该正确检测边界接触的情况', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const boundsB: IRect = { x: 10, y: 0, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.boundsIntersect(boundsA, boundsB);

      // Assert
      expect(result).toBe(true); // 边界接触算相交
    });

    it('应该正确检测包含关系', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 20, height: 20 };
      const boundsB: IRect = { x: 5, y: 5, width: 5, height: 5 };

      // Act
      const result = GeometryUtils.boundsIntersect(boundsA, boundsB);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('射线投射', () => {
    it('应该正确检测射线与边界的相交', () => {
      // Arrange
      const origin: IPoint = { x: -5, y: 5 };
      const direction = new Vector2(1, 0); // 向右
      const maxDistance = 20;
      const bounds: IRect = { x: 0, y: 0, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.raycastBounds(origin, direction, maxDistance, bounds);

      // Assert
      expect(result.hit).toBe(true);
      expect(result.point.x).toBe(0);
      expect(result.point.y).toBe(5);
      expect(result.distance).toBe(5);
      expect(result.normal.x).toBe(-1);
      expect(result.normal.y).toBe(0);
    });

    it('应该正确处理射线未命中的情况', () => {
      // Arrange
      const origin: IPoint = { x: -5, y: 15 };
      const direction = new Vector2(1, 0); // 向右，但高度不对
      const maxDistance = 20;
      const bounds: IRect = { x: 0, y: 0, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.raycastBounds(origin, direction, maxDistance, bounds);

      // Assert
      expect(result.hit).toBe(false);
    });

    it('应该正确处理射线距离不足的情况', () => {
      // Arrange
      const origin: IPoint = { x: -10, y: 5 };
      const direction = new Vector2(1, 0);
      const maxDistance = 5; // 距离不足以到达边界
      const bounds: IRect = { x: 0, y: 0, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.raycastBounds(origin, direction, maxDistance, bounds);

      // Assert
      expect(result.hit).toBe(false);
    });

    it('应该正确处理从内部发射的射线', () => {
      // Arrange
      const origin: IPoint = { x: 5, y: 5 }; // 在边界内部
      const direction = new Vector2(1, 0);
      const maxDistance = 20;
      const bounds: IRect = { x: 0, y: 0, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.raycastBounds(origin, direction, maxDistance, bounds);

      // Assert
      expect(result.hit).toBe(true);
      expect(result.point.x).toBe(10);
      expect(result.point.y).toBe(5);
      expect(result.distance).toBe(5);
    });
  });

  describe('圆形碰撞检测', () => {
    it('应该正确检测相交的圆形', () => {
      // Arrange
      const circleA: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 0, y: 0 },
        radius: 5,
        bounds: { x: -5, y: -5, width: 10, height: 10 }
      };
      const circleB: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 7, y: 0 },
        radius: 5,
        bounds: { x: 2, y: -5, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.circleCircleCollision(circleA, circleB);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.distance).toBeCloseTo(7);
      expect(result.penetration).toBeCloseTo(3); // 10 - 7
      expect(result.normal.x).toBeCloseTo(1);
      expect(result.normal.y).toBeCloseTo(0);
    });

    it('应该正确检测不相交的圆形', () => {
      // Arrange
      const circleA: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 0, y: 0 },
        radius: 3,
        bounds: { x: -3, y: -3, width: 6, height: 6 }
      };
      const circleB: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 10, y: 0 },
        radius: 3,
        bounds: { x: 7, y: -3, width: 6, height: 6 }
      };

      // Act
      const result = GeometryUtils.circleCircleCollision(circleA, circleB);

      // Assert
      expect(result.hasCollision).toBe(false);
      expect(result.distance).toBeCloseTo(10);
      expect(result.penetration).toBe(0);
    });

    it('应该正确处理完全重叠的圆形', () => {
      // Arrange
      const circleA: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 0, y: 0 },
        radius: 5,
        bounds: { x: -5, y: -5, width: 10, height: 10 }
      };
      const circleB: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 0, y: 0 },
        radius: 5,
        bounds: { x: -5, y: -5, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.circleCircleCollision(circleA, circleB);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.distance).toBe(0);
      expect(result.penetration).toBe(10); // 两个半径之和
    });
  });

  describe('矩形碰撞检测', () => {
    it('应该正确检测相交的矩形', () => {
      // Arrange
      const rectA: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 5, y: 5 },
        bounds: { x: 0, y: 0, width: 10, height: 10 }
      };
      const rectB: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 10, y: 10 },
        bounds: { x: 5, y: 5, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.rectRectCollision(rectA, rectB);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
    });

    it('应该正确检测不相交的矩形', () => {
      // Arrange
      const rectA: IRectGeometry = {
        type: GeometryType.RECT,
        width: 5,
        height: 5,
        center: { x: 2.5, y: 2.5 },
        bounds: { x: 0, y: 0, width: 5, height: 5 }
      };
      const rectB: IRectGeometry = {
        type: GeometryType.RECT,
        width: 5,
        height: 5,
        center: { x: 12.5, y: 12.5 },
        bounds: { x: 10, y: 10, width: 5, height: 5 }
      };

      // Act
      const result = GeometryUtils.rectRectCollision(rectA, rectB);

      // Assert
      expect(result.hasCollision).toBe(false);
      expect(result.penetration).toBe(0);
    });

    it('应该正确处理边界接触的矩形', () => {
      // Arrange
      const rectA: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 5, y: 5 },
        bounds: { x: 0, y: 0, width: 10, height: 10 }
      };
      const rectB: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 15, y: 5 },
        bounds: { x: 10, y: 0, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.rectRectCollision(rectA, rectB);

      // Assert
      expect(result.hasCollision).toBe(true); // 边界接触算碰撞
    });
  });

  describe('圆形与矩形碰撞检测', () => {
    it('应该正确检测圆形与矩形的碰撞', () => {
      // Arrange
      const circle: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 15, y: 5 },
        radius: 8,
        bounds: { x: 7, y: -3, width: 16, height: 16 }
      };
      const rect: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 5, y: 5 },
        bounds: { x: 0, y: 0, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.circleRectCollision(circle, rect);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
    });

    it('应该正确检测圆形与矩形不碰撞的情况', () => {
      // Arrange
      const circle: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 20, y: 20 },
        radius: 3,
        bounds: { x: 17, y: 17, width: 6, height: 6 }
      };
      const rect: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 5, y: 5 },
        bounds: { x: 0, y: 0, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.circleRectCollision(circle, rect);

      // Assert
      expect(result.hasCollision).toBe(false);
      expect(result.penetration).toBe(0);
    });

    it('应该正确处理圆心在矩形内的情况', () => {
      // Arrange
      const circle: ICircleGeometry = {
        type: GeometryType.CIRCLE,
        center: { x: 5, y: 5 }, // 圆心在矩形中心
        radius: 3,
        bounds: { x: 2, y: 2, width: 6, height: 6 }
      };
      const rect: IRectGeometry = {
        type: GeometryType.RECT,
        width: 10,
        height: 10,
        center: { x: 5, y: 5 },
        bounds: { x: 0, y: 0, width: 10, height: 10 }
      };

      // Act
      const result = GeometryUtils.circleRectCollision(circle, rect);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
    });
  });

  describe('边界碰撞检测', () => {
    it('应该正确检测边界碰撞', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const boundsB: IRect = { x: 5, y: 5, width: 10, height: 10 };

      // Act
      const result = GeometryUtils.boundsCollision(boundsA, boundsB);

      // Assert
      expect(result.hasCollision).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
    });

    it('应该正确处理无碰撞的边界', () => {
      // Arrange
      const boundsA: IRect = { x: 0, y: 0, width: 5, height: 5 };
      const boundsB: IRect = { x: 10, y: 10, width: 5, height: 5 };

      // Act
      const result = GeometryUtils.boundsCollision(boundsA, boundsB);

      // Assert
      expect(result.hasCollision).toBe(false);
      expect(result.penetration).toBe(0);
    });
  });

  describe('几何形状创建', () => {
    it('应该正确创建圆形几何', () => {
      // Arrange
      const center: IPoint = { x: 10, y: 15 };
      const radius = 8;

      // Act
      const circle = GeometryUtils.createCircleGeometry(center, radius);

      // Assert
      expect(circle.type).toBe(GeometryType.CIRCLE);
      expect(circle.center.x).toBe(10);
      expect(circle.center.y).toBe(15);
      expect(circle.radius).toBe(8);
      expect(circle.bounds.x).toBe(2); // 10 - 8
      expect(circle.bounds.y).toBe(7); // 15 - 8
      expect(circle.bounds.width).toBe(16); // 8 * 2
      expect(circle.bounds.height).toBe(16);
    });

    it('应该正确创建矩形几何', () => {
      // Arrange & Act
      const rect = GeometryUtils.createRectGeometry(5, 10, 20, 30);

      // Assert
      expect(rect.type).toBe(GeometryType.RECT);
      expect(rect.bounds.x).toBe(5);
      expect(rect.bounds.y).toBe(10);
      expect(rect.width).toBe(20);
      expect(rect.height).toBe(30);
      expect(rect.center.x).toBe(15); // 5 + 20/2
      expect(rect.center.y).toBe(25); // 10 + 30/2
      expect(rect.bounds.x).toBe(5);
      expect(rect.bounds.y).toBe(10);
      expect(rect.bounds.width).toBe(20);
      expect(rect.bounds.height).toBe(30);
    });

    it('应该正确创建多边形几何', () => {
      // Arrange
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(10, 10),
        new Vector2(0, 10)
      ];

      // Act
      const polygon = GeometryUtils.createPolygonGeometry(vertices);

      // Assert
      expect(polygon.type).toBe(GeometryType.POLYGON);
      expect(polygon.vertices).toHaveLength(4);
      expect(polygon.center.x).toBe(5);
      expect(polygon.center.y).toBe(5);
      expect(polygon.bounds.x).toBe(0);
      expect(polygon.bounds.y).toBe(0);
      expect(polygon.bounds.width).toBe(10);
      expect(polygon.bounds.height).toBe(10);
    });

    it('应该正确处理三角形多边形', () => {
      // Arrange
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(5, 10)
      ];

      // Act
      const polygon = GeometryUtils.createPolygonGeometry(vertices);

      // Assert
      expect(polygon.type).toBe(GeometryType.POLYGON);
      expect(polygon.vertices).toHaveLength(3);
      expect(polygon.center.x).toBeCloseTo(5);
      // 当前实现使用边界框中心，不是几何中心
      expect(polygon.center.y).toBeCloseTo(5, 1);
    });
  });

  describe('点到线段距离计算', () => {
    it('应该正确计算点到水平线段的距离', () => {
      // Arrange
      const point = new Vector2(5, 5);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(10, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(5);
    });

    it('应该正确计算点到垂直线段的距离', () => {
      // Arrange
      const point = new Vector2(5, 5);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(0, 10);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(5);
    });

    it('应该正确计算点到斜线段的距离', () => {
      // Arrange
      const point = new Vector2(0, 0);
      const lineStart = new Vector2(1, 1);
      const lineEnd = new Vector2(3, 3);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBeCloseTo(Math.sqrt(2), 5);
    });

    it('应该正确处理点在线段端点的情况', () => {
      // Arrange
      const point = new Vector2(0, 0);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(10, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(0);
    });

    it('应该正确处理点在线段延长线上的情况', () => {
      // Arrange
      const point = new Vector2(-5, 0);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(10, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(5); // 到最近端点的距离
    });
  });

  describe('点在多边形内检测', () => {
    it('应该正确检测点在矩形多边形内', () => {
      // Arrange
      const point = new Vector2(5, 5);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(10, 10),
        new Vector2(0, 10)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(true);
    });

    it('应该正确检测点在多边形外', () => {
      // Arrange
      const point = new Vector2(15, 15);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(10, 10),
        new Vector2(0, 10)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(false);
    });

    it('应该正确检测点在三角形内', () => {
      // Arrange
      const point = new Vector2(5, 3);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(5, 8)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(true);
    });

    it('应该正确处理点在多边形边界上的情况', () => {
      // Arrange
      const point = new Vector2(5, 0);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(10, 10),
        new Vector2(0, 10)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(true); // 边界上算在内部
    });

    it('应该正确处理复杂多边形', () => {
      // Arrange - L形多边形
      const point = new Vector2(2, 2);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(5, 0),
        new Vector2(5, 3),
        new Vector2(3, 3),
        new Vector2(3, 5),
        new Vector2(0, 5)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(true);
    });

    it('应该正确处理凹多边形中的点', () => {
      // Arrange - L形多边形，点在凹陷处
      const point = new Vector2(4, 4);
      const vertices = [
        new Vector2(0, 0),
        new Vector2(5, 0),
        new Vector2(5, 3),
        new Vector2(3, 3),
        new Vector2(3, 5),
        new Vector2(0, 5)
      ];

      // Act
      const isInside = GeometryUtils.pointInPolygon(point, vertices);

      // Assert
      expect(isInside).toBe(false); // 在凹陷的外部
    });
  });

  describe('pointToLineSegmentDistance', () => {
    it('应该计算点到线段的最短距离', () => {
      // Arrange
      const point = new Vector2(2, 2);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(4, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(2); // 点到x轴的距离
    });

    it('应该处理点在线段延长线上的情况', () => {
      // Arrange
      const point = new Vector2(5, 0);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(3, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(2); // 到线段端点的距离
    });

    it('应该处理点在线段上的情况', () => {
      // Arrange
      const point = new Vector2(2, 0);
      const lineStart = new Vector2(0, 0);
      const lineEnd = new Vector2(4, 0);

      // Act
      const distance = GeometryUtils.pointToLineSegmentDistance(point, lineStart, lineEnd);

      // Assert
      expect(distance).toBe(0); // 点在线段上
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该正确处理零半径圆形', () => {
      // Arrange
      const center: IPoint = { x: 5, y: 5 };
      const radius = 0;

      // Act
      const circle = GeometryUtils.createCircleGeometry(center, radius);

      // Assert
      expect(circle.radius).toBe(0);
      expect(circle.bounds.width).toBe(0);
      expect(circle.bounds.height).toBe(0);
    });

    it('应该正确处理零尺寸矩形', () => {
      // Arrange & Act
      const rect = GeometryUtils.createRectGeometry(5, 5, 0, 0);

      // Assert
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
      expect(rect.bounds.width).toBe(0);
      expect(rect.bounds.height).toBe(0);
    });

    it('应该正确处理单点多边形', () => {
      // Arrange
      const vertices = [new Vector2(5, 5)];

      // Act & Assert
      // 单点不能构成多边形，应该抛出错误
      expect(() => GeometryUtils.createPolygonGeometry(vertices)).toThrow('Polygon must have at least 3 vertices');
    });

    it('应该正确处理空多边形', () => {
      // Arrange
      const vertices: Vector2[] = [];

      // Act & Assert
      // 空数组不能构成多边形，应该抛出错误
      expect(() => GeometryUtils.createPolygonGeometry(vertices)).toThrow('Polygon must have at least 3 vertices');
    });

    it('应该正确处理负坐标', () => {
      // Arrange & Act
      const rect = GeometryUtils.createRectGeometry(-10, -20, 5, 8);

      // Assert
      expect(rect.bounds.x).toBe(-10);
      expect(rect.bounds.y).toBe(-20);
      expect(rect.center.x).toBe(-7.5);
      expect(rect.center.y).toBe(-16);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量边界相交检测', () => {
      // Arrange
      const bounds1: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const testBounds = Array.from({ length: 1000 }, (_, i) => ({
        x: i % 20,
        y: Math.floor(i / 20) % 20,
        width: 5,
        height: 5
      }));

      // Act
      const start = performance.now();
      const results = testBounds.map(bounds => 
        GeometryUtils.boundsIntersect(bounds1, bounds)
      );
      const end = performance.now();

      // Assert
      expect(results).toHaveLength(1000);
      expect(end - start).toBeLessThan(10); // 应该在10ms内完成
    });

    it('应该高效处理大量点在多边形检测', () => {
      // Arrange
      const vertices = [
        new Vector2(0, 0),
        new Vector2(100, 0),
        new Vector2(100, 100),
        new Vector2(0, 100)
      ];
      const testPoints = Array.from({ length: 1000 }, (_, i) => 
        new Vector2(Math.random() * 150, Math.random() * 150)
      );

      // Act
      const start = performance.now();
      const results = testPoints.map(point => 
        GeometryUtils.pointInPolygon(point, vertices)
      );
      const end = performance.now();

      // Assert
      expect(results).toHaveLength(1000);
      expect(end - start).toBeLessThan(20); // 应该在20ms内完成
    });
  });
});