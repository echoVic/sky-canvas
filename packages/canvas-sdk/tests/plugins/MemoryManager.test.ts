/**
 * 内存管理器单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryManager } from '../../src/plugins/performance/MemoryManager';

// Mock资源类型
interface MockResource {
  id: string;
  size: number;
  dispose?: () => void;
}

describe.skip('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    memoryManager.dispose();
    vi.useRealTimers();
  });

  describe('资源注册', () => {
    it('应该注册资源', () => {
      const resource: MockResource = { id: 'test-resource', size: 1024 };
      
      memoryManager.registerResource('test-plugin', 'test-resource', resource, 1024);
      
      const usage = memoryManager.getPluginMemoryUsage('test-plugin');
      expect(usage.totalSize).toBe(1024);
      expect(usage.resourceCount).toBe(1);
    });

    it('应该累计插件资源大小', () => {
      memoryManager.registerResource('test-plugin', 'resource-1', { id: '1', size: 512 }, 512);
      memoryManager.registerResource('test-plugin', 'resource-2', { id: '2', size: 256 }, 256);
      
      const usage = memoryManager.getPluginMemoryUsage('test-plugin');
      expect(usage.totalSize).toBe(768);
      expect(usage.resourceCount).toBe(2);
    });

    it('应该为不同插件分别计算', () => {
      memoryManager.registerResource('plugin-1', 'resource-1', { id: '1', size: 1024 }, 1024);
      memoryManager.registerResource('plugin-2', 'resource-2', { id: '2', size: 512 }, 512);
      
      expect(memoryManager.getPluginMemoryUsage('plugin-1').totalSize).toBe(1024);
      expect(memoryManager.getPluginMemoryUsage('plugin-2').totalSize).toBe(512);
    });

    it('应该拒绝重复注册相同资源', () => {
      const resource: MockResource = { id: 'duplicate', size: 1024 };
      
      memoryManager.registerResource('test-plugin', 'duplicate', resource, 1024);
      
      expect(() => {
        memoryManager.registerResource('test-plugin', 'duplicate', resource, 1024);
      }).toThrow('already registered');
    });
  });

  describe('资源访问', () => {
    beforeEach(() => {
      const resource: MockResource = { id: 'test-resource', size: 1024 };
      memoryManager.registerResource('test-plugin', 'test-resource', resource, 1024);
    });

    it('应该获取已注册的资源', () => {
      const resource = memoryManager.getResource('test-plugin', 'test-resource');
      
      expect(resource).toBeDefined();
      expect(resource!.id).toBe('test-resource');
    });

    it('应该返回undefined（不存在的资源）', () => {
      const resource = memoryManager.getResource('test-plugin', 'non-existent');
      expect(resource).toBeUndefined();
    });

    it('应该检查资源存在性', () => {
      expect(memoryManager.hasResource('test-plugin', 'test-resource')).toBe(true);
      expect(memoryManager.hasResource('test-plugin', 'non-existent')).toBe(false);
    });

    it('应该获取插件的所有资源', () => {
      memoryManager.registerResource('test-plugin', 'resource-2', { id: '2', size: 512 }, 512);
      
      const resources = memoryManager.getPluginResources('test-plugin');
      expect(resources).toHaveLength(2);
      expect(resources.map(r => r.id)).toContain('test-resource');
      expect(resources.map(r => r.id)).toContain('2');
    });
  });

  describe('资源释放', () => {
    it('应该释放单个资源', () => {
      const disposeSpy = vi.fn();
      const resource: MockResource = { 
        id: 'test-resource', 
        size: 1024,
        dispose: disposeSpy
      };
      
      memoryManager.registerResource('test-plugin', 'test-resource', resource, 1024);
      memoryManager.releaseResource('test-plugin', 'test-resource');
      
      expect(disposeSpy).toHaveBeenCalled();
      expect(memoryManager.hasResource('test-plugin', 'test-resource')).toBe(false);
      
      const usage = memoryManager.getPluginMemoryUsage('test-plugin');
      expect(usage.totalSize).toBe(0);
    });

    it('应该释放插件的所有资源', () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();
      
      memoryManager.registerResource('test-plugin', 'resource-1', { 
        id: '1', size: 512, dispose: dispose1 
      }, 512);
      memoryManager.registerResource('test-plugin', 'resource-2', { 
        id: '2', size: 256, dispose: dispose2 
      }, 256);
      
      memoryManager.releasePluginResources('test-plugin');
      
      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
      
      const usage = memoryManager.getPluginMemoryUsage('test-plugin');
      expect(usage.totalSize).toBe(0);
      expect(usage.resourceCount).toBe(0);
    });

    it('应该处理没有dispose方法的资源', () => {
      const resource: MockResource = { id: 'no-dispose', size: 1024 };
      
      memoryManager.registerResource('test-plugin', 'no-dispose', resource, 1024);
      
      expect(() => {
        memoryManager.releaseResource('test-plugin', 'no-dispose');
      }).not.toThrow();
    });

    it('应该处理dispose方法抛出错误', () => {
      const resource: MockResource = { 
        id: 'error-resource', 
        size: 1024,
        dispose: () => { throw new Error('Dispose error'); }
      };
      
      memoryManager.registerResource('test-plugin', 'error-resource', resource, 1024);
      
      expect(() => {
        memoryManager.releaseResource('test-plugin', 'error-resource');
      }).not.toThrow();
    });
  });

  describe('内存泄漏检测', () => {
    it('应该检测潜在的内存泄漏', () => {
      // 注册大量资源
      for (let i = 0; i < 15; i++) {
        memoryManager.registerResource('leak-plugin', `resource-${i}`, {
          id: `resource-${i}`,
          size: 1024 * 1024 // 1MB each
        }, 1024 * 1024);
      }
      
      const leaks = memoryManager.detectMemoryLeaks();
      expect(leaks).toHaveLength(1);
      expect(leaks[0].pluginId).toBe('leak-plugin');
      expect(leaks[0].resourceCount).toBe(15);
    });

    it('应该检测大内存使用', () => {
      memoryManager.registerResource('heavy-plugin', 'big-resource', {
        id: 'big-resource',
        size: 60 * 1024 * 1024 // 60MB
      }, 60 * 1024 * 1024);
      
      const leaks = memoryManager.detectMemoryLeaks();
      expect(leaks).toHaveLength(1);
      expect(leaks[0].pluginId).toBe('heavy-plugin');
      expect(leaks[0].totalSize).toBe(60 * 1024 * 1024);
    });

    it('应该返回空数组（无泄漏）', () => {
      memoryManager.registerResource('normal-plugin', 'small-resource', {
        id: 'small-resource',
        size: 1024
      }, 1024);
      
      const leaks = memoryManager.detectMemoryLeaks();
      expect(leaks).toEqual([]);
    });
  });

  describe('垃圾回收', () => {
    it('应该执行垃圾回收', () => {
      // 模拟gc函数
      const mockGc = vi.fn();
      (global as any).gc = mockGc;
      const gcSpy = vi.spyOn(global as any, 'gc').mockImplementation(() => undefined);
      
      memoryManager.forceGarbageCollection();
      
      if (typeof global.gc === 'function') {
        expect(gcSpy).toHaveBeenCalled();
      }
    });

    it('应该处理不支持gc的环境', () => {
      const originalGc = global.gc;
      delete (global as any).gc;
      
      expect(() => {
        memoryManager.forceGarbageCollection();
      }).not.toThrow();
      
      (global as any).gc = originalGc;
    });
  });

  describe('内存统计', () => {
    beforeEach(() => {
      memoryManager.registerResource('plugin-1', 'resource-1', { id: '1', size: 1024 }, 1024);
      memoryManager.registerResource('plugin-1', 'resource-2', { id: '2', size: 512 }, 512);
      memoryManager.registerResource('plugin-2', 'resource-3', { id: '3', size: 2048 }, 2048);
    });

    it('应该生成内存统计报告', () => {
      const stats = memoryManager.getMemoryStats();
      
      expect(stats.totalPlugins).toBe(2);
      expect(stats.totalResources).toBe(3);
      expect(stats.totalMemoryUsage).toBe(3584); // 1024 + 512 + 2048
      expect(stats.plugins).toHaveLength(2);
    });

    it('应该包含插件详细信息', () => {
      const stats = memoryManager.getMemoryStats();
      const plugin1 = stats.plugins.find(p => p.pluginId === 'plugin-1');
      
      expect(plugin1).toBeDefined();
      expect(plugin1!.totalSize).toBe(1536); // 1024 + 512
      expect(plugin1!.resourceCount).toBe(2);
    });

    it('应该计算平均内存使用', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats.averageMemoryPerPlugin).toBe(1792); // 3584 / 2
    });

    it('应该识别最大内存使用插件', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats.largestPlugin).toBe('plugin-2');
      expect(stats.largestPluginSize).toBe(2048);
    });
  });

  describe('内存监控', () => {
    it('应该启动内存监控', () => {
      const callback = vi.fn();
      
      memoryManager.startMemoryMonitoring(callback, 100);
      
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalled();
    });

    it('应该停止内存监控', () => {
      const callback = vi.fn();
      
      memoryManager.startMemoryMonitoring(callback, 100);
      memoryManager.stopMemoryMonitoring();
      
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('应该在监控中检测泄漏', () => {
      const callback = vi.fn();
      
      memoryManager.startMemoryMonitoring(callback, 100);
      
      // 添加大量资源触发泄漏检测
      for (let i = 0; i < 15; i++) {
        memoryManager.registerResource('monitored-plugin', `resource-${i}`, {
          id: `resource-${i}`,
          size: 1024 * 1024
        }, 1024 * 1024);
      }
      
      vi.advanceTimersByTime(100);
      
      const callArgs = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(callArgs.memoryLeaks.length).toBeGreaterThan(0);
    });
  });

  describe('内存趋势分析', () => {
    it('应该记录内存使用历史', () => {
      memoryManager.registerResource('trend-plugin', 'resource-1', { id: '1', size: 1024 }, 1024);
      
      vi.advanceTimersByTime(1000);
      memoryManager.registerResource('trend-plugin', 'resource-2', { id: '2', size: 512 }, 512);
      
      vi.advanceTimersByTime(1000);
      memoryManager.releaseResource('trend-plugin', 'resource-1');
      
      const trend = memoryManager.getMemoryTrend('trend-plugin');
      expect(trend.length).toBeGreaterThan(0);
    });

    it('应该分析内存增长趋势', () => {
      // 模拟内存持续增长
      for (let i = 0; i < 5; i++) {
        memoryManager.registerResource('growing-plugin', `resource-${i}`, {
          id: `resource-${i}`,
          size: 1024 * (i + 1)
        }, 1024 * (i + 1));
        vi.advanceTimersByTime(1000);
      }
      
      const analysis = memoryManager.analyzeMemoryTrend('growing-plugin');
      expect(analysis.isGrowing).toBe(true);
      expect(analysis.growthRate).toBeGreaterThan(0);
    });

    it('应该分析内存稳定趋势', () => {
      memoryManager.registerResource('stable-plugin', 'resource-1', { id: '1', size: 1024 }, 1024);
      
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
      }
      
      const analysis = memoryManager.analyzeMemoryTrend('stable-plugin');
      expect(analysis.isStable).toBe(true);
      expect(Math.abs(analysis.growthRate)).toBeLessThan(0.1);
    });
  });

  describe('内存优化建议', () => {
    it('应该提供内存优化建议', () => {
      // 创建大量小资源
      for (let i = 0; i < 20; i++) {
        memoryManager.registerResource('fragmented-plugin', `small-${i}`, {
          id: `small-${i}`,
          size: 100
        }, 100);
      }
      
      // 创建大资源
      memoryManager.registerResource('heavy-plugin', 'large-resource', {
        id: 'large-resource',
        size: 100 * 1024 * 1024 // 100MB
      }, 100 * 1024 * 1024);
      
      const suggestions = memoryManager.getOptimizationSuggestions();
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('fragmented-plugin'))).toBe(true);
      expect(suggestions.some(s => s.includes('heavy-plugin'))).toBe(true);
    });

    it('应该建议资源池化', () => {
      for (let i = 0; i < 25; i++) {
        memoryManager.registerResource('pooling-plugin', `resource-${i}`, {
          id: `resource-${i}`,
          size: 1024
        }, 1024);
      }
      
      const suggestions = memoryManager.getOptimizationSuggestions();
      expect(suggestions.some(s => s.includes('resource pooling'))).toBe(true);
    });
  });

  describe('数据清理', () => {
    beforeEach(() => {
      memoryManager.registerResource('plugin-1', 'resource-1', { id: '1', size: 1024 }, 1024);
      memoryManager.registerResource('plugin-2', 'resource-2', { id: '2', size: 512 }, 512);
    });

    it('应该清理插件数据', () => {
      memoryManager.clearPluginData('plugin-1');
      
      expect(memoryManager.getPluginMemoryUsage('plugin-1').totalSize).toBe(0);
      expect(memoryManager.getPluginMemoryUsage('plugin-2').totalSize).toBe(512);
    });

    it('应该清理所有数据', () => {
      memoryManager.clearAllData();
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalMemoryUsage).toBe(0);
    });
  });

  describe('内存限制', () => {
    it('应该设置插件内存限制', () => {
      memoryManager.setPluginMemoryLimit('limited-plugin', 1024); // 1KB limit
      
      memoryManager.registerResource('limited-plugin', 'small-resource', {
        id: 'small',
        size: 512
      }, 512);
      
      expect(() => {
        memoryManager.registerResource('limited-plugin', 'large-resource', {
          id: 'large',
          size: 1024
        }, 1024);
      }).toThrow('Memory limit exceeded');
    });

    it('应该检查全局内存限制', () => {
      memoryManager.setGlobalMemoryLimit(2048); // 2KB global limit
      
      memoryManager.registerResource('plugin-1', 'resource-1', { id: '1', size: 1024 }, 1024);
      
      expect(() => {
        memoryManager.registerResource('plugin-2', 'resource-2', { id: '2', size: 1536 }, 1536);
      }).toThrow('Global memory limit exceeded');
    });

    it('应该获取内存限制信息', () => {
      memoryManager.setPluginMemoryLimit('test-plugin', 1024);
      memoryManager.setGlobalMemoryLimit(4096);
      
      const limits = memoryManager.getMemoryLimits();
      expect(limits.global).toBe(4096);
      expect(limits.plugins['test-plugin']).toBe(1024);
    });
  });
});
