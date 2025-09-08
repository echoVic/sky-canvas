/**
 * 形状服务实现
 */

import { Injectable, Inject } from '../di';
import { 
  IShapeService, 
  IEventBusService, 
  ILogService
} from '../di';

/**
 * 形状服务实现
 * 负责形状的管理、存储和操作
 */
@Injectable
export class ShapeService implements IShapeService {
  private shapes = new Map<string, any>();
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * 添加形状
   */
  addShape(shape: any): void {
    if (!shape || !shape.id) {
      throw new Error('Shape must have an id');
    }

    this.shapes.set(shape.id, shape);
    this.logger.debug('Shape added', { id: shape.id, type: shape.type });
    this.eventBus.emit('shape:added', { shape });
  }

  /**
   * 移除形状
   */
  removeShape(id: string): boolean {
    const shape = this.shapes.get(id);
    if (shape) {
      this.shapes.delete(id);
      this.logger.debug('Shape removed', { id });
      this.eventBus.emit('shape:removed', { shape });
      return true;
    }
    return false;
  }

  /**
   * 获取形状
   */
  getShape(id: string): any | undefined {
    return this.shapes.get(id);
  }

  /**
   * 获取所有形状
   */
  getAllShapes(): any[] {
    return Array.from(this.shapes.values());
  }

  /**
   * 获取所有形状（接口方法）
   */
  getShapes(): any[] {
    return this.getAllShapes();
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: any): boolean {
    const shape = this.shapes.get(id);
    if (shape) {
      Object.assign(shape, updates);
      this.logger.debug('Shape updated', { id, updates });
      this.eventBus.emit('shape:updated', { shape, updates });
      return true;
    }
    return false;
  }

  /**
   * 清空所有形状
   */
  clear(): void {
    const count = this.shapes.size;
    this.shapes.clear();
    this.logger.info('All shapes cleared', { count });
    this.eventBus.emit('shapes:cleared', { count });
  }

  /**
   * 清空所有形状（接口方法）
   */
  clearShapes(): void {
    this.clear();
  }

  /**
   * 获取形状数量
   */
  getShapeCount(): number {
    return this.shapes.size;
  }

  /**
   * 检查形状是否存在
   */
  hasShape(id: string): boolean {
    return this.shapes.has(id);
  }

  /**
   * 根据类型获取形状
   */
  getShapesByType(type: string): any[] {
    return Array.from(this.shapes.values()).filter(shape => shape.type === type);
  }

  /**
   * 点击测试
   */
  hitTest(point: { x: number; y: number }): any | null {
    // 从上到下测试形状（z-index 高的优先）
    const sortedShapes = this.getAllShapes().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    for (const shape of sortedShapes) {
      if (shape.hitTest && shape.hitTest(point)) {
        return shape;
      }
    }
    
    return null;
  }

  /**
   * 区域测试
   */
  hitTestBounds(bounds: { x: number; y: number; width: number; height: number }): any[] {
    const results: any[] = [];
    
    for (const shape of this.shapes.values()) {
      if (this.shapeIntersectsBounds(shape, bounds)) {
        results.push(shape);
      }
    }
    
    return results;
  }

  /**
   * 检查形状是否与边界相交
   */
  private shapeIntersectsBounds(shape: any, bounds: { x: number; y: number; width: number; height: number }): boolean {
    if (!shape.getBounds) return false;
    
    const shapeBounds = shape.getBounds();
    
    return !(
      shapeBounds.x + shapeBounds.width < bounds.x ||
      bounds.x + bounds.width < shapeBounds.x ||
      shapeBounds.y + shapeBounds.height < bounds.y ||
      bounds.y + bounds.height < shapeBounds.y
    );
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    this.clear();
    this.logger.info('Shape service disposed');
  }
}
