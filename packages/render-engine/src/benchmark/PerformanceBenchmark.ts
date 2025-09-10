/**
 * 性能基准测试框架
 * 用于测试和比较渲染引擎各个组件的性能
 */

import { EventEmitter } from '../events/EventBus';

/**
 * 基准测试结果
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number; // 总耗时（毫秒）
  averageTime: number; // 平均耗时（毫秒）
  minTime: number; // 最小耗时（毫秒）
  maxTime: number; // 最大耗时（毫秒）
  standardDeviation: number; // 标准差
  throughput: number; // 吞吐量（操作/秒）
  memoryUsage?: {
    before: number; // 测试前内存使用（字节）
    after: number; // 测试后内存使用（字节）
    peak: number; // 峰值内存使用（字节）
  };
  gcInfo?: {
    collectionsCount: number; // GC次数
    totalGCTime: number; // GC总耗时
  };
}

/**
 * 基准测试套件配置
 */
export interface BenchmarkConfig {
  name: string;
  iterations: number; // 迭代次数
  warmupIterations?: number; // 预热迭代次数
  timeout?: number; // 超时时间（毫秒）
  measureMemory?: boolean; // 是否测量内存使用
  measureGC?: boolean; // 是否测量垃圾回收
  setup?: () => Promise<void> | void; // 设置函数
  teardown?: () => Promise<void> | void; // 清理函数
  beforeEach?: () => Promise<void> | void; // 每次测试前执行
  afterEach?: () => Promise<void> | void; // 每次测试后执行
}

/**
 * 基准测试函数类型
 */
export type BenchmarkFunction = () => Promise<void> | void;

/**
 * 基准测试事件
 */
export interface BenchmarkEvents {
  'suiteStart': { name: string };
  'suiteComplete': { name: string; results: BenchmarkResult[] };
  'testStart': { name: string };
  'testComplete': { name: string; result: BenchmarkResult };
  'progress': { completed: number; total: number };
}

/**
 * 性能基准测试框架
 */
export class PerformanceBenchmark extends EventEmitter<BenchmarkEvents> {
  private suites = new Map<string, {
    config: BenchmarkConfig;
    tests: Map<string, BenchmarkFunction>;
  }>();
  
  private running = false;
  private abortController?: AbortController;

  /**
   * 创建基准测试套件
   */
  suite(name: string, config: Omit<BenchmarkConfig, 'name'>): BenchmarkSuite {
    const suite = new BenchmarkSuite({
      name,
      ...config
    }, this);
    
    this.suites.set(name, {
      config: { name, ...config },
      tests: new Map()
    });

    return suite;
  }

  /**
   * 运行指定的测试套件
   */
  async runSuite(suiteName: string): Promise<BenchmarkResult[]> {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`Benchmark suite '${suiteName}' not found`);
    }

    this.running = true;
    this.abortController = new AbortController();
    
    this.emit('suiteStart', { name: suiteName });

    try {
      const results: BenchmarkResult[] = [];
      const tests = Array.from(suite.tests.entries());
      let completed = 0;

      // 执行套件设置
      await suite.config.setup?.();

      for (const [testName, testFn] of tests) {
        this.checkAbort();
        
        this.emit('testStart', { name: testName });
        
        const result = await this.runTest(
          testName,
          testFn,
          suite.config
        );
        
        results.push(result);
        completed++;
        
        this.emit('testComplete', { name: testName, result });
        this.emit('progress', { completed, total: tests.length });
      }

      // 执行套件清理
      await suite.config.teardown?.();
      
      this.emit('suiteComplete', { name: suiteName, results });
      return results;
      
    } finally {
      this.running = false;
      this.abortController = undefined;
    }
  }

  /**
   * 运行所有测试套件
   */
  async runAll(): Promise<Map<string, BenchmarkResult[]>> {
    const results = new Map<string, BenchmarkResult[]>();
    
    for (const suiteName of this.suites.keys()) {
      const suiteResults = await this.runSuite(suiteName);
      results.set(suiteName, suiteResults);
    }
    
    return results;
  }

  /**
   * 中止当前运行的测试
   */
  abort(): void {
    this.abortController?.abort();
    this.running = false;
  }

  /**
   * 获取是否正在运行
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * 比较两个基准测试结果
   */
  static compare(baseline: BenchmarkResult, current: BenchmarkResult): {
    name: string;
    timeChange: number; // 时间变化百分比（正数表示变慢）
    throughputChange: number; // 吞吐量变化百分比
    memoryChange?: number; // 内存使用变化百分比
    verdict: 'improved' | 'degraded' | 'similar';
  } {
    if (baseline.name !== current.name) {
      throw new Error('Cannot compare results from different benchmarks');
    }

    const timeChange = ((current.averageTime - baseline.averageTime) / baseline.averageTime) * 100;
    const throughputChange = ((current.throughput - baseline.throughput) / baseline.throughput) * 100;
    
    let memoryChange: number | undefined;
    if (baseline.memoryUsage && current.memoryUsage) {
      const baselineMemory = baseline.memoryUsage.after - baseline.memoryUsage.before;
      const currentMemory = current.memoryUsage.after - current.memoryUsage.before;
      memoryChange = ((currentMemory - baselineMemory) / baselineMemory) * 100;
    }

    // 判断性能变化（5%为阈值）
    let verdict: 'improved' | 'degraded' | 'similar';
    if (timeChange < -5 || throughputChange > 5) {
      verdict = 'improved';
    } else if (timeChange > 5 || throughputChange < -5) {
      verdict = 'degraded';
    } else {
      verdict = 'similar';
    }

    return {
      name: baseline.name,
      timeChange,
      throughputChange,
      memoryChange,
      verdict
    };
  }

  /**
   * 导出结果为JSON
   */
  static exportResults(results: Map<string, BenchmarkResult[]>): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      platform: this.getPlatformInfo(),
      results: Object.fromEntries(results)
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 运行单个测试
   */
  private async runTest(
    name: string,
    testFn: BenchmarkFunction,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const totalIterations = config.iterations + (config.warmupIterations || 0);
    let memoryBefore = 0;
    let memoryAfter = 0;
    let memoryPeak = 0;
    let gcCollections = 0;
    let gcTime = 0;

    // 获取初始GC信息
    if (config.measureGC) {
      const gcInfo = this.getGCInfo();
      gcCollections = gcInfo.collections;
      gcTime = gcInfo.time;
    }

    // 测量内存使用（开始前）
    if (config.measureMemory) {
      await this.forceGC();
      memoryBefore = this.getMemoryUsage();
    }

    // 预热运行
    if (config.warmupIterations) {
      for (let i = 0; i < config.warmupIterations; i++) {
        this.checkAbort();
        await config.beforeEach?.();
        await testFn();
        await config.afterEach?.();
      }
    }

    // 正式测试
    for (let i = 0; i < config.iterations; i++) {
      this.checkAbort();
      
      await config.beforeEach?.();
      
      const start = performance.now();
      await testFn();
      const end = performance.now();
      
      times.push(end - start);
      
      // 更新峰值内存使用
      if (config.measureMemory) {
        const currentMemory = this.getMemoryUsage();
        memoryPeak = Math.max(memoryPeak, currentMemory);
      }
      
      await config.afterEach?.();
    }

    // 测量内存使用（结束后）
    if (config.measureMemory) {
      await this.forceGC();
      memoryAfter = this.getMemoryUsage();
    }

    // 获取最终GC信息
    if (config.measureGC) {
      const finalGcInfo = this.getGCInfo();
      gcCollections = finalGcInfo.collections - gcCollections;
      gcTime = finalGcInfo.time - gcTime;
    }

    // 计算统计数据
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    
    const throughput = 1000 / averageTime; // 操作/秒

    const result: BenchmarkResult = {
      name,
      iterations: config.iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput
    };

    if (config.measureMemory) {
      result.memoryUsage = {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      };
    }

    if (config.measureGC) {
      result.gcInfo = {
        collectionsCount: gcCollections,
        totalGCTime: gcTime
      };
    }

    return result;
  }

  /**
   * 检查是否被中止
   */
  private checkAbort(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Benchmark aborted');
    }
  }

  /**
   * 强制垃圾回收
   */
  private async forceGC(): Promise<void> {
    if ('gc' in global && typeof global.gc === 'function') {
      global.gc();
    } else if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // 等待一个事件循环来确保GC完成
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * 获取内存使用量
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    } else if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 获取GC信息
   */
  private getGCInfo(): { collections: number; time: number } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js环境，尝试获取V8统计信息
      try {
        const v8 = require('v8');
        const heapStats = v8.getHeapStatistics();
        return {
          collections: heapStats.number_of_native_contexts || 0,
          time: 0 // V8不直接提供GC时间
        };
      } catch {
        return { collections: 0, time: 0 };
      }
    }
    return { collections: 0, time: 0 };
  }

  /**
   * 获取平台信息
   */
  private static getPlatformInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    
    if (typeof navigator !== 'undefined') {
      info.userAgent = navigator.userAgent;
      info.platform = navigator.platform;
      info.hardwareConcurrency = navigator.hardwareConcurrency;
    }
    
    if (typeof process !== 'undefined') {
      info.nodeVersion = process.version;
      info.platform = process.platform;
      info.arch = process.arch;
    }
    
    return info;
  }
}

/**
 * 基准测试套件
 */
export class BenchmarkSuite {
  constructor(
    private config: BenchmarkConfig,
    private benchmark: PerformanceBenchmark
  ) {}

  /**
   * 添加测试
   */
  test(name: string, fn: BenchmarkFunction): this {
    const suite = this.benchmark['suites'].get(this.config.name);
    if (suite) {
      suite.tests.set(name, fn);
    }
    return this;
  }

  /**
   * 运行此套件
   */
  async run(): Promise<BenchmarkResult[]> {
    return this.benchmark.runSuite(this.config.name);
  }
}

/**
 * 创建基准测试实例
 */
export function createBenchmark(): PerformanceBenchmark {
  return new PerformanceBenchmark();
}