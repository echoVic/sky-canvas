# Benchmark 模块

性能基准测试模块，提供渲染引擎各组件的性能测试和基准比较功能。

## 主要组件

### RenderingBenchmark
渲染性能基准测试器，测试不同渲染场景下的性能表现。

**主要功能：**
- 渲染帧率测试
- GPU 利用率监控
- 内存使用量分析
- 渲染管线性能评估

### BenchmarkExample
基准测试示例和预设测试场景。

**测试场景包括：**
- 大量对象渲染测试
- 复杂效果渲染测试
- 动画性能测试
- 批处理效率测试

## 使用示例

```typescript
import { RenderingBenchmark } from './benchmark';

// 创建基准测试
const benchmark = new RenderingBenchmark({
  testDuration: 5000,
  targetFPS: 60
});

// 运行渲染测试
const results = await benchmark.runRenderTest({
  objectCount: 1000,
  enableEffects: true
});

console.log(`Average FPS: ${results.avgFPS}`);
console.log(`GPU Usage: ${results.gpuUsage}%`);
```

## 相关模块

- `performance` - 性能监控
- `engine` - 渲染引擎
- `utils` - 工具函数