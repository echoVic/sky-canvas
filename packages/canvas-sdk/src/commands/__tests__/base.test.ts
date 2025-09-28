/**
 * Command基础类测试
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  SyncCommand,
  AsyncCommand,
  CompositeCommand,
  BatchCommand,
  StatefulCommand,
  CommandStatus
} from '../base';
import { ICanvasModel } from '../../models/CanvasModel';

// Mock实现
const mockCanvasModel = {
  beginBatch: vi.fn(),
  endBatch: vi.fn(),
  notify: vi.fn(),
  getShapes: vi.fn(() => []),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  getSelection: vi.fn(() => []),
  setSelection: vi.fn(),
  addToSelection: vi.fn(),
  removeFromSelection: vi.fn(),
  clearSelection: vi.fn(),
  selectAll: vi.fn(),
  invertSelection: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  unsubscribe: vi.fn()
};

// 测试用的具体命令实现
class TestSyncCommand extends SyncCommand {
  public executed = false;
  public undone = false;

  execute(): void {
    this.executed = true;
    this.markAsExecuted();
  }

  undo(): void {
    this.undone = true;
    this.markAsNotExecuted();
  }
}

class TestAsyncCommand extends AsyncCommand {
  public executed = false;
  public undone = false;

  async execute(): Promise<void> {
    this.executed = true;
    this.markAsExecuted();
  }

  async undo(): Promise<void> {
    this.undone = true;
    this.markAsNotExecuted();
  }
}

describe('Command基础类测试', () => {
  let model: ICanvasModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = mockCanvasModel as any;
  });

  describe('SyncCommand', () => {
    let command: TestSyncCommand;

    beforeEach(() => {
      command = new TestSyncCommand(model, 'Test Sync Command');
    });

    it('应该能创建同步命令实例', () => {
      expect(command).toBeDefined();
      expect(command.description).toBe('Test Sync Command');
      expect(command.isCommandExecuted()).toBe(false);
    });

    it('应该能执行命令', () => {
      command.execute();
      expect(command.executed).toBe(true);
      expect(command.isCommandExecuted()).toBe(true);
    });

    it('应该能撤销命令', () => {
      command.execute();
      command.undo();
      expect(command.undone).toBe(true);
      expect(command.isCommandExecuted()).toBe(false);
    });

    it('应该能重做命令', () => {
      command.execute();
      command.undo();
      command.redo();
      expect(command.executed).toBe(true);
      expect(command.isCommandExecuted()).toBe(true);
    });

    it('应该有正确的字符串表示', () => {
      expect(command.toString()).toBe('Test Sync Command');
    });
  });

  describe('AsyncCommand', () => {
    let command: TestAsyncCommand;

    beforeEach(() => {
      command = new TestAsyncCommand(model, 'Test Async Command');
    });

    it('应该能创建异步命令实例', () => {
      expect(command).toBeDefined();
      expect(command.description).toBe('Test Async Command');
      expect(command.isCommandExecuted()).toBe(false);
    });

    it('应该能执行异步命令', async () => {
      await command.execute();
      expect(command.executed).toBe(true);
      expect(command.isCommandExecuted()).toBe(true);
    });

    it('应该能撤销异步命令', async () => {
      await command.execute();
      await command.undo();
      expect(command.undone).toBe(true);
      expect(command.isCommandExecuted()).toBe(false);
    });

    it('应该有初始进度状态', () => {
      const progress = command.getProgress();
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(1);
    });

    it('应该能中断命令', () => {
      // 测试abort方法存在且可以调用
      expect(typeof command.abort).toBe('function');

      // 调用abort不应该抛出错误
      expect(() => command.abort()).not.toThrow();
    });
  });

  describe('CompositeCommand', () => {
    let compositeCommand: CompositeCommand;
    let subCommand1: TestSyncCommand;
    let subCommand2: TestSyncCommand;

    beforeEach(() => {
      compositeCommand = new CompositeCommand(model, 'Composite Test');
      subCommand1 = new TestSyncCommand(model, 'Sub Command 1');
      subCommand2 = new TestSyncCommand(model, 'Sub Command 2');
    });

    it('应该能创建复合命令实例', () => {
      expect(compositeCommand).toBeDefined();
      expect(compositeCommand.description).toBe('Composite Test');
      expect(compositeCommand.isEmpty()).toBe(true);
      expect(compositeCommand.size()).toBe(0);
    });

    it('应该能添加子命令', () => {
      compositeCommand.add(subCommand1);
      compositeCommand.add(subCommand2);

      expect(compositeCommand.size()).toBe(2);
      expect(compositeCommand.isEmpty()).toBe(false);
    });

    it('应该能执行所有子命令', async () => {
      compositeCommand.add(subCommand1);
      compositeCommand.add(subCommand2);

      await compositeCommand.execute();

      expect(subCommand1.executed).toBe(true);
      expect(subCommand2.executed).toBe(true);
      expect(compositeCommand.isCommandExecuted()).toBe(true);
    });

    it('应该能撤销所有子命令', async () => {
      compositeCommand.add(subCommand1);
      compositeCommand.add(subCommand2);

      await compositeCommand.execute();
      await compositeCommand.undo();

      expect(subCommand1.undone).toBe(true);
      expect(subCommand2.undone).toBe(true);
      expect(compositeCommand.isCommandExecuted()).toBe(false);
    });

    it('应该能清空子命令', () => {
      compositeCommand.add(subCommand1);
      compositeCommand.clear();

      expect(compositeCommand.isEmpty()).toBe(true);
      expect(compositeCommand.size()).toBe(0);
    });
  });

  describe('BatchCommand', () => {
    let batchCommand: BatchCommand;
    let subCommand1: TestAsyncCommand;
    let subCommand2: TestAsyncCommand;

    beforeEach(() => {
      subCommand1 = new TestAsyncCommand(model, 'Batch Sub 1');
      subCommand2 = new TestAsyncCommand(model, 'Batch Sub 2');
      batchCommand = new BatchCommand(model, [subCommand1, subCommand2]);
    });

    it('应该能创建批量命令实例', () => {
      expect(batchCommand).toBeDefined();
      expect(batchCommand.description).toBe('Batch Operation (2 commands)');
    });

    it('应该能执行批量命令', async () => {
      await batchCommand.execute();

      expect(subCommand1.executed).toBe(true);
      expect(subCommand2.executed).toBe(true);
      expect(batchCommand.isCommandExecuted()).toBe(true);

      // 验证批量模式调用
      expect(model.beginBatch).toHaveBeenCalled();
      expect(model.endBatch).toHaveBeenCalled();
    });

    it('应该能撤销批量命令', async () => {
      await batchCommand.execute();
      await batchCommand.undo();

      expect(subCommand1.undone).toBe(true);
      expect(subCommand2.undone).toBe(true);
      expect(batchCommand.isCommandExecuted()).toBe(false);

      // 验证通知调用
      expect(model.notify).toHaveBeenCalledWith({
        type: 'batch-undone',
        data: { count: 2 },
        timestamp: expect.any(Number)
      });
    });

    it('应该有正确的进度状态', () => {
      const progress = batchCommand.getProgress();
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(2);
    });
  });

  describe('StatefulCommand', () => {
    let baseCommand: TestAsyncCommand;
    let statefulCommand: StatefulCommand;

    beforeEach(() => {
      baseCommand = new TestAsyncCommand(model, 'Stateful Test');
      statefulCommand = new StatefulCommand(baseCommand);
    });

    it('应该能创建状态命令实例', () => {
      expect(statefulCommand).toBeDefined();
      expect(statefulCommand.getStatus()).toBe(CommandStatus.PENDING);
    });

    it('应该能执行并跟踪状态', async () => {
      await statefulCommand.execute();

      expect(statefulCommand.getStatus()).toBe(CommandStatus.COMPLETED);
      expect(baseCommand.executed).toBe(true);
      const executionTime = statefulCommand.getExecutionTime();
      expect(executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该能撤销已完成的命令', async () => {
      await statefulCommand.execute();
      await statefulCommand.undo();

      expect(baseCommand.undone).toBe(true);
    });

    it('应该拒绝撤销未完成的命令', async () => {
      await expect(statefulCommand.undo()).rejects.toThrow('Cannot undo command that is not completed');
    });

    it('应该能中断命令', () => {
      statefulCommand.abort();
      expect(statefulCommand.getStatus()).toBe(CommandStatus.ABORTED);
    });

    it('应该有正确的字符串表示', () => {
      expect(statefulCommand.toString()).toMatch(/\[pending\]$/);
    });
  });
});