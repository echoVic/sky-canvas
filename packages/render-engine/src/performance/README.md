# 渲染引擎性能监控系统

渲染引擎性能监控系统专注于监控渲染引擎自身的性能，包括 FPS 统计、内存监控、GPU 性能分析和基准测试。

## 核心特性

- 🚀 **渲染性能监控**: 实时监控 FPS、帧时间、绘制调用
- 📊 **GPU 性能分析**: WebGL 上下文分析，着色器性能监控
- ⚠️ **智能警告**: 基于阈值的性能警告系统
- 🔍 **内存分析**: 自动检测内存泄漏和内存使用模式
- 📈 **基准测试**: 全面的性能基准测试框架
- 📋 **报告生成**: 自动生成性能报告

## 快速开始

### 1. 基础使用

```typescript
import {
  PerformanceMonitor,
  WebGLAnalyzer
} from '@sky-canvas/render-engine/performance';

// 创建性能监控器
const performanceMonitor = new PerformanceMonitor(gl, {
  enableGPUQueries: true,
  enableMemoryProfiler: true
});

// 开始监控
performanceMonitor.start();
```

### 2. WebGL 性能分析

```typescript
// 创建 WebGL 分析器
const webGLAnalyzer = new WebGLAnalyzer(gl);

// 分析着色器性能
const shaderAnalysis = webGLAnalyzer.analyzeShaderPerformance(shaderProgram);

// 分析缓冲区使用
const bufferAnalysis = webGLAnalyzer.analyzeBufferUsage();
```

### 3. 基准测试

```typescript
import {
  createDefaultBenchmarkSuite,
  PerformanceBenchmarkSuite
} from '@sky-canvas/render-engine/performance';

// 创建基准测试套件
const benchmarkSuite = createDefaultBenchmarkSuite(renderEngine);

// 运行所有测试
const results = await benchmarkSuite.runAll();
```

## 架构设计

### 核心组件

```text
┌─────────────────────────────────────────────────────────────┐
│                PerformanceMonitor                           │
├─────────────────────────────────────────────────────────────┤
│  - 实时性能数据采集                                           │
│  - 帧率和帧时间监控                                           │
│  - 内存使用分析                                              │
│  - 性能警告系统                                              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                WebGLAnalyzer                                │
├─────────────────────────────────────────────────────────────┤
│  - WebGL 上下文分析                                           │
│  - 着色器性能监控                                             │
│  - GPU 内存使用分析                                           │
│  - 绘制调用优化建议                                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                PerformanceBenchmarkSuite                    │
├─────────────────────────────────────────────────────────────┤
│  - FPS 基准测试                                              │
│  - 内存压力测试                                              │
│  - 绘制调用效率测试                                           │
│  - 批处理性能测试                                             │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```text
渲染引擎执行 → 性能数据收集 → 实时分析 → 警告/报告生成
```

## 性能指标类型

### 渲染性能

- `FPS` - 帧率
- `FRAME_TIME` - 帧时间
- `RENDER_TIME` - 渲染时间

### GPU性能

- `DRAW_CALLS` - 绘制调用次数
- `VERTICES` - 顶点数量
- `TRIANGLES` - 三角形数量
- `BATCH_COUNT` - 批处理数量
- `GPU_MEMORY` - GPU内存使用
- `SHADER_COMPILE_TIME` - 着色器编译时间

### 内存性能

- `MEMORY_USAGE` - 内存使用量
- `TEXTURE_MEMORY` - 纹理内存
- `BUFFER_MEMORY` - 缓冲区内存

## 使用场景

### 渲染引擎集成

```typescript
import { PerformanceMonitor } from '@sky-canvas/render-engine/performance';
import { RenderEngine } from '@sky-canvas/render-engine';

class MyRenderEngine extends RenderEngine {
  private performanceMonitor: PerformanceMonitor;

  constructor(gl: WebGLRenderingContext) {
    super();

    // 创建性能监控器
    this.performanceMonitor = new PerformanceMonitor(gl, {
      enableGPUQueries: true,
      enableMemoryProfiler: true,
      enableWarnings: true
    });

    this.performanceMonitor.start();
  }

  render() {
    // 记录帧开始
    this.performanceMonitor.recordFrame();

    // 执行渲染
    super.render();

    // 记录绘制调用
    this.performanceMonitor.recordDrawCall(vertexCount, triangleCount);
  }

  dispose() {
    this.performanceMonitor.dispose();
    super.dispose();
  }
}
```

### 基准测试

```typescript
import { createDefaultBenchmarkSuite } from '@sky-canvas/render-engine/performance';

async function runPerformanceTests(renderEngine: RenderEngine) {
  const benchmarkSuite = createDefaultBenchmarkSuite(renderEngine);

  // 监听测试事件
  benchmarkSuite.on('scenarioComplete', (result) => {
    console.log(`测试完成: ${result.name}, 分数: ${result.score} ${result.unit}`);
  });

  // 运行所有测试
  const results = await benchmarkSuite.runAll();

  // 获取测试摘要
  const summary = benchmarkSuite.getSummary();
  console.log(`总测试: ${summary.total}, 通过: ${summary.passed}, 失败: ${summary.failed}`);

  // 导出结果
  const reportHTML = benchmarkSuite.generateHTMLReport();
  // 保存或显示报告...
}
```

### 性能警告处理

```typescript
performanceMonitor.on('performance-warning', (warning) => {
  console.warn(`[${warning.severity}] ${warning.type}: ${warning.message}`);

  // 根据警告类型采取行动
  if (warning.severity === 'high') {
    // 高严重性警告处理
    handleCriticalPerformanceIssue(warning);
  }
});

performanceMonitor.on('fps-drop', (data) => {
  console.warn(`FPS 下降: ${data.from.toFixed(1)} → ${data.to.toFixed(1)}`);
});

performanceMonitor.on('memory-leak', (data) => {
  console.error(`检测到内存泄漏: ${data.type}, 趋势: ${data.trend}`);
});
```

## API 参考

### PerformanceMonitor

主要性能监控类，用于实时监控渲染性能。

```typescript
class PerformanceMonitor {
  // 构造函数
  constructor(gl?: WebGLRenderingContext, config?: Partial<PerformanceConfig>)

  // 生命周期
  start(): void
  stop(): void
  dispose(): void

  // 记录性能数据
  recordFrame(): void
  recordDrawCall(vertices: number, triangles?: number): void
  recordBatch(commandCount: number): void
  recordMemoryAllocation(type: string, size: number): void
  recordMemoryDeallocation(type: string, size: number): void

  // 获取数据
  getCurrentMetrics(): Record<MetricType, number>
  getStats(metricType?: MetricType): MetricStats | Map<MetricType, MetricStats>
  getHistoryData(metricType: MetricType, duration?: number): MetricDataPoint[]

  // 报告
  generateReport(): PerformanceReport
  clearHistory(): void
}
```

### WebGLAnalyzer

WebGL 性能分析器，用于分析 GPU 性能。

```typescript
class WebGLAnalyzer {
  constructor(gl: WebGLRenderingContext)

  analyzeShaderPerformance(program: WebGLProgram): ShaderAnalysis
  analyzeBufferUsage(): BufferAnalysis
  getGPUInfo(): GPUInfo
  measureDrawCall(drawFunction: () => void): DrawCallMetrics
}
```

### PerformanceBenchmarkSuite

基准测试套件，用于运行性能测试。

```typescript
class PerformanceBenchmarkSuite {
  constructor(performanceMonitor?: PerformanceMonitor)

  addScenario(scenario: BenchmarkScenario): void
  runAll(): Promise<BenchmarkResult[]>
  runScenario(name: string): Promise<BenchmarkResult | null>

  getSummary(): BenchmarkSummary
  detectRegression(baseline: BenchmarkResult[], tolerance?: number): RegressionAnalysis
  exportResults(): string
  generateHTMLReport(): string
}
```

## 最佳实践

### 1. 性能监控设置

在渲染引擎初始化时设置性能监控，确保从一开始就收集数据。

### 2. 适度监控

性能监控本身有轻微的性能开销，在生产环境中适度使用。

### 3. 内存管理

定期清理历史数据，避免内存泄漏：

```typescript
// 每5分钟清理一次历史数据
setInterval(() => {
  performanceMonitor.clearHistory();
}, 5 * 60 * 1000);
```

### 4. 自定义阈值

根据应用特性设置合适的性能阈值：

```typescript
const performanceMonitor = new PerformanceMonitor(gl, {
  thresholds: {
    fps: { min: 30, max: 120 },
    frameTime: { max: 33.33 }, // 30fps = 33.33ms
    drawCalls: { max: 500 },
    memoryUsage: { max: 512 * 1024 * 1024 } // 512MB
  }
});
```

## 故障排除

### 常见问题

1. **WebGL 上下文未提供**
   确保在创建 PerformanceMonitor 时传入有效的 WebGL 上下文。

2. **性能影响过大**
   增加采样间隔，减少历史数据保留时间。

3. **内存泄漏**
   定期清理历史数据和警告，正确销毁监控器。

### 调试

```typescript
// 启用详细日志
const performanceMonitor = new PerformanceMonitor(gl, {
  enableWarnings: true,
  sampleInterval: 500 // 更频繁的采样
});

// 查看当前状态
console.log('当前指标:', performanceMonitor.getCurrentMetrics());
console.log('统计信息:', performanceMonitor.getStats());
```