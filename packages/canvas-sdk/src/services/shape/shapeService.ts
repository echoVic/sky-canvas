/**
 * 形状服务 - 单一职责：管理形状实体的存储和 CRUD 操作
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ShapeEntity } from '../../models/entities/Shape';
import { RenderableShapeView } from '../../views/RenderableShapeView';
/**
 * 形状服务接口
 */
export interface IShapeService {
  readonly _serviceBrand: undefined;
  // 基础 CRUD
  addShape(entity: ShapeEntity): RenderableShapeView;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<ShapeEntity>): void;
  
  // 查询操作
  getShapeEntity(id: string): ShapeEntity | undefined;
  getShapeView(id: string): RenderableShapeView | undefined;
  getAllShapeEntities(): ShapeEntity[];
  getAllShapeViews(): RenderableShapeView[];
  getObjects(): IRenderable[];
  
  // 碰撞检测
  hitTest(x: number, y: number): string | null;
  
  // 清理操作
  clear(): void;
  
  // 统计信息
  getStats(): {
    totalShapes: number;
    visibleShapes: number;
    shapesByType: Record<string, number>;
  };
}

/**
 * 形状服务标识符
 */
export const IShapeService = createDecorator<IShapeService>('ShapeService');

/**
 * 形状服务实现
 */
export class ShapeService implements IShapeService {
  readonly _serviceBrand: undefined;
  private entities: Map<string, ShapeEntity> = new Map();
  private views: Map<string, RenderableShapeView> = new Map();

  /**
   * 添加形状
   */
  addShape(entity: ShapeEntity): RenderableShapeView {
    // 存储实体
    this.entities.set(entity.id, entity);
    
    // 创建视图
    const view = new RenderableShapeView(entity);
    this.views.set(entity.id, view);
    
    return view;
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    this.entities.delete(id);
    
    const view = this.views.get(id);
    if (view) {
      view.dispose();
      this.views.delete(id);
    }
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // 更新实体
    Object.assign(entity, { ...updates, updatedAt: new Date() });
    
    // 更新视图
    const view = this.views.get(id);
    if (view) {
      view.updateEntity(entity);
    }
  }

  /**
   * 获取形状实体
   */
  getShapeEntity(id: string): ShapeEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * 获取形状视图
   */
  getShapeView(id: string): RenderableShapeView | undefined {
    return this.views.get(id);
  }

  /**
   * 获取所有形状实体
   */
  getAllShapeEntities(): ShapeEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * 获取所有形状视图
   */
  getAllShapeViews(): RenderableShapeView[] {
    return Array.from(this.views.values());
  }

  /**
   * 获取可渲染对象数组
   */
  getObjects(): IRenderable[] {
    return Array.from(this.views.values());
  }

  /**
   * 碰撞检测
   */
  hitTest(x: number, y: number): string | null {
    // 按 z-index 从高到低检测
    const sortedViews = Array.from(this.views.entries())
      .sort(([,a], [,b]) => (b as any).zIndex - (a as any).zIndex);
    
    for (const [id, view] of sortedViews) {
      if ((view as any).visible && view.hitTest({ x, y })) {
        return id;
      }
    }
    
    return null;
  }

  /**
   * 清空所有形状
   */
  clear(): void {
    // 清理所有视图
    for (const view of this.views.values()) {
      view.dispose();
    }
    
    this.entities.clear();
    this.views.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalShapes: number;
    visibleShapes: number;
    shapesByType: Record<string, number>;
  } {
    const entities = Array.from(this.entities.values());
    const shapesByType: Record<string, number> = {};
    
    for (const entity of entities) {
      shapesByType[entity.type] = (shapesByType[entity.type] || 0) + 1;
    }
    
    return {
      totalShapes: entities.length,
      visibleShapes: entities.filter(e => e.visible).length,
      shapesByType
    };
  }
}