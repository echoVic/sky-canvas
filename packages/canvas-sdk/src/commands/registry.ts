/**
 * 命令注册表
 * 负责 Action 到 Command 的映射和命令实例化
 */

import { Action } from '../actions/types';
import { Command } from './base';
import { CanvasModel } from '../models/CanvasModel';

/**
 * 命令工厂函数接口
 */
export interface CommandFactory {
  (model: CanvasModel, action: Action): Command;
}

/**
 * 命令注册信息
 */
export interface CommandRegistration {
  factory: CommandFactory;
  description?: string;
  category?: string;
  version?: string;
}

/**
 * 命令注册表类
 */
export class CommandRegistry {
  private registry = new Map<string, CommandRegistration>();
  private plugins = new Set<string>();

  /**
   * 注册单个命令
   */
  register(actionType: string, registration: CommandRegistration): void {
    if (this.registry.has(actionType)) {
      console.warn(`Command for action type '${actionType}' is already registered. Overwriting.`);
    }

    this.registry.set(actionType, registration);
  }

  /**
   * 批量注册命令
   */
  registerBatch(registrations: Record<string, CommandRegistration>): void {
    Object.entries(registrations).forEach(([actionType, registration]) => {
      this.register(actionType, registration);
    });
  }

  /**
   * 注册插件
   */
  registerPlugin(pluginName: string, registrations: Record<string, CommandRegistration>): void {
    if (this.plugins.has(pluginName)) {
      console.warn(`Plugin '${pluginName}' is already registered. Skipping.`);
      return;
    }

    this.registerBatch(registrations);
    this.plugins.add(pluginName);
    console.log(`Plugin '${pluginName}' registered with ${Object.keys(registrations).length} commands`);
  }

  /**
   * 创建命令实例
   */
  createCommand(model: CanvasModel, action: Action): Command {
    const registration = this.registry.get(action.type);
    if (!registration) {
      throw new Error(`No command registered for action type: ${action.type}`);
    }

    try {
      return registration.factory(model, action);
    } catch (error) {
      throw new Error(`Failed to create command for action type '${action.type}': ${error}`);
    }
  }

  /**
   * 检查是否支持某个 Action 类型
   */
  supports(actionType: string): boolean {
    return this.registry.has(actionType);
  }

  /**
   * 获取所有已注册的 Action 类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 获取注册信息
   */
  getRegistration(actionType: string): CommandRegistration | undefined {
    return this.registry.get(actionType);
  }

  /**
   * 取消注册
   */
  unregister(actionType: string): boolean {
    return this.registry.delete(actionType);
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.registry.clear();
    this.plugins.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCommands: number;
    totalPlugins: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};

    this.registry.forEach((registration) => {
      const category = registration.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    return {
      totalCommands: this.registry.size,
      totalPlugins: this.plugins.size,
      categories
    };
  }

  /**
   * 导出注册表配置（用于调试和导出）
   */
  export(): Array<{
    actionType: string;
    description?: string;
    category?: string;
    version?: string;
  }> {
    return Array.from(this.registry.entries()).map(([actionType, registration]) => ({
      actionType,
      description: registration.description,
      category: registration.category,
      version: registration.version
    }));
  }
}

/**
 * 全局命令注册表实例
 */
export const commandRegistry = new CommandRegistry();

/**
 * 便捷注册函数
 */
export function registerCommand(
  actionType: string,
  factory: CommandFactory,
  options?: Omit<CommandRegistration, 'factory'>
): void {
  commandRegistry.register(actionType, {
    factory,
    ...options
  });
}

/**
 * 便捷批量注册函数
 */
export function registerCommands(registrations: Record<string, CommandFactory>): void {
  const mapped = Object.entries(registrations).reduce((acc, [actionType, factory]) => {
    acc[actionType] = { factory };
    return acc;
  }, {} as Record<string, CommandRegistration>);

  commandRegistry.registerBatch(mapped);
}