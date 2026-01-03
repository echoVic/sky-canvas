/**
 * 事务管理器 - 协调历史服务的复杂业务逻辑
 * 支持批量操作、嵌套事务和自动管理事务边界
 */

import type { ILogService } from '../services';
import { CompositeCommand } from '../services/history/commands';
import { ICommand, IHistoryService } from '../services/history/historyService';

/**
 * 事务管理器接口
 */
export interface ITransactionManager {
  // 事务控制
  begin(name?: string): void;
  commit(): void;
  rollback(): void;
  
  // 命令执行
  execute(command: ICommand): void;
  
  // 批量操作
  batch<T>(name: string, operations: () => T): T;
  batchAsync<T>(name: string, operations: () => Promise<T>): Promise<T>;
  
  // 状态查询
  hasActiveTransaction(): boolean;
  getTransactionDepth(): number;
  getCurrentTransaction(): CompositeCommand | null;
  
  // 清理
  clear(): void;
}

/**
 * 事务管理器实现
 * 协调 HistoryService 和复杂的批量操作
 */
export class TransactionManager implements ITransactionManager {
  private transactionStack: CompositeCommand[] = [];

  constructor(
    private historyService: IHistoryService,
    private logService: ILogService
  ) {
    this.logService.info('TransactionManager initialized');
  }

  /**
   * 开始新事务
   */
  begin(name?: string): void {
    const transactionName = name || `Transaction ${this.transactionStack.length + 1}`;
    const transaction = new CompositeCommand(transactionName);
    this.transactionStack.push(transaction);
    
    this.logService.debug('Transaction began', transactionName);
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
      this.logService.debug('Empty transaction committed', transaction.description);
      return; // 空事务直接忽略
    }

    if (this.transactionStack.length > 0) {
      const parentTransaction = this.transactionStack[this.transactionStack.length - 1];
      parentTransaction.add(transaction);
    } else {
      this.historyService.execute(transaction);
    }

    this.logService.debug('Transaction committed', transaction.description);
  }

  /**
   * 回滚当前事务
   */
  rollback(): void {
    const transaction = this.transactionStack.pop();
    if (!transaction) {
      throw new Error('No active transaction to rollback');
    }

    try {
      transaction.undo();
      this.logService.debug('Transaction rolled back', transaction.description);
    } catch (error) {
      this.logService.error('Failed to rollback transaction', error);
      throw error;
    }
  }

  /**
   * 在事务中执行命令
   */
  execute(command: ICommand): void {
    if (this.transactionStack.length === 0) {
      // 没有活动事务，直接通过历史服务执行
      this.historyService.execute(command);
    } else {
      // 有活动事务，先执行命令，然后添加到事务中
      command.execute();
      const currentTransaction = this.transactionStack[this.transactionStack.length - 1];
      currentTransaction.add(command);
      
      this.logService.debug('Command executed in transaction', command.description);
    }
  }

  /**
   * 批量执行操作 - 便捷方法
   */
  batch<T>(name: string, operations: () => T): T {
    this.begin(name);
    try {
      const result = operations();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /**
   * 异步批量执行操作
   */
  async batchAsync<T>(name: string, operations: () => Promise<T>): Promise<T> {
    this.begin(name);
    try {
      const result = await operations();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
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
   * 清理所有未提交的事务
   */
  clear(): void {
    const transactionCount = this.transactionStack.length;
    
    // 回滚所有未提交的事务
    while (this.transactionStack.length > 0) {
      try {
        this.rollback();
      } catch (error) {
        this.logService.error('Error during transaction cleanup', error);
        // 强制清理
        this.transactionStack.pop();
      }
    }
    
    if (transactionCount > 0) {
      this.logService.info(`Cleared ${transactionCount} active transactions`);
    }
  }

  /**
   * 获取事务统计信息
   */
  getTransactionStats(): {
    activeTransactions: number;
    totalCommands: number;
    transactionNames: string[];
  } {
    const totalCommands = this.transactionStack.reduce((sum, transaction) => sum + transaction.size(), 0);
    const transactionNames = this.transactionStack.map(transaction => transaction.description);
    
    return {
      activeTransactions: this.transactionStack.length,
      totalCommands,
      transactionNames
    };
  }
}

/**
 * 事务装饰器 - 自动管理事务边界
 */
export function transactional(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const transactionManager: ITransactionManager = (this as any).transactionManager;
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
      const transactionManager: ITransactionManager = (this as any).transactionManager;
      if (!transactionManager) {
        throw new Error(`TransactionManager not found on ${target.constructor.name}`);
      }

      const operationName = name || `${target.constructor.name}.${propertyName}`;
      return transactionManager.batchAsync(operationName, () => method.apply(this, args));
    };

    return descriptor;
  };
}