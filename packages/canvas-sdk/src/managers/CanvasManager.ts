/**
 * Canvas 总管理器 - 协调 Services 和 Business 层
 * 为视图层提供统一的操作接口
 */

import { Container } from '../container/Container';
import { IRenderable } from '@sky-canvas/render-engine';
import { ShapeManager } from '../business/ShapeManager';
import { SelectionManager } from '../business/selection/SelectionManager';
import { ISelectionService, IEventBusService, IHistoryService, ILogService } from '../services';
import { ShapeEntity } from '../models/entities/Shape';

/**
 * Canvas 管理器
 * 集成 DI Services 和 Business Managers，为视图层提供统一接口
 */
export class CanvasManager {
  private shapeManager: ShapeManager;
  private selectionManager: SelectionManager;
  
  // DI Services
  private selectionService: ISelectionService;
  private eventBus: IEventBusService;
  private historyService: IHistoryService;
  private logService: ILogService;

  constructor(private container: Container) {
    // 初始化 Business 层
    this.shapeManager = new ShapeManager();
    this.selectionManager = new SelectionManager();
    
    // 获取 DI Services
    this.selectionService = container.get<ISelectionService>('ISelectionService');
    this.eventBus = container.get<IEventBusService>('IEventBusService');
    this.historyService = container.get<IHistoryService>('IHistoryService');
    this.logService = container.get<ILogService>('ILogService');
    
    this.setupIntegration();
  }

  /**
   * 设置 Services 和 Business 层的集成
   */
  private setupIntegration(): void {
    // 将 Business 层的选择变化同步到 Service 层
    this.selectionManager.on('selectionChanged', (event) => {
      this.selectionService.select(event.selected);
      this.eventBus.emit('canvas:selectionChanged', event);
    });
    
    // 记录操作日志
    this.logService.info('CanvasManager initialized');
  }

  // === 形状管理 ===
  
  /**
   * 添加形状
   */
  addShape(entity: ShapeEntity): void {
    const view = this.shapeManager.addShape(entity);
    
    // 记录到历史
    this.historyService.execute({
      execute: () => {}, // 已经执行了，不需要重复
      undo: () => this.shapeManager.removeShape(entity.id)
    });
    
    // 发布事件
    this.eventBus.emit('canvas:shapeAdded', { entity, view });
    this.logService.debug(`Shape added: ${entity.id}`);
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    const entity = this.shapeManager.getShapeEntity(id);
    if (!entity) return;
    
    this.shapeManager.removeShape(id);
    
    // 记录到历史
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => this.shapeManager.addShape(entity)
    });
    
    // 发布事件
    this.eventBus.emit('canvas:shapeRemoved', { id });
    this.logService.debug(`Shape removed: ${id}`);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const oldEntity = this.shapeManager.getShapeEntity(id);
    if (!oldEntity) return;
    
    this.shapeManager.updateShape(id, updates);
    
    // 记录到历史 - 保存旧值用于撤销
    const oldValues = { 
      transform: { ...oldEntity.transform }, 
      style: { ...oldEntity.style }
    };
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => this.shapeManager.updateShape(id, oldValues)
    });
    
    // 发布事件
    this.eventBus.emit('canvas:shapeUpdated', { id, updates });
    this.logService.debug(`Shape updated: ${id}`);
  }

  /**
   * 获取所有可渲染对象
   */
  getRenderables(): IRenderable[] {
    return this.shapeManager.getRenderables();
  }

  /**
   * 点击测试
   */
  hitTest(x: number, y: number): string | null {
    return this.shapeManager.hitTest(x, y);
  }

  // === 选择管理 ===
  
  /**
   * 选择形状
   */
  selectShape(id: string): void {
    const entity = this.shapeManager.getShapeEntity(id);
    if (!entity) return;
    
    // 使用 Business 层的选择管理
    this.selectionManager.select(entity);
    
    // 同步到 ShapeManager 的视觉状态
    this.shapeManager.selectShape(id);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    const entity = this.shapeManager.getShapeEntity(id);
    if (!entity) return;
    
    this.selectionManager.deselect(entity);
    this.shapeManager.deselectShape(id);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
    this.shapeManager.clearSelection();
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeEntity[] {
    return this.shapeManager.getSelectedShapeEntities();
  }

  /**
   * 检查是否选中
   */
  isShapeSelected(id: string): boolean {
    return this.shapeManager.isShapeSelected(id);
  }

  // === 历史操作 ===
  
  /**
   * 撤销
   */
  undo(): void {
    this.historyService.undo();
    this.eventBus.emit('canvas:historyChanged', { canUndo: this.historyService.canUndo(), canRedo: this.historyService.canRedo() });
  }

  /**
   * 重做
   */
  redo(): void {
    this.historyService.redo();
    this.eventBus.emit('canvas:historyChanged', { canUndo: this.historyService.canUndo(), canRedo: this.historyService.canRedo() });
  }

  // === 状态查询 ===
  
  /**
   * 获取画布统计信息
   */
  getStats(): {
    shapes: { totalShapes: number; selectedShapes: number; visibleShapes: number; shapesByType: Record<string, number> };
    history: { canUndo: boolean; canRedo: boolean };
  } {
    return {
      shapes: this.shapeManager.getStats(),
      history: {
        canUndo: this.historyService.canUndo(),
        canRedo: this.historyService.canRedo()
      }
    };
  }

  /**
   * 清空画布
   */
  clear(): void {
    this.shapeManager.clear();
    this.selectionManager.clearSelection();
    this.selectionService.clearSelection();
    this.historyService.clear();
    
    this.eventBus.emit('canvas:cleared', {});
    this.logService.info('Canvas cleared');
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.shapeManager.clear();
    this.logService.info('CanvasManager disposed');
  }
}