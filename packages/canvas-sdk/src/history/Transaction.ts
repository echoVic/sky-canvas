/**
 * 事务系统 - 支持批量操作和嵌套事务
 */

import { ICommand } from './HistoryManager';

/**
 * 复合命令 - 包含多个子命令的命令
 */
export class CompositeCommand implements ICommand {
  private commands: ICommand[] = [];
  private name: string;

  constructor(name: string = 'Composite Operation') {
    this.name = name;
  }

  /**
   * 添加子命令
   */
  add(command: ICommand): void {
    this.commands.push(command);
  }

  /**
   * 执行所有子命令
   */
  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  /**
   * 按相反顺序撤销所有子命令
   */
  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
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
  }

  toString(): string {
    return `${this.name} (${this.commands.length} commands)`;
  }
}

/**
 * 事务管理器 - 支持嵌套事务和批量操作
 */
export class TransactionManager {
  private transactionStack: CompositeCommand[] = [];
  private historyManager: import('./HistoryManager').HistoryManager | null = null;

  constructor(historyManager?: import('./HistoryManager').HistoryManager) {
    this.historyManager = historyManager || null;
  }

  /**
   * 开始新事务
   */
  begin(name?: string): void {
    const transaction = new CompositeCommand(name || `Transaction ${this.transactionStack.length + 1}`);
    this.transactionStack.push(transaction);
  }

  /**
   * 提交当前事务
   */
  commit(): void {
    const transaction = this.transactionStack.pop();
    if (!transaction) {
      throw new Error('No active transaction to commit');
    }

    if (transaction.isEmpty()) {
      return; // 空事务直接忽略
    }

    // 如果有父事务，添加到父事务中
    if (this.transactionStack.length > 0) {
      const parentTransaction = this.transactionStack[this.transactionStack.length - 1];
      parentTransaction.add(transaction);
    } else {
      // 顶层事务，添加到历史记录
      if (this.historyManager) {
        this.historyManager.execute(transaction);
      } else {
        // 没有历史管理器，直接执行
        transaction.execute();
      }
    }
  }

  /**
   * 回滚当前事务
   */
  rollback(): void {
    const transaction = this.transactionStack.pop();
    if (!transaction) {
      throw new Error('No active transaction to rollback');
    }

    // 撤销已执行的命令
    transaction.undo();
  }

  /**
   * 在事务中执行命令
   */
  execute(command: ICommand): void {
    if (this.transactionStack.length === 0) {
      // 没有活动事务，直接通过历史管理器执行
      if (this.historyManager) {
        this.historyManager.execute(command);
      } else {
        command.execute();
      }
    } else {
      // 有活动事务，先执行命令，然后添加到事务中
      command.execute();
      const currentTransaction = this.transactionStack[this.transactionStack.length - 1];
      currentTransaction.add(command);
    }
  }

  /**
   * 检查是否有活动事务
   */
  hasActiveTransaction(): boolean {
    return this.transactionStack.length > 0;
  }

  /**
   * 获取当前事务深度
   */
  getTransactionDepth(): number {
    return this.transactionStack.length;
  }

  /**
   * 获取当前事务信息
   */
  getCurrentTransaction(): CompositeCommand | null {
    return this.transactionStack.length > 0 
      ? this.transactionStack[this.transactionStack.length - 1]
      : null;
  }

  /**
   * 批量执行操作 - 便捷方法
   */
  batch(name: string, operations: () => void): void {
    this.begin(name);
    try {
      operations();
      this.commit();
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /**
   * 异步批量执行操作
   */
  async batchAsync(name: string, operations: () => Promise<void>): Promise<void> {
    this.begin(name);
    try {
      await operations();
      this.commit();
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /**
   * 清理所有未提交的事务
   */
  clear(): void {
    // 回滚所有未提交的事务
    while (this.transactionStack.length > 0) {
      this.rollback();
    }
  }

  /**
   * 设置历史管理器
   */
  setHistoryManager(historyManager: import('./HistoryManager').HistoryManager): void {
    this.historyManager = historyManager;
  }
}

/**
 * 事务装饰器 - 自动管理事务边界
 */
export function transactional(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const transactionManager: TransactionManager = (this as any).transactionManager;
      if (!transactionManager) {
        throw new Error(`TransactionManager not found on ${target.constructor.name}`);
      }

      const operationName = name || `${target.constructor.name}.${propertyName}`;
      return transactionManager.batch(operationName, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * 异步事务装饰器
 */
export function transactionalAsync(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const transactionManager: TransactionManager = (this as any).transactionManager;
      if (!transactionManager) {
        throw new Error(`TransactionManager not found on ${target.constructor.name}`);
      }

      const operationName = name || `${target.constructor.name}.${propertyName}`;
      return transactionManager.batchAsync(operationName, () => method.apply(this, args));
    };

    return descriptor;
  };
}