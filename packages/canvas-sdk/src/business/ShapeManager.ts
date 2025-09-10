/**
 * 形状管理器 - 业务层，不通过 DI
 * 直接被 ViewModel 使用，管理形状的 CRUD 操作
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { ShapeEntity } from '../models/entities/Shape';
import { RenderableShapeView } from '../views/RenderableShapeView';

/**
 * 形状管理器
 * 负责形状的增删改查，以及 Model-View 的映射
 */
export class ShapeManager {
  private entities: Map<string, ShapeEntity> = new Map();
  private views: Map<string, RenderableShapeView> = new Map();
  private selectedShapes: Set<string> = new Set();

  /**
   * 添加形状
   */
  addShape(entity: ShapeEntity): RenderableShapeView {
    // 存储 Model
    this.entities.set(entity.id, entity);
    
    // 创建 View（不需要工厂！）
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
    
    this.selectedShapes.delete(id);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // 更新 Model
    Object.assign(entity, { ...updates, updatedAt: new Date() });
    
    // 更新 View
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
  getRenderables(): IRenderable[] {
    return Array.from(this.views.values());
  }

  /**
   * 选择形状
   */
  selectShape(id: string): void {
    if (!this.entities.has(id)) return;
    
    this.selectedShapes.add(id);
    
    const view = this.views.get(id);
    if (view) {
      view.setSelected(true);
    }
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    this.selectedShapes.delete(id);
    
    const view = this.views.get(id);
    if (view) {
      view.setSelected(false);
    }
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    for (const id of this.selectedShapes) {
      const view = this.views.get(id);
      if (view) {
        view.setSelected(false);
      }
    }
    this.selectedShapes.clear();
  }

  /**
   * 获取选中的形状ID
   */
  getSelectedShapeIds(): string[] {
    return Array.from(this.selectedShapes);
  }

  /**
   * 获取选中的形状实体
   */
  getSelectedShapeEntities(): ShapeEntity[] {
    return Array.from(this.selectedShapes)
      .map(id => this.entities.get(id))
      .filter((entity): entity is ShapeEntity => entity !== undefined);
  }

  /**
   * 获取选中的形状视图
   */
  getSelectedShapeViews(): RenderableShapeView[] {
    return Array.from(this.selectedShapes)
      .map(id => this.views.get(id))
      .filter((view): view is RenderableShapeView => view !== undefined);
  }

  /**
   * 检查形状是否被选中
   */
  isShapeSelected(id: string): boolean {
    return this.selectedShapes.has(id);
  }

  /**
   * 多选形状
   */
  selectMultipleShapes(ids: string[]): void {
    for (const id of ids) {
      this.selectShape(id);
    }
  }

  /**
   * 全选形状
   */
  selectAllShapes(): void {
    const ids = Array.from(this.entities.keys());
    this.selectMultipleShapes(ids);
  }

  /**
   * 设置形状悬停状态
   */
  setShapeHovered(id: string, hovered: boolean): void {
    const view = this.views.get(id);
    if (view) {
      view.setHovered(hovered);
    }
  }

  /**
   * 根据点击位置查找形状
   */
  hitTest(x: number, y: number): string | null {
    // 按 z-index 从高到低检测
    const sortedViews = Array.from(this.views.entries())
      .sort(([,a], [,b]) => b.zIndex - a.zIndex);
    
    for (const [id, view] of sortedViews) {
      if (view.visible && view.hitTest({ x, y })) {
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
    this.selectedShapes.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalShapes: number;
    selectedShapes: number;
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
      selectedShapes: this.selectedShapes.size,
      visibleShapes: entities.filter(e => e.visible).length,
      shapesByType
    };
  }
}