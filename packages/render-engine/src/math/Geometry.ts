/**
 * 几何运算库 - 纯数学计算，不涉及业务逻辑
 * 从Canvas SDK的碰撞检测中提取的纯几何运算部分
 */

import { Vector2 } from './Vector2';

/**
 * 几何形状类型
 */
export enum GeometryType {
  POINT = 'point',
  CIRCLE = 'circle',
  RECT = 'rect',
  POLYGON = 'polygon'
}

/**
 * 基础几何接口
 */
export interface IPoint {
  x: number;
  y: number;
}

export interface IRect extends IPoint {
  width: number;
  height: number;
}

/**
 * 基础几何形状接口
 */
export interface IGeometry {
  type: GeometryType;
  bounds: IRect;
  center: IPoint;
}

/**
 * 圆形几何
 */
export interface ICircleGeometry extends IGeometry {
  type: GeometryType.CIRCLE;
  radius: number;
}

/**
 * 矩形几何
 */
export interface IRectGeometry extends IGeometry {
  type: GeometryType.RECT;
  width: number;
  height: number;
}

/**
 * 多边形几何
 */
export interface IPolygonGeometry extends IGeometry {
  type: GeometryType.POLYGON;
  vertices: Vector2[];
}

/**
 * 几何碰撞结果
 */
export interface IGeometryCollisionResult {
  hasCollision: boolean;
  distance: number;
  normal: Vector2;
  penetration: number;
  contactPoint: IPoint;
}

/**
 * 射线投射结果
 */
export interface IRaycastResult {
  hit: boolean;
  point: IPoint;
  distance: number;
  normal: Vector2;
}

/**
 * 几何运算工具类
 * 包含所有纯几何数学运算，不涉及场景节点等业务逻辑
 */
export class GeometryUtils {
  /**
   * 检测两个矩形边界是否相交
   */
  static boundsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  /**
   * 射线与矩形边界的相交测试
   */
  static raycastBounds(origin: IPoint, direction: Vector2, maxDistance: number, bounds: IRect): IRaycastResult {
    const originVec = new Vector2(origin.x, origin.y);
    
    // AABB射线相交测试
    const invDir = new Vector2(1 / direction.x, 1 / direction.y);
    const t1 = (bounds.x - origin.x) * invDir.x;
    const t2 = (bounds.x + bounds.width - origin.x) * invDir.x;
    const t3 = (bounds.y - origin.y) * invDir.y;
    const t4 = (bounds.y + bounds.height - origin.y) * invDir.y;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    if (tmax < 0 || tmin > tmax || tmin > maxDistance) {
      return { hit: false, point: origin, distance: Infinity, normal: new Vector2(0, 0) };
    }

    const t = tmin > 0 ? tmin : tmax;
    const hitPoint = originVec.add(direction.multiply(t));
    
    // 计算法线
    let normal = new Vector2(0, 0);
    const center = new Vector2(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const toHit = hitPoint.subtract(center);
    
    if (Math.abs(toHit.x) > Math.abs(toHit.y)) {
      normal = new Vector2(toHit.x > 0 ? 1 : -1, 0);
    } else {
      normal = new Vector2(0, toHit.y > 0 ? 1 : -1);
    }

    return {
      hit: true,
      point: { x: hitPoint.x, y: hitPoint.y },
      distance: t,
      normal
    };
  }

  /**
   * 圆与圆的碰撞检测
   */
  static circleCircleCollision(circleA: ICircleGeometry, circleB: ICircleGeometry): IGeometryCollisionResult {
    const centerA = new Vector2(circleA.center.x, circleA.center.y);
    const centerB = new Vector2(circleB.center.x, circleB.center.y);
    const distance = centerA.distance(centerB);
    const radiusSum = circleA.radius + circleB.radius;

    if (distance <= radiusSum) {
      const normal = centerB.subtract(centerA).normalize();
      const penetration = radiusSum - distance;
      const contactPoint = centerA.add(normal.multiply(circleA.radius));

      return {
        hasCollision: true,
        distance,
        normal,
        penetration,
        contactPoint: { x: contactPoint.x, y: contactPoint.y }
      };
    }

    return {
      hasCollision: false,
      distance,
      normal: new Vector2(0, 0),
      penetration: 0,
      contactPoint: circleA.center
    };
  }

  /**
   * 矩形与矩形的碰撞检测
   */
  static rectRectCollision(rectA: IRectGeometry, rectB: IRectGeometry): IGeometryCollisionResult {
    const boundsA = rectA.bounds;
    const boundsB = rectB.bounds;

    if (this.boundsIntersect(boundsA, boundsB)) {
      const centerA = new Vector2(rectA.center.x, rectA.center.y);
      const centerB = new Vector2(rectB.center.x, rectB.center.y);
      const distance = centerA.distance(centerB);

      // 计算重叠区域
      const overlapX = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) - Math.max(boundsA.x, boundsB.x);
      const overlapY = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) - Math.max(boundsA.y, boundsB.y);
      
      let normal: Vector2;
      let penetration: number;

      if (overlapX < overlapY) {
        normal = new Vector2(centerB.x > centerA.x ? 1 : -1, 0);
        penetration = overlapX;
      } else {
        normal = new Vector2(0, centerB.y > centerA.y ? 1 : -1);
        penetration = overlapY;
      }

      const contactPoint = centerA.add(normal.multiply(penetration / 2));

      return {
        hasCollision: true,
        distance,
        normal,
        penetration,
        contactPoint: { x: contactPoint.x, y: contactPoint.y }
      };
    }

    return {
      hasCollision: false,
      distance: new Vector2(rectA.center.x, rectA.center.y).distance(new Vector2(rectB.center.x, rectB.center.y)),
      normal: new Vector2(0, 0),
      penetration: 0,
      contactPoint: rectA.center
    };
  }

  /**
   * 圆与矩形的碰撞检测
   */
  static circleRectCollision(circle: ICircleGeometry, rect: IRectGeometry): IGeometryCollisionResult {
    const circleCenter = new Vector2(circle.center.x, circle.center.y);
    const rectBounds = rect.bounds;

    // 找到矩形上最接近圆心的点
    const closestX = Math.max(rectBounds.x, Math.min(circleCenter.x, rectBounds.x + rectBounds.width));
    const closestY = Math.max(rectBounds.y, Math.min(circleCenter.y, rectBounds.y + rectBounds.height));
    const closest = new Vector2(closestX, closestY);

    const distance = circleCenter.distance(closest);

    if (distance <= circle.radius) {
      const normal = circleCenter.subtract(closest).normalize();
      const penetration = circle.radius - distance;
      const contactPoint = closest;

      return {
        hasCollision: true,
        distance,
        normal,
        penetration,
        contactPoint: { x: contactPoint.x, y: contactPoint.y }
      };
    }

    return {
      hasCollision: false,
      distance,
      normal: new Vector2(0, 0),
      penetration: 0,
      contactPoint: circle.center
    };
  }

  /**
   * 通用边界碰撞检测
   */
  static boundsCollision(boundsA: IRect, boundsB: IRect): IGeometryCollisionResult {
    if (this.boundsIntersect(boundsA, boundsB)) {
      const centerA = new Vector2(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height / 2);
      const centerB = new Vector2(boundsB.x + boundsB.width / 2, boundsB.y + boundsB.height / 2);
      const distance = centerA.distance(centerB);

      // 计算穿透深度
      const overlapX = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) - Math.max(boundsA.x, boundsB.x);
      const overlapY = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) - Math.max(boundsA.y, boundsB.y);
      const penetration = Math.min(overlapX, overlapY);

      return {
        hasCollision: true,
        distance,
        normal: centerB.subtract(centerA).normalize(),
        penetration,
        contactPoint: { x: centerA.x, y: centerA.y }
      };
    }

    return {
      hasCollision: false,
      distance: Infinity,
      normal: new Vector2(0, 0),
      penetration: 0,
      contactPoint: { x: boundsA.x, y: boundsA.y }
    };
  }

  /**
   * 创建圆形几何
   */
  static createCircleGeometry(center: IPoint, radius: number): ICircleGeometry {
    return {
      type: GeometryType.CIRCLE,
      center,
      radius,
      bounds: {
        x: center.x - radius,
        y: center.y - radius,
        width: radius * 2,
        height: radius * 2
      }
    };
  }

  /**
   * 创建矩形几何
   */
  static createRectGeometry(x: number, y: number, width: number, height: number): IRectGeometry {
    return {
      type: GeometryType.RECT,
      center: { x: x + width / 2, y: y + height / 2 },
      width,
      height,
      bounds: { x, y, width, height }
    };
  }

  /**
   * 创建多边形几何
   */
  static createPolygonGeometry(vertices: Vector2[]): IPolygonGeometry {
    if (vertices.length < 3) {
      throw new Error('Polygon must have at least 3 vertices');
    }

    // 计算边界框
    let minX = vertices[0].x, maxX = vertices[0].x;
    let minY = vertices[0].y, maxY = vertices[0].y;

    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    }

    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    return {
      type: GeometryType.POLYGON,
      vertices: vertices.map(v => v.clone()),
      bounds,
      center
    };
  }

  /**
   * 点到线段的距离
   */
  static pointToLineSegmentDistance(point: Vector2, lineStart: Vector2, lineEnd: Vector2): number {
    const lineVec = lineEnd.subtract(lineStart);
    const pointVec = point.subtract(lineStart);
    
    const lineLength = lineVec.length();
    if (lineLength === 0) return pointVec.length();
    
    const t = Math.max(0, Math.min(1, pointVec.dot(lineVec) / (lineLength * lineLength)));
    const projection = lineStart.add(lineVec.multiply(t));
    
    return point.distance(projection);
  }

  /**
   * 检测点是否在多边形内部（射线投射算法）
   */
  static pointInPolygon(point: Vector2, vertices: Vector2[]): boolean {
    let inside = false;
    const x = point.x, y = point.y;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}