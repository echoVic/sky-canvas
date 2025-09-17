# Memory 模块

内存管理模块，提供高效的内存分配、回收和优化功能。

## 主要组件

### MemoryManager
内存管理器，统一管理渲染引擎的内存使用。

**主要功能：**
- 内存池管理
- 垃圾回收优化
- 内存使用监控
- 内存泄漏检测

## 内存优化

### 对象池
- **几何对象池**：顶点、面片对象复用
- **矩阵对象池**：变换矩阵复用
- **事件对象池**：事件对象复用
- **渲染命令池**：命令对象复用

### 缓冲区管理
- **顶点缓冲区**：GPU 缓冲区管理
- **索引缓冲区**：索引数据管理
- **纹理缓冲区**：纹理内存管理
- **帧缓冲区**：渲染目标管理

## 使用示例

```typescript
import { MemoryManager } from './memory';

// 创建内存管理器
const memoryManager = new MemoryManager({
  maxPoolSize: 1000,
  enableLeakDetection: true
});

// 获取对象池中的对象
const vector = memoryManager.getVector2();
// 使用完毕后归还
memoryManager.returnVector2(vector);

// 监控内存使用
const stats = memoryManager.getMemoryStats();
console.log('内存使用情况:', stats);
```

## 性能特点

- **减少 GC 压力**：对象复用减少垃圾回收
- **内存局部性**：优化内存访问模式
- **预分配策略**：避免运行时分配
- **自动清理**：定期清理未使用内存

## 相关模块

- `engine` - 引擎内存管理
- `graphics` - GPU 内存管理
- `performance` - 性能监控