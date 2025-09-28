/**
 * ActionProcessor 单元测试
 * 测试核心的 Action → Command 流程
 */

import { vi } from 'vitest';
import { ActionProcessor } from '../processor';
import { CanvasModel } from '../../models/CanvasModel';
import { Action } from '../types';
import { CommandRegistry } from '../../commands/registry';

// Mock EventBus 和 Logger
const mockEventBus = {
  _serviceBrand: undefined,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockLogger = {
  _serviceBrand: undefined,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn()
};

describe('ActionProcessor', () => {
  let model: CanvasModel;
  let processor: ActionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new CanvasModel();
    const commandRegistry = new CommandRegistry();
    processor = new ActionProcessor(model, commandRegistry, undefined, undefined, undefined, {
      enableValidation: true,
      enableLogging: false
    });
  });

  afterEach(() => {
    // 清理测试环境
  });

  describe('基础功能', () => {
    it('应该能创建 ActionProcessor 实例', () => {
      expect(processor).toBeDefined();
      expect(typeof processor.process).toBe('function');
    });

    it('应该有正确的配置', () => {
      const stats = processor.getHistoryStats();
      expect(stats).toBeDefined();
      expect(typeof stats.canUndo).toBe('boolean');
      expect(typeof stats.canRedo).toBe('boolean');
    });

    it('应该能处理未知 Action 类型', async () => {
      const unknownAction: Action = {
        type: 'UNKNOWN_ACTION',
        payload: {},
        metadata: {
          timestamp: Date.now(),
          source: 'user'
        }
      };

      await expect(processor.process(unknownAction)).rejects.toThrow();
    });
  });

  describe('历史管理', () => {
    it('初始状态应该无法撤销和重做', () => {
      const stats = processor.getHistoryStats();
      expect(stats.canUndo).toBe(false);
      expect(stats.canRedo).toBe(false);
    });
  });

  describe('配置管理', () => {
    it('应该能更新配置', () => {
      const newConfig = {
        enableValidation: false,
        enableLogging: true
      };

      processor.updateConfig(newConfig);

      // 配置更新不会抛出错误即可
      expect(() => processor.updateConfig(newConfig)).not.toThrow();
    });
  });
});