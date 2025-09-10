# 批处理系统 (Batch System)

Sky Canvas 渲染引擎的高性能批处理系统，用于优化渲染性能，减少绘制调用次数。

## 📋 概述

批处理系统通过智能分组、纹理图集和实例化渲染等技术，显著提升渲染性能：

- **绘制调用减少 60-80%**：通过智能分组合并渲染操作
- **纹理利用率提升**：使用纹理图集减少纹理切换
- **实例化渲染优化**：大量相同对象使用GPU实例化渲染
- **自动性能优化**：根据运行时性能自动调整策略

## 🏗️ 架构设计

### 核心组件

```
BatchSystem/
├── EnhancedBatcher.ts      # 增强批处理器（主要实现）
├── BatchManager.ts         # 批处理管理器（策略协调）
├── TextureAtlas.ts         # 纹理图集管理
├── AdvancedBatcher.ts      # 高级批处理器（兼容性）
└── types/                  # 类型定义
```

### 批处理策略

1. **AUTO**: 自动选择最优策略
2. **ENHANCED**: 使用增强批处理器（推荐）
3. **ADVANCED**: 使用高级批处理器
4. **LEGACY**: 传统逐个渲染方式

## 🚀 快速开始

### 基本使用

```typescript
import { globalBatchManager, BatchStrategy } from '@sky-canvas/render-engine';

// 配置批处理管理器
globalBatchManager.updateConfig({
  strategy: BatchStrategy.ENHANCED,
  maxBatchSize: 10000,
  instancingThreshold: 50,
  enableTextureAtlas: true
});

// 在渲染循环中使用
function renderFrame(context: WebGLRenderingContext) {
  // 开始新帧
  globalBatchManager.beginFrame();
  
  // 添加渲染对象
  renderables.forEach(renderable => {
    globalBatchManager.addRenderable(renderable);
  });
  
  // 执行批处理渲染
  globalBatchManager.renderFrame(context);
  
  // 结束帧
  globalBatchManager.endFrame();
  
  // 每帧后清理
  globalBatchManager.clear();
}
```

### 高级配置

```typescript
import { BatchManager, BatchStrategy } from '@sky-canvas/render-engine';

const customBatchManager = new BatchManager({
  strategy: BatchStrategy.AUTO,
  maxBatchSize: 8000,
  instancingThreshold: 100,
  maxTextureBinds: 16,
  enableTextureAtlas: true,
  enableSpatialSorting: true,
  enableAutoOptimization: true,
  optimizationInterval: 3000 // 3秒优化一次
});
```

## 📊 智能分组算法

### 分组键生成

渲染对象按以下属性自动分组：

```typescript
const batchKey = `${textureId}-${blendMode}-${shaderId}-${zIndex}`;
```

### 分组优先级

1. **纹理ID**: 相同纹理优先合并
2. **混合模式**: 相同混合模式合并
3. **着色器**: 相同着色器合并
4. **Z轴层级**: 相近Z轴合并

### 合并条件

```typescript
// 两个批次可以合并的条件
function canMergeBatches(batch1, batch2): boolean {
  return (
    batch1.textureId === batch2.textureId &&
    batch1.blendMode === batch2.blendMode &&
    batch1.shaderId === batch2.shaderId &&
    Math.abs(batch1.zIndex - batch2.zIndex) <= 1
  );
}
```

## 🖼️ 纹理图集系统

### 自动图集生成

```typescript
import { TextureAtlas } from '@sky-canvas/render-engine';

const atlas = new TextureAtlas();

// 添加小纹理到图集
const entry = atlas.addTexture('icon1', 64, 64);
// 自动合并到2048x2048图集中

// 获取图集UV坐标
const uvCoords = {
  u: entry.x / atlas.width,
  v: entry.y / atlas.height,
  w: entry.width / atlas.width,
  h: entry.height / atlas.height
};
```

### 图集优化策略

- **自动分箱**: 使用最优分箱算法排列纹理
- **尺寸限制**: 单个图集最大2048x2048
- **边距处理**: 自动添加2像素边距防止渗色
- **动态扩展**: 满了自动创建新图集

## ⚡ 实例化渲染

### 自动检测

当相同类型对象数量超过阈值时，自动启用实例化渲染：

```typescript
// 配置实例化阈值
const config = {
  instancingThreshold: 50 // 50个以上启用实例化
};

// 自动检测相同对象
const objects = Array.from({length: 100}, () => 
  new Rectangle({ width: 10, height: 10, color: 'red' })
);

// 自动启用实例化渲染，性能提升30%+
```

### 实例数据结构

```typescript
interface InstanceData {
  transform: Float32Array;  // 变换矩阵 [x,y,w,h,r,sx,sy,1]
  tint: Float32Array;       // 颜色调制 [r,g,b,a]
  textureOffset: Float32Array; // UV偏移 [u,v,w,h]
  customData?: Float32Array;    // 自定义数据
}
```

## 📈 性能监控

### 实时指标

```typescript
// 获取性能统计
const stats = batchManager.getStats();
console.log({
  totalBatches: stats.totalBatches,        // 总批次数
  instancedBatches: stats.instancedBatches, // 实例化批次数
  drawCalls: stats.drawCalls,             // 绘制调用数
  averageBatchSize: stats.averageBatchSize  // 平均批次大小
});

// 监听性能更新
batchManager.on('performanceUpdate', (metrics) => {
  console.log({
    frameTime: metrics.frameTime,     // 帧时间
    batchTime: metrics.batchTime,     // 批处理时间
    drawCalls: metrics.drawCalls,     // 绘制调用
    triangles: metrics.triangles      // 三角形数量
  });
});
```

### 性能阈值警告

```typescript
batchManager.on('warningThreshold', (warning) => {
  console.warn(`性能警告: ${warning.metric} = ${warning.value} 
               超过阈值 ${warning.threshold}`);
});
```

## 🔧 自动优化

### 批次优化

系统会自动执行以下优化：

1. **批次合并**: 合并相似批次
2. **重新分组**: 重新分析渲染对象分组
3. **实例化检测**: 重新检测可实例化对象
4. **内存整理**: 清理无用缓存

### 策略自适应

```typescript
// AUTO模式下的策略选择逻辑
function selectOptimalStrategy(metrics): BatchStrategy {
  if (metrics.frameTime > 20) {
    return BatchStrategy.ENHANCED; // 帧时间长，使用最优化模式
  } else if (metrics.drawCalls > 50) {
    return BatchStrategy.ENHANCED; // 绘制调用多，使用批处理优化
  } else if (metrics.memoryUsage > 50MB) {
    return BatchStrategy.ADVANCED; // 内存高，使用内存优化模式
  }
  return BatchStrategy.ENHANCED;
}
```

## 📱 使用示例

### React集成

```typescript
import React, { useEffect, useRef } from 'react';
import { globalBatchManager } from '@sky-canvas/render-engine';

function CanvasComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('webgl2');
    
    if (!context) return;
    
    // 配置批处理
    globalBatchManager.updateConfig({
      strategy: BatchStrategy.AUTO,
      enableAutoOptimization: true
    });
    
    // 渲染循环
    function renderLoop() {
      globalBatchManager.beginFrame();
      
      // 添加渲染对象...
      sprites.forEach(sprite => {
        globalBatchManager.addRenderable(sprite);
      });
      
      globalBatchManager.renderFrame(context);
      globalBatchManager.endFrame();
      globalBatchManager.clear();
      
      requestAnimationFrame(renderLoop);
    }
    
    renderLoop();
  }, []);
  
  return <canvas ref={canvasRef} />;
}
```

### Vue集成

```vue
<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { globalBatchManager, BatchStrategy } from '@sky-canvas/render-engine';

const canvasRef = ref<HTMLCanvasElement>();

onMounted(() => {
  const context = canvasRef.value?.getContext('webgl2');
  
  globalBatchManager.updateConfig({
    strategy: BatchStrategy.ENHANCED
  });
  
  // 渲染逻辑...
});
</script>
```

## 🎯 最佳实践

### 渲染对象设计

```typescript
// ✅ 良好的批处理友好设计
class OptimizedSprite implements IRenderable {
  textureId: string;
  blendMode: string = 'normal';
  shaderId: string = 'sprite';
  zIndex: number = 0;
  
  // 实现必要方法...
}

// ❌ 批处理不友好的设计
class UnoptimizedSprite {
  // 每个实例都有unique的纹理
  uniqueTextureId: string = `texture_${Math.random()}`;
  // 随机的混合模式
  blendMode: string = ['normal', 'add', 'multiply'][Math.floor(Math.random() * 3)];
}
```

### 性能调优

```typescript
// 1. 合理设置阈值
globalBatchManager.updateConfig({
  maxBatchSize: 8000,        // 根据GPU能力调整
  instancingThreshold: 100,  // 根据对象复杂度调整
  maxTextureBinds: 16        // 根据GPU纹理单元数调整
});

// 2. 启用纹理图集（适合小图标）
globalBatchManager.updateConfig({
  enableTextureAtlas: true // 大图片关闭，小图标开启
});

// 3. 监控关键指标
globalBatchManager.on('performanceUpdate', (metrics) => {
  if (metrics.frameTime > 16.67) {
    console.warn('帧率低于60fps');
  }
  if (metrics.drawCalls > 100) {
    console.warn('绘制调用过多，考虑增加批次大小');
  }
});
```

### 内存管理

```typescript
// 及时清理批次
function renderFrame() {
  // ... 渲染逻辑
  
  // 每帧结束清理
  globalBatchManager.clear();
  
  // 定期深度清理（如切换场景时）
  if (sceneChanged) {
    globalBatchManager.dispose();
    globalBatchManager = new BatchManager();
  }
}
```

## 🔍 调试工具

### 批处理可视化

```typescript
// 开发模式下显示批处理信息
if (process.env.NODE_ENV === 'development') {
  globalBatchManager.on('batchCreated', (batch) => {
    console.log(`创建批次: ${batch.key}, 对象数: ${batch.items.length}`);
  });
  
  globalBatchManager.on('instancedRenderExecuted', (data) => {
    console.log(`实例化渲染: ${data.batchKey}, 实例数: ${data.instanceCount}`);
  });
}
```

### 性能分析

```typescript
// 性能分析辅助函数
function analyzeBatchPerformance() {
  const stats = globalBatchManager.getStats();
  const history = globalBatchManager.getPerformanceHistory();
  
  const avgFrameTime = history.reduce((sum, m) => sum + m.frameTime, 0) / history.length;
  const avgDrawCalls = history.reduce((sum, m) => sum + m.drawCalls, 0) / history.length;
  
  return {
    batchEfficiency: stats.averageBatchSize, // 批次效率
    renderEfficiency: avgFrameTime,          // 渲染效率
    callReduction: 1 - (avgDrawCalls / stats.totalItems) // 调用减少比例
  };
}
```

## 🚨 常见问题

### Q: 为什么批处理没有生效？

A: 检查以下条件：
1. 渲染对象是否实现了IRenderable接口
2. 纹理ID、混合模式、着色器是否一致
3. 是否超过了maxBatchSize限制

### Q: 实例化渲染没有启用？

A: 确认：
1. 相同类型对象数量是否超过instancingThreshold
2. 对象属性是否完全相同（纹理、着色器等）
3. 是否正确实现了批处理键生成

### Q: 性能没有提升？

A: 分析：
1. 检查绘制调用数量是否真的减少了
2. 是否存在过多的纹理切换
3. 批次是否过小或过大
4. 考虑启用纹理图集

## 📚 API 参考

详细的API文档请参考：
- [EnhancedBatcher API](./EnhancedBatcher.ts)
- [BatchManager API](./BatchManager.ts)
- [TextureAtlas API](./EnhancedBatcher.ts#TextureAtlas)

## 🔄 版本历史

- **v1.0.0**: 初始版本，基本批处理功能
- **v1.1.0**: 添加纹理图集支持
- **v1.2.0**: 实例化渲染优化
- **v1.3.0**: 自动优化和性能监控
- **v2.0.0**: 批处理管理器和策略系统

---

*批处理系统是Sky Canvas渲染引擎的核心优化技术，正确使用可以显著提升应用性能。*