# Debug 模块

调试渲染模块，提供渲染过程的可视化调试和性能分析工具。

## 主要组件

### DebugRenderer
调试渲染器，提供各种调试可视化功能。

**主要功能：**
- 线框渲染模式
- 边界框显示
- 法线可视化
- 渲染统计信息显示

### PerformanceAnalyzer
性能分析器，实时监控和分析渲染性能。

**分析功能：**
- FPS 监控
- 渲染时间分析
- GPU 使用率监控
- 内存使用统计

## 使用示例

```typescript
import { DebugRenderer, PerformanceAnalyzer } from './debug';

// 启用调试渲染
const debugRenderer = new DebugRenderer();
debugRenderer.enableWireframe(true);
debugRenderer.showBoundingBoxes(true);

// 性能监控
const analyzer = new PerformanceAnalyzer();
analyzer.startMonitoring();

// 获取性能报告
const report = analyzer.getPerformanceReport();
console.log(report);
```

## 调试功能

### 视觉调试
- **线框模式**：显示几何体线框
- **边界框**：显示对象包围盒
- **坐标系**：显示世界坐标系
- **网格**：显示参考网格

### 性能调试
- **帧率监控**：实时 FPS 显示
- **渲染统计**：Draw Call 计数
- **内存使用**：内存占用分析
- **GPU 分析**：GPU 利用率监控

## 相关模块

- `engine` - 渲染引擎
- `performance` - 性能监控
- `graphics` - 图形接口