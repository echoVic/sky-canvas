/**
 * 历史服务 - 基于 VSCode DI 架构
 */

import { createDecorator } from '../../di';
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
 * 历史变更监听器
 */
export type HistoryChangeListener = () => void;

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
  onDidChange(listener: HistoryChangeListener): () => void;
}

/**
 * 历史服务标识符
 */
export const IHistoryService = createDecorator<IHistoryService>('HistoryService');

/**
 * 历史服务实现
 */
export class HistoryService implements IHistoryService {
  readonly _serviceBrand: undefined;
  private history: ICommand[] = [];
  private currentIndex = -1;
  private maxHistorySize = 100;
  private listeners: HistoryChangeListener[] = [];

  constructor(
    @ILogService private logger: ILogService
  ) {}

  onDidChange(listener: HistoryChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        this.logger.error('Error in history change listener', error);
      }
    });
  }

  execute(command: ICommand): void {
    try {
      command.execute();
      
      this.history.splice(this.currentIndex + 1);
      
      this.history.push(command);
      this.currentIndex++;
      
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.currentIndex--;
      }
      
      this.logger.debug('Command executed', command.description || 'Unknown command');
      this.notifyListeners();
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
      
      this.logger.debug('Command undone', command.description || 'Unknown command');
      this.notifyListeners();
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
      
      this.logger.debug('Command redone', command.description || 'Unknown command');
      this.notifyListeners();
    } catch (error) {
      this.currentIndex--;
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
    this.logger.debug('History cleared');
    this.notifyListeners();
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
