/**
 * 统一性能监控系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  UnifiedPerformanceMonitor,
  UnifiedMetricType,
  DataSourceType,
  IDataSourceAdapter
} from '../UnifiedPerformanceMonitor';

// Mock 适配器
class MockDataSourceAdapter implements IDataSourceAdapter {
  readonly sourceType: DataSourceType;
  readonly supportedMetrics: UnifiedMetricType[];
  private metrics = new Map<UnifiedMetricType, number>();
  
  constructor(sourceType: DataSourceType, supportedMetrics: UnifiedMetricType[]) {
    this.sourceType = sourceType;
    this.supportedMetrics = supportedMetrics;
  }
  
  async initialize(): Promise<void> {
    // Mock initialization
  }
  
  async collect(): Promise<Map<UnifiedMetricType, number>> {
    return new Map(this.metrics);
  }
  
  setMetric(type: UnifiedMetricType, value: number): void {
    this.metrics.set(type, value);
  }
  
  dispose(): void {
    this.metrics.clear();
  }
}

describe('UnifiedPerformanceMonitor', () => {
  let monitor: UnifiedPerformanceMonitor;
  let renderEngineAdapter: MockDataSourceAdapter;
  let canvasSDKAdapter: MockDataSourceAdapter;
  
  beforeEach(() => {
    monitor = new UnifiedPerformanceMonitor({
      sampleInterval: 100,
      historyRetention: 60,
      enableAutoAnalysis: false,
      enableWarnings: false,
      enableCrossSourcceCorrelation: false
    });
    
    renderEngineAdapter = new MockDataSourceAdapter(
      DataSourceType.RENDER_ENGINE,
      [UnifiedMetricType.FPS, UnifiedMetricType.DRAW_CALLS, UnifiedMetricType.GPU_MEMORY]
    );
    
    canvasSDKAdapter = new MockDataSourceAdapter(
      DataSourceType.CANVAS_SDK,
      [UnifiedMetricType.UPDATE_TIME, UnifiedMetricType.CACHE_HIT_RATE]
    );
  });
  
  afterEach(() => {
    monitor.dispose();
  });
  
  describe('基础功能', () => {
    it('应该正确初始化', async () => {
      expect(monitor).toBeDefined();
      
      monitor.registerAdapter(renderEngineAdapter);
      monitor.registerAdapter(canvasSDKAdapter);
      
      await monitor.initialize();
      expect(monitor.getCurrentMetrics()).toBeDefined();
    });
    
    it('应该能够手动记录指标', () => {
      monitor.recordMetric(
        UnifiedMetricType.FPS,
        60,
        DataSourceType.RENDER_ENGINE
      );
      
      const metrics = monitor.getCurrentMetrics();
      expect(metrics[UnifiedMetricType.FPS]).toBe(60);
    });
    
    it('应该能够获取历史数据', () => {
      monitor.recordMetric(
        UnifiedMetricType.FPS,
        60,
        DataSourceType.RENDER_ENGINE
      );
      
      monitor.recordMetric(
        UnifiedMetricType.FPS,
        30,
        DataSourceType.RENDER_ENGINE
      );
      
      const history = monitor.getHistoryData(UnifiedMetricType.FPS);
      expect(history).toHaveLength(2);
      expect(history[0].value).toBe(60);
      expect(history[1].value).toBe(30);
    });
  });
  
  describe('数据源适配器', () => {
    beforeEach(async () => {
      monitor.registerAdapter(renderEngineAdapter);
      monitor.registerAdapter(canvasSDKAdapter);
      await monitor.initialize();
    });
    
    it('应该从适配器收集数据', async () => {
      // 设置模拟数据
      renderEngineAdapter.setMetric(UnifiedMetricType.FPS, 60);
      renderEngineAdapter.setMetric(UnifiedMetricType.DRAW_CALLS, 500);
      canvasSDKAdapter.setMetric(UnifiedMetricType.UPDATE_TIME, 16.67);
      
      // 手动触发收集
      const mockCollect = vi.spyOn(monitor as any, 'collectMetrics');
      await (monitor as any).collectMetrics();
      
      expect(mockCollect).toHaveBeenCalled();
    });
    
    it('应该正确处理适配器错误', async () => {
      // 创建会抛出错误的适配器
      const errorAdapter = new MockDataSourceAdapter(
        DataSourceType.FRONTEND_UI,
        [UnifiedMetricType.RENDER_TIME]
      );
      
      errorAdapter.collect = vi.fn().mockRejectedValue(new Error('收集失败'));
      monitor.registerAdapter(errorAdapter);
      
      // 应该不会抛出错误
      await expect((monitor as any).collectMetrics()).resolves.not.toThrow();
    });
  });
  
  describe('统计计算', () => {
    beforeEach(() => {
      // 添加一些测试数据
      monitor.recordMetric(UnifiedMetricType.FPS, 30, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.FPS, 45, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
    });
    
    it('应该正确计算统计信息', () => {
      const stats = monitor.getStats(UnifiedMetricType.FPS);
      
      if (stats && 'min' in stats) {
        expect(stats.min).toBe(30);
        expect(stats.max).toBe(60);
        expect(stats.current).toBe(60);
        expect(stats.samples).toBe(3);
        expect(stats.avg).toBeCloseTo(45);
      }
    });
    
    it('应该正确计算趋势', () => {
      // 添加递增趋势的数据
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 100, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 200, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 300, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 400, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 500, DataSourceType.RENDER_ENGINE);
      
      const stats = monitor.getStats(UnifiedMetricType.DRAW_CALLS);
      if (stats && 'trend' in stats) {
        expect(stats.trend).toBe('increasing');
      }
    });
  });
  
  describe('警告系统', () => {
    beforeEach(() => {
      monitor = new UnifiedPerformanceMonitor({
        enableWarnings: true,
        thresholds: {
          [UnifiedMetricType.FPS]: { min: 30, max: 120 },
          [UnifiedMetricType.MEMORY_USAGE]: { max: 512 * 1024 * 1024 },
          [UnifiedMetricType.DRAW_CALLS]: { max: 1000 }
        }
      });
    });
    
    it('应该触发低FPS警告', () => {
      const warnings = monitor.getWarnings();
      const initialCount = warnings.length;
      
      monitor.recordMetric(UnifiedMetricType.FPS, 15, DataSourceType.RENDER_ENGINE);
      
      const newWarnings = monitor.getWarnings();
      expect(newWarnings.length).toBeGreaterThan(initialCount);
      
      const lowFpsWarning = newWarnings.find(w => 
        w.type === UnifiedMetricType.FPS && w.severity === 'high'
      );
      expect(lowFpsWarning).toBeDefined();
    });
    
    it('应该触发高内存使用警告', () => {
      const warnings = monitor.getWarnings();
      const initialCount = warnings.length;
      
      monitor.recordMetric(
        UnifiedMetricType.MEMORY_USAGE, 
        600 * 1024 * 1024, // 600MB
        DataSourceType.CANVAS_SDK
      );
      
      const newWarnings = monitor.getWarnings();
      expect(newWarnings.length).toBeGreaterThan(initialCount);
      
      const memoryWarning = newWarnings.find(w => 
        w.type === UnifiedMetricType.MEMORY_USAGE
      );
      expect(memoryWarning).toBeDefined();
    });
    
    it('应该避免重复警告', () => {
      // 短时间内多次触发相同警告
      monitor.recordMetric(UnifiedMetricType.FPS, 15, DataSourceType.RENDER_ENGINE);
      const firstWarningCount = monitor.getWarnings().length;
      
      monitor.recordMetric(UnifiedMetricType.FPS, 16, DataSourceType.RENDER_ENGINE);
      const secondWarningCount = monitor.getWarnings().length;
      
      expect(secondWarningCount).toBe(firstWarningCount);
    });
  });
  
  describe('瓶颈分析', () => {
    beforeEach(() => {
      monitor = new UnifiedPerformanceMonitor({
        enableAutoAnalysis: false
      });
    });
    
    it('应该检测CPU瓶颈', () => {
      // 模拟CPU瓶颈场景
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric(UnifiedMetricType.FRAME_TIME, 40, DataSourceType.RENDER_ENGINE);
        monitor.recordMetric(UnifiedMetricType.UPDATE_TIME, 25, DataSourceType.CANVAS_SDK);
        monitor.recordMetric(UnifiedMetricType.RENDER_TIME, 10, DataSourceType.RENDER_ENGINE);
      }
      
      const analysis = monitor.analyzeBottlenecks();
      expect(analysis.type).toBe('cpu');
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.suggestions).toContain('优化更新逻辑算法');
    });
    
    it('应该检测GPU瓶颈', () => {
      // 模拟GPU瓶颈场景
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 1500, DataSourceType.RENDER_ENGINE);
        monitor.recordMetric(UnifiedMetricType.TRIANGLES, 150000, DataSourceType.RENDER_ENGINE);
      }
      
      const analysis = monitor.analyzeBottlenecks();
      expect(analysis.type).toBe('gpu');
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.suggestions).toContain('减少绘制调用数量');
    });
    
    it('应该检测内存瓶颈', () => {
      // 模拟内存瓶颈场景
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric(
          UnifiedMetricType.MEMORY_USAGE, 
          450 * 1024 * 1024, // 450MB (80% of 512MB threshold)
          DataSourceType.CANVAS_SDK
        );
      }
      
      const analysis = monitor.analyzeBottlenecks();
      expect(analysis.type).toBe('memory');
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.suggestions).toContain('优化资源管理策略');
    });
    
    it('应该在无瓶颈时返回正确结果', () => {
      // 添加正常性能数据
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
        monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 300, DataSourceType.RENDER_ENGINE);
        monitor.recordMetric(UnifiedMetricType.MEMORY_USAGE, 100 * 1024 * 1024, DataSourceType.CANVAS_SDK);
      }
      
      const analysis = monitor.analyzeBottlenecks();
      expect(analysis.type).toBe('none');
      expect(analysis.confidence).toBe(0);
      expect(analysis.description).toContain('未检测到明显瓶颈');
    });
  });
  
  describe('跨源关联分析', () => {
    beforeEach(() => {
      monitor = new UnifiedPerformanceMonitor({
        enableCrossSourcceCorrelation: true
      });
    });
    
    it('应该检测到强正相关', () => {
      const correlationAnalyzer = (monitor as any).correlationAnalyzer;
      
      // 创建强正相关的数据
      const data1 = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 1000,
        value: i * 10 + Math.random() * 5,
        source: DataSourceType.RENDER_ENGINE
      }));
      
      const data2 = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 1000,
        value: i * 10 + Math.random() * 5,
        source: DataSourceType.CANVAS_SDK
      }));
      
      const correlation = correlationAnalyzer.calculateCorrelation(data1, data2);
      expect(correlation).toBeGreaterThan(0.7);
    });
    
    it('应该检测到强负相关', () => {
      const correlationAnalyzer = (monitor as any).correlationAnalyzer;
      
      // 创建强负相关的数据
      const data1 = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 1000,
        value: i * 10,
        source: DataSourceType.RENDER_ENGINE
      }));
      
      const data2 = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 1000,
        value: (20 - i) * 10,
        source: DataSourceType.CANVAS_SDK
      }));
      
      const correlation = correlationAnalyzer.calculateCorrelation(data1, data2);
      expect(correlation).toBeLessThan(-0.7);
    });
  });
  
  describe('报告生成', () => {
    beforeEach(() => {
      // 添加一些测试数据
      monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 500, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.UPDATE_TIME, 16.67, DataSourceType.CANVAS_SDK);
      monitor.recordMetric(UnifiedMetricType.CACHE_HIT_RATE, 0.85, DataSourceType.CANVAS_SDK);
    });
    
    it('应该生成完整的性能报告', () => {
      const report = monitor.generateComprehensiveReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('bottlenecks');
      expect(report).toHaveProperty('correlations');
      expect(report).toHaveProperty('recommendations');
      
      // 检查摘要信息
      expect(report.summary.totalMetrics).toBeGreaterThan(0);
      expect(report.summary.overallHealth).toBeOneOf(['good', 'warning', 'critical']);
      
      // 检查指标数据
      expect(report.metrics[UnifiedMetricType.FPS]).toBeDefined();
      expect(report.metrics[UnifiedMetricType.FPS].current).toBe(60);
    });
    
    it('应该根据警告数量确定整体健康状况', () => {
      // 添加高严重性警告
      monitor = new UnifiedPerformanceMonitor({
        enableWarnings: true,
        thresholds: {
          [UnifiedMetricType.FPS]: { min: 30, max: 120 }
        }
      });
      
      monitor.recordMetric(UnifiedMetricType.FPS, 15, DataSourceType.RENDER_ENGINE);
      
      const report = monitor.generateComprehensiveReport();
      expect(report.summary.overallHealth).toBe('critical');
    });
  });
  
  describe('数据清理', () => {
    it('应该清理过期的历史数据', async () => {
      monitor = new UnifiedPerformanceMonitor({
        historyRetention: 1 // 1秒保留时间
      });
      
      // 添加一些数据
      monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
      
      let history = monitor.getHistoryData(UnifiedMetricType.FPS);
      expect(history).toHaveLength(1);
      
      // 等待超过保留时间
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // 触发清理
      await (monitor as any).cleanupOldData();
      
      history = monitor.getHistoryData(UnifiedMetricType.FPS);
      expect(history).toHaveLength(0);
    });
    
    it('应该能够手动清理历史数据', () => {
      monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
      monitor.recordMetric(UnifiedMetricType.DRAW_CALLS, 500, DataSourceType.RENDER_ENGINE);
      
      let metrics = monitor.getCurrentMetrics();
      expect(Object.keys(metrics)).toHaveLength(2);
      
      monitor.clearHistory();
      
      metrics = monitor.getCurrentMetrics();
      expect(Object.values(metrics).every(v => v === 0)).toBe(true);
    });
    
    it('应该能够清理警告', () => {
      monitor = new UnifiedPerformanceMonitor({
        enableWarnings: true,
        thresholds: {
          [UnifiedMetricType.FPS]: { min: 30, max: 120 }
        }
      });
      
      monitor.recordMetric(UnifiedMetricType.FPS, 15, DataSourceType.RENDER_ENGINE);
      
      let warnings = monitor.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      
      monitor.clearWarnings();
      
      warnings = monitor.getWarnings();
      expect(warnings).toHaveLength(0);
    });
  });
  
  describe('事件系统', () => {
    it('应该触发指标更新事件', (done) => {
      monitor.on('metric-updated', (data) => {
        expect(data.type).toBe(UnifiedMetricType.FPS);
        expect(data.value).toBe(60);
        expect(data.source).toBe(DataSourceType.RENDER_ENGINE);
        done();
      });
      
      monitor.recordMetric(UnifiedMetricType.FPS, 60, DataSourceType.RENDER_ENGINE);
    });
    
    it('应该触发警告事件', (done) => {
      monitor = new UnifiedPerformanceMonitor({
        enableWarnings: true,
        thresholds: {
          [UnifiedMetricType.FPS]: { min: 30, max: 120 }
        }
      });
      
      monitor.on('warning-triggered', (warning) => {
        expect(warning.type).toBe(UnifiedMetricType.FPS);
        expect(warning.severity).toBe('high');
        done();
      });
      
      monitor.recordMetric(UnifiedMetricType.FPS, 15, DataSourceType.RENDER_ENGINE);
    });
  });
  
  describe('生命周期管理', () => {
    it('应该正确启动和停止', () => {
      expect(monitor.start).not.toThrow();
      expect(monitor.stop).not.toThrow();
    });
    
    it('应该正确销毁', () => {
      monitor.registerAdapter(renderEngineAdapter);
      monitor.registerAdapter(canvasSDKAdapter);
      
      expect(() => monitor.dispose()).not.toThrow();
      
      // 验证清理后的状态
      const metrics = monitor.getCurrentMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });
    
    it('应该处理重复启动', () => {
      monitor.start();
      expect(() => monitor.start()).not.toThrow();
      monitor.stop();
    });
    
    it('应该处理重复停止', () => {
      monitor.start();
      monitor.stop();
      expect(() => monitor.stop()).not.toThrow();
    });
  });
});