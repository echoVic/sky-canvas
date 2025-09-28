/**
* 删除形状命令
 */

import { Shape } from '@sky-canvas/render-engine';
import { SyncCommand, ChangeDescription } from '../base';
import { ICanvasModel } from '../../models/CanvasModel';

/**
 * 删除形状命令
 * 负责删除指定形状
 */
export class DeleteShapeCommand extends SyncCommand {
  private shapeId: string;
  private deletedShape: Shape | null = null;

  constructor(model: ICanvasModel, shapeId: string) {
    super(model, `Delete shape ${shapeId}`);
    this.shapeId = shapeId;
  }

  execute(): void {
    // 获取要删除的形状
    this.deletedShape = this.model.getShape(this.shapeId) || null;
    if (!this.deletedShape) {
      throw new Error(`Shape with id ${this.shapeId} not found`);
    }

    // 使用 CanvasModel 的删除方法（它会处理通知和选择清理）
    const success = this.model.removeShape(this.shapeId);
    if (!success) {
      throw new Error(`Failed to remove shape ${this.shapeId}`);
    }

    this.markAsExecuted();
  }

  undo(): void {
    if (!this.deletedShape) {
      throw new Error('Cannot undo: no deleted shape stored');
    }

    // 重新添加形状
    this.model.addShape(this.deletedShape);

    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'shape-removed',
      shapeId: this.shapeId,
      data: {
        shapeType: this.deletedShape?.constructor.name,
        x: this.deletedShape?.x,
        y: this.deletedShape?.y
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取删除的形状ID
   */
  getShapeId(): string {
    return this.shapeId;
  }

  /**
   * 获取删除的形状（如果已执行）
   */
  getDeletedShape(): Shape | null {
    return this.deletedShape;
  }
}

/**
 * 删除选中形状命令
 * 删除当前选中的所有形状
 */
export class DeleteSelectedCommand extends SyncCommand {
  private deletedShapes: Map<string, Shape> = new Map();
  private deletedShapeIds: string[] = [];

  constructor(model: ICanvasModel) {
    super(model, 'Delete selected shapes');
  }

  execute(): void {
    // 获取当前选中的形状
    const selectedIds = this.model.getSelection();
    if (selectedIds.length === 0) {
      // 没有选中形状，命令无效但不抛错
      this.markAsExecuted();
      return;
    }

    // 保存要删除的形状
    this.deletedShapes.clear();
    this.deletedShapeIds = [...selectedIds];

    for (const id of selectedIds) {
      const shape = this.model.getShape(id);
      if (shape) {
        this.deletedShapes.set(id, shape);
      }
    }

    // 使用批量操作以提高性能
    this.model.beginBatch();
    try {
      // 删除形状（CanvasModel会自动处理选择清理）
      for (const id of selectedIds) {
        this.model.removeShape(id);
      }
      this.model.endBatch();
    } catch (error) {
      this.model.endBatch();
      throw error;
    }

    this.markAsExecuted();
  }

  undo(): void {
    // 使用批量操作恢复删除的形状
    this.model.beginBatch();
    try {
      // 恢复删除的形状
      for (const [id, shape] of this.deletedShapes) {
        this.model.addShape(shape);
      }

      // 恢复选择状态
      if (this.deletedShapeIds.length > 0) {
        this.model.setSelection(this.deletedShapeIds);
      }
      this.model.endBatch();
    } catch (error) {
      this.model.endBatch();
      throw error;
    }

    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'shapes-deleted',
      shapeIds: this.deletedShapeIds,
      data: {
        count: this.deletedShapeIds.length,
        shapeTypes: Array.from(this.deletedShapes.values()).map(shape => shape.constructor.name)
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取删除的形状数量
   */
  getDeletedCount(): number {
    return this.deletedShapeIds.length;
  }

  /**
   * 获取删除的形状ID列表
   */
  getDeletedShapeIds(): string[] {
    return [...this.deletedShapeIds];
  }

  /**
   * 获取删除的形状映射
   */
  getDeletedShapes(): Map<string, Shape> {
    return new Map(this.deletedShapes);
  }
}