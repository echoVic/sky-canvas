# 统一性能监控系统

统一性能监控系统提供了跨包的性能数据采集、分析和可视化能力，避免重复的数据采集，提供统一的性能监控接口。

## 核心特性

- 🚀 **统一数据源**: 整合 Render Engine、Canvas SDK、Frontend UI 的性能数据
- 📊 **实时监控**: 实时采集和分析性能指标
- ⚠️ **智能警告**: 基于阈值的性能警告系统
- 🔍 **瓶颈分析**: 自动检测CPU、GPU、内存瓶颈
- 🌐 **跨源关联**: 发现不同模块间的性能关联性
- 📈 **可视化仪表板**: 实时性能仪表板
- 📋 **报告生成**: 自动生成性能报告

## 快速开始

### 1. 基础使用

```typescript
import { 
  UnifiedPerformanceManager,
  globalPerformanceManager 
} from '@sky-canvas/render-engine/performance';

// 使用全局实例
await globalPerformanceManager.initialize();

// 或创建自定义实例
const performanceManager = new UnifiedPerformanceManager({
  sampleInterval: 1000,
  enableDashboard: true,
  enableWarnings: true,
  enableCrossSourcceCorrelation: true
});

await performanceManager.initialize();
```

### 2. 设置数据源

```typescript
// 设置 Render Engine 组件
performanceManager.setRenderEngineComponents(
  renderEnginePerformanceMonitor,
  renderEnginePerformanceSystem,
  webglContext
);

// 设置 Canvas SDK 组件
performanceManager.setCanvasSDKComponents(canvasSDKProvider);

// 设置 Frontend UI 组件
performanceManager.setFrontendUIComponents(frontendUIProvider);
```

### 3. 手动记录指标

```typescript
import { UnifiedMetricType, DataSourceType } from '@sky-canvas/render-engine/performance';

// 记录自定义性能指标
performanceManager.recordMetric(
  UnifiedMetricType.RENDER_TIME,
  renderTime,
  DataSourceType.RENDER_ENGINE,
  { frameId: 123, batchCount: 5 }
);
```

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                UnifiedPerformanceManager                    │
├─────────────────────────────────────────────────────────────┤
│  - 协调各个数据源适配器                                        │
│  - 提供统一的API接口                                          │
│  - 管理性能仪表板和报告                                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                UnifiedPerformanceMonitor                    │
├─────────────────────────────────────────────────────────────┤
│  - 统一的性能数据采集和存储                                     │
│  - 跨源关联分析                                              │
│  - 瓶颈检测和警告系统                                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌──────────────────┬──────────────────┬──────────────────────┐
│  RenderEngine    │   CanvasSDK      │    FrontendUI        │
│  Adapter         │   Adapter        │    Adapter           │
├──────────────────┼──────────────────┼──────────────────────┤
│ - FPS            │ - Plugin性能     │ - React渲染时间       │
│ - 绘制调用       │ - 交互延迟       │ - DOM性能            │
│ - GPU内存        │ - 事件处理       │ - 浏览器指标         │
│ - 着色器编译     │ - 缓存命中率     │ - 网络延迟           │
└──────────────────┴──────────────────┴──────────────────────┘
```

### 数据流

```
原始性能数据 → 适配器标准化 → 统一监控器存储 → 分析处理 → 可视化/报告
```

## 性能指标类型

### 渲染性能
- `FPS` - 帧率
- `FRAME_TIME` - 帧时间
- `RENDER_TIME` - 渲染时间
- `UPDATE_TIME` - 更新时间

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

### 交互性能
- `INPUT_LATENCY` - 输入延迟
- `EVENT_PROCESSING_TIME` - 事件处理时间
- `GESTURE_RECOGNITION_TIME` - 手势识别时间

### 插件性能
- `PLUGIN_LOAD_TIME` - 插件加载时间
- `PLUGIN_ACTIVATE_TIME` - 插件激活时间
- `PLUGIN_API_CALLS` - 插件API调用次数
- `PLUGIN_ERRORS` - 插件错误次数

## 使用场景

### 1. Render Engine 集成

```typescript
import { globalPerformanceManager } from '@sky-canvas/render-engine/performance';
import { RenderEngine } from '@sky-canvas/render-engine';

class MyRenderEngine extends RenderEngine {
  constructor() {
    super();
    
    // 设置性能监控组件
    globalPerformanceManager.setRenderEngineComponents(
      this.performanceMonitor,
      this.performanceSystem,
      this.getWebGLContext()
    );
  }
  
  render() {
    // 性能监控会自动收集渲染指标
    super.render();
  }
}
```

### 2. Canvas SDK 集成

```typescript
import { CanvasSDKPerformanceHelper } from '@sky-canvas/render-engine/performance';

class InteractionManager {
  private performanceHelper = new CanvasSDKPerformanceHelper();
  
  constructor() {
    // 设置性能数据提供者
    globalPerformanceManager.setCanvasSDKComponents(
      this.performanceHelper.getPerformanceProvider()
    );
  }
  
  handleMouseEvent(event: MouseEvent) {
    this.performanceHelper.recordInputStart();
    
    // 处理事件
    this.processEvent(event);
    
    this.performanceHelper.recordInputEnd();
  }
  
  @performanceDecorator('eventProcessingTime')
  processEvent(event: MouseEvent) {
    // 事件处理逻辑
  }
}
```

### 3. Frontend UI 集成

```typescript
import React, { useEffect } from 'react';
import { FrontendUIPerformanceHelper } from '@sky-canvas/render-engine/performance';

const performanceHelper = new FrontendUIPerformanceHelper();

// 设置性能数据提供者
globalPerformanceManager.setFrontendUIComponents(
  performanceHelper.getPerformanceProvider()
);

function MyComponent() {
  useEffect(() => {
    performanceHelper.recordRenderStart();
    return () => {
      performanceHelper.recordRenderEnd();
    };
  });
  
  const handleUpdate = () => {
    performanceHelper.recordUpdateStart();
    // 更新逻辑
    performanceHelper.recordUpdateEnd();
  };
  
  return <div>My Component</div>;
}
```

## 性能仪表板

启用实时性能仪表板：

```typescript
// 启用仪表板
performanceManager.setDashboardEnabled(true);

// 配置仪表板
performanceManager.configureDashboard({
  position: 'top-right',
  width: 350,
  height: 400,
  refreshInterval: 1000
});
```

仪表板显示：
- 实时FPS、帧时间、内存使用
- 性能警告和瓶颈分析
- 数据源状态
- 历史趋势

## 性能分析

### 瓶颈检测

系统会自动检测以下瓶颈类型：

```typescript
const analysis = performanceManager.analyzeBottlenecks();

switch (analysis.type) {
  case 'cpu':
    console.log('CPU瓶颈:', analysis.suggestions);
    break;
  case 'gpu':
    console.log('GPU瓶颈:', analysis.suggestions);
    break;
  case 'memory':
    console.log('内存瓶颈:', analysis.suggestions);
    break;
}
```

### 跨源关联分析

```typescript
performanceManager.monitor.on('correlation-found', (correlation) => {
  console.log(`发现关联: ${correlation.metrics.join(' & ')}`);
  console.log(`关联度: ${correlation.correlation}`);
  console.log(`描述: ${correlation.description}`);
});
```

### 性能警告

```typescript
performanceManager.monitor.on('warning-triggered', (warning) => {
  console.warn(`[${warning.severity}] ${warning.source}: ${warning.message}`);
  
  // 根据警告类型采取行动
  if (warning.severity === 'high') {
    // 高严重性警告处理
  }
});
```

## 报告生成

### 手动生成报告

```typescript
// 生成综合报告
const report = performanceManager.generateReport();

// 导出为不同格式
const jsonReport = performanceManager.exportReport('json');
const csvReport = performanceManager.exportReport('csv');
const htmlReport = performanceManager.exportReport('html');
```

### 自动报告

```typescript
const performanceManager = new UnifiedPerformanceManager({
  reportingInterval: 60000, // 每分钟生成报告
  autoExportReports: true   // 自动导出到文件
});

// 监听报告生成事件
window.addEventListener('performance-report-generated', (event) => {
  const { report, counter } = event.detail;
  console.log(`生成第 ${counter} 个报告:`, report);
});
```

## 性能优化建议

基于分析结果，系统会提供针对性的优化建议：

### CPU 瓶颈优化
- 优化更新逻辑算法
- 减少JavaScript计算复杂度
- 使用Web Workers进行并行处理
- 启用对象池减少GC压力

### GPU 瓶颈优化
- 减少绘制调用数量
- 优化着色器性能
- 使用LOD系统
- 启用视锥剔除
- 合并批处理

### 内存优化
- 优化资源管理策略
- 启用纹理压缩
- 清理未使用资源
- 实现资源懒加载

## API 参考

### UnifiedPerformanceManager

主要管理类，提供统一的性能监控接口。

```typescript
class UnifiedPerformanceManager {
  // 初始化
  async initialize(): Promise<void>
  
  // 设置组件
  setRenderEngineComponents(monitor?, system?, gl?)
  setCanvasSDKComponents(provider?)
  setFrontendUIComponents(provider?)
  
  // 记录指标
  recordMetric(type, value, source, metadata?)
  
  // 获取数据
  getCurrentMetrics(): Record<UnifiedMetricType, number>
  getStats()
  getWarnings(severity?): UnifiedPerformanceWarning[]
  
  // 分析
  analyzeBottlenecks(): BottleneckAnalysis
  generateReport()
  
  // 仪表板
  setDashboardEnabled(enabled: boolean)
  configureDashboard(config: Partial<DashboardConfig>)
  
  // 生命周期
  restart()
  stop()
  dispose()
}
```

### 事件系统

```typescript
// 监听性能事件
performanceManager.monitor.on('metric-updated', (data) => {
  console.log(`指标更新: ${data.type} = ${data.value} (${data.source})`);
});

performanceManager.monitor.on('warning-triggered', (warning) => {
  console.warn(`性能警告: ${warning.message}`);
});

performanceManager.monitor.on('bottleneck-detected', (bottleneck) => {
  console.warn(`瓶颈检测: ${bottleneck.description}`);
});

performanceManager.monitor.on('correlation-found', (correlation) => {
  console.info(`关联发现: ${correlation.description}`);
});
```

## 最佳实践

### 1. 初始化时机
在应用启动的早期阶段初始化性能监控系统。

### 2. 数据源配置
尽早设置各个数据源组件，确保完整的数据采集。

### 3. 性能影响
性能监控本身有轻微的性能开销，在生产环境中适度使用。

### 4. 内存管理
定期清理历史数据，避免内存泄漏。

```typescript
// 每5分钟清理一次历史数据
setInterval(() => {
  performanceManager.clearHistory();
}, 5 * 60 * 1000);
```

### 5. 自定义阈值
根据应用特性设置合适的性能阈值。

```typescript
const performanceManager = new UnifiedPerformanceManager({
  thresholds: {
    [UnifiedMetricType.FPS]: { min: 30, max: 120 },
    [UnifiedMetricType.MEMORY_USAGE]: { max: 1024 * 1024 * 1024 }, // 1GB
    [UnifiedMetricType.DRAW_CALLS]: { max: 500 }
  }
});
```

## 故障排除

### 常见问题

1. **数据源未注册**
   确保在初始化前设置所有数据源组件。

2. **性能影响过大**
   增加采样间隔，减少历史数据保留时间。

3. **仪表板显示异常**
   检查CSS样式冲突，调整仪表板位置和大小。

4. **内存泄漏**
   定期清理历史数据和警告，正确销毁监控器。

### 调试

```typescript
// 启用调试模式
const performanceManager = new UnifiedPerformanceManager({
  enableDashboard: true,
  sampleInterval: 500 // 更频繁的采样
});

// 查看当前状态
console.log('当前指标:', performanceManager.getCurrentMetrics());
console.log('统计信息:', performanceManager.getStats());
console.log('警告列表:', performanceManager.getWarnings());
```