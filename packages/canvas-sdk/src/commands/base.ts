/**
 * 扩展的 Command 基础类
 *
 * Command 包含具体的执行逻辑和撤销逻辑。
 * Command 的执行可以是异步的，支持网络请求、文件操作等异步场景。
 */

import { CanvasModel } from '../models/CanvasModel';

/**
 * 扩展的 Command 接口
 * 支持异步操作、中断机制和进度反馈
 */
export interface Command {
  /** 执行命令 - 可以是异步的 */
  execute(): void | Promise<void>;

  /** 撤销命令 - 撤销也可以是异步的 */
  undo(): void | Promise<void>;

  /** 重做命令 - 重做同样支持异步 */
  redo?(): void | Promise<void>;

  /** 中断命令 - 用于异步操作的中断 */
  abort?(): void;

  /** 获取执行进度 - 用于长时间异步操作 */
  getProgress?(): { current: number; total: number };

  /** 命令是否自己处理通知 */
  handlesOwnNotification?(): boolean;

  /** 获取变更描述，供 ActionProcessor 使用 */
  getChangeDescription?(): ChangeDescription;

  /** 命令描述 */
  description?: string;
}

/**
 * 变更描述接口
 */
export interface ChangeDescription {
  type: string;
  data?: any;
  timestamp?: number;
  shapeId?: string;
  shapeIds?: string[];
}

/**
 * 扩展的基础 Command 抽象类
 */
export abstract class BaseCommand implements Command {
  protected model: CanvasModel;
  public description: string;
  protected isExecuted: boolean = false;
  protected abortController?: AbortController;

  constructor(model: CanvasModel, description: string = 'Command') {
    this.model = model;
    this.description = description;
  }

  /**
   * 抽象方法 - 子类必须实现
   */
  abstract execute(): void | Promise<void>;
  abstract undo(): void | Promise<void>;

  /**
   * 默认重做实现 - 重新执行
   */
  redo(): void | Promise<void> {
    return this.execute();
  }

  /**
   * 默认中断实现
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 默认不处理自己的通知
   */
  handlesOwnNotification(): boolean {
    return false;
  }

  /**
   * 默认变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'unknown',
      timestamp: Date.now()
    };
  }

  /**
   * 字符串表示
   */
  toString(): string {
    return this.description;
  }

  /**
   * 检查是否已执行
   */
  isCommandExecuted(): boolean {
    return this.isExecuted;
  }

  /**
   * 标记为已执行
   */
  protected markAsExecuted(): void {
    this.isExecuted = true;
  }

  /**
   * 标记为未执行
   */
  protected markAsNotExecuted(): void {
    this.isExecuted = false;
  }
}

/**
 * 同步命令基类
 * 用于不需要异步操作的简单命令
 */
export abstract class SyncCommand extends BaseCommand {
  abstract execute(): void;
  abstract undo(): void;

  redo(): void {
    return this.execute();
  }
}

/**
 * 异步命令基类
 * 用于需要异步操作的复杂命令
 */
export abstract class AsyncCommand extends BaseCommand {
  protected progress: { current: number; total: number } = { current: 0, total: 1 };

  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;

  async redo(): Promise<void> {
    return this.execute();
  }

  /**
   * 获取执行进度
   */
  getProgress(): { current: number; total: number } {
    return { ...this.progress };
  }

  /**
   * 更新进度
   */
  protected updateProgress(current: number, total?: number): void {
    this.progress.current = current;
    if (total !== undefined) {
      this.progress.total = total;
    }
  }

  /**
   * 重置进度
   */
  protected resetProgress(): void {
    this.progress = { current: 0, total: 1 };
  }

  /**
   * 创建可中断的AbortController
   */
  protected createAbortController(): AbortController {
    this.abortController = new AbortController();
    return this.abortController;
  }

  /**
   * 检查是否被中断
   */
  protected checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Command was aborted');
    }
  }
}

/**
 * 复合命令 - 包含多个子命令的命令
 * 优化版本，支持异步子命令
 */
export class CompositeCommand extends BaseCommand {
  private commands: Command[] = [];
  private completedCommands: Command[] = [];

  constructor(model: CanvasModel, description: string = 'Composite Operation') {
    super(model, description);
  }

  /**
   * 添加子命令
   */
  add(command: Command): void {
    this.commands.push(command);
  }

  /**
   * 执行所有子命令
   */
  async execute(): Promise<void> {
    this.completedCommands = [];

    try {
      for (const command of this.commands) {
        await command.execute();
        this.completedCommands.push(command);
        if (this.abortController?.signal.aborted) {
          throw new Error('Command was aborted');
        }
      }
      this.markAsExecuted();
    } catch (error) {
      // 出错时回滚已执行的命令
      await this.rollback();
      throw error;
    }
  }

  /**
   * 按相反顺序撤销所有已完成的子命令
   */
  async undo(): Promise<void> {
    for (let i = this.completedCommands.length - 1; i >= 0; i--) {
      try {
        await this.completedCommands[i].undo();
      } catch (error) {
        console.error('Failed to undo command:', error);
        // 继续撤销其他命令
      }
    }
    this.markAsNotExecuted();
  }

  /**
   * 回滚已执行的命令
   */
  private async rollback(): Promise<void> {
    for (let i = this.completedCommands.length - 1; i >= 0; i--) {
      try {
        await this.completedCommands[i].undo();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
  }

  /**
   * 中断所有子命令
   */
  abort(): void {
    super.abort();
    for (const command of this.commands) {
      if (command.abort) {
        command.abort();
      }
    }
  }

  /**
   * 获取子命令数量
   */
  size(): number {
    return this.commands.length;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * 清空所有子命令
   */
  clear(): void {
    this.commands = [];
    this.completedCommands = [];
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'composite-executed',
      data: {
        commandCount: this.completedCommands.length,
        commands: this.completedCommands.map(cmd => cmd.description)
      },
      timestamp: Date.now()
    };
  }

  toString(): string {
    return `${this.description} (${this.commands.length} commands)`;
  }
}

/**
 * 批量命令 - 专门用于批量操作的命令
 * 支持事务性操作和回滚
 */
export class BatchCommand extends AsyncCommand {
  protected commands: Command[] = [];
  protected completed: Command[] = [];

  constructor(model: CanvasModel, commands: Command[]) {
    super(model, `Batch Operation (${commands.length} commands)`);
    this.commands = [...commands];
    this.updateProgress(0, commands.length);
  }

  async execute(): Promise<void> {
    this.completed = [];
    this.resetProgress();
    this.updateProgress(0, this.commands.length);

    // 开启批量模式，暂停通知
    if (this.model.beginBatch) {
      this.model.beginBatch();
    }

    try {
      for (let i = 0; i < this.commands.length; i++) {
        const command = this.commands[i];
        await command.execute();
        this.completed.push(command);
        this.updateProgress(i + 1);
        this.checkAborted();
      }

      // 所有命令成功后，一次性发送通知
      if (this.model.endBatch) {
        this.model.endBatch();
      }

      this.markAsExecuted();
    } catch (error) {
      // 出错时回滚已执行的命令
      await this.rollback();
      throw error;
    }
  }

  async undo(): Promise<void> {
    // 反向撤销所有已完成的命令
    for (let i = this.completed.length - 1; i >= 0; i--) {
      try {
        await this.completed[i].undo();
      } catch (error) {
        console.error('Failed to undo batch command:', error);
      }
    }

    if (this.model.notify) {
      this.model.notify({
        type: 'batch-undone',
        data: { count: this.completed.length },
        timestamp: Date.now()
      });
    }

    this.markAsNotExecuted();
  }

  /**
   * 回滚已执行的命令
   */
  private async rollback(): Promise<void> {
    for (let i = this.completed.length - 1; i >= 0; i--) {
      try {
        await this.completed[i].undo();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }

    // 确保退出批量模式
    if (this.model.endBatch) {
      this.model.endBatch();
    }

    if (this.model.notify) {
      this.model.notify({
        type: 'batch-rollback',
        data: { count: this.completed.length },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 中断批量操作
   */
  abort(): void {
    super.abort();
    for (const command of this.commands) {
      if (command.abort) {
        command.abort();
      }
    }
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'batch-executed',
      data: {
        count: this.completed.length,
        commandTypes: this.completed.map(cmd => cmd.constructor.name)
      },
      timestamp: Date.now()
    };
  }
}

/**
 * 命令状态枚举
 */
export enum CommandStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted'
}

/**
 * 带状态的命令包装器
 */
export class StatefulCommand {
  private command: Command;
  private status: CommandStatus = CommandStatus.PENDING;
  private error?: Error;
  private startTime?: number;
  private endTime?: number;

  constructor(command: Command) {
    this.command = command;
  }

  async execute(): Promise<void> {
    this.status = CommandStatus.EXECUTING;
    this.startTime = Date.now();

    try {
      await this.command.execute();
      this.status = CommandStatus.COMPLETED;
    } catch (error) {
      this.error = error as Error;
      this.status = CommandStatus.FAILED;
      throw error;
    } finally {
      this.endTime = Date.now();
    }
  }

  async undo(): Promise<void> {
    if (this.status !== CommandStatus.COMPLETED) {
      throw new Error('Cannot undo command that is not completed');
    }

    await this.command.undo();
  }

  abort(): void {
    this.status = CommandStatus.ABORTED;
    if (this.command.abort) {
      this.command.abort();
    }
  }

  getStatus(): CommandStatus {
    return this.status;
  }

  getError(): Error | undefined {
    return this.error;
  }

  getExecutionTime(): number | undefined {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }
    return undefined;
  }

  getProgress(): { current: number; total: number } | undefined {
    return this.command.getProgress?.();
  }

  toString(): string {
    return `${this.command.toString()} [${this.status}]`;
  }
}