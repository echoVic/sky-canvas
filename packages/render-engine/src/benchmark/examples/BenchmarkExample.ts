/**
 * 性能基准测试示例
 * 展示如何使用基准测试框架测试渲染引擎性能
 */

import { createBenchmark } from '../PerformanceBenchmark';
import { createRenderingBenchmark } from '../RenderingBenchmark';

/**
 * 基本基准测试示例
 */
async function basicBenchmarkExample() {
  const benchmark = createBenchmark();

  // 创建一个测试套件
  const suite = benchmark.suite('Array Operations', {
    iterations: 10000,
    warmupIterations: 1000,
    measureMemory: true,
    setup: async () => {
      console.log('Setting up array operations test...');
    },
    teardown: async () => {
      console.log('Cleaning up array operations test...');
    }
  });

  // 添加测试用例
  suite.test('Array Push', () => {
    const arr: number[] = [];
    for (let i = 0; i < 100; i++) {
      arr.push(i);
    }
  });

  suite.test('Array Concat', () => {
    let arr: number[] = [];
    for (let i = 0; i < 100; i++) {
      arr = arr.concat([i]);
    }
  });

  suite.test('Array Spread', () => {
    let arr: number[] = [];
    for (let i = 0; i < 100; i++) {
      arr = [...arr, i];
    }
  });

  // 监听事件
  benchmark.on('testStart', (name) => {
    console.log(`Starting test: ${name}`);
  });

  benchmark.on('testComplete', (name, result) => {
    console.log(`Completed test: ${name}`);
    console.log(`  Average time: ${result.averageTime.toFixed(3)}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    if (result.memoryUsage) {
      const memoryDiff = result.memoryUsage.after - result.memoryUsage.before;
      console.log(`  Memory change: ${(memoryDiff / 1024).toFixed(2)}KB`);
    }
  });

  // 运行测试
  const results = await suite.run();

  // 比较结果
  if (results.length >= 2) {
    const comparison = benchmark.constructor.compare(results[0], results[1]);
    console.log('\n=== Performance Comparison ===');
    console.log(`${results[0].name} vs ${results[1].name}`);
    console.log(`Time change: ${comparison.timeChange.toFixed(2)}%`);
    console.log(`Throughput change: ${comparison.throughputChange.toFixed(2)}%`);
    console.log(`Verdict: ${comparison.verdict}`);
  }

  return results;
}

/**
 * 渲染性能基准测试示例
 */
async function renderingBenchmarkExample() {
  // 创建渲染基准测试
  const renderBenchmark = createRenderingBenchmark({
    canvasWidth: 1920,
    canvasHeight: 1080,
    objectCount: 1000,
    textureSize: 64,
    iterations: 100,
    enableProfiling: true
  });

  console.log('Starting rendering performance benchmarks...');

  try {
    // 运行批处理测试
    console.log('\n=== Batching Performance Tests ===');
    const batchResults = await renderBenchmark.runBatchingTests();
    
    batchResults.forEach(result => {
      console.log(`${result.name}:`);
      console.log(`  Average time: ${result.averageTime.toFixed(3)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/sec`);
      console.log(`  Min/Max: ${result.minTime.toFixed(3)}ms / ${result.maxTime.toFixed(3)}ms`);
      if (result.memoryUsage) {
        console.log(`  Memory delta: ${((result.memoryUsage.after - result.memoryUsage.before) / 1024).toFixed(2)}KB`);
      }
    });

    // 运行纹理管理测试
    console.log('\n=== Texture Management Tests ===');
    const textureResults = await renderBenchmark.runTextureTests();
    
    textureResults.forEach(result => {
      console.log(`${result.name}:`);
      console.log(`  Average time: ${result.averageTime.toFixed(3)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    });

    // 获取渲染指标
    const metrics = renderBenchmark.getRenderingMetrics();
    console.log('\n=== Rendering Metrics ===');
    console.log(`FPS: ${metrics.fps}`);
    console.log(`Frame time: ${metrics.frameTime}ms`);
    console.log(`Draw calls: ${metrics.drawCalls}`);
    console.log(`Triangles: ${metrics.triangles}`);

  } finally {
    renderBenchmark.dispose();
  }
}

/**
 * 性能回归测试示例
 */
async function regressionTestExample() {
  const benchmark = createBenchmark();

  // 模拟基准结果（通常从文件加载）
  const baselineResults = {
    'Math Operations': [
      {
        name: 'Vector Addition',
        iterations: 10000,
        totalTime: 100,
        averageTime: 0.01,
        minTime: 0.008,
        maxTime: 0.015,
        standardDeviation: 0.002,
        throughput: 100000
      }
    ]
  };

  // 创建当前测试
  const suite = benchmark.suite('Math Operations', {
    iterations: 10000
  });

  suite.test('Vector Addition', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    const result = {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    };
  });

  const currentResults = await suite.run();

  // 比较性能
  console.log('\n=== Regression Test Results ===');
  const baseline = baselineResults['Math Operations'][0];
  const current = currentResults[0];
  
  const comparison = benchmark.constructor.compare(baseline, current);
  
  console.log(`Test: ${comparison.name}`);
  console.log(`Time change: ${comparison.timeChange.toFixed(2)}%`);
  console.log(`Throughput change: ${comparison.throughputChange.toFixed(2)}%`);
  console.log(`Verdict: ${comparison.verdict}`);

  if (comparison.verdict === 'degraded') {
    console.warn('⚠️  Performance regression detected!');
  } else if (comparison.verdict === 'improved') {
    console.log('✅ Performance improvement detected!');
  } else {
    console.log('➡️  Performance similar to baseline');
  }
}

/**
 * 内存泄漏检测示例
 */
async function memoryLeakDetectionExample() {
  const benchmark = createBenchmark();

  const suite = benchmark.suite('Memory Leak Detection', {
    iterations: 1000,
    measureMemory: true,
    beforeEach: () => {
      // 强制垃圾回收（如果支持）
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
    }
  });

  // 测试可能导致内存泄漏的操作
  const objects: any[] = [];
  
  suite.test('Object Creation', () => {
    // 创建对象但不清理引用
    const obj = {
      data: new Array(1000).fill(0),
      timestamp: Date.now()
    };
    objects.push(obj);
  });

  suite.test('Object Creation with Cleanup', () => {
    // 创建对象并清理引用
    const obj = {
      data: new Array(1000).fill(0),
      timestamp: Date.now()
    };
    // 立即删除引用
    obj.data.length = 0;
  });

  const results = await suite.run();

  // 分析内存使用模式
  results.forEach(result => {
    if (result.memoryUsage) {
      const memoryIncrease = result.memoryUsage.after - result.memoryUsage.before;
      const avgMemoryPerOp = memoryIncrease / result.iterations;
      
      console.log(`\n${result.name}:`);
      console.log(`  Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
      console.log(`  Avg memory per operation: ${avgMemoryPerOp.toFixed(2)} bytes`);
      
      if (avgMemoryPerOp > 100) { // 阈值：每操作100字节
        console.warn(`  ⚠️  Potential memory leak detected!`);
      }
    }
  });

  // 清理测试数据
  objects.length = 0;
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 Starting Performance Benchmark Examples\n');

  try {
    // 基本基准测试
    console.log('1. Basic Benchmark Example');
    console.log('=' .repeat(50));
    await basicBenchmarkExample();

    // 渲染性能测试（仅在浏览器环境运行）
    if (typeof window !== 'undefined') {
      console.log('\n2. Rendering Benchmark Example');
      console.log('=' .repeat(50));
      await renderingBenchmarkExample();
    }

    // 回归测试
    console.log('\n3. Regression Test Example');
    console.log('=' .repeat(50));
    await regressionTestExample();

    // 内存泄漏检测
    console.log('\n4. Memory Leak Detection Example');
    console.log('=' .repeat(50));
    await memoryLeakDetectionExample();

    console.log('\n✅ All benchmark examples completed successfully!');

  } catch (error) {
    console.error('❌ Benchmark examples failed:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}