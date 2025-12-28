/**
 * Canvas 管理器 - 基于 VSCode DI 架构
 * 通过构造函数注入使用依赖服务
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { IShapeEntity, ShapeEntity } from '../models/entities/Shape';
import {
  IClipboardService,
  IEventBusService,
  IHistoryService,
  ILogService,
  ISelectionService,
  IShapeService,
  IZIndexService
} from '../services';
import { CanvasStats, ICanvasManager } from './ICanvasManager';
import * as ZIndexMixin from './mixins/CanvasZIndexMixin';
import * as ClipboardMixin from './mixins/CanvasClipboardMixin';

// 重新导出接口
export { ICanvasManager } from './ICanvasManager';
export type { CanvasStats } from './ICanvasManager';

/**
 * Canvas 管理器实现
 * 使用 VSCode DI 模式的构造函数注入
 */
export class CanvasManager implements ICanvasManager {
  readonly _serviceBrand: undefined;

  constructor(
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logService: ILogService,
    @IShapeService private shapeService: IShapeService,
    @ISelectionService private selectionService: ISelectionService,
    @IClipboardService private clipboardService: IClipboardService,
    @IHistoryService private historyService: IHistoryService,
    @IZIndexService private zIndexService: IZIndexService
  ) {
    this.logService.info('CanvasManager initialized');
  }

  // === 形状管理 ===

  addShape(entity: ShapeEntity): void {
    const view = this.shapeService.addShape(entity);
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.removeShape(entity.id)
    });
    this.eventBus.emit('canvas:shapeAdded', { entity, view });
    this.logService.debug(`Shape added: ${entity.id}`);
  }

  removeShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    this.shapeService.removeShape(id);
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.addShape(entity)
    });
    this.eventBus.emit('canvas:shapeRemoved', { id });
    this.logService.debug(`Shape removed: ${id}`);
  }

  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    const oldEntity = this.shapeService.getShapeEntity(id);
    if (!oldEntity) return;

    this.shapeService.updateShape(id, updates);
    const oldValues = {
      transform: { ...oldEntity.transform },
      style: { ...oldEntity.style }
    };
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.updateShape(id, oldValues)
    });
    this.eventBus.emit('canvas:shapeUpdated', { id, updates });
    this.logService.debug(`Shape updated: ${id}`);
  }

  getRenderables(): IRenderable[] {
    return this.shapeService.getRenderables();
  }

  hitTest(x: number, y: number): string | null {
    return this.shapeService.hitTest(x, y);
  }

  // === 选择管理 ===

  selectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    this.selectionService.select([entity]);
    this.eventBus.emit('canvas:shapeSelected', { id, entity });
    this.logService.debug(`Shape selected: ${id}`);
  }

  deselectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    this.selectionService.deselect([entity]);
    this.eventBus.emit('canvas:shapeDeselected', { id, entity });
    this.logService.debug(`Shape deselected: ${id}`);
  }

  clearSelection(): void {
    this.selectionService.clearSelection();
    this.eventBus.emit('canvas:selectionCleared', {});
    this.logService.debug('Selection cleared');
  }

  getSelectedShapes(): ShapeEntity[] {
    return this.selectionService.getSelectedShapes() as ShapeEntity[];
  }

  isShapeSelected(id: string): boolean {
    const entity = this.shapeService.getShapeEntity(id);
    return entity ? this.selectionService.isSelected(entity) : false;
  }

  // === 剪贴板操作 (委托给 mixin) ===

  private get clipboardDeps(): ClipboardMixin.IClipboardDeps {
    return {
      clipboardService: this.clipboardService,
      eventBus: this.eventBus,
      logService: this.logService,
      getSelectedShapes: () => this.getSelectedShapes(),
      removeShape: (id) => this.removeShape(id),
      addShape: (shape) => this.addShape(shape),
      clearSelection: () => this.clearSelection(),
      selectShape: (id) => this.selectShape(id)
    };
  }

  copySelectedShapes(): void {
    ClipboardMixin.copySelectedShapes(this.clipboardDeps);
  }

  cutSelectedShapes(): void {
    ClipboardMixin.cutSelectedShapes(this.clipboardDeps);
  }

  paste(): ShapeEntity[] {
    return ClipboardMixin.paste(this.clipboardDeps);
  }

  // === 历史操作 ===

  undo(): void {
    this.historyService.undo();
    this.eventBus.emit('canvas:historyChanged', {
      canUndo: this.historyService.canUndo(),
      canRedo: this.historyService.canRedo()
    });
  }

  redo(): void {
    this.historyService.redo();
    this.eventBus.emit('canvas:historyChanged', {
      canUndo: this.historyService.canUndo(),
      canRedo: this.historyService.canRedo()
    });
  }

  // === Z轴管理 (委托给 mixin) ===

  private get zIndexDeps(): ZIndexMixin.IZIndexDeps {
    return {
      shapeService: this.shapeService,
      zIndexService: this.zIndexService,
      eventBus: this.eventBus,
      logService: this.logService
    };
  }

  bringToFront(shapeIds: string[]): void {
    ZIndexMixin.bringToFront(this.zIndexDeps, shapeIds);
  }

  sendToBack(shapeIds: string[]): void {
    ZIndexMixin.sendToBack(this.zIndexDeps, shapeIds);
  }

  bringForward(shapeIds: string[]): void {
    ZIndexMixin.bringForward(this.zIndexDeps, shapeIds);
  }

  sendBackward(shapeIds: string[]): void {
    ZIndexMixin.sendBackward(this.zIndexDeps, shapeIds);
  }

  setZIndex(shapeIds: string[], zIndex: number): void {
    ZIndexMixin.setZIndex(this.zIndexDeps, shapeIds, zIndex);
  }

  getShapesByZOrder(): IShapeEntity[] {
    return ZIndexMixin.getShapesByZOrder(this.zIndexDeps);
  }

  // === 状态查询 ===

  getStats(): CanvasStats {
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

  clear(): void {
    this.shapeService.clear();
    this.selectionService.clearSelection();
    this.historyService.clear();
    this.eventBus.emit('canvas:cleared', {});
    this.logService.info('Canvas cleared');
  }

  dispose(): void {
    this.shapeService.clear();
    this.logService.info('CanvasManager disposed');
  }
}
