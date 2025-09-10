/**
 * 统一的碰撞检测系统 - 基于几何运算和空间分割
 */

import { Vector2 } from './Vector2';
import { 
  GeometryUtils, 
  IPoint, 
  IRect, 
  IGeometry, 
  ICircleGeometry, 
  IRectGeometry, 
  IPolygonGeometry,
  IGeometryCollisionResult,
  IRaycastResult,
  GeometryType
} from './Geometry';
import { SpatialPartitionManager, ISpatialObject } from './SpatialPartitioning';

/**
 * 碰撞检测类型枚举
 */
export enum CollisionType {
  POINT = 'point',
  CIRCLE = 'circle', 
  RECT = 'rect',
  POLYGON = 'polygon'
}

/**
 * 碰撞对象接口
 */
export interface ICollisionObject extends ISpatialObject {
  geometry: IGeometry;
  visible: boolean;
  enabled: boolean;
  zIndex: number;
}

/**
 * 射线投射结果（业务层）
 */
export interface IRaycastHit<T extends ICollisionObject> {
  hit: boolean;
  object: T | null;
  point: IPoint;
  distance: number;
  normal: Vector2;
}

/**
 * 统一碰撞检测器
 * 结合几何运算和空间分割，提供高效的碰撞检测
 */
export class CollisionDetector<T extends ICollisionObject> {
  private _spatialManager: SpatialPartitionManager<T>;
  private _enabled: boolean = true;

  constructor(cellSize: number = 100, bounds?: IRect) {
    this._spatialManager = new SpatialPartitionManager<T>(cellSize, bounds);
  }

  /**
   * 启用/禁用碰撞检测
   */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * 设置是否使用四叉树
   */
  setUseQuadTree(useQuadTree: boolean): void {
    this._spatialManager.setUseQuadTree(useQuadTree);
  }

  // ======================== 对象管理 ========================

  /**
   * 添加碰撞对象
   */
  addObject(obj: T): void {
    this._spatialManager.insert(obj);
  }

  /**
   * 移除碰撞对象
   */
  removeObject(obj: T): void {
    this._spatialManager.remove(obj);
  }

  /**
   * 更新碰撞对象位置
   */
  updateObject(obj: T): void {
    this._spatialManager.update(obj);
  }

  /**
   * 清空所有对象
   */
  clear(): void {
    this._spatialManager.clear();
  }

  // ======================== 点碰撞检测 ========================

  /**
   * 点测试 - 返回第一个命中的对象（按zIndex排序）
   */
  pointTest(point: IPoint, candidates?: T[]): T | null {
    if (!this._enabled) return null;

    const objects = candidates || this._spatialManager.queryPoint(point);
    
    // 按zIndex从高到低排序（高的优先）
    const sortedObjects = objects
      .filter(obj => obj.visible && obj.enabled)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const obj of sortedObjects) {
      if (this.pointIntersectsGeometry(point, obj.geometry)) {
        return obj;
      }
    }

    return null;
  }

  /**
   * 点测试 - 返回所有命中的对象（按zIndex排序）
   */
  pointTestAll(point: IPoint, candidates?: T[]): T[] {
    if (!this._enabled) return [];

    const objects = candidates || this._spatialManager.queryPoint(point);
    const results: T[] = [];

    for (const obj of objects) {
      if (obj.visible && obj.enabled && this.pointIntersectsGeometry(point, obj.geometry)) {
        results.push(obj);
      }
    }

    // 按zIndex从高到低排序
    results.sort((a, b) => b.zIndex - a.zIndex);
    return results;
  }

  // ======================== 区域碰撞检测 ========================

  /**
   * 边界测试 - 返回所有与指定边界相交的对象
   */
  boundsTest(bounds: IRect, candidates?: T[]): T[] {
    if (!this._enabled) return [];

    const objects = candidates || this._spatialManager.query(bounds);
    const results: T[] = [];

    for (const obj of objects) {
      if (obj.visible && obj.enabled) {
        const objBounds = obj.getBounds();
        if (GeometryUtils.boundsIntersect(bounds, objBounds)) {
          results.push(obj);
        }
      }
    }

    return results;
  }

  /**
   * 圆形区域测试
   */
  circleTest(center: IPoint, radius: number, candidates?: T[]): T[] {
    if (!this._enabled) return [];

    const objects = candidates || this._spatialManager.queryRadius(center, radius);
    const results: T[] = [];

    const circleGeometry = GeometryUtils.createCircleGeometry(center, radius);

    for (const obj of objects) {
      if (obj.visible && obj.enabled) {
        const collision = this.geometryCollision(circleGeometry, obj.geometry);
        if (collision.hasCollision) {
          results.push(obj);
        }
      }
    }

    return results;
  }

  // ======================== 射线投射 ========================

  /**
   * 射线投射 - 返回最近的命中对象
   */
  raycast(origin: IPoint, direction: Vector2, maxDistance: number = Infinity, candidates?: T[]): IRaycastHit<T> {
    if (!this._enabled) {
      return { hit: false, object: null, point: origin, distance: 0, normal: new Vector2(0, 0) };
    }

    const normalizedDirection = direction.normalize();
    const endPoint = new Vector2(origin.x, origin.y).add(normalizedDirection.multiply(maxDistance));
    
    // 创建射线边界框用于空间查询
    const rayBounds: IRect = {
      x: Math.min(origin.x, endPoint.x),
      y: Math.min(origin.y, endPoint.y), 
      width: Math.abs(endPoint.x - origin.x),
      height: Math.abs(endPoint.y - origin.y)
    };

    const objects = candidates || this._spatialManager.query(rayBounds);
    let closestHit: IRaycastHit<T> = { 
      hit: false, 
      object: null, 
      point: origin, 
      distance: Infinity, 
      normal: new Vector2(0, 0) 
    };

    for (const obj of objects) {
      if (!obj.visible || !obj.enabled) continue;

      const hit = this.raycastGeometry(origin, normalizedDirection, maxDistance, obj.geometry);
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = {
          hit: true,
          object: obj,
          point: hit.point,
          distance: hit.distance,
          normal: hit.normal
        };
      }
    }

    return closestHit;
  }

  /**
   * 射线投射 - 返回所有命中的对象（按距离排序）
   */
  raycastAll(origin: IPoint, direction: Vector2, maxDistance: number = Infinity, candidates?: T[]): IRaycastHit<T>[] {
    if (!this._enabled) return [];

    const normalizedDirection = direction.normalize();
    const endPoint = new Vector2(origin.x, origin.y).add(normalizedDirection.multiply(maxDistance));
    
    const rayBounds: IRect = {
      x: Math.min(origin.x, endPoint.x),
      y: Math.min(origin.y, endPoint.y),
      width: Math.abs(endPoint.x - origin.x),
      height: Math.abs(endPoint.y - origin.y)
    };

    const objects = candidates || this._spatialManager.query(rayBounds);
    const hits: IRaycastHit<T>[] = [];

    for (const obj of objects) {
      if (!obj.visible || !obj.enabled) continue;

      const hit = this.raycastGeometry(origin, normalizedDirection, maxDistance, obj.geometry);
      if (hit.hit) {
        hits.push({
          hit: true,
          object: obj,
          point: hit.point,
          distance: hit.distance,
          normal: hit.normal
        });
      }
    }

    // 按距离排序
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  // ======================== 形状碰撞检测 ========================

  /**
   * 几何形状碰撞检测
   */
  geometryCollision(geometryA: IGeometry, geometryB: IGeometry): IGeometryCollisionResult {
    if (!this._enabled) {
      return {
        hasCollision: false,
        distance: Infinity,
        normal: new Vector2(0, 0),
        penetration: 0,
        contactPoint: geometryA.center
      };
    }

    // 首先进行边界框检测
    if (!GeometryUtils.boundsIntersect(geometryA.bounds, geometryB.bounds)) {
      return {
        hasCollision: false,
        distance: new Vector2(geometryA.center.x, geometryA.center.y)
          .distance(new Vector2(geometryB.center.x, geometryB.center.y)),
        normal: new Vector2(0, 0),
        penetration: 0,
        contactPoint: geometryA.center
      };
    }

    // 根据形状类型进行精确检测
    if (geometryA.type === GeometryType.CIRCLE && geometryB.type === GeometryType.CIRCLE) {
      return GeometryUtils.circleCircleCollision(geometryA as ICircleGeometry, geometryB as ICircleGeometry);
    } else if (geometryA.type === GeometryType.RECT && geometryB.type === GeometryType.RECT) {
      return GeometryUtils.rectRectCollision(geometryA as IRectGeometry, geometryB as IRectGeometry);
    } else if (
      (geometryA.type === GeometryType.CIRCLE && geometryB.type === GeometryType.RECT) ||
      (geometryA.type === GeometryType.RECT && geometryB.type === GeometryType.CIRCLE)
    ) {
      const circle = geometryA.type === GeometryType.CIRCLE ? geometryA as ICircleGeometry : geometryB as ICircleGeometry;
      const rect = geometryA.type === GeometryType.RECT ? geometryA as IRectGeometry : geometryB as IRectGeometry;
      return GeometryUtils.circleRectCollision(circle, rect);
    }

    // 默认使用边界框碰撞
    return GeometryUtils.boundsCollision(geometryA.bounds, geometryB.bounds);
  }

  // ======================== 私有方法 ========================

  /**
   * 检测点是否与几何形状相交
   */
  private pointIntersectsGeometry(point: IPoint, geometry: IGeometry): boolean {
    switch (geometry.type) {
      case GeometryType.CIRCLE:
        const circleGeom = geometry as ICircleGeometry;
        const distance = new Vector2(point.x, point.y).distance(new Vector2(circleGeom.center.x, circleGeom.center.y));
        return distance <= circleGeom.radius;

      case GeometryType.RECT:
        const rectGeom = geometry as IRectGeometry;
        const bounds = rectGeom.bounds;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;

      case GeometryType.POLYGON:
        const polygonGeom = geometry as IPolygonGeometry;
        return GeometryUtils.pointInPolygon(new Vector2(point.x, point.y), polygonGeom.vertices);

      default:
        // 默认使用边界框检测
        const defaultBounds = geometry.bounds;
        return point.x >= defaultBounds.x && point.x <= defaultBounds.x + defaultBounds.width &&
               point.y >= defaultBounds.y && point.y <= defaultBounds.y + defaultBounds.height;
    }
  }

  /**
   * 射线与几何形状的相交测试
   */
  private raycastGeometry(origin: IPoint, direction: Vector2, maxDistance: number, geometry: IGeometry): IRaycastResult {
    // 对于复杂几何形状，可以先用边界框进行快速测试
    const boundsHit = GeometryUtils.raycastBounds(origin, direction, maxDistance, geometry.bounds);
    if (!boundsHit.hit) {
      return boundsHit;
    }

    // 根据几何类型进行精确检测
    switch (geometry.type) {
      case GeometryType.CIRCLE:
        return this.raycastCircle(origin, direction, maxDistance, geometry as ICircleGeometry);
      
      case GeometryType.RECT:
        return this.raycastRect(origin, direction, maxDistance, geometry as IRectGeometry);
        
      case GeometryType.POLYGON:
        return this.raycastPolygon(origin, direction, maxDistance, geometry as IPolygonGeometry);
        
      default:
        // 默认返回边界框检测结果
        return boundsHit;
    }
  }

  /**
   * 射线与圆形的相交测试
   */
  private raycastCircle(origin: IPoint, direction: Vector2, maxDistance: number, circle: ICircleGeometry): IRaycastResult {
    const center = new Vector2(circle.center.x, circle.center.y);
    const rayStart = new Vector2(origin.x, origin.y);
    const rayDir = direction.normalize();

    // 射线到圆心的向量
    const toCenter = center.subtract(rayStart);
    
    // 投影到射线方向上的长度
    const projectionLength = toCenter.dot(rayDir);
    
    // 最接近点
    const closestPoint = rayStart.add(rayDir.multiply(projectionLength));
    const distanceToCenter = center.distance(closestPoint);

    // 如果距离大于半径，则没有相交
    if (distanceToCenter > circle.radius) {
      return { hit: false, point: origin, distance: Infinity, normal: new Vector2(0, 0) };
    }

    // 计算交点
    const halfChordLength = Math.sqrt(circle.radius * circle.radius - distanceToCenter * distanceToCenter);
    const intersectionDistance = projectionLength - halfChordLength;

    // 检查是否在射线范围内
    if (intersectionDistance < 0 || intersectionDistance > maxDistance) {
      return { hit: false, point: origin, distance: Infinity, normal: new Vector2(0, 0) };
    }

    const hitPoint = rayStart.add(rayDir.multiply(intersectionDistance));
    const normal = hitPoint.subtract(center).normalize();

    return {
      hit: true,
      point: { x: hitPoint.x, y: hitPoint.y },
      distance: intersectionDistance,
      normal
    };
  }

  /**
   * 射线与矩形的相交测试
   */
  private raycastRect(origin: IPoint, direction: Vector2, maxDistance: number, rect: IRectGeometry): IRaycastResult {
    // 使用现有的边界框射线投射方法
    return GeometryUtils.raycastBounds(origin, direction, maxDistance, rect.bounds);
  }

  /**
   * 射线与多边形的相交测试
   */
  private raycastPolygon(origin: IPoint, direction: Vector2, maxDistance: number, polygon: IPolygonGeometry): IRaycastResult {
    const rayStart = new Vector2(origin.x, origin.y);
    const rayDir = direction.normalize();
    
    let closestHit: IRaycastResult = { hit: false, point: origin, distance: Infinity, normal: new Vector2(0, 0) };

    // 检查射线与每条边的相交
    const vertices = polygon.vertices;
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      
      const hit = this.raycastLineSegment(rayStart, rayDir, v1, v2, maxDistance);
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = hit;
      }
    }

    return closestHit;
  }

  /**
   * 射线与线段的相交测试
   */
  private raycastLineSegment(rayStart: Vector2, rayDir: Vector2, lineStart: Vector2, lineEnd: Vector2, maxDistance: number): IRaycastResult {
    const lineVec = lineEnd.subtract(lineStart);
    const lineToRay = rayStart.subtract(lineStart);

    const cross1 = rayDir.cross(lineVec);
    const cross2 = lineToRay.cross(lineVec);

    if (Math.abs(cross1) < 1e-6) {
      // 射线与线段平行
      return { hit: false, point: { x: rayStart.x, y: rayStart.y }, distance: Infinity, normal: new Vector2(0, 0) };
    }

    const t = lineToRay.cross(rayDir) / cross1;
    const u = cross2 / cross1;

    if (t >= 0 && t <= 1 && u >= 0 && u <= maxDistance) {
      const hitPoint = rayStart.add(rayDir.multiply(u));
      const normal = new Vector2(-lineVec.y, lineVec.x).normalize();
      
      return {
        hit: true,
        point: { x: hitPoint.x, y: hitPoint.y },
        distance: u,
        normal
      };
    }

    return { hit: false, point: { x: rayStart.x, y: rayStart.y }, distance: Infinity, normal: new Vector2(0, 0) };
  }

  // ======================== 工具方法 ========================

  /**
   * 重建空间分割结构（用于批量更新）
   */
  rebuildSpatialStructure(objects: T[]): void {
    this._spatialManager.clear();
    this._spatialManager.rebuildQuadTree(objects);
    
    for (const obj of objects) {
      this._spatialManager.insert(obj);
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      enabled: this._enabled,
      spatialPartitioning: this._spatialManager.getDebugInfo()
    };
  }
}