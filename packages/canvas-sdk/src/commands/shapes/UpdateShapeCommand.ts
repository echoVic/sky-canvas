/**
* 更新形状命令
 */

import { SyncCommand, ChangeDescription } from '../base';
import { GraphicData } from '../../actions/types';
import { ICanvasModel } from '../../models/CanvasModel';
import { Shape } from '@sky-canvas/render-engine';

/**
 * 更新形状命令
 * 负责更新现有形状的属性
 */
export class UpdateShapeCommand extends SyncCommand {
  private shapeId: string;
  private updates: Partial<GraphicData>;
  private oldValues: Partial<GraphicData> = {};

  constructor(model: ICanvasModel, shapeId: string, updates: Partial<GraphicData>) {
    super(model, `Update shape ${shapeId}`);
    this.shapeId = shapeId;
    this.updates = { ...updates };
  }

  execute(): void {
    const shape = this.model.getShape(this.shapeId);
    if (!shape) {
      throw new Error(`Shape with id ${this.shapeId} not found`);
    }

    // 保存旧值用于撤销
    this.saveOldValues(shape);

    // 使用 CanvasModel 的更新方法（它现在直接处理 GraphicData）
    const success = this.model.updateShape(this.shapeId, this.updates);
    if (!success) {
      throw new Error(`Failed to update shape ${this.shapeId}`);
    }

    this.markAsExecuted();
  }

  undo(): void {
    const shape = this.model.getShape(this.shapeId);
    if (!shape) {
      console.warn(`Shape with id ${this.shapeId} not found during undo`);
      return;
    }

    // 使用 CanvasModel 的更新方法恢复旧值
    this.model.updateShape(this.shapeId, this.oldValues);

    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'shape-updated',
      shapeId: this.shapeId,
      data: {
        updates: this.updates,
        oldValues: this.oldValues
      },
      timestamp: Date.now()
    };
  }

  /**
   * 保存旧值
   */
  private saveOldValues(shape: Shape): void {
    const keys = Object.keys(this.updates) as (keyof GraphicData)[];
    const shapeAny = shape as any;
    for (const key of keys) {
      if (key in shapeAny) {
        (this.oldValues as any)[key] = shapeAny[key];
      }
    }
  }


  /**
   * 获取更新的形状ID
   */
  getShapeId(): string {
    return this.shapeId;
  }

  /**
   * 获取更新内容
   */
  getUpdates(): Partial<GraphicData> {
    return { ...this.updates };
  }

  /**
   * 获取旧值
   */
  getOldValues(): Partial<GraphicData> {
    return { ...this.oldValues };
  }
}