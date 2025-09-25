/**
 * 批量Action命令
 * 支持将多个Action合并为一个事务性操作
 */

import { BatchCommand } from '../base';
import { CanvasModel } from '../../models/CanvasModel';
import { Action } from '../../actions/types';
import { commandRegistry } from '../registry';

/**
 * 批量Action参数
 */
export interface BatchActionParams {
  actions: Action[];
  transactional?: boolean; // 是否事务性执行（失败时回滚）
  description?: string; // 自定义描述
}

/**
 * 批量Action命令
 * 将多个Action转换为Command并批量执行
 */
export class BatchActionCommand extends BatchCommand {
  private params: BatchActionParams;
  private actions: Action[];

  constructor(model: CanvasModel, params: BatchActionParams) {
    // 先创建所有子命令
    const commands = params.actions.map(action =>
      commandRegistry.createCommand(model, action)
    );

    super(model, commands);
    this.params = params;
    this.actions = params.actions;

    // 更新描述
    this.description = params.description || `Batch operation (${params.actions.length} actions)`;
  }

  async execute(): Promise<void> {
    if (this.params.transactional) {
      // 事务性执行：失败时自动回滚
      return super.execute();
    } else {
      // 非事务性执行：遇到错误继续执行其他命令
      return this.executeNonTransactional();
    }
  }

  /**
   * 非事务性执行
   * 即使某些命令失败，也会继续执行后续命令
   */
  private async executeNonTransactional(): Promise<void> {
    this.completed = [];
    this.resetProgress();
    this.updateProgress(0, this.commands.length);

    // 开启批量模式
    if (this.model.beginBatch) {
      this.model.beginBatch();
    }

    const errors: Error[] = [];

    try {
      for (let i = 0; i < this.commands.length; i++) {
        const command = this.commands[i];

        try {
          await command.execute();
          this.completed.push(command);
        } catch (error) {
          console.warn(`Command ${i} failed in non-transactional batch:`, error);
          errors.push(error as Error);
        }

        this.updateProgress(i + 1);
        this.checkAborted();
      }

      // 结束批量模式
      if (this.model.endBatch) {
        this.model.endBatch();
      }

      this.markAsExecuted();

      // 如果有错误，记录但不抛出
      if (errors.length > 0) {
        console.warn(`Batch operation completed with ${errors.length} errors:`, errors);
      }

    } catch (abortError) {
      // 只有中断错误才需要清理
      if (this.model.endBatch) {
        this.model.endBatch();
      }
      throw abortError;
    }
  }

  /**
   * 获取执行的Action列表
   */
  getExecutedActions(): Action[] {
    return this.actions.slice(0, this.completed.length);
  }

  /**
   * 获取失败的Action列表
   */
  getFailedActions(): Action[] {
    return this.actions.slice(this.completed.length);
  }

  /**
   * 获取执行统计信息
   */
  getExecutionStats(): {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  } {
    const total = this.actions.length;
    const completed = this.completed.length;
    const failed = total - completed;

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? completed / total : 0
    };
  }
}