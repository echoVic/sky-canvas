/**
 * Action 处理器
 * 负责处理 Action，转换为 Command 并执行
 */

import { AsyncCommand, Command } from '../commands/base';
import { ActionProcessorEvents, IActionProcessor, ICommandRegistry, IProcessResult } from '../commands/services';
import { ICanvasModel } from '../models/CanvasModel';
import { IEventBusService, ILogService } from '../services';
import { ICommand, IHistoryService } from '../services/history/historyService';
import { Action } from './types';
import { validateAction, ValidationError } from './validation';

/**
 * Action 处理器配置
 */
export interface ActionProcessorConfig {
  enableValidation?: boolean;
  enableLogging?: boolean;
  autoExecute?: boolean;
  errorRetry?: {
    maxRetries: number;
    retryableErrors: string[];
    backoffMs: number;
  };
}


/**
 * Action 处理器类 - DI 版本
 */
export class ActionProcessor implements IActionProcessor {
  private config: Required<Omit<ActionProcessorConfig, 'errorRetry'>>;
  private errorRetryConfig?: NonNullable<ActionProcessorConfig['errorRetry']>;
  private listeners: Map<keyof ActionProcessorEvents, Function[]> = new Map();
  private activeCommands: Map<string, Command> = new Map();
  private retryCounters: Map<string, number> = new Map();

  constructor(
    private canvasModel: ICanvasModel,
    private commandRegistry: ICommandRegistry,
    private historyService?: IHistoryService,
    private logger?: ILogService,
    private eventBus?: IEventBusService,
    config: ActionProcessorConfig = {}
  ) {
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
  }

  /**
   * 处理 Action
   */
  async process(action: Action): Promise<IProcessResult> {
    const startTime = Date.now();
    const actionKey = this.getActionKey(action);

    try {
      // 触发 action-received 事件
      this.emit('action-received', action);

      // 验证 Action
      if (this.config.enableValidation) {
        try {
          validateAction(action);
        } catch (error) {
          if (error instanceof ValidationError) {
            const result: IProcessResult = {
              success: false,
              error: `Validation failed: ${error.message}`,
              actionId: action.metadata?.id,
              executionTime: Date.now() - startTime
            };
            this.logError(`Action validation failed: ${error.message}`, action);
            return result;
          }
          throw error;
        }
      }

      // 创建命令
      const command = await this.createCommand(action);
      this.activeCommands.set(actionKey, command);

      // 自动执行命令
      if (this.config.autoExecute) {
        return await this.executeCommand(command);
      }

      return {
        success: true,
        command,
        actionId: action.metadata?.id,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError(`Failed to process action: ${errorMessage}`, action);

      // 尝试重试
      if (this.shouldRetry(action, error)) {
        return await this.retryAction(action);
      }

      return {
        success: false,
        error: errorMessage,
        actionId: action.metadata?.id,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 创建命令但不执行
   */
  async createCommand(action: Action): Promise<Command> {
    try {
      const command = this.commandRegistry.createCommand(this.canvasModel as any, action);

      // 触发 command-created 事件
      this.emit('command-created', command, action);

      this.logInfo(`Command created for action type: ${action.type}`, action);
      return command;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError(`Failed to create command: ${errorMessage}`, action);
      throw error;
    }
  }

  /**
   * 执行命令
   */
  async executeCommand(command: Command): Promise<IProcessResult> {
    const startTime = Date.now();
    const actionId = (command as any).actionId || 'unknown';

    try {
      let result: any;

      if (command instanceof AsyncCommand) {
        result = await command.execute();
      } else {
        result = command.execute();
      }

      // 添加到历史记录
      if (this.historyService && command.canUndo()) {
        const historyCommand: ICommand = {
          execute: () => command.execute(),
          undo: () => command.undo(),
          description: command.getDescription()
        };
        this.historyService.execute(historyCommand);
      }

      // 触发 command-executed 事件
      this.emit('command-executed', command, result);

      // 从活跃命令中移除
      const actionKey = this.findActionKeyByCommand(command);
      if (actionKey) {
        this.activeCommands.delete(actionKey);
      }

      this.logInfo(`Command executed successfully: ${command.getDescription()}`);

      return {
        success: true,
        command,
        actionId,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 触发 command-failed 事件
      this.emit('command-failed', command, error instanceof Error ? error : new Error(errorMessage));

      this.logError(`Command execution failed: ${errorMessage}`);

      return {
        success: false,
        command,
        error: errorMessage,
        actionId,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 中止命令执行
   */
  async abortCommand(actionId: string): Promise<boolean> {
    const command = this.findCommandByActionId(actionId);
    if (!command) {
      this.logWarning(`No active command found for action ID: ${actionId}`);
      return false;
    }

    try {
      if (command instanceof AsyncCommand) {
        await command.abort();
      }

      // 从活跃命令中移除
      const actionKey = this.findActionKeyByCommand(command);
      if (actionKey) {
        this.activeCommands.delete(actionKey);
      }

      // 触发 command-aborted 事件
      this.emit('command-aborted', command);

      this.logInfo(`Command aborted for action ID: ${actionId}`);
      return true;
    } catch (error) {
      this.logError(`Failed to abort command for action ID: ${actionId}`, error);
      return false;
    }
  }

  /**
   * 获取活跃的命令
   */
  getActiveCommands(): Command[] {
    return Array.from(this.activeCommands.values());
  }

  /**
   * 设置事件监听器
   */
  on<K extends keyof ActionProcessorEvents>(event: K, listener: ActionProcessorEvents[K]): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener as Function);
    this.listeners.set(event, listeners);
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof ActionProcessorEvents>(event: K, listener: ActionProcessorEvents[K]): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener as Function);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // 私有辅助方法

  private emit<K extends keyof ActionProcessorEvents>(
    event: K,
    ...args: Parameters<ActionProcessorEvents[K]>
  ): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        this.logError(`Event listener error for '${event}':`, error);
      }
    });

    // 同时通过 EventBus 发送事件
    if (this.eventBus) {
      try {
        (this.eventBus.emit as any)(`action-processor:${event}`, ...args);
      } catch (error) {
        this.logError(`EventBus emission error for '${event}':`, error);
      }
    }
  }

  private getActionKey(action: Action): string {
    return action.metadata?.id || `${action.type}-${Date.now()}`;
  }

  private findActionKeyByCommand(command: Command): string | undefined {
    for (const [key, cmd] of this.activeCommands) {
      if (cmd === command) {
        return key;
      }
    }
    return undefined;
  }

  private findCommandByActionId(actionId: string): Command | undefined {
    for (const [key, command] of this.activeCommands) {
      if (key.includes(actionId)) {
        return command;
      }
    }
    return undefined;
  }

  private shouldRetry(action: Action, error: any): boolean {
    if (!this.errorRetryConfig) {
      return false;
    }

    const retryCount = this.retryCounters.get(action.metadata?.id || '') || 0;
    if (retryCount >= this.errorRetryConfig.maxRetries) {
      return false;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return this.errorRetryConfig.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    );
  }

  private async retryAction(action: Action): Promise<IProcessResult> {
    const retryCount = (this.retryCounters.get(action.metadata?.id || '') || 0) + 1;
    this.retryCounters.set(action.metadata?.id || '', retryCount);

    // 触发重试事件
    this.emit('action-retry', action, retryCount);

    this.logInfo(`Retrying action (attempt ${retryCount}): ${action.type}`);

    // 等待回退时间
    if (this.errorRetryConfig?.backoffMs) {
      await new Promise(resolve => setTimeout(resolve, this.errorRetryConfig!.backoffMs * retryCount));
    }

    // 递归调用 process
    return this.process(action);
  }

  private logInfo(message: string, data?: any): void {
    if (this.config.enableLogging) {
      if (this.logger) {
        this.logger.info(message, data);
      } else {
        console.log(`[ActionProcessor] ${message}`, data);
      }
    }
  }

  private logWarning(message: string, data?: any): void {
    if (this.config.enableLogging) {
      if (this.logger) {
        this.logger.warn(message, data);
      } else {
        console.warn(`[ActionProcessor] ${message}`, data);
      }
    }
  }

  private logError(message: string, data?: any): void {
    if (this.config.enableLogging) {
      if (this.logger) {
        this.logger.error(message, data);
      } else {
        console.error(`[ActionProcessor] ${message}`, data);
      }
    }
  }

  // 历史管理方法 - 委托给 historyService
  undo(): void {
    if (this.historyService) {
      this.historyService.undo();
    }
  }

  redo(): void {
    if (this.historyService) {
      this.historyService.redo();
    }
  }

  clearHistory(): void {
    if (this.historyService) {
      this.historyService.clear();
    }
  }

  getHistoryStats(): { canUndo: boolean; canRedo: boolean; historyLength: number } {
    if (this.historyService) {
      return {
        canUndo: this.historyService.canUndo(),
        canRedo: this.historyService.canRedo(),
        historyLength: this.historyService.getHistory().length
      };
    }
    return {
      canUndo: false,
      canRedo: false,
      historyLength: 0
    };
  }

  updateConfig(newConfig: Partial<ActionProcessorConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    if (newConfig.errorRetry) {
      this.errorRetryConfig = newConfig.errorRetry;
    }
  }
}