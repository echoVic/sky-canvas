/**
 * 选择形状命令
 */

import { SyncCommand, ChangeDescription } from '../base';
import { ICanvasModel } from '../../models/CanvasModel';

/**
 * 选择形状命令
 * 支持单选和多选
 */
export class SelectShapesCommand extends SyncCommand {
  private shapeIds: string[];
  private previousSelection: string[] = [];
  private addToSelection: boolean;

  constructor(model: ICanvasModel, shapeIds: string | string[], addToSelection: boolean = false) {
    const ids = Array.isArray(shapeIds) ? shapeIds : [shapeIds];
    super(model, `Select ${ids.length} shape(s)`);

    this.shapeIds = ids;
    this.addToSelection = addToSelection;
  }

  execute(): void {
    // 保存当前选择状态
    this.previousSelection = this.model.getSelection();

    if (this.addToSelection) {
      // 添加到现有选择
      this.model.addToSelection(this.shapeIds);
    } else {
      // 替换当前选择
      this.model.setSelection(this.shapeIds);
    }

    this.markAsExecuted();
  }

  undo(): void {
    // 恢复之前的选择状态
    this.model.setSelection(this.previousSelection);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'selection-changed',
      shapeIds: this.shapeIds,
      data: {
        selectedIds: this.shapeIds,
        previousSelection: this.previousSelection,
        addToSelection: this.addToSelection
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取选择的形状ID
   */
  getSelectedIds(): string[] {
    return [...this.shapeIds];
  }

  /**
   * 获取之前的选择
   */
  getPreviousSelection(): string[] {
    return [...this.previousSelection];
  }
}

/**
 * 取消选择形状命令
 */
export class DeselectShapeCommand extends SyncCommand {
  private shapeId: string;
  private wasSelected: boolean = false;

  constructor(model: ICanvasModel, shapeId: string) {
    super(model, `Deselect shape ${shapeId}`);
    this.shapeId = shapeId;
  }

  execute(): void {
    const currentSelection = this.model.getSelection();
    this.wasSelected = currentSelection.includes(this.shapeId);

    if (this.wasSelected) {
      this.model.removeFromSelection([this.shapeId]);
    }

    this.markAsExecuted();
  }

  undo(): void {
    if (this.wasSelected) {
      this.model.addToSelection([this.shapeId]);
    }

    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'shape-deselected',
      shapeId: this.shapeId,
      data: {
        wasSelected: this.wasSelected
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取取消选择的形状ID
   */
  getShapeId(): string {
    return this.shapeId;
  }
}

/**
 * 清空选择命令
 */
export class ClearSelectionCommand extends SyncCommand {
  private previousSelection: string[] = [];

  constructor(model: ICanvasModel) {
    super(model, 'Clear selection');
  }

  execute(): void {
    // 保存当前选择
    this.previousSelection = this.model.getSelection();

    // 清空选择
    this.model.clearSelection();

    this.markAsExecuted();
  }

  undo(): void {
    // 恢复之前的选择
    this.model.setSelection(this.previousSelection);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'selection-cleared',
      data: {
        previousSelection: this.previousSelection,
        clearedCount: this.previousSelection.length
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取之前的选择
   */
  getPreviousSelection(): string[] {
    return [...this.previousSelection];
  }

  /**
   * 获取清空的形状数量
   */
  getClearedCount(): number {
    return this.previousSelection.length;
  }
}

/**
 * 选择全部命令
 */
export class SelectAllCommand extends SyncCommand {
  private previousSelection: string[] = [];
  private allShapeIds: string[] = [];

  constructor(model: ICanvasModel) {
    super(model, 'Select all');
  }

  execute(): void {
    // 保存当前选择
    this.previousSelection = this.model.getSelection();

    // 使用 CanvasModel 的 selectAll 方法
    this.model.selectAll();
    this.allShapeIds = this.model.getSelection();

    this.markAsExecuted();
  }

  undo(): void {
    // 恢复之前的选择
    this.model.setSelection(this.previousSelection);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'all-selected',
      shapeIds: this.allShapeIds,
      data: {
        selectedCount: this.allShapeIds.length,
        previousSelection: this.previousSelection
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取选择的所有形状ID
   */
  getAllShapeIds(): string[] {
    return [...this.allShapeIds];
  }

  /**
   * 获取之前的选择
   */
  getPreviousSelection(): string[] {
    return [...this.previousSelection];
  }

  /**
   * 获取选择的形状数量
   */
  getSelectedCount(): number {
    return this.allShapeIds.length;
  }
}

/**
 * 反向选择命令
 * 选择当前未选中的形状，取消选择当前选中的形状
 */
export class InvertSelectionCommand extends SyncCommand {
  private previousSelection: string[] = [];
  private newSelection: string[] = [];

  constructor(model: ICanvasModel) {
    super(model, 'Invert selection');
  }

  execute(): void {
    // 保存当前选择
    this.previousSelection = this.model.getSelection();

    // 使用 CanvasModel 的 invertSelection 方法
    this.model.invertSelection();
    this.newSelection = this.model.getSelection();

    this.markAsExecuted();
  }

  undo(): void {
    // 恢复之前的选择
    this.model.setSelection(this.previousSelection);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'selection-inverted',
      shapeIds: this.newSelection,
      data: {
        newSelection: this.newSelection,
        previousSelection: this.previousSelection,
        invertedCount: this.newSelection.length
      },
      timestamp: Date.now()
    };
  }

  /**
   * 获取新选择
   */
  getNewSelection(): string[] {
    return [...this.newSelection];
  }

  /**
   * 获取之前的选择
   */
  getPreviousSelection(): string[] {
    return [...this.previousSelection];
  }
}