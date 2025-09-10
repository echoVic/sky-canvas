# WebGL优化系统

Sky Canvas 渲染引擎的WebGL优化系统，提供着色器管理、缓冲区优化、状态跟踪和资源管理等功能。

## 📋 概述

WebGL优化系统通过多种优化技术显著提升渲染性能：

- **着色器缓存和预热**：避免重复编译着色器程序
- **缓冲区池化**：复用缓冲区对象，减少内存分配
- **状态跟踪**：避免冗余的WebGL状态切换
- **资源管理**：统一管理纹理、帧缓冲等WebGL资源
- **批处理优化**：智能排序和合并渲染批次

## 🏗️ 架构设计

### 核心组件

```
WebGL/
├── WebGLOptimizer.ts           # 主优化器
├── WebGLResourceManager.ts     # 资源管理器
├── ShaderManager.ts            # 着色器管理
├── BufferManager.ts            # 缓冲区管理
├── ShaderLibrary.ts           # 内置着色器库
├── AdvancedShaderManager.ts   # 高级着色器管理
└── __tests__/                 # 测试文件
```

### 优化系统层次

```
WebGLOptimizer (主优化器)
├── ShaderCache (着色器缓存)
├── BufferPool (缓冲区池)
├── WebGLStateManager (状态管理)
├── RenderBatchOptimizer (批次优化)
└── WebGLResourceManager (资源管理)
    ├── TextureManager (纹理管理)
    ├── FramebufferManager (帧缓冲管理)
    └── ResourceRefCounter (引用计数)
```

## 🚀 快速开始

### 基本设置

```typescript
import { 
  WebGLOptimizer, 
  ShaderManager, 
  BufferManager, 
  createGlobalWebGLOptimizer 
} from '@sky-canvas/render-engine';

// 获取WebGL上下文
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL not supported');
}

// 创建管理器
const shaderManager = new ShaderManager(gl);
const bufferManager = new BufferManager(gl);

// 创建优化器
const optimizer = new WebGLOptimizer(gl, shaderManager, bufferManager, {
  enableStateTracking: true,
  enableBatchOptimization: true,
  enableShaderWarmup: true,
  enableBufferPooling: true
});
```

### 渲染循环集成

```typescript
function renderFrame() {
  // 开始帧
  optimizer.beginFrame();
  
  // 获取优化的着色器
  const shader = optimizer.getOptimizedShader({
    name: 'basic',
    version: '1.0',
    vertex: vertexShaderSource,
    fragment: fragmentShaderSource
  }, shaderManager);
  
  // 使用优化的状态切换
  optimizer.optimizedUseProgram(shader.program);
  
  // 获取优化的缓冲区
  const vertexBuffer = optimizer.getOptimizedBuffer(
    BufferType.VERTEX, 
    vertexData.byteLength
  );
  
  // 绑定缓冲区（带状态跟踪）
  optimizer.optimizedBindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
  
  // 执行绘制...
  
  // 结束帧
  optimizer.endFrame();
  
  requestAnimationFrame(renderFrame);
}
```

## 📊 着色器管理

### 着色器缓存

```typescript
import { ShaderCache } from '@sky-canvas/render-engine';

const cache = new ShaderCache();

// 获取着色器（自动缓存）
const shader = cache.getProgram('basic_shader', {
  name: 'basic',
  vertex: vertexSource,
  fragment: fragmentSource
}, shaderManager);

// 预热着色器（异步编译）
cache.warmupShader('advanced_shader', {
  name: 'advanced',
  vertex: advancedVertexSource,
  fragment: advancedFragmentSource
}, shaderManager);

// 获取缓存统计
const stats = cache.getStats();
console.log(`缓存着色器: ${stats.cached}, 编译中: ${stats.compiling}`);
```

### 着色器预热策略

```typescript
// 应用启动时预热常用着色器
const commonShaders = [
  { key: 'sprite', source: spriteShaderSource },
  { key: 'text', source: textShaderSource },
  { key: 'line', source: lineShaderSource }
];

optimizer.warmupShaders(commonShaders, shaderManager);
```

## 🔧 缓冲区池化

### 缓冲区复用

```typescript
import { BufferPool, BufferType, BufferUsage } from '@sky-canvas/render-engine';

const bufferPool = new BufferPool(bufferManager);

// 获取缓冲区（从池中复用或创建新的）
const vertexBuffer = bufferPool.acquireBuffer(
  BufferType.VERTEX, 
  1024 * 4, // 4KB
  BufferUsage.DYNAMIC
);

// 使用缓冲区...
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

// 使用完成后释放回池中
bufferPool.releaseBuffer(vertexBuffer);

// 获取池统计
const poolStats = bufferPool.getStats();
console.log({
  totalBuffers: poolStats.totalBuffers,
  inUse: poolStats.inUseBuffers,
  available: poolStats.availableBuffers,
  memory: poolStats.totalMemory
});
```

### 池配置和维护

```typescript
// 定期清理无效缓冲区
setInterval(() => {
  bufferPool.cleanup();
}, 30000); // 30秒清理一次
```

## 📈 状态跟踪优化

### WebGL状态管理

```typescript
import { WebGLStateManager } from '@sky-canvas/render-engine';

const stateManager = new WebGLStateManager(gl);

// 跟踪状态的WebGL调用
stateManager.useProgram(shader.program);        // 避免重复的useProgram
stateManager.bindBuffer(gl.ARRAY_BUFFER, buffer); // 避免重复的bindBuffer
stateManager.bindTexture(gl.TEXTURE_2D, texture); // 避免重复的bindTexture
stateManager.setViewport(0, 0, width, height);   // 避免重复的viewport设置

// 获取当前状态
const currentState = stateManager.getCurrentState();
console.log('当前程序:', currentState.currentProgram);

// 重置状态更改计数
const changeCount = stateManager.resetStateChangeCount();
console.log(`本帧状态更改: ${changeCount}`);
```

### 性能监控

```typescript
optimizer.on('performanceWarning', (warning) => {
  console.warn(`性能警告: ${warning.metric} = ${warning.value}, 阈值: ${warning.threshold}`);
  
  switch (warning.metric) {
    case 'frameTime':
      console.log('帧时间过长，考虑减少绘制复杂度');
      break;
    case 'stateChanges':
      console.log('状态切换过多，考虑优化渲染顺序');
      break;
    case 'drawCalls':
      console.log('绘制调用过多，考虑使用批处理');
      break;
  }
});
```

## 🖼️ 资源管理

### 纹理管理

```typescript
import { WebGLResourceManager, TextureConfig } from '@sky-canvas/render-engine';

const resourceManager = new WebGLResourceManager(gl, {
  total: 256 * 1024 * 1024, // 256MB总预算
  textures: 128 * 1024 * 1024, // 128MB纹理预算
  buffers: 64 * 1024 * 1024,   // 64MB缓冲区预算
  other: 64 * 1024 * 1024      // 64MB其他资源预算
});

// 创建纹理
const textureConfig: TextureConfig = {
  width: 512,
  height: 512,
  format: gl.RGBA,
  type: gl.UNSIGNED_BYTE,
  minFilter: gl.LINEAR_MIPMAP_LINEAR,
  magFilter: gl.LINEAR,
  generateMipmap: true
};

const textureRef = resourceManager.createTexture('player_sprite', textureConfig, imageData);

// 使用纹理
gl.bindTexture(gl.TEXTURE_2D, textureRef.resource);

// 增加引用计数
resourceManager.addResourceRef('player_sprite');

// 释放引用计数
resourceManager.releaseResourceRef('player_sprite');

// 资源会在引用计数为0时自动释放
```

### 帧缓冲管理

```typescript
import { FramebufferConfig } from '@sky-canvas/render-engine';

// 创建帧缓冲
const fbConfig: FramebufferConfig = {
  width: 1024,
  height: 1024,
  colorTextures: 2, // 2个颜色附件
  depthTexture: true,
  samples: 4 // 4x MSAA
};

const framebufferRef = resourceManager.createFramebuffer('shadow_map', fbConfig);

// 使用帧缓冲
gl.bindFramebuffer(gl.FRAMEBUFFER, framebufferRef.resource);

// 调整大小
resourceManager.resizeFramebuffer('shadow_map', 2048, 2048);
```

### 内存监控和垃圾收集

```typescript
// 监听内存压力事件
resourceManager.on('memoryPressure', (event) => {
  console.warn(`内存压力: 使用 ${event.used} / 预算 ${event.budget}`);
});

// 监听垃圾收集事件
resourceManager.on('gcStarted', (event) => {
  console.log(`开始垃圾收集: ${event.reason}`);
});

resourceManager.on('gcCompleted', (event) => {
  console.log(`垃圾收集完成: 释放 ${event.freedMemory} 字节, ${event.freedResources} 个资源`);
});

// 手动触发垃圾收集
resourceManager.forceGC();

// 获取内存使用情况
const memoryUsage = resourceManager.getMemoryUsage();
console.log({
  纹理内存: memoryUsage.textures,
  缓冲区内存: memoryUsage.buffers,
  其他内存: memoryUsage.other,
  总内存: memoryUsage.total
});
```

## 🎯 批处理优化

### 渲染批次管理

```typescript
import { RenderBatchOptimizer, OptimizedRenderBatch } from '@sky-canvas/render-engine';

const batchOptimizer = new RenderBatchOptimizer();

// 添加渲染批次
const batch: OptimizedRenderBatch = {
  id: 'sprites_batch_1',
  shader: spriteShader,
  vertexArray: spriteVAO,
  textureBindings: new Map([[0, spriteTexture]]),
  uniforms: new Map([['uProjection', projectionMatrix]]),
  drawCalls: [
    { mode: gl.TRIANGLES, count: 6, offset: 0 },
    { mode: gl.TRIANGLES, count: 6, offset: 6 }
  ],
  sortKey: 'sprite_atlas1_shader1'
};

batchOptimizer.addBatch(batch);

// 优化批次顺序
const optimizedBatches = batchOptimizer.optimizeBatches();

// 合并兼容批次
const mergedBatches = batchOptimizer.mergeBatches();

console.log(`优化前批次: ${batch.drawCalls.length}, 优化后批次: ${mergedBatches.length}`);
```

### 自动批次排序

```typescript
// 批次按以下顺序自动排序:
// 1. 着色器程序
// 2. 纹理绑定
// 3. VAO绑定
// 4. Uniform值

const sortKeys = [
  'shader1_texture1_vao1',  // 第一组
  'shader1_texture2_vao1',  // 第二组（纹理不同）
  'shader2_texture1_vao1'   // 第三组（着色器不同）
];

// 渲染时会按这个顺序执行，最小化状态切换
```

## 📱 使用示例

### React集成

```tsx
import React, { useEffect, useRef } from 'react';
import { createGlobalWebGLOptimizer } from '@sky-canvas/render-engine';

const WebGLCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optimizerRef = useRef<WebGLOptimizer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    // 创建优化器
    const shaderManager = new ShaderManager(gl);
    const bufferManager = new BufferManager(gl);
    const optimizer = createGlobalWebGLOptimizer(gl, shaderManager, bufferManager);
    
    optimizerRef.current = optimizer;

    // 配置优化器
    optimizer.updateConfig({
      enableStateTracking: true,
      enableBatchOptimization: true,
      maxTextureBindsPerFrame: 16
    });

    // 监听性能警告
    optimizer.on('performanceWarning', (warning) => {
      console.warn('WebGL性能警告:', warning);
    });

    // 渲染循环
    const renderLoop = () => {
      optimizer.beginFrame();
      
      // 渲染逻辑...
      renderScene(optimizer, gl);
      
      optimizer.endFrame();
      
      requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      optimizer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} width={800} height={600} />;
};

function renderScene(optimizer: WebGLOptimizer, gl: WebGLRenderingContext) {
  // 获取着色器
  const shader = optimizer.getOptimizedShader(basicShaderSource, shaderManager);
  
  // 优化状态切换
  optimizer.optimizedUseProgram(shader.program);
  optimizer.optimizedBindTexture(gl.TEXTURE_2D, spriteTexture);
  
  // 绘制...
}
```

### Vue集成

```vue
<template>
  <canvas ref="canvasRef" :width="800" :height="600"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createGlobalWebGLOptimizer, WebGLOptimizer } from '@sky-canvas/render-engine';

const canvasRef = ref<HTMLCanvasElement>();
let optimizer: WebGLOptimizer | null = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const gl = canvas.getContext('webgl2');
  if (!gl) return;

  // 设置优化器
  const shaderManager = new ShaderManager(gl);
  const bufferManager = new BufferManager(gl);
  optimizer = createGlobalWebGLOptimizer(gl, shaderManager, bufferManager);

  // 启动渲染
  startRenderLoop(optimizer, gl);
});

onUnmounted(() => {
  optimizer?.dispose();
});

function startRenderLoop(optimizer: WebGLOptimizer, gl: WebGLRenderingContext) {
  function render() {
    optimizer.beginFrame();
    // 渲染逻辑...
    optimizer.endFrame();
    requestAnimationFrame(render);
  }
  render();
}
</script>
```

## 🎯 最佳实践

### 性能优化建议

```typescript
// 1. 合理配置优化器
const config = {
  enableStateTracking: true,      // 启用状态跟踪
  enableBatchOptimization: true,  // 启用批处理优化
  enableShaderWarmup: true,       // 启用着色器预热
  enableBufferPooling: true,      // 启用缓冲区池化
  maxTextureBindsPerFrame: 16,    // 根据GPU能力调整
  maxDrawCallsPerBatch: 100       // 根据场景复杂度调整
};

// 2. 着色器预热策略
const preloadShaders = async () => {
  const commonShaders = ['basic', 'sprite', 'text', 'particle'];
  
  for (const shaderName of commonShaders) {
    optimizer.warmupShaders([{
      key: shaderName,
      source: getShaderSource(shaderName)
    }], shaderManager);
  }
};

// 3. 内存管理
const setupMemoryManagement = () => {
  // 监控内存使用
  setInterval(() => {
    const stats = resourceManager.getResourceStats();
    if (stats.memoryUtilization > 0.9) {
      console.warn('内存使用率过高:', stats);
      resourceManager.forceGC();
    }
  }, 10000);
};

// 4. 批处理优化
const optimizeBatching = () => {
  // 按材质分组渲染对象
  const groups = new Map();
  
  renderObjects.forEach(obj => {
    const key = `${obj.shaderId}_${obj.textureId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(obj);
  });
  
  // 按组渲染
  groups.forEach((objects, key) => {
    const batch = createRenderBatch(objects);
    optimizer.addRenderBatch(batch);
  });
};
```

### 调试和分析

```typescript
// 性能分析
const analyzePerformance = () => {
  const stats = optimizer.getDetailedStats();
  
  console.log('WebGL优化统计:', {
    帧数: stats.optimization.frameCount,
    着色器切换: stats.optimization.stateChanges.shaderSwitches,
    纹理绑定: stats.optimization.stateChanges.textureBinds,
    绘制调用: stats.optimization.drawCalls.total,
    批处理绘制: stats.optimization.drawCalls.batched,
    实例化绘制: stats.optimization.drawCalls.instanced,
    缓存着色器: stats.shaderCache.cached,
    缓冲区池: stats.bufferPool.totalBuffers
  });
};

// 开发模式调试
if (process.env.NODE_ENV === 'development') {
  // 显示详细信息
  optimizer.on('shaderCompiled', (event) => {
    console.log(`着色器编译: ${event.name} (${event.compileTime.toFixed(2)}ms)`);
  });
  
  optimizer.on('batchOptimized', (event) => {
    console.log(`批处理优化: ${event.before} -> ${event.after} 批次`);
  });
  
  // 定期输出统计
  setInterval(analyzePerformance, 5000);
}
```

## 🚨 常见问题

### Q: 为什么状态跟踪没有减少WebGL调用？

A: 检查以下情况：
1. 确认 `enableStateTracking` 已启用
2. 检查是否在多个地方直接调用WebGL API
3. 确保使用优化器的方法而不是直接WebGL调用

### Q: 着色器缓存没有生效？

A: 确认：
1. 着色器源码字符串完全一致
2. 着色器名称和版本一致
3. 没有手动删除缓存的着色器

### Q: 缓冲区池没有复用缓冲区？

A: 检查：
1. 缓冲区大小是否匹配
2. 缓冲区类型和使用模式是否相同
3. 是否正确释放缓冲区回池中

## 📚 API 参考

详细的API文档请参考：
- [WebGLOptimizer API](./WebGLOptimizer.ts)
- [WebGLResourceManager API](./WebGLResourceManager.ts)
- [ShaderManager API](./ShaderManager.ts)
- [BufferManager API](./BufferManager.ts)

---

*WebGL优化系统是Sky Canvas渲染引擎的核心性能模块，正确使用可以显著提升WebGL应用性能。*