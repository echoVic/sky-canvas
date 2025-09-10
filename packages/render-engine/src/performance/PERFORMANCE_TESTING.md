# 性能测试套件和基准测试系统

## 概述

性能测试套件是 Sky Canvas Render Engine 的核心组件，提供了完整的性能基准测试、回归检测和性能警报功能。

## 核心特性

### 🎯 性能基准测试套件 (PerformanceBenchmarkSuite)

- **多种测试类型**: FPS、内存使用、渲染调用、批处理效率
- **自动化测试流程**: 支持预热、执行、清理的完整测试周期
- **事件驱动架构**: 实时监控测试进度和状态变化
- **多种报告格式**: JSON、HTML报告生成
- **可扩展测试场景**: 支持自定义测试场景

### 📊 基准测试类型

#### 1. FPS 性能测试 (FPSBenchmark)
- **测试目标**: 测量帧率和渲染性能
- **关键指标**: FPS、平均帧时间、内存使用变化、渲染调用次数
- **测试方式**: 模拟真实渲染循环，支持预热期
- **验收标准**: 可配置的FPS阈值，默认30FPS

```typescript
const fpsTest = new FPSBenchmark(
  () => renderEngine.render(), 
  {
    name: 'FPS Test',
    type: BenchmarkType.FRAME_RATE,
    duration: 5000,    // 5秒测试
    threshold: 30,     // 30FPS阈值
    warmupTime: 1000   // 1秒预热
  }
);
```

#### 2. 内存压力测试 (MemoryBenchmark)
- **测试目标**: 测量内存使用和泄漏
- **关键指标**: 峰值内存使用、内存增长率
- **测试方式**: 执行内存密集操作，监控内存变化
- **验收标准**: 内存使用不超过配置阈值

```typescript
const memoryTest = new MemoryBenchmark(
  () => createLargeObjects(),
  {
    name: 'Memory Test',
    type: BenchmarkType.MEMORY_USAGE,
    duration: 3000,
    threshold: 100  // 100MB限制
  }
);
```

#### 3. 渲染调用效率测试 (DrawCallBenchmark)
- **测试目标**: 测量渲染调用的效率
- **关键指标**: 每次调用处理的对象数、批处理效率
- **测试方式**: 渲染大量对象，统计渲染调用
- **验收标准**: 渲染效率达到预设阈值

#### 4. 批处理效率测试 (BatchEfficiencyBenchmark)
- **测试目标**: 测量批处理系统的优化效果
- **关键指标**: 批次减少百分比、优化效果
- **测试方式**: 对比批处理前后的渲染调用数
- **验收标准**: 批处理减少50%以上的渲染调用

### 🔍 性能回归检测 (RegressionDetector)

- **统计分析**: 使用t检验进行统计显著性分析
- **趋势识别**: 自动识别性能改进、退化或稳定趋势
- **置信度计算**: 提供回归检测的置信度评估
- **历史数据管理**: 维护性能测试的历史基准数据

#### 关键功能

1. **回归分析**
```typescript
const detector = new RegressionDetector({
  tolerance: 0.05,           // 5%容忍度
  minSamples: 5,            // 最少5个样本
  significanceThreshold: 0.05, // p < 0.05显著性
  warmupPeriod: 2           // 忽略前2个样本
});

const analysis = detector.detectRegression('TestName', currentResults);
// analysis.hasRegression - 是否有回归
// analysis.confidence - 置信度
// analysis.magnitude - 回归幅度百分比
// analysis.trend - 'improving' | 'degrading' | 'stable'
```

2. **批量回归检测**
```typescript
const analyses = detector.detectRegressions(testResultsMap);
const report = detector.generateReport(analyses);
// report.summary.regressions - 回归数量
// report.summary.improvements - 改进数量
// report.regressions - 详细回归信息
```

### 🚨 性能警报系统 (PerformanceAlertSystem)

- **实时监控**: 自动检测性能回归并发送警报
- **分级警报**: 根据回归严重程度设置警报级别
- **订阅机制**: 支持多个订阅者接收警报通知
- **智能过滤**: 避免误报，只在显著回归时触发警报

#### 警报级别
- **Critical**: 超过50%性能下降，置信度>90%
- **High**: 超过25%性能下降，置信度>80%
- **Medium**: 超过10%性能下降，置信度>70%
- **Low**: 其他情况

```typescript
const alertSystem = new PerformanceAlertSystem(detector);

alertSystem.subscribe((alert) => {
  console.log(`[${alert.severity}] ${alert.message}`);
  if (alert.severity === 'critical') {
    // 发送紧急通知
    sendEmergencyAlert(alert);
  }
});
```

## 使用示例

### 基础使用

```typescript
import { 
  PerformanceBenchmarkSuite,
  createDefaultBenchmarkSuite,
  RegressionDetector
} from '@sky-canvas/render-engine/performance';

// 1. 创建默认测试套件
const suite = createDefaultBenchmarkSuite(renderEngine);

// 2. 运行所有测试
const results = await suite.runAll();

// 3. 检查测试结果
const summary = suite.getSummary();
console.log(`测试完成: ${summary.passed}/${summary.total} 通过`);

// 4. 导出报告
const jsonReport = suite.exportResults();
const htmlReport = suite.generateHTMLReport();
```

### 自定义测试场景

```typescript
// 自定义测试场景
class CustomBenchmark implements BenchmarkScenario {
  name = 'Custom Performance Test';
  
  async setup() {
    // 测试准备工作
  }
  
  async execute() {
    // 执行性能测试
  }
  
  async cleanup() {
    // 清理资源
  }
  
  measure(): BenchmarkResult {
    return {
      name: this.name,
      type: BenchmarkType.FRAME_RATE,
      score: calculateScore(),
      unit: 'FPS',
      metadata: {},
      timestamp: Date.now(),
      passed: true
    };
  }
}

suite.addScenario(new CustomBenchmark());
```

### 回归检测集成

```typescript
const detector = new RegressionDetector();
const alertSystem = new PerformanceAlertSystem(detector);

// 设置历史基准数据
detector.addHistoricalData('FPS Test', historicalResults);

// 订阅警报
alertSystem.subscribe((alert) => {
  if (alert.type === 'regression') {
    console.warn(`性能回归警报: ${alert.message}`);
  }
});

// 运行测试并检测回归
const results = await suite.runAll();
const testResults = new Map([['FPS Test', results]]);
alertSystem.checkAndAlert(testResults);
```

### CI/CD 集成

```typescript
// CI环境中的性能测试
async function runCIPerformanceTests() {
  const suite = createDefaultBenchmarkSuite(renderEngine);
  const results = await suite.runAll();
  
  // 检查是否有测试失败
  const summary = suite.getSummary();
  if (summary.failed > 0) {
    console.error(`${summary.failed} 个性能测试失败`);
    process.exit(1);
  }
  
  // 保存基准数据
  const benchmarkData = JSON.stringify(results);
  fs.writeFileSync('performance-baseline.json', benchmarkData);
  
  // 生成报告
  const htmlReport = suite.generateHTMLReport();
  fs.writeFileSync('performance-report.html', htmlReport);
}
```

## 配置选项

### 基准测试配置

```typescript
interface BenchmarkConfig {
  name: string;           // 测试名称
  type: BenchmarkType;    // 测试类型
  duration: number;       // 测试持续时间（毫秒）
  threshold?: number;     // 性能阈值
  warmupTime?: number;    // 预热时间（毫秒）
  iterations?: number;    // 迭代次数
  skipOnCI?: boolean;     // 在CI环境中跳过
}
```

### 回归检测配置

```typescript
interface RegressionConfig {
  tolerance: number;              // 容忍度（0-1）
  minSamples: number;            // 最少样本数
  significanceThreshold: number;  // 显著性阈值
  warmupPeriod: number;          // 预热期
}
```

## 性能指标

### 关键性能指标 (KPIs)

1. **帧率 (FPS)**
   - 目标: ≥30 FPS (移动端), ≥60 FPS (桌面端)
   - 测量: 平均帧率、最低帧率、帧率稳定性

2. **内存使用**
   - 目标: 内存增长 <10% (长时间运行)
   - 测量: 峰值内存、内存增长率、垃圾回收频率

3. **渲染效率**
   - 目标: 每个draw call处理 ≥10个对象
   - 测量: 渲染调用数、批处理效率、GPU利用率

4. **响应延迟**
   - 目标: 用户交互响应 <16ms
   - 测量: 输入延迟、渲染延迟、总响应时间

### 性能阈值配置

```typescript
const performanceThresholds = {
  fps: {
    desktop: 60,
    mobile: 30,
    minimum: 20
  },
  memory: {
    maxUsage: 512 * 1024 * 1024,  // 512MB
    maxGrowth: 0.1                 // 10%
  },
  rendering: {
    maxDrawCalls: 1000,
    minBatchEfficiency: 0.5        // 50%减少
  }
};
```

## 最佳实践

### 1. 测试环境标准化
- 使用一致的硬件配置
- 控制系统负载
- 固定浏览器版本
- 禁用不必要的后台任务

### 2. 基准数据管理
- 定期更新基准数据
- 保持足够的历史样本
- 考虑季节性和版本变化
- 备份重要的基准数据

### 3. 回归检测策略
- 设置合理的容忍度
- 考虑统计显著性
- 平衡误报和漏报
- 建立回归处理流程

### 4. CI/CD 集成
- 在关键分支运行性能测试
- 设置性能门禁
- 自动化报告生成
- 建立性能趋势监控

## 扩展性

### 自定义测试类型

```typescript
// 扩展新的基准测试类型
enum CustomBenchmarkType {
  NETWORK_LATENCY = 'network_latency',
  STORAGE_PERFORMANCE = 'storage_performance'
}

class NetworkLatencyBenchmark implements BenchmarkScenario {
  // 实现网络延迟测试
}
```

### 自定义分析器

```typescript
class CustomRegressionAnalyzer {
  // 实现专门的回归分析逻辑
  analyzePattern(data: BenchmarkResult[]): CustomAnalysisResult {
    // 自定义分析算法
  }
}
```

## 监控和调试

### 实时监控
- 性能指标实时展示
- 异常检测和警报
- 历史趋势分析
- 对比分析工具

### 调试支持
- 详细的性能分析报告
- 性能热点识别
- 回归根因分析
- 优化建议生成

## 兼容性

- 支持现代浏览器（Chrome 60+, Firefox 55+, Safari 12+）
- 支持 Node.js 环境（测试和CI）
- WebGL 1.0 和 2.0 兼容
- TypeScript 4.5+ 完整类型支持

## 性能目标

基于路线图要求，性能测试套件的验收标准：

✅ **完整的性能测试用例**: 涵盖 FPS、内存、渲染调用、批处理效率  
✅ **性能回归检测**: 自动检测性能退化，置信度评估  
✅ **基准测试管理**: 历史数据管理，趋势分析  
✅ **报告生成**: JSON和HTML格式的详细报告  
✅ **CI/CD集成**: 支持持续集成的性能门禁