/**
 * Command 体系的依赖注入服务标识符
 */

import { createDecorator } from '../di';
import { Action } from '../actions/types';
import { Command } from './base';
import { ICanvasModel } from '../models/CanvasModel';

/**
 * 命令工厂函数接口
 */
export interface ICommandFactory {
  (model: ICanvasModel, action: Action): Command;
}

/**
 * 命令注册信息
 */
export interface ICommandRegistration {
  factory: ICommandFactory;
  description?: string;
  category?: string;
  version?: string;
}

/**
 * 命令注册表服务接口
 */
export interface ICommandRegistry {
  /**
   * 注册单个命令
   */
  register(actionType: string, registration: ICommandRegistration): void;

  /**
   * 批量注册命令
   */
  registerBatch(registrations: Record<string, ICommandRegistration>): void;

  /**
   * 注册插件
   */
  registerPlugin(pluginName: string, registrations: Record<string, ICommandRegistration>): void;

  /**
   * 创建命令实例
   */
  createCommand(model: ICanvasModel, action: Action): Command;

  /**
   * 检查是否支持某个 Action 类型
   */
  supports(actionType: string): boolean;

  /**
   * 获取所有已注册的 Action 类型
   */
  getRegisteredTypes(): string[];

  /**
   * 获取注册信息
   */
  getRegistration(actionType: string): ICommandRegistration | undefined;

  /**
   * 取消注册
   */
  unregister(actionType: string): boolean;

  /**
   * 清空注册表
   */
  clear(): void;

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCommands: number;
    totalPlugins: number;
    categories: Record<string, number>;
  };
}

/**
 * Action 处理结果
 */
export interface IProcessResult {
  success: boolean;
  command?: Command;
  error?: string;
  actionId?: string;
  executionTime?: number;
}

/**
 * Action 处理器服务接口
 */
export interface IActionProcessor {
  /**
   * 处理 Action
   */
  process(action: Action): Promise<IProcessResult>;

  /**
   * 创建命令但不执行
   */
  createCommand(action: Action): Promise<Command>;

  /**
   * 执行命令
   */
  executeCommand(command: Command): Promise<IProcessResult>;

  /**
   * 中止命令执行
   */
  abortCommand(actionId: string): Promise<boolean>;

  /**
   * 获取活跃的命令
   */
  getActiveCommands(): Command[];

  /**
   * 设置事件监听器
   */
  on<K extends keyof ActionProcessorEvents>(event: K, listener: ActionProcessorEvents[K]): void;

  /**
   * 移除事件监听器
   */
  off<K extends keyof ActionProcessorEvents>(event: K, listener: ActionProcessorEvents[K]): void;

  /**
   * 历史管理方法
   */
  undo(): void;
  redo(): void;
  clearHistory(): void;
  getHistoryStats(): { canUndo: boolean; canRedo: boolean; historyLength: number };

  /**
   * 配置更新
   */
  updateConfig(newConfig: Partial<any>): void;
}

/**
 * Action 处理器事件
 */
export interface ActionProcessorEvents {
  'action-received': (action: Action) => void;
  'command-created': (command: Command, action: Action) => void;
  'command-executed': (command: Command, result: any) => void;
  'command-failed': (command: Command, error: Error) => void;
  'command-aborted': (command: Command) => void;
  'action-error': (action: Action, error: Error, retryCount: number) => void;
  'action-retry': (action: Action, retryCount: number) => void;
}

/**
 * 命令注册表服务标识符
 */
export const ICommandRegistry = createDecorator<ICommandRegistry>('commandRegistry');

/**
 * Action 处理器服务标识符
 */
export const IActionProcessor = createDecorator<IActionProcessor>('actionProcessor');