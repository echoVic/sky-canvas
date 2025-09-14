/**
 * 性能基准测试系统
 * 提供 FPS 统计、内存监控和渲染调用统计，用于检测性能回归
 */

import { EventEmitter } from 'eventemitter3';
import { UnifiedPerformanceMonitor } from './UnifiedPerformanceMonitor';

/**
 * 基准测试类型
 */
export enum BenchmarkType {
  RENDER_PERFORMANCE = 'render_performance',
  MEMORY_USAGE = 'memory_usage', 
  FRAME_RATE = 'frame_rate',
  DRAW_CALLS = 'draw_calls',
  BATCH_EFFICIENCY = 'batch_efficiency',
  RESOURCE_LOADING = 'resource_loading'
}

/**
 * 基准测试结果
 */
export interface BenchmarkResult {
  name: string;
  type: BenchmarkType;
  score: number;
  unit: string;
  metadata: {
    fps?: number;
    averageFrameTime?: number;
    memoryUsage?: number;
    drawCalls?: number;
    batchCount?: number;
    loadTime?: number;
  };
  timestamp: number;
  passed: boolean;
  threshold?: number;
}

/**
 * 基准测试配置
 */
export interface BenchmarkConfig {
  name: string;
  type: BenchmarkType;
  duration: number; // 测试持续时间（毫秒）
  threshold?: number; // 性能阈值
  warmupTime?: number; // 预热时间（毫秒）
  iterations?: number; // 迭代次数
  skipOnCI?: boolean; // 在CI环境中跳过
}

/**
 * 测试场景接口
 */
export interface BenchmarkScenario {
  name: string;
  setup(): Promise<void>;
  execute(): Promise<void>;
  cleanup(): Promise<void>;
  measure(): BenchmarkResult;
}

/**
 * FPS基准测试
 */
export class FPSBenchmark implements BenchmarkScenario {
  name = 'FPS Performance Test';
  private frameCount = 0;
  private startTime = 0;
  private frameTimeSum = 0;
  private memoryStart = 0;
  private drawCallCount = 0;

  constructor(
    private renderLoop: () => void,
    private config: BenchmarkConfig
  ) {}

  async setup(): Promise<void> {
    this.frameCount = 0;
    this.frameTimeSum = 0;
    this.drawCallCount = 0;
    this.memoryStart = this.getMemoryUsage();
    
    // 预热
    if (this.config.warmupTime) {
      const warmupEnd = Date.now() + this.config.warmupTime;
      while (Date.now() < warmupEnd) {
        this.renderLoop();
        await new Promise(resolve => requestAnimationFrame(() => resolve(void 0)));
      }
    }
  }

  async execute(): Promise<void> {
    return new Promise((resolve) => {
      this.startTime = performance.now();
      
      const frame = () => {
        const frameStart = performance.now();
        
        this.renderLoop();
        this.frameCount++;
        
        const frameEnd = performance.now();
        this.frameTimeSum += frameEnd - frameStart;
        
        if (frameEnd - this.startTime < this.config.duration) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(frame);
    });
  }

  async cleanup(): Promise<void> {
    // 清理资源
  }

  measure(): BenchmarkResult {
    const totalTime = this.frameTimeSum;
    const avgFrameTime = totalTime / this.frameCount;
    const fps = 1000 / avgFrameTime;
    const memoryEnd = this.getMemoryUsage();
    const memoryDelta = memoryEnd - this.memoryStart;

    return {
      name: this.name,
      type: BenchmarkType.FRAME_RATE,
      score: fps,
      unit: 'FPS',
      metadata: {
        fps,
        averageFrameTime: avgFrameTime,
        memoryUsage: memoryDelta,
        drawCalls: this.drawCallCount
      },
      timestamp: Date.now(),
      passed: this.config.threshold ? fps >= this.config.threshold : true,
      threshold: this.config.threshold
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
}

/**
 * 内存压力测试
 */
export class MemoryBenchmark implements BenchmarkScenario {
  name = 'Memory Usage Test';
  private initialMemory = 0;
  private peakMemory = 0;
  private objectsCreated = 0;

  constructor(
    private memoryIntensiveOperation: () => void,
    private config: BenchmarkConfig
  ) {}

  async setup(): Promise<void> {
    // 强制垃圾回收
    if ((global as any).gc) {
      (global as any).gc();
    }
    
    this.initialMemory = this.getMemoryUsage();
    this.peakMemory = this.initialMemory;
    this.objectsCreated = 0;
  }

  async execute(): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.duration) {
      this.memoryIntensiveOperation();
      this.objectsCreated++;
      
      const currentMemory = this.getMemoryUsage();
      this.peakMemory = Math.max(this.peakMemory, currentMemory);
      
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  async cleanup(): Promise<void> {
    if ((global as any).gc) {
      (global as any).gc();
    }
  }

  measure(): BenchmarkResult {
    const memoryDelta = this.peakMemory - this.initialMemory;
    const avgMemoryPerObject = memoryDelta / this.objectsCreated;

    return {
      name: this.name,
      type: BenchmarkType.MEMORY_USAGE,
      score: memoryDelta,
      unit: 'MB',
      metadata: {
        memoryUsage: memoryDelta
      },
      timestamp: Date.now(),
      passed: this.config.threshold ? memoryDelta <= this.config.threshold : true,
      threshold: this.config.threshold
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
}

/**
 * 渲染调用统计测试
 */
export class DrawCallBenchmark implements BenchmarkScenario {
  name = 'Draw Call Efficiency Test';
  private drawCallCount = 0;
  private batchCount = 0;
  private objectCount = 0;

  constructor(
    private renderObjects: (count: number) => { drawCalls: number; batches: number },
    private config: BenchmarkConfig
  ) {}

  async setup(): Promise<void> {
    this.drawCallCount = 0;
    this.batchCount = 0;
    this.objectCount = 100; // 默认渲染100个对象
  }

  async execute(): Promise<void> {
    const result = this.renderObjects(this.objectCount);
    this.drawCallCount = result.drawCalls;
    this.batchCount = result.batches;
  }

  async cleanup(): Promise<void> {
    // 清理渲染资源
  }

  measure(): BenchmarkResult {
    const efficiency = this.objectCount / this.drawCallCount; // 每个draw call处理的对象数
    const batchEfficiency = this.objectCount / this.batchCount;

    return {
      name: this.name,
      type: BenchmarkType.DRAW_CALLS,
      score: efficiency,
      unit: 'objects/call',
      metadata: {
        drawCalls: this.drawCallCount,
        batchCount: this.batchCount
      },
      timestamp: Date.now(),
      passed: this.config.threshold ? efficiency >= this.config.threshold : true,
      threshold: this.config.threshold
    };
  }
}

/**
 * 批处理效率测试
 */
export class BatchEfficiencyBenchmark implements BenchmarkScenario {
  name = 'Batch Efficiency Test';
  private beforeBatches = 0;
  private afterBatches = 0;
  private objectCount = 0;

  constructor(
    private batchedRender: (objects: any[]) => number,
    private config: BenchmarkConfig
  ) {}

  async setup(): Promise<void> {
    this.objectCount = 1000; // 大量对象测试批处理
  }

  async execute(): Promise<void> {
    const objects = Array.from({ length: this.objectCount }, (_, i) => ({
      id: i,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      type: i % 5 // 5种不同类型，便于批处理
    }));

    this.afterBatches = this.batchedRender(objects);
    this.beforeBatches = this.objectCount; // 假设没有批处理，每个对象一个batch
  }

  async cleanup(): Promise<void> {
    // 清理
  }

  measure(): BenchmarkResult {
    const reduction = (this.beforeBatches - this.afterBatches) / this.beforeBatches;
    const efficiency = reduction * 100; // 百分比

    return {
      name: this.name,
      type: BenchmarkType.BATCH_EFFICIENCY,
      score: efficiency,
      unit: '% reduction',
      metadata: {
        batchCount: this.afterBatches
      },
      timestamp: Date.now(),
      passed: this.config.threshold ? efficiency >= this.config.threshold : true,
      threshold: this.config.threshold
    };
  }
}

/**
 * 性能基准测试套件
 */
export class PerformanceBenchmarkSuite extends EventEmitter {
  private scenarios: BenchmarkScenario[] = [];
  private results: BenchmarkResult[] = [];
  private performanceMonitor: UnifiedPerformanceMonitor;

  constructor(performanceMonitor?: UnifiedPerformanceMonitor) {
    super();
    this.performanceMonitor = performanceMonitor || new UnifiedPerformanceMonitor();
  }

  /**
   * 添加测试场景
   */
  addScenario(scenario: BenchmarkScenario): void {
    this.scenarios.push(scenario);
  }

  /**
   * 运行所有基准测试
   */
  async runAll(): Promise<BenchmarkResult[]> {
    this.results = [];
    this.emit('suiteStart', this.scenarios.length);

    for (let i = 0; i < this.scenarios.length; i++) {
      const scenario = this.scenarios[i];
      this.emit('scenarioStart', scenario.name, i + 1, this.scenarios.length);

      try {
        await scenario.setup();
        await scenario.execute();
        const result = scenario.measure();
        await scenario.cleanup();

        this.results.push(result);
        this.emit('scenarioComplete', result);
      } catch (error) {
        this.emit('scenarioError', scenario.name, error);
      }
    }

    this.emit('suiteComplete', this.results);
    return this.results;
  }

  /**
   * 运行单个场景
   */
  async runScenario(name: string): Promise<BenchmarkResult | null> {
    const scenario = this.scenarios.find(s => s.name === name);
    if (!scenario) return null;

    this.emit('scenarioStart', scenario.name, 1, 1);

    try {
      await scenario.setup();
      await scenario.execute();
      const result = scenario.measure();
      await scenario.cleanup();

      this.emit('scenarioComplete', result);
      return result;
    } catch (error) {
      this.emit('scenarioError', scenario.name, error);
      return null;
    }
  }

  /**
   * 获取测试结果摘要
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    results: BenchmarkResult[];
  } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    return {
      total: this.results.length,
      passed,
      failed,
      results: [...this.results]
    };
  }

  /**
   * 检测性能回归
   */
  detectRegression(baseline: BenchmarkResult[], tolerance: number = 0.1): {
    regressions: Array<{
      test: string;
      baseline: number;
      current: number;
      regression: number;
    }>;
    improvements: Array<{
      test: string;
      baseline: number;
      current: number;
      improvement: number;
    }>;
  } {
    const regressions: any[] = [];
    const improvements: any[] = [];

    for (const current of this.results) {
      const baselineResult = baseline.find(b => b.name === current.name);
      if (!baselineResult) continue;

      const change = (current.score - baselineResult.score) / baselineResult.score;
      
      if (Math.abs(change) > tolerance) {
        if (change < 0) {
          regressions.push({
            test: current.name,
            baseline: baselineResult.score,
            current: current.score,
            regression: Math.abs(change) * 100
          });
        } else {
          improvements.push({
            test: current.name,
            baseline: baselineResult.score,
            current: current.score,
            improvement: change * 100
          });
        }
      }
    }

    return { regressions, improvements };
  }

  /**
   * 导出结果为JSON
   */
  exportResults(): string {
    const summary = this.getSummary();
    const report = {
      timestamp: Date.now(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        platform: typeof process !== 'undefined' ? process.platform : 'unknown',
        memory: this.getMemoryInfo()
      },
      summary,
      results: this.results
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 创建HTML报告
   */
  generateHTMLReport(): string {
    const summary = this.getSummary();
    const timestamp = new Date().toISOString();

    return `
<!DOCTYPE html>
<html>
<head>
  <title>性能基准测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric.passed { border-left: 4px solid #4CAF50; }
    .metric.failed { border-left: 4px solid #F44336; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .pass { color: #4CAF50; font-weight: bold; }
    .fail { color: #F44336; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>性能基准测试报告</h1>
    <p>生成时间: ${timestamp}</p>
  </div>
  
  <div class="summary">
    <div class="metric">
      <h3>总计测试</h3>
      <p style="font-size: 24px; margin: 0;">${summary.total}</p>
    </div>
    <div class="metric passed">
      <h3>通过测试</h3>
      <p style="font-size: 24px; margin: 0;">${summary.passed}</p>
    </div>
    <div class="metric failed">
      <h3>失败测试</h3>
      <p style="font-size: 24px; margin: 0;">${summary.failed}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>测试名称</th>
        <th>类型</th>
        <th>分数</th>
        <th>单位</th>
        <th>阈值</th>
        <th>结果</th>
      </tr>
    </thead>
    <tbody>
      ${this.results.map(result => `
        <tr>
          <td>${result.name}</td>
          <td>${result.type}</td>
          <td>${result.score.toFixed(2)}</td>
          <td>${result.unit}</td>
          <td>${result.threshold ? result.threshold.toFixed(2) : 'N/A'}</td>
          <td class="${result.passed ? 'pass' : 'fail'}">${result.passed ? 'PASS' : 'FAIL'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `;
  }

  private getMemoryInfo() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
      };
    }

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      return {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    return null;
  }
}

/**
 * 创建默认的基准测试套件
 */
export function createDefaultBenchmarkSuite(
  renderEngine: any,
  performanceMonitor?: UnifiedPerformanceMonitor
): PerformanceBenchmarkSuite {
  const suite = new PerformanceBenchmarkSuite(performanceMonitor);

  // FPS测试
  const fpsConfig: BenchmarkConfig = {
    name: 'FPS Test',
    type: BenchmarkType.FRAME_RATE,
    duration: 5000,
    threshold: 30,
    warmupTime: 1000
  };
  
  suite.addScenario(new FPSBenchmark(
    () => renderEngine?.render?.(),
    fpsConfig
  ));

  // 内存测试
  const memoryConfig: BenchmarkConfig = {
    name: 'Memory Test',
    type: BenchmarkType.MEMORY_USAGE,
    duration: 3000,
    threshold: 100 // 100MB限制
  };

  suite.addScenario(new MemoryBenchmark(
    () => {
      // 创建大量临时对象
      const objects = Array.from({ length: 1000 }, () => ({
        data: new Float32Array(100)
      }));
      return objects;
    },
    memoryConfig
  ));

  return suite;
}