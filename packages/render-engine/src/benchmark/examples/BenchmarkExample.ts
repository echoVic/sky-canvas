/**
 * 性能基准测试示例
 * 展示如何使用基准测试框架测试渲染引擎性能
 */

import { createBenchmark, PerformanceBenchmark } from '../PerformanceBenchmark';
import { RenderingBenchmark } from '../RenderingBenchmark';

/**
 * 基本基准测试示例
 */
async function basicBenchmarkExample() {
  // 创建基础基准测试
  const basicBenchmark = createBenchmark();
  
  const suite = basicBenchmark.suite('基础性能测试', {
    iterations: 1000,
    warmupIterations: 100,
    measureMemory: true
  });

  suite.test('简单计算任务', () => {
    // 简单的计算任务
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += Math.sqrt(i);
    }
    // 测试函数不需要返回值
  });

  // 运行测试
  const results = await suite.run();
  console.log('基础基准测试结果:', results[0]);
}

/**
 * 渲染性能基准测试示例
 */
async function renderingBenchmarkExample() {
  // 创建渲染基准测试
  const renderBenchmark = new RenderingBenchmark({
    canvasWidth: 1920,
    canvasHeight: 1080,
    objectCount: 1000,
    textureSize: 64,
    iterations: 100,
    enableProfiling: true
  });

  try {
    // 运行批处理测试
    const batchResult = await renderBenchmark.testBatchRendering();
    console.log('批处理渲染测试结果:', batchResult);

    // 运行实例化渲染测试
    const instancedResult = await renderBenchmark.testInstancedRendering();
    console.log('实例化渲染测试结果:', instancedResult);

    // 获取统计信息
    const stats = renderBenchmark.getBatchStats();
    console.log('批处理统计:', stats);

    // 获取优化建议
    const suggestions = renderBenchmark.getOptimizationSuggestions();
    console.log('优化建议:', suggestions);

  } catch (error) {
    console.error('渲染基准测试失败:', error);
  } finally {
    // 清理资源
    renderBenchmark.dispose();
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('开始运行基准测试示例...');

  try {
    await basicBenchmarkExample();
    await renderingBenchmarkExample();
    
    console.log('所有基准测试示例完成!');
  } catch (error) {
    console.error('运行基准测试示例时出错:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (typeof window === 'undefined' && require.main === module) {
  runAllExamples().catch(console.error);
}