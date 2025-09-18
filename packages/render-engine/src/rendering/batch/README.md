# Batch 模块

批处理渲染模块提供高性能的批量渲染功能，通过合并相似的渲染对象来减少 GPU 调用次数，显著提升渲染性能。

## 模块结构

### 核心组件 (core/)
- `BatchManager` - 批处理管理器，统一管理所有批处理操作
- `BatchBuffer` - 批处理缓冲区，管理顶点和索引数据
- `BatchData` - 批处理数据结构和工具类

### 渲染策略 (strategies/)
- `BasicStrategy` - 基础批处理策略，简单的对象分组
- `EnhancedStrategy` - 增强批处理策略，智能优化分组
- `InstancedStrategy` - 实例化渲染策略，适用于大量相同对象

### 工具函数 (utils/)
- `BatchOptimizer` - 批处理性能优化器
- 性能分析和优化建议工具

### 工厂函数
- `BatchFactory` - 批处理管理器工厂，快速创建不同类型的批处理器

## 主要功能

### 批处理管理
```typescript
import { createBatchManager, BatchManager } from './batch';

// 创建批处理管理器
const batchManager = createBatchManager({
  maxBatchSize: 1000,
  strategy: 'enhanced'
});

// 添加渲染对象
batchManager.addRenderable(sprite1);
batchManager.addRenderable(sprite2);

// 执行批量渲染
batchManager.render(renderContext);
```

### 不同渲染策略
```typescript
import {
  createBasicBatchManager,
  createEnhancedBatchManager,
  createInstancedBatchManager
} from './batch';

// 基础批处理 - 适用于简单场景
const basicManager = createBasicBatchManager();

// 增强批处理 - 智能优化，适用于复杂场景
const enhancedManager = createEnhancedBatchManager({
  enableStateOptimization: true,
  enableTextureAtlas: true
});

// 实例化渲染 - 适用于大量相同对象
const instancedManager = createInstancedBatchManager({
  maxInstances: 10000
});
```

### 性能优化
```typescript
import { BatchOptimizer } from './batch';

// 分析批处理性能
const analysis = BatchOptimizer.analyze(batchManager);

// 获取优化建议
const suggestions = BatchOptimizer.getSuggestions(analysis);

// 应用优化
BatchOptimizer.optimize(batchManager, suggestions);
```

## 批处理策略详解

### BasicStrategy
- **适用场景**：简单的 2D 渲染，对象数量较少
- **特点**：按材质和纹理分组，实现简单
- **性能**：中等，适合入门使用

### EnhancedStrategy
- **适用场景**：复杂的 2D/3D 渲染，需要高性能
- **特点**：智能分组算法，状态排序优化
- **性能**：高，生产环境推荐

### InstancedStrategy
- **适用场景**：大量相同或相似对象（如粒子、草地）
- **特点**：GPU 实例化渲染，极高效率
- **性能**：极高，特定场景下性能最佳

## 性能特点

### 渲染优化
- **Draw Call 减少**：合并相似对象，减少 GPU 调用
- **状态切换优化**：智能排序，减少状态变更
- **内存管理**：高效的缓冲区复用机制

### 动态批处理
- **动态分组**：运行时根据对象属性动态分组
- **自适应优化**：根据性能指标自动调整策略
- **实时监控**：提供详细的性能统计信息

## 使用建议

### 选择合适的策略
1. **小型项目**：使用 BasicStrategy
2. **中大型项目**：使用 EnhancedStrategy
3. **粒子系统**：使用 InstancedStrategy
4. **混合使用**：根据不同对象类型选择不同策略

### 性能调优
- 定期使用 BatchOptimizer 分析性能
- 根据实际渲染负载调整批处理大小
- 合理使用纹理图集减少纹理切换

## 相关模块

- `graphics` - 图形渲染接口
- `engine` - 渲染引擎核心
- `adapters` - 渲染适配器
- `performance` - 性能监控