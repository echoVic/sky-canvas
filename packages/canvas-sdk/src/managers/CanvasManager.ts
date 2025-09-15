/**
 * Canvas 管理器 - 基于 VSCode DI 架构
 * 通过构造函数注入使用依赖服务
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { createDecorator } from '../di';
import { ShapeEntity } from '../models/entities/Shape';
import {
  ICanvasRenderingService,
  IClipboardService,
  IEventBusService,
  IHistoryService,
  ILogService,
  ISelectionService,
  IShapeService,
  IZIndexService
} from '../services';

/**
 * Canvas 管理器接口
 */
export interface ICanvasManager {
  readonly _serviceBrand: undefined;
  
  // 形状管理
  addShape(entity: ShapeEntity): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<ShapeEntity>): void;
  getRenderables(): IRenderable[];
  hitTest(x: number, y: number): string | null;
  
  // 选择管理
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  getSelectedShapes(): ShapeEntity[];
  isShapeSelected(id: string): boolean;
  
  // 剪贴板操作
  copySelectedShapes(): void;
  cutSelectedShapes(): void;
  paste(): ShapeEntity[];
  
  // 历史操作
  undo(): void;
  redo(): void;

  // Z轴管理
  bringToFront(shapeIds: string[]): void;
  sendToBack(shapeIds: string[]): void;
  bringForward(shapeIds: string[]): void;
  sendBackward(shapeIds: string[]): void;
  setZIndex(shapeIds: string[], zIndex: number): void;
  getShapesByZOrder(): ShapeEntity[];

  // 状态查询
  getStats(): any;
  clear(): void;
  dispose(): void;
}

/**
 * Canvas 管理器服务标识符
 */
export const ICanvasManager = createDecorator<ICanvasManager>('CanvasManager');

/**
 * Canvas 管理器实现
 * 使用 VSCode DI 模式的构造函数注入
 */
export class CanvasManager implements ICanvasManager {
  readonly _serviceBrand: undefined;

  constructor(
    @IEventBusService private eventBus: any,
    @ILogService private logService: any,
    @IShapeService private shapeService: any,
    @ISelectionService private selectionService: any,
    @IClipboardService private clipboardService: any,
    @IHistoryService private historyService: any,
    @IZIndexService private zIndexService: any,
    @ICanvasRenderingService private renderingService: any
  ) {
    this.setupIntegration();
  }

  /**
   * 设置 Services 集成
   */
  private setupIntegration(): void {
    // 记录操作日志
    this.logService.info('CanvasManager initialized');
  }

  // === 形状管理 ===
  
  /**
   * 添加形状
   */
  addShape(entity: ShapeEntity): void {
    this.logService.info('CanvasManager.addShape called:', entity);

    const view = this.shapeService.addShape(entity);
    this.logService.info('Shape view created:', view);

    // 添加到渲染服务
    this.logService.info('Adding to rendering service...');
    this.renderingService.addRenderable(view);

    // 记录到历史
    this.historyService.execute({
      execute: () => {}, // 已经执行了，不需要重复
      undo: () => this.shapeService.removeShape(entity.id)
    });

    // 发布事件
    this.eventBus.emit('canvas:shapeAdded', { entity, view });
    this.logService.debug(`Shape added: ${entity.id}`);
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    // 从渲染服务中移除
    this.renderingService.removeRenderable(id);

    this.shapeService.removeShape(id);

    // 记录到历史
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => this.shapeService.addShape(entity)
    });

    // 发布事件
    this.eventBus.emit('canvas:shapeRemoved', { id });
    this.logService.debug(`Shape removed: ${id}`);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const oldEntity = this.shapeService.getShapeEntity(id);
    if (!oldEntity) return;
    
    this.shapeService.updateShape(id, updates);
    
    // 记录到历史 - 保存旧值用于撤销
    const oldValues = { 
      transform: { ...oldEntity.transform }, 
      style: { ...oldEntity.style }
    };
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => this.shapeService.updateShape(id, oldValues)
    });
    
    // 发布事件
    this.eventBus.emit('canvas:shapeUpdated', { id, updates });
    this.logService.debug(`Shape updated: ${id}`);
  }

  /**
   * 获取所有可渲染对象
   */
  getRenderables(): IRenderable[] {
    return this.shapeService.getRenderables();
  }

  /**
   * 点击测试
   */
  hitTest(x: number, y: number): string | null {
    return this.shapeService.hitTest(x, y);
  }

  // === 选择管理 ===
  
  /**
   * 选择形状
   */
  selectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;
    
    // 使用 SelectionService 管理选择状态
    this.selectionService.select([entity]);
    
    // TODO: 通过 ShapeService 更新视觉状态
    // const view = this.shapeService.getShapeView(id);
    // if (view) view.setSelected(true);
    
    // 发布事件
    this.eventBus.emit('canvas:shapeSelected', { id, entity });
    this.logService.debug(`Shape selected: ${id}`);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;
    
    // 使用 SelectionService 管理选择状态
    this.selectionService.deselect([entity]);
    
    // TODO: 通过 ShapeService 更新视觉状态
    // const view = this.shapeService.getShapeView(id);
    // if (view) view.setSelected(false);
    
    // 发布事件
    this.eventBus.emit('canvas:shapeDeselected', { id, entity });
    this.logService.debug(`Shape deselected: ${id}`);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    // 清空 SelectionService 的状态
    this.selectionService.clearSelection();
    
    // TODO: 通过 ShapeService 清空视觉状态
    // const views = this.shapeService.getAllShapeViews();
    // views.forEach(view => view.setSelected(false));
    
    // 发布事件
    this.eventBus.emit('canvas:selectionCleared', {});
    this.logService.debug('Selection cleared');
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeEntity[] {
    return this.selectionService.getSelectedShapes() as ShapeEntity[];
  }

  /**
   * 检查是否选中
   */
  isShapeSelected(id: string): boolean {
    const entity = this.shapeService.getShapeEntity(id);
    return entity ? this.selectionService.isSelected(entity) : false;
  }

  // === 剪贴板操作 ===
  
  /**
   * 复制选中的形状
   */
  copySelectedShapes(): void {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length === 0) return;
    
    this.clipboardService.copy(selectedShapes);
    this.eventBus.emit('canvas:shapesCopied', { count: selectedShapes.length });
    this.logService.debug(`Copied ${selectedShapes.length} shapes`);
  }

  /**
   * 剪切选中的形状
   */
  cutSelectedShapes(): void {
    const selectedShapes = this.getSelectedShapes();
    if (selectedShapes.length === 0) return;
    
    // 先复制到剪贴板
    this.clipboardService.cut(selectedShapes);
    
    // 然后删除选中的形状
    selectedShapes.forEach(shape => {
      this.removeShape(shape.id);
    });
    
    this.eventBus.emit('canvas:shapesCut', { count: selectedShapes.length });
    this.logService.debug(`Cut ${selectedShapes.length} shapes`);
  }

  /**
   * 粘贴形状
   */
  paste(): ShapeEntity[] {
    const pastedShapes = this.clipboardService.paste();
    if (!pastedShapes || pastedShapes.length === 0) return [];
    
    // 添加粘贴的形状
    pastedShapes.forEach((shape: any) => {
      this.addShape(shape as ShapeEntity);
    });
    
    // 选中粘贴的形状
    this.clearSelection();
    pastedShapes.forEach((shape: any) => {
      this.selectShape(shape.id);
    });
    
    this.eventBus.emit('canvas:shapesPasted', { count: pastedShapes.length });
    this.logService.debug(`Pasted ${pastedShapes.length} shapes`);
    
    return pastedShapes as ShapeEntity[];
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
    const shapeStats = this.shapeService.getStats();
    return {
      shapes: {
        ...shapeStats,
        selectedShapes: this.selectionService.getSelectionCount()
      },
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
    this.shapeService.clear();
    this.selectionService.clearSelection();
    this.historyService.clear();
    
    this.eventBus.emit('canvas:cleared', {});
    this.logService.info('Canvas cleared');
  }

  // === Z轴管理 ===

  /**
   * 置顶 - 将形状移到最前面
   */
  bringToFront(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapeService.getShapeEntity(id))
      .filter(shape => shape !== null) as ShapeEntity[];

    if (shapesToMove.length === 0) return;

    const allShapes = this.shapeService.getAllShapeEntities() as ShapeEntity[];
    const updatedShapes = this.zIndexService.bringToFront(shapesToMove, allShapes);

    // 批量更新形状
    this.batchUpdateShapes(updatedShapes);

    this.eventBus.emit('canvas:shapesBroughtToFront', { shapeIds });
    this.logService.debug(`Brought ${shapeIds.length} shapes to front`);
  }

  /**
   * 置底 - 将形状移到最后面
   */
  sendToBack(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapeService.getShapeEntity(id))
      .filter(shape => shape !== null) as ShapeEntity[];

    if (shapesToMove.length === 0) return;

    const allShapes = this.shapeService.getAllShapeEntities() as ShapeEntity[];
    const updatedShapes = this.zIndexService.sendToBack(shapesToMove, allShapes);

    this.batchUpdateShapes(updatedShapes);

    this.eventBus.emit('canvas:shapesSentToBack', { shapeIds });
    this.logService.debug(`Sent ${shapeIds.length} shapes to back`);
  }

  /**
   * 上移一层
   */
  bringForward(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapeService.getShapeEntity(id))
      .filter(shape => shape !== null) as ShapeEntity[];

    if (shapesToMove.length === 0) return;

    const allShapes = this.shapeService.getAllShapeEntities() as ShapeEntity[];
    const updatedShapes = this.zIndexService.bringForward(shapesToMove, allShapes);

    this.batchUpdateShapes(updatedShapes);

    this.eventBus.emit('canvas:shapesBroughtForward', { shapeIds });
    this.logService.debug(`Brought ${shapeIds.length} shapes forward`);
  }

  /**
   * 下移一层
   */
  sendBackward(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapeService.getShapeEntity(id))
      .filter(shape => shape !== null) as ShapeEntity[];

    if (shapesToMove.length === 0) return;

    const allShapes = this.shapeService.getAllShapeEntities() as ShapeEntity[];
    const updatedShapes = this.zIndexService.sendBackward(shapesToMove, allShapes);

    this.batchUpdateShapes(updatedShapes);

    this.eventBus.emit('canvas:shapesSentBackward', { shapeIds });
    this.logService.debug(`Sent ${shapeIds.length} shapes backward`);
  }

  /**
   * 设置指定的zIndex值
   */
  setZIndex(shapeIds: string[], zIndex: number): void {
    if (shapeIds.length === 0) return;

    const shapesToUpdate = shapeIds
      .map(id => this.shapeService.getShapeEntity(id))
      .filter(shape => shape !== null) as ShapeEntity[];

    if (shapesToUpdate.length === 0) return;

    const updatedShapes = this.zIndexService.setZIndex(shapesToUpdate, zIndex);

    updatedShapes.forEach((shape: ShapeEntity) => {
      this.shapeService.updateShapeEntity(shape.id, shape);
    });

    this.eventBus.emit('canvas:shapesZIndexSet', { shapeIds, zIndex });
    this.logService.debug(`Set zIndex to ${zIndex} for ${shapeIds.length} shapes`);
  }

  /**
   * 获取按Z轴顺序排序的形状列表
   */
  getShapesByZOrder(): ShapeEntity[] {
    const allShapes = this.shapeService.getAllShapeEntities() as ShapeEntity[];
    return this.zIndexService.getSortedShapes(allShapes);
  }

  /**
   * 批量更新形状实体
   */
  private batchUpdateShapes(shapes: ShapeEntity[]): void {
    shapes.forEach((shape: ShapeEntity) => {
      this.shapeService.updateShapeEntity(shape.id, shape);
    });
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.shapeService.clear();
    this.logService.info('CanvasManager disposed');
  }
}