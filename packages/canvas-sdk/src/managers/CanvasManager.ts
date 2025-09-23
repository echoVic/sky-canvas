/**
 * Canvas 管理器 - 基于 VSCode DI 架构
 * 通过构造函数注入使用依赖服务
 */

import { IRenderable, Shape } from '@sky-canvas/render-engine';
import { createDecorator } from '../di';
import {
  ICanvasRenderingService,
  IClipboardService,
  IEventBusService,
  IHistoryService,
  ILogService,
  ISelectionService,
  IZIndexService
} from '../services';

/**
 * Canvas 管理器接口
 */
export interface ICanvasManager {
  readonly _serviceBrand: undefined;
  
  // 形状管理
  addShape(shape: Shape): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<Shape>): void;
  getObjects(): IRenderable[];
  hitTest(x: number, y: number): string | null;
  
  // 选择管理
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  getSelectedShapes(): Shape[];
  isShapeSelected(id: string): boolean;
  
  // 剪贴板操作
  copySelectedShapes(): void;
  cutSelectedShapes(): void;
  paste(): Shape[];
  
  // 历史操作
  undo(): void;
  redo(): void;

  // Z轴管理
  bringToFront(shapeIds: string[]): void;
  sendToBack(shapeIds: string[]): void;
  bringForward(shapeIds: string[]): void;
  sendBackward(shapeIds: string[]): void;
  setZIndex(shapeIds: string[], zIndex: number): void;
  getShapesByZOrder(): Shape[];

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
  private shapes = new Map<string, Shape>();

  constructor(
    @IEventBusService private eventBus: any,
    @ILogService private logService: any,
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
  addShape(shape: Shape): void {
    this.logService.info('CanvasManager.addShape called:', shape.id);

    // 存储形状
    this.shapes.set(shape.id, shape);

    // 直接添加到渲染服务 - Shape 本身就是 IRenderable
    this.renderingService.addObject(shape);

    // 记录到历史
    this.historyService.execute({
      execute: () => {}, // 已经执行了，不需要重复
      undo: () => this.removeShape(shape.id)
    });

    // 发布事件
    this.eventBus.emit('canvas:shapeAdded', { shape });
    this.logService.debug(`Shape added: ${shape.id}`);
  }

  /**
   * 移除形状
   */
  removeShape(id: string): void {
    const shape = this.shapes.get(id);
    if (!shape) return;

    // 从渲染服务中移除
    this.renderingService.removeObject(id);

    // 从内存中移除
    this.shapes.delete(id);

    // 记录到历史
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => this.addShape(shape)
    });

    // 发布事件
    this.eventBus.emit('canvas:shapeRemoved', { id });
    this.logService.debug(`Shape removed: ${id}`);
  }

  /**
   * 更新形状
   */
  updateShape(id: string, updates: Partial<Shape>): void {
    const shape = this.shapes.get(id);
    if (!shape) return;

    // 保存旧值用于撤销
    const oldValues = {
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      scaleX: shape.scaleX,
      scaleY: shape.scaleY,
      visible: shape.visible,
      zIndex: shape.zIndex
    };

    // 直接更新 Shape 对象的属性
    Object.assign(shape, updates);

    // 记录到历史
    this.historyService.execute({
      execute: () => {},  // 已经执行了，不需要重复
      undo: () => Object.assign(shape, oldValues)
    });

    // 发布事件
    this.eventBus.emit('canvas:shapeUpdated', { id, updates });
    this.logService.debug(`Shape updated: ${id}`);
  }

  /**
   * 获取所有可渲染对象
   */
  getObjects(): IRenderable[] {
    return Array.from(this.shapes.values());
  }

  /**
   * 点击测试
   */
  hitTest(x: number, y: number): string | null {
    // 按 z-index 从高到低检测
    const sortedShapes = Array.from(this.shapes.values())
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const shape of sortedShapes) {
      if (shape.visible && shape.hitTest({ x, y })) {
        return shape.id;
      }
    }

    return null;
  }

  // === 选择管理 ===
  
  /**
   * 选择形状
   */
  selectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (!shape) return;

    // 使用 SelectionService 管理选择状态
    this.selectionService.select([shape]);

    // 发布事件
    this.eventBus.emit('canvas:shapeSelected', { id, shape });
    this.logService.debug(`Shape selected: ${id}`);
  }

  /**
   * 取消选择形状
   */
  deselectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (!shape) return;

    // 使用 SelectionService 管理选择状态
    this.selectionService.deselect([shape]);

    // 发布事件
    this.eventBus.emit('canvas:shapeDeselected', { id, shape });
    this.logService.debug(`Shape deselected: ${id}`);
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    // 清空 SelectionService 的状态
    this.selectionService.clearSelection();
    
    // 选择状态由 SelectionService 管理，无需额外清理
    
    // 发布事件
    this.eventBus.emit('canvas:selectionCleared', {});
    this.logService.debug('Selection cleared');
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): Shape[] {
    return this.selectionService.getSelectedShapes() as Shape[];
  }

  /**
   * 检查是否选中
   */
  isShapeSelected(id: string): boolean {
    const shape = this.shapes.get(id);
    return shape ? this.selectionService.isSelected(shape) : false;
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
  paste(): Shape[] {
    const pastedShapes = this.clipboardService.paste();
    if (!pastedShapes || pastedShapes.length === 0) return [];

    // 添加粘贴的形状
    pastedShapes.forEach((shape: any) => {
      this.addShape(shape as Shape);
    });

    // 选中粘贴的形状
    this.clearSelection();
    pastedShapes.forEach((shape: any) => {
      this.selectShape(shape.id);
    });

    this.eventBus.emit('canvas:shapesPasted', { count: pastedShapes.length });
    this.logService.debug(`Pasted ${pastedShapes.length} shapes`);

    return pastedShapes as Shape[];
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
    const shapes = Array.from(this.shapes.values());
    const shapesByType: Record<string, number> = {};

    // 统计每种类型的形状数量
    for (const shape of shapes) {
      const type = (shape as any).constructor.name.toLowerCase(); // Circle -> circle
      shapesByType[type] = (shapesByType[type] || 0) + 1;
    }

    return {
      shapes: {
        totalShapes: shapes.length,
        visibleShapes: shapes.filter(s => s.visible).length,
        shapesByType,
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
    // 清空所有形状
    this.shapes.clear();
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
      .map(id => this.shapes.get(id))
      .filter(shape => shape !== undefined) as Shape[];

    if (shapesToMove.length === 0) return;

    const allShapes = Array.from(this.shapes.values());
    const updatedShapes = this.zIndexService.bringToFront(shapesToMove, allShapes);

    this.eventBus.emit('canvas:shapesBroughtToFront', { shapeIds });
    this.logService.debug(`Brought ${shapeIds.length} shapes to front`);
  }

  /**
   * 置底 - 将形状移到最后面
   */
  sendToBack(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapes.get(id))
      .filter(shape => shape !== undefined) as Shape[];

    if (shapesToMove.length === 0) return;

    const allShapes = Array.from(this.shapes.values());
    const updatedShapes = this.zIndexService.sendToBack(shapesToMove, allShapes);

    this.eventBus.emit('canvas:shapesSentToBack', { shapeIds });
    this.logService.debug(`Sent ${shapeIds.length} shapes to back`);
  }

  /**
   * 上移一层
   */
  bringForward(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapes.get(id))
      .filter(shape => shape !== undefined) as Shape[];

    if (shapesToMove.length === 0) return;

    const allShapes = Array.from(this.shapes.values());
    const updatedShapes = this.zIndexService.bringForward(shapesToMove, allShapes);

    this.eventBus.emit('canvas:shapesBroughtForward', { shapeIds });
    this.logService.debug(`Brought ${shapeIds.length} shapes forward`);
  }

  /**
   * 下移一层
   */
  sendBackward(shapeIds: string[]): void {
    if (shapeIds.length === 0) return;

    const shapesToMove = shapeIds
      .map(id => this.shapes.get(id))
      .filter(shape => shape !== undefined) as Shape[];

    if (shapesToMove.length === 0) return;

    const allShapes = Array.from(this.shapes.values());
    const updatedShapes = this.zIndexService.sendBackward(shapesToMove, allShapes);

    this.eventBus.emit('canvas:shapesSentBackward', { shapeIds });
    this.logService.debug(`Sent ${shapeIds.length} shapes backward`);
  }

  /**
   * 设置指定的zIndex值
   */
  setZIndex(shapeIds: string[], zIndex: number): void {
    if (shapeIds.length === 0) return;

    const shapesToUpdate = shapeIds
      .map(id => this.shapes.get(id))
      .filter(shape => shape !== undefined) as Shape[];

    if (shapesToUpdate.length === 0) return;

    const updatedShapes = this.zIndexService.setZIndex(shapesToUpdate, zIndex);

    this.eventBus.emit('canvas:shapesZIndexSet', { shapeIds, zIndex });
    this.logService.debug(`Set zIndex to ${zIndex} for ${shapeIds.length} shapes`);
  }

  /**
   * 获取按Z轴顺序排序的形状列表
   */
  getShapesByZOrder(): Shape[] {
    const allShapes = Array.from(this.shapes.values());
    return this.zIndexService.getSortedShapes(allShapes);
  }


  /**
   * 销毁管理器
   */
  dispose(): void {
    this.shapes.clear();
    this.logService.info('CanvasManager disposed');
  }
}