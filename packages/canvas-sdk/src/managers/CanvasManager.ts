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

/**
 * Canvas 状态接口
 * 
 * **重要**：此状态通过 valtio proxy 管理，更新是异步的（通过 queueMicrotask）。
 * 在执行操作后立即读取状态可能得到旧值。如需同步读取最新状态，
 * 请直接调用相应的 Service 方法。
 * 
 * @see CanvasManager.scheduleSyncState 了解异步更新机制
 */
export interface CanvasState {
  /** 形状总数 */
  shapeCount: number;
  /** 选中的形状 ID 列表 */
  selectedIds: string[];
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 剪贴板是否有数据 */
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

  private unsubscribeHistory?: () => void;
  private syncStateScheduled = false;

  constructor(
    @ILogService private logService: ILogService,
    @IShapeService private shapeService: IShapeService,
    @ISelectionService private selectionService: ISelectionService,
    @IClipboardService private clipboardService: IClipboardService,
    @IHistoryService private historyService: IHistoryService,
    @IZIndexService private zIndexService: IZIndexService
  ) {
    this.logService.info('CanvasManager initialized');
    this.setupHistorySubscription();
  }

  private setupHistorySubscription(): void {
    this.unsubscribeHistory = this.historyService.onDidChange(() => {
      this.scheduleSyncState();
    });
  }

  /**
   * 调度状态同步（防抖）
   * 
   * 使用 queueMicrotask 实现微任务级别的防抖，确保在同一事件循环中
   * 多次调用 syncState() 只会执行一次实际的状态同步。
   * 
   * **重要行为说明**：
   * - 状态更新是异步的（延迟到下一个微任务）
   * - 在调用 syncState() 后立即读取 state 可能得到旧值
   * - 如果需要同步读取最新状态，应该直接调用相应的 Service 方法
   * 
   * @example
   * ```typescript
   * // 异步行为示例
   * canvasManager.addShape(shape);  // 内部调用 syncState()
   * console.log(canvasManager.state.shapeCount);  // 可能是旧值
   * 
   * // 等待微任务完成
   * await Promise.resolve();
   * console.log(canvasManager.state.shapeCount);  // 新值
   * 
   * // 或者直接读取 Service
   * const count = shapeService.getAllShapeEntities().length;  // 总是最新值
   * ```
   */
  private scheduleSyncState(): void {
    if (this.syncStateScheduled) return;
    
    this.syncStateScheduled = true;
    queueMicrotask(() => {
      this.syncStateScheduled = false;
      this.syncStateNow();
    });
  }

  /**
   * 请求状态同步（异步）
   * 
   * 此方法会调度一个微任务来更新状态，不会立即同步。
   * 详见 scheduleSyncState() 的文档说明。
   */
  private syncState(): void {
    this.scheduleSyncState();
  }

  /**
   * 立即同步状态（内部使用）
   * 
   * 直接从各个 Service 读取最新状态并更新 state proxy。
   * 此方法由 scheduleSyncState() 在微任务中调用。
   */
  private syncStateNow(): void {
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
    if (this.unsubscribeHistory) {
      this.unsubscribeHistory();
      this.unsubscribeHistory = undefined;
    }
    this.shapeService.clear();
    this.logService.info('CanvasManager disposed');
  }
}
