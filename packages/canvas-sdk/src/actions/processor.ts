/**
 * Action 处理器
 * 负责处理 Action，转换为 Command 并执行
 */

import { Action, ActionResult } from './types';
import { Command, AsyncCommand } from '../commands/base';
import { CanvasModel } from '../models/CanvasModel';
import { commandRegistry } from '../commands/registry';
import { registerDefaultCommands } from '../commands/defaultCommands';
import { IHistoryService, ICommand } from '../services/history/historyService';
import { validateAction, ValidationError } from './validation';

/**
 * Action 处理器配置
 */
export interface ActionProcessorConfig {
  enableValidation?: boolean;
  enableLogging?: boolean;
  autoExecute?: boolean;
  historyService?: IHistoryService;
  errorRetry?: {
    maxRetries: number;
    retryableErrors: string[];
    backoffMs: number;
  };
}

/**
 * Action 处理结果
 */
export interface ProcessResult {
  success: boolean;
  command?: Command;
  error?: string;
  actionId?: string;
  executionTime?: number;
}

/**
 * Action 处理器事件
 */
export interface ActionProcessorEvents {
  'action-received': (action: Action) => void;
  'command-created': (command: Command, action: Action) => void;
  'command-executed': (command: Command, result: ActionResult) => void;
  'command-failed': (command: Command, error: Error) => void;
  'command-aborted': (command: Command) => void;
  'action-error': (action: Action, error: Error, retryCount: number) => void;
  'action-retry': (action: Action, retryCount: number) => void;
}

/**
 * Action 处理器类
 */
export class ActionProcessor {
  private model: CanvasModel;
  private config: Required<Omit<ActionProcessorConfig, 'historyService' | 'errorRetry'>>;
  private errorRetryConfig?: NonNullable<ActionProcessorConfig['errorRetry']>;
  private historyService?: IHistoryService;
  private listeners: Map<keyof ActionProcessorEvents, Function[]> = new Map();
  private activeCommands: Map<string, Command> = new Map();
  private retryCounters: Map<string, number> = new Map();

  constructor(model: CanvasModel, config: ActionProcessorConfig = {}) {
    this.model = model;
    this.historyService = config.historyService;
    this.errorRetryConfig = config.errorRetry;
    this.config = {
      enableValidation: true,
      enableLogging: false,
      autoExecute: true,
      ...config
    };

    // 初始化事件监听器映射
    const eventTypes: (keyof ActionProcessorEvents)[] = [
      'action-received',
      'command-created',
      'command-executed',
      'command-failed',
      'command-aborted',
      'action-error',
      'action-retry'
    ];
    eventTypes.forEach(type => {
      this.listeners.set(type, []);
    });

    // 注册默认命令
    registerDefaultCommands();
  }

  /**
   * 处理 Action
   */
  async process(action: Action): Promise<ProcessResult> {
    const startTime = Date.now();
    const actionKey = this.getActionKey(action);

    try {
      // 发出事件
      this.emit('action-received', action);

      // 验证 Action 并获取清理后的payload
      let validatedPayload = action.payload;
      if (this.config.enableValidation) {
        validatedPayload = this.validateAction(action);
        // 使用验证后的payload更新action
        action = { ...action, payload: validatedPayload };
      }

      // 日志记录
      if (this.config.enableLogging) {
        console.log(`Processing action: ${action.type}`, action);
      }

      // 创建命令
      const command = commandRegistry.createCommand(this.model, action);
      this.emit('command-created', command, action);

      // 如果是异步命令，记录到活动命令中
      if (command instanceof AsyncCommand && action.metadata?.id) {
        this.activeCommands.set(action.metadata.id, command);
      }

      // 执行命令
      if (this.config.autoExecute) {
        await this.executeCommand(command, action);
      }

      // 成功后清除重试计数器
      this.retryCounters.delete(actionKey);

      const result: ProcessResult = {
        success: true,
        command,
        actionId: action.metadata?.id,
        executionTime: Date.now() - startTime
      };

      return result;

    } catch (error) {
      // 处理错误和重试逻辑
      return this.handleActionError(action, error as Error, startTime);
    }
  }

  /**
   * 执行命令
   */
  private async executeCommand(command: Command, action: Action): Promise<void> {
    try {
      // 如果有历史服务，使用历史服务执行命令（自动记录历史）
      if (this.historyService) {
        // 创建适配器将Command转换为ICommand
        const historyCommand: ICommand = {
          execute: () => command.execute(),
          undo: () => command.undo(),
          description: `Action: ${action.type}`
        };

        this.historyService.execute(historyCommand);
      } else {
        // 直接执行命令
        await command.execute();
      }

      // 发出执行成功事件
      this.emit('command-executed', command, {
        success: true,
        timestamp: Date.now(),
        actionId: action.metadata?.id
      });

      // 清理活动命令
      if (action.metadata?.id) {
        this.activeCommands.delete(action.metadata.id);
      }

    } catch (error) {
      // 发出执行失败事件
      this.emit('command-failed', command, error as Error);

      // 清理活动命令
      if (action.metadata?.id) {
        this.activeCommands.delete(action.metadata.id);
      }

      throw error;
    }
  }

  /**
   * 撤销最后一个命令
   */
  async undo(): Promise<boolean> {
    if (!this.historyService) {
      if (this.config.enableLogging) {
        console.warn('Cannot undo: no history service available');
      }
      return false;
    }

    if (!this.historyService.canUndo()) {
      return false;
    }

    try {
      this.historyService.undo();

      if (this.config.enableLogging) {
        console.log('Undid command');
      }

      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to undo command:', error);
      }

      throw error;
    }
  }

  /**
   * 重做最后一个撤销的命令
   */
  async redo(): Promise<boolean> {
    if (!this.historyService) {
      if (this.config.enableLogging) {
        console.warn('Cannot redo: no history service available');
      }
      return false;
    }

    if (!this.historyService.canRedo()) {
      return false;
    }

    try {
      this.historyService.redo();

      if (this.config.enableLogging) {
        console.log('Redid command');
      }

      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to redo command:', error);
      }

      throw error;
    }
  }

  /**
   * 中止指定的异步命令
   */
  abort(actionId: string): boolean {
    const command = this.activeCommands.get(actionId);
    if (!command || !command.abort) {
      return false;
    }

    try {
      command.abort();
      this.activeCommands.delete(actionId);
      this.emit('command-aborted', command);

      if (this.config.enableLogging) {
        console.log('Aborted command:', actionId);
      }

      return true;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Failed to abort command:', error);
      }
      return false;
    }
  }

  /**
   * 验证 Action
   */
  private validateAction(action: Action): any {
    try {
      // 使用新的验证器进行参数验证
      const validatedPayload = validateAction(action);

      // 检查是否支持该Action类型
      if (!commandRegistry.supports(action.type)) {
        throw new ValidationError(`Unsupported action type: ${action.type}`, 'type', action.type);
      }

      return validatedPayload;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error(`Action validation failed: ${error.message}`);
      }
      throw error;
    }
  }


  /**
   * 事件监听
   */
  on<K extends keyof ActionProcessorEvents>(
    event: K,
    listener: ActionProcessorEvents[K]
  ): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof ActionProcessorEvents>(
    event: K,
    listener: ActionProcessorEvents[K]
  ): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 发出事件
   */
  private emit<K extends keyof ActionProcessorEvents>(
    event: K,
    ...args: Parameters<ActionProcessorEvents[K]>
  ): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * 获取历史记录统计
   */
  getHistoryStats(): {
    historySize: number;
    activeCommands: number;
    canUndo: boolean;
    canRedo: boolean;
  } {
    if (!this.historyService) {
      return {
        historySize: 0,
        activeCommands: this.activeCommands.size,
        canUndo: false,
        canRedo: false
      };
    }

    return {
      historySize: this.historyService.getHistory().length,
      activeCommands: this.activeCommands.size,
      canUndo: this.historyService.canUndo(),
      canRedo: this.historyService.canRedo()
    };
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    if (this.historyService) {
      this.historyService.clear();
    }
  }

  /**
   * 获取活动命令列表
   */
  getActiveCommands(): string[] {
    return Array.from(this.activeCommands.keys());
  }


  /**
   * 获取配置
   */
  getConfig(): ActionProcessorConfig {
    return {
      ...this.config,
      historyService: this.historyService
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ActionProcessorConfig>): void {
    const { historyService, errorRetry, ...otherConfig } = newConfig;
    this.config = { ...this.config, ...otherConfig };
    if (historyService) {
      this.historyService = historyService;
    }
    if (errorRetry) {
      this.errorRetryConfig = errorRetry;
    }
  }

  /**
   * 获取Action的唯一标识
   */
  private getActionKey(action: Action): string {
    return action.metadata?.id || `${action.type}-${Date.now()}`;
  }

  /**
   * 处理Action错误
   */
  private async handleActionError(action: Action, error: Error, startTime: number): Promise<ProcessResult> {
    const actionKey = this.getActionKey(action);
    const currentRetryCount = this.retryCounters.get(actionKey) || 0;

    // 发出错误事件
    this.emit('action-error', action, error, currentRetryCount);

    if (this.config.enableLogging) {
      console.error(`Failed to process action: ${action.type}`, error);
    }

    // 检查是否可以重试
    if (this.errorRetryConfig && this.canRetryAction(action, error, currentRetryCount)) {
      return this.retryAction(action, error, currentRetryCount, startTime);
    }

    // 不能重试或重试次数已用完
    return {
      success: false,
      error: error.message,
      actionId: action.metadata?.id,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * 判断Action是否可以重试
   */
  private canRetryAction(action: Action, error: Error, currentRetryCount: number): boolean {
    if (!this.errorRetryConfig) return false;

    // 检查重试次数限制
    if (currentRetryCount >= this.errorRetryConfig.maxRetries) {
      return false;
    }

    // 检查错误类型是否在可重试列表中
    const errorName = error.name || error.constructor.name;
    const errorMessage = error.message || '';

    return this.errorRetryConfig.retryableErrors.some(retryableError =>
      errorName.includes(retryableError) || errorMessage.includes(retryableError)
    );
  }

  /**
   * 重试Action
   */
  private async retryAction(action: Action, error: Error, currentRetryCount: number, startTime: number): Promise<ProcessResult> {
    const actionKey = this.getActionKey(action);
    const newRetryCount = currentRetryCount + 1;

    // 更新重试计数器
    this.retryCounters.set(actionKey, newRetryCount);

    // 发出重试事件
    this.emit('action-retry', action, newRetryCount);

    if (this.config.enableLogging) {
      console.log(`Retrying action: ${action.type} (attempt ${newRetryCount}/${this.errorRetryConfig?.maxRetries})`);
    }

    // 等待退避时间
    if (this.errorRetryConfig?.backoffMs && this.errorRetryConfig.backoffMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.errorRetryConfig!.backoffMs * newRetryCount));
    }

    // 递归重试
    try {
      return await this.process(action);
    } catch (retryError) {
      // 如果重试失败，继续处理错误
      return this.handleActionError(action, retryError as Error, startTime);
    }
  }
}