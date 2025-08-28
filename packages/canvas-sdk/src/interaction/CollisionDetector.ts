/**
 * 碰撞检测器实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { ICollisionDetector } from './types';
import { IShape } from '../scene/IShape';

/**
 * 边界框接口
 */
interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 碰撞检测器
 */
export class CollisionDetector implements ICollisionDetector {
  private items: IShape[] = [];
  public enabled = true;

  addItem(item: IShape): void {
    if (!this.items.includes(item)) {
      this.items.push(item);
    }
  }

  removeItem(item: IShape): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  hitTest(point: IPoint): IShape | null {
    if (!this.enabled) return null;

    // 从上到下测试（按zIndex倒序）
    const sortedItems = [...this.items]
      .filter(item => item.visible)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const item of sortedItems) {
      if (item.hitTest && item.hitTest(point)) {
        return item;
      }
    }

    return null;
  }

  hitTestAll(point: IPoint): IShape[] {
    if (!this.enabled) return [];

    return this.items
      .filter(item => item.visible && item.hitTest && item.hitTest(point))
      .sort((a, b) => b.zIndex - a.zIndex);
  }

  boundsTest(bounds: IBounds): IShape[] {
    if (!this.enabled) return [];

    return this.items.filter(item => {
      if (!item.visible) return false;

      // 获取item的边界框
      const itemBounds = this.getItemBounds(item);
      if (!itemBounds) return false;

      // 检测矩形相交
      return this.boundsIntersect(bounds, itemBounds);
    });
  }

  clear(): void {
    this.items = [];
  }

  updateItems(items: IShape[]): void {
    this.items = [...items];
  }

  private getItemBounds(item: IShape): IBounds | null {
    // 如果item有getBounds方法，使用它
    if (typeof item.getBounds === 'function') {
      return item.getBounds();
    }

    // 否则根据position和size计算
    if (item.position && item.size) {
      return {
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height
      };
    }

    return null;
  }

  private boundsIntersect(bounds1: IBounds, bounds2: IBounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  // 高级碰撞检测方法
  
  /**
   * 圆形碰撞检测
   */
  circleTest(center: IPoint, radius: number): IShape[] {
    if (!this.enabled) return [];

    return this.items.filter(item => {
      if (!item.visible) return false;

      const itemBounds = this.getItemBounds(item);
      if (!itemBounds) return false;

      // 简化：检测圆形与矩形的碰撞
      return this.circleRectIntersect(center, radius, itemBounds);
    });
  }

  /**
   * 射线检测
   */
  rayTest(origin: IPoint, direction: IPoint, maxDistance: number = Infinity): IShape[] {
    if (!this.enabled) return [];

    const hits: { item: IShape; distance: number }[] = [];

    for (const item of this.items) {
      if (!item.visible) continue;

      const itemBounds = this.getItemBounds(item);
      if (!itemBounds) continue;

      const distance = this.rayRectIntersect(origin, direction, itemBounds);
      if (distance !== null && distance <= maxDistance) {
        hits.push({ item, distance });
      }
    }

    // 按距离排序
    return hits
      .sort((a, b) => a.distance - b.distance)
      .map(hit => hit.item);
  }

  private circleRectIntersect(center: IPoint, radius: number, rect: IBounds): boolean {
    // 找到矩形上离圆心最近的点
    const closestX = Math.max(rect.x, Math.min(center.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(center.y, rect.y + rect.height));

    // 计算距离
    const distanceX = center.x - closestX;
    const distanceY = center.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared <= radius * radius;
  }

  private rayRectIntersect(origin: IPoint, direction: IPoint, rect: IBounds): number | null {
    // 简化的射线-矩形相交测试
    const invDirX = 1 / direction.x;
    const invDirY = 1 / direction.y;

    const t1 = (rect.x - origin.x) * invDirX;
    const t2 = (rect.x + rect.width - origin.x) * invDirX;
    const t3 = (rect.y - origin.y) * invDirY;
    const t4 = (rect.y + rect.height - origin.y) * invDirY;

    const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    // 射线错过了矩形
    if (tMax < 0 || tMin > tMax) {
      return null;
    }

    return tMin >= 0 ? tMin : tMax;
  }
}