/**
 * 画布模型 - 统一状态管理
 * 作为 Command + Action 架构中的核心数据层
 */

import { Shape } from '@sky-canvas/render-engine';
import { ShapeData } from '../actions/types';

/**
 * 变更描述接口
 */
export interface ChangeDescription {
  type: string;
  shapeId?: string;
  shapeIds?: string[];
  data?: any;
  timestamp: number;
}

/**
 * 模型事件监听器
 */
export type ModelListener = (change: ChangeDescription) => void;

/**
 * 批量操作状态
 */
interface BatchState {
  active: boolean;
  changes: ChangeDescription[];
}

/**
 * 画布模型类
 * 管理形状、选择状态和通知机制
 */
export class CanvasModel {
  private shapes = new Map<string, Shape>();
  private selection = new Set<string>();
  private listeners: ModelListener[] = [];
  private batchState: BatchState = { active: false, changes: [] };

  // 通知合并相关
  private notificationQueue: ChangeDescription[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly NOTIFICATION_DELAY = 16; // 16ms (一个动画帧)

  /**
   * 查询方法（只读）
   */
  getShape(id: string): Shape | undefined {
    return this.shapes.get(id);
  }

  getShapes(): Shape[] {
    return Array.from(this.shapes.values());
  }

  getShapeIds(): string[] {
    return Array.from(this.shapes.keys());
  }

  getSelection(): string[] {
    return Array.from(this.selection);
  }

  getSelectedShapes(): Shape[] {
    return this.getSelection()
      .map(id => this.shapes.get(id))
      .filter((shape): shape is Shape => shape !== undefined);
  }

  hasShape(id: string): boolean {
    return this.shapes.has(id);
  }

  isSelected(id: string): boolean {
    return this.selection.has(id);
  }

  getShapeCount(): number {
    return this.shapes.size;
  }

  getSelectionCount(): number {
    return this.selection.size;
  }

  /**
   * 修改方法（只能被 Command 调用）
   */
  addShape(shape: Shape): void {
    if (this.shapes.has(shape.id)) {
      throw new Error(`Shape with id ${shape.id} already exists`);
    }

    this.shapes.set(shape.id, shape);
    this.notify({
      type: 'shape-added',
      shapeId: shape.id,
      data: { shape },
      timestamp: Date.now()
    });
  }

  removeShape(id: string): boolean {
    const shape = this.shapes.get(id);
    if (!shape) {
      return false;
    }

    this.shapes.delete(id);
    this.selection.delete(id); // 同时从选择中移除

    this.notify({
      type: 'shape-removed',
      shapeId: id,
      data: { shape },
      timestamp: Date.now()
    });

    return true;
  }

  updateShape(id: string, updates: Partial<ShapeData>): boolean {
    const shape = this.shapes.get(id);
    if (!shape) {
      return false;
    }

    // 记录旧值
    const oldValues: Partial<ShapeData> = {};

    // 应用更新并记录旧值
    if (updates.x !== undefined) {
      oldValues.x = shape.x;
      shape.x = updates.x;
    }
    if (updates.y !== undefined) {
      oldValues.y = shape.y;
      shape.y = updates.y;
    }
    if (updates.visible !== undefined) {
      oldValues.visible = shape.visible;
      shape.setVisible(updates.visible);
    }
    if (updates.zIndex !== undefined) {
      oldValues.zIndex = shape.zIndex;
      shape.setZIndex(updates.zIndex);
    }

    // 针对特定形状类型的属性（使用 any 类型绕过 TypeScript 检查）
    if (updates.width !== undefined && 'width' in shape) {
      (oldValues as any).width = (shape as any).width;
      (shape as any).width = updates.width;
    }
    if (updates.height !== undefined && 'height' in shape) {
      (oldValues as any).height = (shape as any).height;
      (shape as any).height = updates.height;
    }
    if (updates.radius !== undefined && 'radius' in shape) {
      (oldValues as any).radius = (shape as any).radius;
      (shape as any).radius = updates.radius;
    }
    if (updates.text !== undefined && 'text' in shape) {
      (oldValues as any).text = (shape as any).text;
      (shape as any).text = updates.text;
    }

    // 样式更新
    if (updates.style) {
      const currentStyle = shape.style();
      oldValues.style = {
        fill: currentStyle.fill,
        stroke: currentStyle.stroke,
        strokeWidth: currentStyle.strokeWidth,
        opacity: currentStyle.opacity
      };
      shape.style(updates.style);
    }

    this.notify({
      type: 'shape-updated',
      shapeId: id,
      data: { updates, oldValues },
      timestamp: Date.now()
    });

    return true;
  }

  clearShapes(): void {
    const removedShapes = Array.from(this.shapes.values());
    this.shapes.clear();
    this.selection.clear();

    this.notify({
      type: 'shapes-cleared',
      data: { removedShapes, count: removedShapes.length },
      timestamp: Date.now()
    });
  }

  /**
   * 选择管理
   */
  setSelection(shapeIds: string[]): void {
    const previousSelection = Array.from(this.selection);
    this.selection.clear();

    // 验证并添加有效的形状ID
    const validIds = shapeIds.filter(id => this.shapes.has(id));
    validIds.forEach(id => this.selection.add(id));

    this.notify({
      type: 'selection-changed',
      shapeIds: validIds,
      data: {
        selectedIds: validIds,
        previousSelection,
        invalidIds: shapeIds.filter(id => !this.shapes.has(id))
      },
      timestamp: Date.now()
    });
  }

  addToSelection(shapeIds: string[]): void {
    const addedIds: string[] = [];
    const invalidIds: string[] = [];

    shapeIds.forEach(id => {
      if (this.shapes.has(id) && !this.selection.has(id)) {
        this.selection.add(id);
        addedIds.push(id);
      } else if (!this.shapes.has(id)) {
        invalidIds.push(id);
      }
    });

    if (addedIds.length > 0) {
      this.notify({
        type: 'selection-added',
        shapeIds: addedIds,
        data: { addedIds, invalidIds },
        timestamp: Date.now()
      });
    }
  }

  removeFromSelection(shapeIds: string[]): void {
    const removedIds: string[] = [];

    shapeIds.forEach(id => {
      if (this.selection.has(id)) {
        this.selection.delete(id);
        removedIds.push(id);
      }
    });

    if (removedIds.length > 0) {
      this.notify({
        type: 'selection-removed',
        shapeIds: removedIds,
        data: { removedIds },
        timestamp: Date.now()
      });
    }
  }

  clearSelection(): void {
    const previousSelection = Array.from(this.selection);
    this.selection.clear();

    if (previousSelection.length > 0) {
      this.notify({
        type: 'selection-cleared',
        data: { previousSelection, count: previousSelection.length },
        timestamp: Date.now()
      });
    }
  }

  selectAll(): void {
    const allIds = Array.from(this.shapes.keys());
    this.setSelection(allIds);
  }

  invertSelection(): void {
    const allIds = new Set(this.shapes.keys());
    const currentSelection = new Set(this.selection);

    const newSelection = Array.from(allIds).filter(id => !currentSelection.has(id));
    this.setSelection(newSelection);
  }

  /**
   * 批量操作支持
   */
  beginBatch(): void {
    this.batchState.active = true;
    this.batchState.changes = [];
  }

  endBatch(): void {
    if (!this.batchState.active) {
      return;
    }

    const changes = [...this.batchState.changes];
    this.batchState.active = false;
    this.batchState.changes = [];

    // 发送批量变更通知
    if (changes.length > 0) {
      this.notify({
        type: 'batch-completed',
        data: { changes, count: changes.length },
        timestamp: Date.now()
      });
    }
  }

  isBatching(): boolean {
    return this.batchState.active;
  }

  /**
   * 通知机制
   */
  subscribe(listener: ModelListener): () => void {
    this.listeners.push(listener);

    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notify(change: ChangeDescription): void {
    // 如果在批量操作中，收集变更而不立即通知
    if (this.batchState.active) {
      this.batchState.changes.push(change);
      return;
    }

    // 添加到通知队列
    this.notificationQueue.push(change);

    // 如果已有定时器，取消重新设置
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // 延迟通知以合并频繁的更新
    this.flushTimer = setTimeout(() => {
      this.flushNotifications();
    }, this.NOTIFICATION_DELAY);
  }

  /**
   * 立即发送通知（跳过合并延迟）
   */
  notifyImmediate(change: ChangeDescription): void {
    this.listeners.forEach(listener => {
      try {
        listener(change);
      } catch (error) {
        console.error('Model listener error:', error);
      }
    });
  }

  /**
   * 刷新待发送的通知
   */
  private flushNotifications(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const changes = [...this.notificationQueue];
    this.notificationQueue = [];
    this.flushTimer = null;

    // 如果只有一个变更，直接发送
    if (changes.length === 1) {
      this.notifyImmediate(changes[0]);
      return;
    }

    // 多个变更，发送合并通知
    this.notifyImmediate({
      type: 'batch-notification',
      data: { changes, count: changes.length },
      timestamp: Date.now()
    });

    // 同时发送每个独立的变更
    changes.forEach(change => {
      this.notifyImmediate(change);
    });
  }

  /**
   * 获取模型状态统计
   */
  getStats(): {
    shapeCount: number;
    selectionCount: number;
    listenerCount: number;
    isBatching: boolean;
    pendingNotifications: number;
  } {
    return {
      shapeCount: this.shapes.size,
      selectionCount: this.selection.size,
      listenerCount: this.listeners.length,
      isBatching: this.batchState.active,
      pendingNotifications: this.notificationQueue.length
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清除定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // 清空所有数据
    this.shapes.clear();
    this.selection.clear();
    this.listeners = [];
    this.notificationQueue = [];
    this.batchState = { active: false, changes: [] };
  }
}