import { Point, Rect } from '../../types';
import { Vector2 } from '../math';
import { ISceneNode } from '../scene/SceneNode';

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
 * 碰撞形状接口
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
 * 空间分割网格
 */
export class SpatialGrid {
  private _cellSize: number;
  private _grid: Map<string, Set<ISceneNode>> = new Map();
  private _nodeCells: Map<ISceneNode, Set<string>> = new Map();

  constructor(cellSize: number = 100) {
    this._cellSize = cellSize;
  }

  insert(node: ISceneNode): void {
    const bounds = node.getBounds();
    const cells = this.getCellsForBounds(bounds);
    
    this._nodeCells.set(node, cells);
    
    for (const cellKey of cells) {
      if (!this._grid.has(cellKey)) {
        this._grid.set(cellKey, new Set());
      }
      this._grid.get(cellKey)!.add(node);
    }
  }

  remove(node: ISceneNode): void {
    const cells = this._nodeCells.get(node);
    if (!cells) return;

    for (const cellKey of cells) {
      const cell = this._grid.get(cellKey);
      if (cell) {
        cell.delete(node);
        if (cell.size === 0) {
          this._grid.delete(cellKey);
        }
      }
    }

    this._nodeCells.delete(node);
  }

  update(node: ISceneNode): void {
    this.remove(node);
    this.insert(node);
  }

  query(bounds: Rect): Set<ISceneNode> {
    const cells = this.getCellsForBounds(bounds);
    const result = new Set<ISceneNode>();

    for (const cellKey of cells) {
      const cell = this._grid.get(cellKey);
      if (cell) {
        for (const node of cell) {
          result.add(node);
        }
      }
    }

    return result;
  }

  queryPoint(point: Point): Set<ISceneNode> {
    const cellKey = this.getCellKey(point.x, point.y);
    return this._grid.get(cellKey) || new Set();
  }

  clear(): void {
    this._grid.clear();
    this._nodeCells.clear();
  }

  private getCellsForBounds(bounds: Rect): Set<string> {
    const cells = new Set<string>();
    
    const startX = Math.floor(bounds.x / this._cellSize);
    const endX = Math.floor((bounds.x + bounds.width) / this._cellSize);
    const startY = Math.floor(bounds.y / this._cellSize);
    const endY = Math.floor((bounds.y + bounds.height) / this._cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.add(this.getCellKey(x * this._cellSize, y * this._cellSize));
      }
    }

    return cells;
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this._cellSize);
    const cellY = Math.floor(y / this._cellSize);
    return `${cellX},${cellY}`;
  }

  getDebugInfo(): object {
    return {
      cellSize: this._cellSize,
      gridSize: this._grid.size,
      totalNodes: this._nodeCells.size
    };
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
        distance: Vector2.distance(new Vector2(shapeA.center.x, shapeA.center.y), new Vector2(shapeB.center.x, shapeB.center.y)),
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
      return { hit: false, node: null, point: origin, distance: Infinity, normal: new Vector2(0, 0) };
    }

    const t = tmin > 0 ? tmin : tmax;
    const hitPoint = originVec.add(direction.multiplyScalar(t));
    
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
      node: null,
      point: { x: hitPoint.x, y: hitPoint.y },
      distance: t,
      normal
    };
  }

  private circleCircleCollision(circleA: CircleShape, circleB: CircleShape): CollisionResult {
    const centerA = new Vector2(circleA.center.x, circleA.center.y);
    const centerB = new Vector2(circleB.center.x, circleB.center.y);
    const distance = centerA.distance(centerB);
    const radiusSum = circleA.radius + circleB.radius;

    if (distance <= radiusSum) {
      const normal = centerB.subtract(centerA).normalize();
      const penetration = radiusSum - distance;
      const contactPoint = centerA.add(normal.multiplyScalar(circleA.radius));

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

  private rectRectCollision(rectA: RectShape, rectB: RectShape): CollisionResult {
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

      const contactPoint = centerA.add(normal.multiplyScalar(penetration / 2));

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

  private circleRectCollision(circle: CircleShape, rect: RectShape): CollisionResult {
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

  private boundsCollision(boundsA: Rect, boundsB: Rect): CollisionResult {
    if (this.boundsIntersect(boundsA, boundsB)) {
      const centerA = new Vector2(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height / 2);
      const centerB = new Vector2(boundsB.x + boundsB.width / 2, boundsB.y + boundsB.height / 2);
      const distance = centerA.distance(centerB);

      return {
        hasCollision: true,
        distance,
        normal: centerB.subtract(centerA).normalize(),
        penetration: 0,
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

  private boundsIntersect(a: Rect, b: Rect): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  // 工具方法
  createCircleShape(center: Point, radius: number): CircleShape {
    return {
      type: CollisionType.CIRCLE,
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

  createRectShape(bounds: Rect): RectShape {
    return {
      type: CollisionType.RECT,
      center: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      },
      width: bounds.width,
      height: bounds.height,
      bounds
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
