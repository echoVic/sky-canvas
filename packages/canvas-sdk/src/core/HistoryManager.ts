/**
 * 历史记录管理器
 * 支持撤销/重做功能
 */

/**
 * 命令接口
 */
export interface ICommand {
  /**
   * 执行命令
   */
  execute(): void;
  
  /**
   * 撤销命令
   */
  undo(): void;
}

/**
 * 历史记录管理器
 */
export class HistoryManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistorySize: number = 50;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 执行命令并添加到历史记录
   * @param command 命令对象
   */
  execute(command: ICommand): void {
    // 执行命令
    command.execute();
    
    // 添加到撤销栈
    this.undoStack.push(command);
    
    // 清空重做栈
    this.redoStack = [];
    
    // 限制历史记录大小
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * 撤销上一个操作
   */
  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      
      // 限制重做栈大小
      if (this.redoStack.length > this.maxHistorySize) {
        this.redoStack.shift();
      }
    }
  }

  /**
   * 重做上一个撤销的操作
   */
  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      
      // 限制撤销栈大小
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }
    }
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}