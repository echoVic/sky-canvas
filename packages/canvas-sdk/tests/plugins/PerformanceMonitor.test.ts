/**
 * 性能监控器单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceMonitor } from '../../src/plugins/performance/PerformanceMonitor';

describe.skip('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    performanceMonitor.dispose();
    vi.useRealTimers();
  });

  describe('插件加载时间监控', () => {
    it('应该记录插件加载开始', () => {
      performanceMonitor.startLoadTime('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.loadStartTime).toBeDefined();
    });

    it('应该记录插件加载结束并计算时间', () => {
      performanceMonitor.startLoadTime('test-plugin');
      
      vi.advanceTimersByTime(100);
      performanceMonitor.endLoadTime('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.loadTime).toBe(100);
    });

    it('应该处理未开始的加载时间记录', () => {
      performanceMonitor.endLoadTime('non-existent');
      
      const metrics = performanceMonitor.getPluginMetrics('non-existent');
      expect(metrics.loadTime).toBe(0);
    });
  });

  describe('插件激活时间监控', () => {
    it('应该记录插件激活时间', () => {
      performanceMonitor.startActivationTime('test-plugin');
      
      vi.advanceTimersByTime(50);
      performanceMonitor.endActivationTime('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.activationTime).toBe(50);
    });

    it('应该支持多次激活时间记录', () => {
      // 第一次激活
      performanceMonitor.startActivationTime('test-plugin');
      vi.advanceTimersByTime(30);
      performanceMonitor.endActivationTime('test-plugin');
      
      // 第二次激活
      performanceMonitor.startActivationTime('test-plugin');
      vi.advanceTimersByTime(20);
      performanceMonitor.endActivationTime('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.activationTime).toBe(20); // 最后一次的时间
    });
  });

  describe('内存使用监控', () => {
    it('应该记录内存使用情况', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1024 * 1024 * 10, // 10MB
          totalJSHeapSize: 1024 * 1024 * 20, // 20MB
          jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
        },
        configurable: true
      });

      performanceMonitor.recordMemoryUsage('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.memoryUsage).toBe(10 * 1024 * 1024);
    });

    it('应该处理不支持memory API的环境', () => {
      // 删除memory属性
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true
      });

      performanceMonitor.recordMemoryUsage('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.memoryUsage).toBe(0);
    });
  });

  describe('API调用统计', () => {
    it('应该增加API调用计数', () => {
      performanceMonitor.incrementApiCalls('test-plugin');
      performanceMonitor.incrementApiCalls('test-plugin');
      performanceMonitor.incrementApiCalls('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.apiCalls).toBe(3);
    });

    it('应该为不同插件分别计数', () => {
      performanceMonitor.incrementApiCalls('plugin-1');
      performanceMonitor.incrementApiCalls('plugin-1');
      performanceMonitor.incrementApiCalls('plugin-2');
      
      expect(performanceMonitor.getPluginMetrics('plugin-1').apiCalls).toBe(2);
      expect(performanceMonitor.getPluginMetrics('plugin-2').apiCalls).toBe(1);
    });
  });

  describe('错误统计', () => {
    it('应该增加错误计数', () => {
      performanceMonitor.incrementErrors('test-plugin');
      performanceMonitor.incrementErrors('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.errors).toBe(2);
    });

    it('应该记录错误详情', () => {
      const error = new Error('Test error');
      performanceMonitor.recordError('test-plugin', error);
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.errors).toBe(1);
      expect(metrics.lastError).toBe('Test error');
    });
  });

  describe('性能报告', () => {
    beforeEach(() => {
      // 设置测试数据
      performanceMonitor.startLoadTime('plugin-1');
      vi.advanceTimersByTime(100);
      performanceMonitor.endLoadTime('plugin-1');
      
      performanceMonitor.startActivationTime('plugin-1');
      vi.advanceTimersByTime(50);
      performanceMonitor.endActivationTime('plugin-1');
      
      performanceMonitor.incrementApiCalls('plugin-1');
      performanceMonitor.incrementApiCalls('plugin-1');
      performanceMonitor.incrementErrors('plugin-1');
      
      performanceMonitor.startLoadTime('plugin-2');
      vi.advanceTimersByTime(200);
      performanceMonitor.endLoadTime('plugin-2');
    });

    it('应该生成完整的性能报告', () => {
      const report = performanceMonitor.generateReport();
      
      expect(report.totalPlugins).toBe(2);
      expect(report.totalLoadTime).toBe(300);
      expect(report.totalActivationTime).toBe(50);
      expect(report.totalApiCalls).toBe(2);
      expect(report.totalErrors).toBe(1);
      expect(report.plugins).toHaveLength(2);
    });

    it('应该包含插件详细信息', () => {
      const report = performanceMonitor.generateReport();
      const plugin1 = report.plugins.find(p => p.pluginId === 'plugin-1');
      
      expect(plugin1).toBeDefined();
      expect(plugin1!.loadTime).toBe(100);
      expect(plugin1!.activationTime).toBe(50);
      expect(plugin1!.apiCalls).toBe(2);
      expect(plugin1!.errors).toBe(1);
    });

    it('应该计算平均值', () => {
      const report = performanceMonitor.generateReport();
      
      expect(report.averageLoadTime).toBe(150); // (100 + 200) / 2
      expect(report.averageActivationTime).toBe(25); // 50 / 2
    });

    it('应该识别性能问题', () => {
      // 添加慢加载插件
      performanceMonitor.startLoadTime('slow-plugin');
      vi.advanceTimersByTime(2000); // 2秒
      performanceMonitor.endLoadTime('slow-plugin');
      
      const report = performanceMonitor.generateReport();
      const slowPlugin = report.plugins.find(p => p.pluginId === 'slow-plugin');
      
      expect(slowPlugin!.loadTime).toBe(2000);
      expect(report.slowestLoadTime).toBe(2000);
    });
  });

  describe('性能阈值检查', () => {
    it('应该检测加载时间超标', () => {
      performanceMonitor.startLoadTime('slow-plugin');
      vi.advanceTimersByTime(1500); // 1.5秒
      performanceMonitor.endLoadTime('slow-plugin');
      
      const warnings = performanceMonitor.getPerformanceWarnings();
      expect(warnings).toContain(
        expect.stringContaining('slow-plugin')
      );
      expect(warnings).toContain(
        expect.stringContaining('load time')
      );
    });

    it('应该检测激活时间超标', () => {
      performanceMonitor.startActivationTime('slow-plugin');
      vi.advanceTimersByTime(600); // 0.6秒
      performanceMonitor.endActivationTime('slow-plugin');
      
      const warnings = performanceMonitor.getPerformanceWarnings();
      expect(warnings).toContain(
        expect.stringContaining('slow-plugin')
      );
      expect(warnings).toContain(
        expect.stringContaining('activation time')
      );
    });

    it('应该检测高错误率', () => {
      // 添加多个错误
      for (let i = 0; i < 15; i++) {
        performanceMonitor.incrementErrors('error-plugin');
      }
      
      const warnings = performanceMonitor.getPerformanceWarnings();
      expect(warnings).toContain(
        expect.stringContaining('error-plugin')
      );
      expect(warnings).toContain(
        expect.stringContaining('error rate')
      );
    });
  });

  describe('数据清理', () => {
    it('应该清理插件数据', () => {
      performanceMonitor.startLoadTime('test-plugin');
      performanceMonitor.endLoadTime('test-plugin');
      
      performanceMonitor.clearPluginMetrics('test-plugin');
      
      const metrics = performanceMonitor.getPluginMetrics('test-plugin');
      expect(metrics.loadTime).toBe(0);
      expect(metrics.activationTime).toBe(0);
      expect(metrics.apiCalls).toBe(0);
      expect(metrics.errors).toBe(0);
    });

    it('应该清理所有数据', () => {
      performanceMonitor.startLoadTime('plugin-1');
      performanceMonitor.startLoadTime('plugin-2');
      
      performanceMonitor.clearAllMetrics();
      
      const report = performanceMonitor.generateReport();
      expect(report.totalPlugins).toBe(0);
    });
  });

  describe('实时监控', () => {
    it('应该启动实时监控', () => {
      const callback = vi.fn();
      
      performanceMonitor.startRealTimeMonitoring(callback, 100);
      
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalled();
    });

    it('应该停止实时监控', () => {
      const callback = vi.fn();
      
      performanceMonitor.startRealTimeMonitoring(callback, 100);
      performanceMonitor.stopRealTimeMonitoring();
      
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1); // 只调用一次
    });

    it('应该在dispose时停止监控', () => {
      const callback = vi.fn();
      
      performanceMonitor.startRealTimeMonitoring(callback, 100);
      performanceMonitor.dispose();
      
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('性能基准', () => {
    it('应该设置性能基准', () => {
      const benchmark = {
        maxLoadTime: 500,
        maxActivationTime: 200,
        maxMemoryUsage: 1024 * 1024 * 50, // 50MB
        maxErrorRate: 0.05
      };
      
      performanceMonitor.setBenchmark(benchmark);
      
      // 测试超标检测
      performanceMonitor.startLoadTime('test-plugin');
      vi.advanceTimersByTime(600); // 超过基准
      performanceMonitor.endLoadTime('test-plugin');
      
      const warnings = performanceMonitor.getPerformanceWarnings();
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('应该使用默认基准', () => {
      // 不设置基准，使用默认值
      performanceMonitor.startLoadTime('test-plugin');
      vi.advanceTimersByTime(1200); // 超过默认基准
      performanceMonitor.endLoadTime('test-plugin');
      
      const warnings = performanceMonitor.getPerformanceWarnings();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('数据导出', () => {
    beforeEach(() => {
      performanceMonitor.startLoadTime('plugin-1');
      vi.advanceTimersByTime(100);
      performanceMonitor.endLoadTime('plugin-1');
      
      performanceMonitor.incrementApiCalls('plugin-1');
      performanceMonitor.incrementErrors('plugin-1');
    });

    it('应该导出性能数据', () => {
      const exported = performanceMonitor.exportData();
      
      expect(exported.timestamp).toBeDefined();
      expect(exported.plugins['plugin-1']).toBeDefined();
      expect(exported.plugins['plugin-1'].loadTime).toBe(100);
    });

    it('应该导入性能数据', () => {
      const data = {
        timestamp: Date.now(),
        plugins: {
          'imported-plugin': {
            loadTime: 200,
            activationTime: 100,
            memoryUsage: 1024,
            apiCalls: 5,
            errors: 1,
            lastError: 'Import error'
          }
        }
      };
      
      performanceMonitor.importData(data);
      
      const metrics = performanceMonitor.getPluginMetrics('imported-plugin');
      expect(metrics.loadTime).toBe(200);
      expect(metrics.apiCalls).toBe(5);
    });
  });
});
