/**
 * Canvas 管理器 - 基于 VSCode DI 架构
 * 通过构造函数注入使用依赖服务
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { proxy } from 'valtio';
import { IShapeEntity, ShapeEntity } from '../models/entities/Shape';
import {
  IClipboardService,
  IHistoryService,
  ILogService,
  ISelectionService,
  IShapeService,
  IZIndexService
} from '../services';
import { CanvasStats, ICanvasManager } from './ICanvasManager';
import * as ClipboardMixin from './mixins/CanvasClipboardMixin';
import * as ZIndexMixin from './mixins/CanvasZIndexMixin';

export interface CanvasState {
  shapeCount: number;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  hasClipboardData: boolean;
}

// 重新导出接口
export { ICanvasManager } from './ICanvasManager';
export type { CanvasStats } from './ICanvasManager';

/**
 * Canvas 管理器实现
 * 使用 VSCode DI 模式的构造函数注入
 */
export class CanvasManager implements ICanvasManager {
  readonly _serviceBrand: undefined;

  readonly state: CanvasState = proxy({
    shapeCount: 0,
    selectedIds: [],
    canUndo: false,
    canRedo: false,
    hasClipboardData: false
  });

  constructor(
    @ILogService private logService: ILogService,
    @IShapeService private shapeService: IShapeService,
    @ISelectionService private selectionService: ISelectionService,
    @IClipboardService private clipboardService: IClipboardService,
    @IHistoryService private historyService: IHistoryService,
    @IZIndexService private zIndexService: IZIndexService
  ) {
    this.logService.info('CanvasManager initialized');
  }

  private syncState(): void {
    this.state.shapeCount = this.shapeService.getAllShapeEntities().length;
    this.state.selectedIds = this.selectionService.getSelectedShapes().map(s => s.id);
    this.state.canUndo = this.historyService.canUndo();
    this.state.canRedo = this.historyService.canRedo();
    this.state.hasClipboardData = this.clipboardService.hasData();
  }

  // === 形状管理 ===

  addShape(entity: ShapeEntity): void {
    this.shapeService.addShape(entity);
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.removeShape(entity.id)
    });
    this.logService.debug(`Shape added: ${entity.id}`);
    this.syncState();
  }

  removeShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    this.shapeService.removeShape(id);
    this.historyService.execute({
      execute: () => {},
      undo: () => this.shapeService.addShape(entity)
    });
    this.logService.debug(`Shape removed: ${id}`);
    this.syncState();
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
    this.logService.debug(`Shape updated: ${id}`);
    this.syncState();
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
    this.logService.debug(`Shape selected: ${id}`);
    this.syncState();
  }

  deselectShape(id: string): void {
    const entity = this.shapeService.getShapeEntity(id);
    if (!entity) return;

    this.selectionService.deselect([entity]);
    this.logService.debug(`Shape deselected: ${id}`);
    this.syncState();
  }

  clearSelection(): void {
    this.selectionService.clearSelection();
    this.logService.debug('Selection cleared');
    this.syncState();
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
    this.syncState();
  }

  cutSelectedShapes(): void {
    ClipboardMixin.cutSelectedShapes(this.clipboardDeps);
    this.syncState();
  }

  paste(): ShapeEntity[] {
    const shapes = ClipboardMixin.paste(this.clipboardDeps);
    this.syncState();
    return shapes;
  }

  // === 历史操作 ===

  undo(): void {
    this.historyService.undo();
    this.syncState();
  }

  redo(): void {
    this.historyService.redo();
    this.syncState();
  }

  // === Z轴管理 (委托给 mixin) ===

  private get zIndexDeps(): ZIndexMixin.IZIndexDeps {
    return {
      shapeService: this.shapeService,
      zIndexService: this.zIndexService,
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
    this.logService.info('Canvas cleared');
    this.syncState();
  }

  dispose(): void {
    this.shapeService.clear();
    this.logService.info('CanvasManager disposed');
  }
}
