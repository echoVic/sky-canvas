/**
 * 历史服务 - 基于 VSCode DI 架构
 */

import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService } from '../logging/logService';

/**
 * 命令接口
 */
export interface ICommand {
  execute(): void;
  undo(): void;
  description?: string;
}

/**
 * 历史服务接口
 */
export interface IHistoryService {
  readonly _serviceBrand: undefined;
  execute(command: ICommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  getHistory(): ICommand[];
  getCurrentIndex(): number;
}

/**
 * 历史服务实现
 */
export class HistoryService implements IHistoryService {
  readonly _serviceBrand: undefined;
  private history: ICommand[] = [];
  private currentIndex = -1;
  private maxHistorySize = 100;

  constructor(
    private eventBus: IEventBusService,
    private logger: ILogService
  ) {}

  execute(command: ICommand): void {
    try {
      // 执行命令
      command.execute();
      
      // 清除当前位置之后的历史记录
      this.history.splice(this.currentIndex + 1);
      
      // 添加新命令到历史记录
      this.history.push(command);
      this.currentIndex++;
      
      // 限制历史记录大小
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.currentIndex--;
      }
      
      this.eventBus.emit('history:executed', { 
        command, 
        canUndo: this.canUndo(), 
        canRedo: this.canRedo() 
      });
      
      this.logger.debug('Command executed', command.description || 'Unknown command');
    } catch (error) {
      this.logger.error('Failed to execute command', error);
      throw error;
    }
  }

  undo(): void {
    if (!this.canUndo()) {
      this.logger.warn('Cannot undo: no commands to undo');
      return;
    }

    try {
      const command = this.history[this.currentIndex];
      command.undo();
      this.currentIndex--;
      
      this.eventBus.emit('history:undone', { 
        command, 
        canUndo: this.canUndo(), 
        canRedo: this.canRedo() 
      });
      
      this.logger.debug('Command undone', command.description || 'Unknown command');
    } catch (error) {
      this.logger.error('Failed to undo command', error);
      throw error;
    }
  }

  redo(): void {
    if (!this.canRedo()) {
      this.logger.warn('Cannot redo: no commands to redo');
      return;
    }

    try {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      command.execute();
      
      this.eventBus.emit('history:redone', { 
        command, 
        canUndo: this.canUndo(), 
        canRedo: this.canRedo() 
      });
      
      this.logger.debug('Command redone', command.description || 'Unknown command');
    } catch (error) {
      this.currentIndex--; // 回滚索引
      this.logger.error('Failed to redo command', error);
      throw error;
    }
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.eventBus.emit('history:cleared', {});
    this.logger.debug('History cleared');
  }

  getHistory(): ICommand[] {
    return [...this.history];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 设置最大历史记录大小
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
    
    // 如果当前历史记录超过新的限制，移除最旧的记录
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
      if (this.currentIndex >= 0) {
        this.currentIndex--;
      }
    }
  }

  /**
   * 获取最大历史记录大小
   */
  getMaxHistorySize(): number {
    return this.maxHistorySize;
  }
}