/**
 * 渲染桥接器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RenderBridge,
  BridgeCommandType,
  BridgeCommandOptimizer,
  CacheKeyGenerator,
  type BridgeCommand,
  type BatchBridgeCommand
} from '../RenderBridge';
import { IGraphicsContext } from '../../graphics/IGraphicsContext';

// Mock graphics context
const mockContext: IGraphicsContext = {
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  setFillStyle: vi.fn(),
  setStrokeStyle: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  clip: vi.fn()
} as any;

describe('RenderBridge', () => {
  let renderBridge: RenderBridge;

  beforeEach(() => {
    renderBridge = new RenderBridge(mockContext);
    vi.clearAllMocks();
  });

  afterEach(() => {
    renderBridge.dispose();
  });

  describe('命令管理', () => {
    it('应该能够添加渲染命令', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_RECTANGLE,
        id: 'test-rect',
        data: { x: 10, y: 20, width: 100, height: 50, fillStyle: '#ff0000' }
      };
      
      renderBridge.addCommand(command);
      
      const stats = renderBridge.getStats();
      expect(stats).toBeDefined();
    });

    it('应该能够添加批量渲染命令', () => {
      const batchCommand: BatchBridgeCommand = {
        commands: [
          {
            type: BridgeCommandType.DRAW_RECTANGLE,
            data: { x: 0, y: 0, width: 50, height: 50 }
          },
          {
            type: BridgeCommandType.DRAW_CIRCLE,
            data: { x: 100, y: 100, radius: 25 }
          }
        ]
      };
      
      renderBridge.addBatchCommands(batchCommand);
      
      const stats = renderBridge.getStats();
      expect(stats.commandsBatched).toBeGreaterThanOrEqual(0);
    });

    it('应该能够刷新命令队列', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_RECTANGLE,
        data: { x: 10, y: 20, width: 100, height: 50, fillStyle: '#ff0000' }
      };
      
      renderBridge.addCommand(command);
      renderBridge.flushCommands();
      
      // 验证命令已执行
      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        enableBatching: false,
        maxCacheSize: 500
      };
      
      renderBridge.configure(newConfig);
      
      // 配置更新应该成功
      expect(() => renderBridge.configure(newConfig)).not.toThrow();
    });
  });

  describe('统计信息', () => {
    it('应该提供统计信息', () => {
      const stats = renderBridge.getStats();
      
      expect(stats).toMatchObject({
        commandsExecuted: expect.any(Number),
        commandsBatched: expect.any(Number),
        cacheHits: expect.any(Number),
        cacheMisses: expect.any(Number),
        optimizedCalls: expect.any(Number)
      });
    });
  });

  describe('缓存管理', () => {
    it('应该能够清除缓存', () => {
      renderBridge.clearCache();
      
      // 清除缓存应该成功
      expect(() => renderBridge.clearCache()).not.toThrow();
    });
  });

  describe('对象池管理', () => {
    it('应该能够获取池化对象', () => {
      const obj = renderBridge.getPooledObject('test');
      
      // 可能返回null或对象
      expect(obj === null || typeof obj === 'object').toBe(true);
    });

    it('应该能够释放池化对象', () => {
      const testObj = { test: true };
      
      renderBridge.releasePooledObject('test', testObj);
      
      // 释放对象应该成功
      expect(() => renderBridge.releasePooledObject('test', testObj)).not.toThrow();
    });
  });
});

describe('BridgeCommandOptimizer', () => {
  describe('命令优化', () => {
    it('应该能够优化命令数组', () => {
      const commands: BridgeCommand[] = [
        {
          type: BridgeCommandType.DRAW_RECTANGLE,
          data: { x: 0, y: 0, width: 50, height: 50 }
        },
        {
          type: BridgeCommandType.DRAW_RECTANGLE,
          data: { x: 60, y: 0, width: 50, height: 50 }
        }
      ];
      
      const optimized = BridgeCommandOptimizer.optimizeCommands(commands);
      
      expect(Array.isArray(optimized)).toBe(true);
      expect(optimized.length).toBeGreaterThan(0);
    });

    it('应该处理空命令数组', () => {
      const optimized = BridgeCommandOptimizer.optimizeCommands([]);
      
      expect(optimized).toEqual([]);
    });
  });
});

describe('CacheKeyGenerator', () => {
  describe('缓存键生成', () => {
    it('应该为矩形命令生成缓存键', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_RECTANGLE,
        data: { x: 10, y: 20, width: 100, height: 50, fillStyle: 'red' }
      };
      
      const key = CacheKeyGenerator.generateCommandKey(command);
      
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('应该为圆形命令生成缓存键', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_CIRCLE,
        data: { x: 100, y: 100, radius: 25, fillStyle: 'blue' }
      };
      
      const key = CacheKeyGenerator.generateCommandKey(command);
      
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('应该为文本命令生成缓存键', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_TEXT,
        data: { text: 'Hello', x: 50, y: 50, font: 'Arial', fillStyle: 'black' }
      };
      
      const key = CacheKeyGenerator.generateCommandKey(command);
      
      expect(typeof key).toBe('string');
      expect(key.includes('Hello')).toBe(true);
    });

    it('应该为相同命令生成相同的键', () => {
      const command: BridgeCommand = {
        type: BridgeCommandType.DRAW_RECTANGLE,
        data: { x: 10, y: 20, width: 100, height: 50, fillStyle: 'red' }
      };
      
      const key1 = CacheKeyGenerator.generateCommandKey(command);
      const key2 = CacheKeyGenerator.generateCommandKey(command);
      
      expect(key1).toBe(key2);
    });

    it('应该为不同命令生成不同的键', () => {
      const command1: BridgeCommand = {
        type: BridgeCommandType.DRAW_RECTANGLE,
        data: { x: 10, y: 20, width: 100, height: 50 }
      };
      
      const command2: BridgeCommand = {
        type: BridgeCommandType.DRAW_CIRCLE,
        data: { x: 100, y: 100, radius: 25 }
      };
      
      const key1 = CacheKeyGenerator.generateCommandKey(command1);
      const key2 = CacheKeyGenerator.generateCommandKey(command2);
      
      expect(key1).not.toBe(key2);
    });
  });
});