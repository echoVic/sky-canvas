import {
  GeometryUtils,
  ISpatialObject,
  IPoint as Point,
  IRect as Rect,
  SpatialPartitionManager,
  Vector2
} from '@sky-canvas/render-engine';
import { ISceneNode } from '../../scene/SceneNode';

/**
 * 碰撞检测类型枚举 - 保持向后兼容
 */
export enum CollisionType {
  POINT = 'point',
  CIRCLE = 'circle',
  RECT = 'rect',
  POLYGON = 'polygon'
}

/**
 * 碰撞形状接口 - 保持向后兼容
 */
export interface CollisionShape {
  type: CollisionType;
  bounds: Rect;
  center: Point;
}

/**
 * 圆形碰撞形状
 */
export interface CircleShape extends CollisionShape {
  type: CollisionType.CIRCLE;
  radius: number;
}

/**
 * 矩形碰撞形状
 */
export interface RectShape extends CollisionShape {
  type: CollisionType.RECT;
  width: number;
  height: number;
}

/**
 * 多边形碰撞形状
 */
export interface PolygonShape extends CollisionShape {
  type: CollisionType.POLYGON;
  vertices: Vector2[];
}

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  hasCollision: boolean;
  distance: number;
  normal: Vector2;
  penetration: number;
  contactPoint: Point;
}

/**
 * 射线投射结果
 */
export interface RaycastResult {
  hit: boolean;
  node: ISceneNode | null;
  point: Point;
  distance: number;
  normal: Vector2;
}

/**
 * 场景节点适配器 - 将 ISceneNode 适配为 ISpatialObject
 */
class SceneNodeSpatialAdapter implements ISpatialObject {
  constructor(private node: ISceneNode) {}

  get id(): string {
    return this.node.id;
  }

  getBounds(): Rect {
    return this.node.getBounds();
  }

  get originalNode(): ISceneNode {
    return this.node;
  }
}

/**
 * 空间分割网格 - 现在基于 Render Engine 实现
 */
export class SpatialGrid {
  private _spatialManager: SpatialPartitionManager<SceneNodeSpatialAdapter>;
  private _nodeAdapters: Map<ISceneNode, SceneNodeSpatialAdapter> = new Map();

  constructor(cellSize: number = 100) {
    this._spatialManager = new SpatialPartitionManager<SceneNodeSpatialAdapter>(cellSize);
  }

  insert(node: ISceneNode): void {
    const adapter = new SceneNodeSpatialAdapter(node);
    this._nodeAdapters.set(node, adapter);
    this._spatialManager.insert(adapter);
  }

  remove(node: ISceneNode): void {
    const adapter = this._nodeAdapters.get(node);
    if (adapter) {
      this._spatialManager.remove(adapter);
      this._nodeAdapters.delete(node);
    }
  }

  update(node: ISceneNode): void {
    const adapter = this._nodeAdapters.get(node);
    if (adapter) {
      this._spatialManager.update(adapter);
    }
  }

  query(bounds: Rect): Set<ISceneNode> {
    const adapters = this._spatialManager.query(bounds);
    const result = new Set<ISceneNode>();
    
    for (const adapter of adapters) {
      result.add(adapter.originalNode);
    }
    
    return result;
  }

  queryPoint(point: Point): Set<ISceneNode> {
    const adapters = this._spatialManager.queryPoint(point);
    const result = new Set<ISceneNode>();
    
    for (const adapter of adapters) {
      result.add(adapter.originalNode);
    }
    
    return result;
  }

  clear(): void {
    this._spatialManager.clear();
    this._nodeAdapters.clear();
  }


  getDebugInfo(): object {
    return this._spatialManager.getDebugInfo();
  }
}

/**
 * 碰撞检测器
 */
export class CollisionDetector {
  private _spatialGrid: SpatialGrid;
  private _enabled: boolean = true;

  constructor(cellSize: number = 100) {
    this._spatialGrid = new SpatialGrid(cellSize);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  // 节点管理
  addNode(node: ISceneNode): void {
    this._spatialGrid.insert(node);
  }

  removeNode(node: ISceneNode): void {
    this._spatialGrid.remove(node);
  }

  updateNode(node: ISceneNode): void {
    this._spatialGrid.update(node);
  }

  clear(): void {
    this._spatialGrid.clear();
  }

  // 点碰撞检测
  pointTest(point: Point, nodes?: ISceneNode[]): ISceneNode | null {
    if (!this._enabled) return null;

    const candidates = nodes || Array.from(this._spatialGrid.queryPoint(point));
    
    // 从前到后检测（zIndex高的优先）
    candidates.sort((a, b) => b.zIndex - a.zIndex);

    for (const node of candidates) {
      if (node.visible && node.enabled && node.hitTest(point)) {
        return node;
      }
    }

    return null;
  }

  pointTestAll(point: Point, nodes?: ISceneNode[]): ISceneNode[] {
    if (!this._enabled) return [];

    const candidates = nodes || Array.from(this._spatialGrid.queryPoint(point));
    const results: ISceneNode[] = [];

    for (const node of candidates) {
      if (node.visible && node.enabled && node.hitTest(point)) {
        results.push(node);
      }
    }

    // 按zIndex排序
    results.sort((a, b) => b.zIndex - a.zIndex);
    return results;
  }

  // 区域碰撞检测
  boundsTest(bounds: Rect, nodes?: ISceneNode[]): ISceneNode[] {
    if (!this._enabled) return [];

    const candidates = nodes || Array.from(this._spatialGrid.query(bounds));
    const results: ISceneNode[] = [];

    for (const node of candidates) {
      if (node.visible && node.enabled) {
        const nodeBounds = node.getBounds();
        if (this.boundsIntersect(bounds, nodeBounds)) {
          results.push(node);
        }
      }
    }

    return results;
  }

  // 射线投射
  raycast(origin: Point, direction: Vector2, maxDistance: number = Infinity, nodes?: ISceneNode[]): RaycastResult {
    if (!this._enabled) {
      return { hit: false, node: null, point: origin, distance: 0, normal: new Vector2(0, 0) };
    }

    const normalizedDirection = direction.normalize();
    const endPoint = new Vector2(origin.x, origin.y).add(normalizedDirection.multiplyScalar(maxDistance));
    
    // 创建射线边界框用于空间查询
    const rayBounds: Rect = {
      x: Math.min(origin.x, endPoint.x),
      y: Math.min(origin.y, endPoint.y),
      width: Math.abs(endPoint.x - origin.x),
      height: Math.abs(endPoint.y - origin.y)
    };

    const candidates = nodes || Array.from(this._spatialGrid.query(rayBounds));
    let closestHit: RaycastResult = { hit: false, node: null, point: origin, distance: Infinity, normal: new Vector2(0, 0) };

    for (const node of candidates) {
      if (!node.visible || !node.enabled) continue;

      const hit = this.raycastNode(origin, normalizedDirection, maxDistance, node);
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = hit;
      }
    }

    return closestHit;
  }

  // 形状碰撞检测
  shapeCollision(shapeA: CollisionShape, shapeB: CollisionShape): CollisionResult {
    if (!this._enabled) {
      return {
        hasCollision: false,
        distance: Infinity,
        normal: new Vector2(0, 0),
        penetration: 0,
        contactPoint: shapeA.center
      };
    }

    // 首先进行边界框检测
    if (!this.boundsIntersect(shapeA.bounds, shapeB.bounds)) {
      return {
        hasCollision: false,
        distance: new Vector2(shapeA.center.x, shapeA.center.y).distance(new Vector2(shapeB.center.x, shapeB.center.y)),
        normal: new Vector2(0, 0),
        penetration: 0,
        contactPoint: shapeA.center
      };
    }

    // 根据形状类型进行精确检测
    if (shapeA.type === CollisionType.CIRCLE && shapeB.type === CollisionType.CIRCLE) {
      return this.circleCircleCollision(shapeA as CircleShape, shapeB as CircleShape);
    } else if (shapeA.type === CollisionType.RECT && shapeB.type === CollisionType.RECT) {
      return this.rectRectCollision(shapeA as RectShape, shapeB as RectShape);
    } else if (
      (shapeA.type === CollisionType.CIRCLE && shapeB.type === CollisionType.RECT) ||
      (shapeA.type === CollisionType.RECT && shapeB.type === CollisionType.CIRCLE)
    ) {
      const circle = shapeA.type === CollisionType.CIRCLE ? shapeA as CircleShape : shapeB as CircleShape;
      const rect = shapeA.type === CollisionType.RECT ? shapeA as RectShape : shapeB as RectShape;
      return this.circleRectCollision(circle, rect);
    }

    // 默认使用边界框碰撞
    return this.boundsCollision(shapeA.bounds, shapeB.bounds);
  }

  // 私有方法
  private raycastNode(origin: Point, direction: Vector2, maxDistance: number, node: ISceneNode): RaycastResult {
    const bounds = node.getBounds();
    const hit = this.raycastBounds(origin, direction, maxDistance, bounds);
    
    if (hit.hit) {
      return {
        hit: true,
        node,
        point: hit.point,
        distance: hit.distance,
        normal: hit.normal
      };
    }

    return { hit: false, node: null, point: origin, distance: Infinity, normal: new Vector2(0, 0) };
  }

  private raycastBounds(origin: Point, direction: Vector2, maxDistance: number, bounds: Rect): RaycastResult {
    // 使用 Render Engine 的射线投射实现
    const result = GeometryUtils.raycastBounds(origin, direction, maxDistance, bounds);
    
    return {
      hit: result.hit,
      node: null,
      point: result.point,
      distance: result.distance,
      normal: result.normal
    };
  }

  private circleCircleCollision(circleA: CircleShape, circleB: CircleShape): CollisionResult {
    // 转换为 Render Engine 的几何格式
    const geomA = GeometryUtils.createCircleGeometry(circleA.center, circleA.radius);
    const geomB = GeometryUtils.createCircleGeometry(circleB.center, circleB.radius);
    
    // 使用 Render Engine 的碰撞检测
    const result = GeometryUtils.circleCircleCollision(geomA, geomB);
    
    return {
      hasCollision: result.hasCollision,
      distance: result.distance,
      normal: result.normal,
      penetration: result.penetration,
      contactPoint: result.contactPoint
    };
  }

  private rectRectCollision(rectA: RectShape, rectB: RectShape): CollisionResult {
    // 转换为 Render Engine 的几何格式
    const geomA = GeometryUtils.createRectGeometry(
      rectA.bounds.x, rectA.bounds.y, rectA.bounds.width, rectA.bounds.height
    );
    const geomB = GeometryUtils.createRectGeometry(
      rectB.bounds.x, rectB.bounds.y, rectB.bounds.width, rectB.bounds.height
    );
    
    // 使用 Render Engine 的碰撞检测
    const result = GeometryUtils.rectRectCollision(geomA, geomB);
    
    return {
      hasCollision: result.hasCollision,
      distance: result.distance,
      normal: result.normal,
      penetration: result.penetration,
      contactPoint: result.contactPoint
    };
  }

  private circleRectCollision(circle: CircleShape, rect: RectShape): CollisionResult {
    // 转换为 Render Engine 的几何格式
    const circleGeom = GeometryUtils.createCircleGeometry(circle.center, circle.radius);
    const rectGeom = GeometryUtils.createRectGeometry(
      rect.bounds.x, rect.bounds.y, rect.bounds.width, rect.bounds.height
    );
    
    // 使用 Render Engine 的碰撞检测
    const result = GeometryUtils.circleRectCollision(circleGeom, rectGeom);
    
    return {
      hasCollision: result.hasCollision,
      distance: result.distance,
      normal: result.normal,
      penetration: result.penetration,
      contactPoint: result.contactPoint
    };
  }

  private boundsCollision(boundsA: Rect, boundsB: Rect): CollisionResult {
    // 使用 Render Engine 的边界碰撞检测
    const result = GeometryUtils.boundsCollision(boundsA, boundsB);
    
    return {
      hasCollision: result.hasCollision,
      distance: result.distance,
      normal: result.normal,
      penetration: result.penetration,
      contactPoint: result.contactPoint
    };
  }

  private boundsIntersect(a: Rect, b: Rect): boolean {
    // 使用 Render Engine 的几何运算
    return GeometryUtils.boundsIntersect(a, b);
  }

  // 工具方法
  createCircleShape(center: Point, radius: number): CircleShape {
    const circleGeometry = GeometryUtils.createCircleGeometry(center, radius);
    return {
      type: CollisionType.CIRCLE,
      center: circleGeometry.center,
      radius: (circleGeometry as any).radius,
      bounds: circleGeometry.bounds
    };
  }

  createRectShape(bounds: Rect): RectShape {
    const rectGeometry = GeometryUtils.createRectGeometry(bounds.x, bounds.y, bounds.width, bounds.height);
    return {
      type: CollisionType.RECT,
      center: rectGeometry.center,
      width: (rectGeometry as any).width,
      height: (rectGeometry as any).height,
      bounds: rectGeometry.bounds
    };
  }

  // 调试信息
  getDebugInfo(): object {
    return {
      enabled: this._enabled,
      spatialGrid: this._spatialGrid.getDebugInfo()
    };
  }
}
