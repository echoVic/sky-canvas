# 资源管理系统

## 概述

资源管理系统是 Sky Canvas Render Engine 的核心组件，提供了完整的资源生命周期管理、智能缓存和高效的异步加载机制。

## 核心特性

### 🚀 异步资源加载器 (AsyncResourceLoader)

- **现代异步API**: 支持 Promise/async-await 模式
- **多种资源类型**: 纹理、字体、音频、JSON、二进制、SVG
- **智能重试机制**: 自动重试失败的加载，支持指数退避
- **进度跟踪**: 实时加载进度回调，包括速度和剩余时间估算  
- **并发控制**: 可配置的最大并发加载数量
- **优先级队列**: 按优先级排序处理加载任务
- **取消支持**: 可取消单个或所有加载任务
- **批量操作**: 支持批量加载和预加载
- **事件驱动**: 完整的事件系统，监听加载状态变化

### 🧠 智能 LRU 缓存 (LRUCache)

- **内存感知**: 自动监控系统内存压力并调整缓存行为
- **LRU 策略**: 最近最少使用算法，自动驱逐旧数据
- **TTL 支持**: 灵活的生存时间控制
- **GPU 资源专用缓存**: 专门针对 GPU 资源的缓存管理
- **自动垃圾收集**: 定期清理过期和无用资源
- **内存预算**: 严格的内存限制和使用统计
- **事件通知**: 缓存命中、驱逐、内存警告等事件
- **性能统计**: 命中率、内存使用率等指标

### 🏗️ 增强资源管理器 (EnhancedResourceManager)

- **统一接口**: 整合加载器和缓存，提供统一的资源管理接口
- **引用计数**: 自动管理资源引用，防止内存泄漏
- **双层缓存**: 普通缓存 + GPU 专用缓存
- **预加载支持**: 静默预加载常用资源
- **资源池化**: 复用相似资源，减少内存占用
- **性能监控**: 加载时间、缓存效率等性能指标
- **自动优化**: 根据使用模式自动优化缓存策略

## 使用示例

### 基础用法

```typescript
import { EnhancedResourceManager, ResourceType } from '@sky-canvas/render-engine/resources';

const resourceManager = new EnhancedResourceManager({
  cacheMaxMemory: 100 * 1024 * 1024, // 100MB
  maxConcurrentLoads: 6
});

// 加载单个资源
const textureRef = await resourceManager.loadResource({
  id: 'hero-texture',
  url: '/assets/hero.png',
  type: ResourceType.TEXTURE
});

// 使用资源
const texture = textureRef.data;
console.log(`Loaded texture: ${texture.width}x${texture.height}`);

// 释放引用
resourceManager.releaseResource('hero-texture');
```

### 批量加载

```typescript
const resources = [
  { id: 'bg1', url: '/assets/bg1.png', type: ResourceType.TEXTURE },
  { id: 'bg2', url: '/assets/bg2.png', type: ResourceType.TEXTURE },
  { id: 'config', url: '/assets/config.json', type: ResourceType.JSON }
];

const refs = await resourceManager.loadBatch(resources, 'ui-assets');
console.log(`Loaded ${refs.length} resources`);
```

### 预加载

```typescript
const preloadResources = [
  { id: 'level2-bg', url: '/assets/level2.png', type: ResourceType.TEXTURE },
  { id: 'level2-audio', url: '/assets/level2.mp3', type: ResourceType.AUDIO }
];

// 静默预加载，不阻塞当前操作
resourceManager.preloadResources(preloadResources);
```

### 事件监听

```typescript
resourceManager.on('resourceLoaded', (ref) => {
  console.log(`Resource loaded: ${ref.id}`);
});

resourceManager.on('memoryWarning', (stats) => {
  console.warn(`Memory usage: ${stats.cache.utilization * 100}%`);
});

resourceManager.on('loadingProgress', (id, progress) => {
  console.log(`${id}: ${progress.percentage}%`);
});
```

### 直接使用异步加载器

```typescript
import { AsyncResourceLoader, ResourceType } from '@sky-canvas/render-engine/resources';

const loader = new AsyncResourceLoader({
  maxConcurrentLoads: 4,
  defaultTimeout: 30000
});

// 加载纹理
const image = await loader.loadResource({
  id: 'sprite',
  url: '/assets/sprite.png',
  type: ResourceType.TEXTURE,
  priority: 90 // 高优先级
});
```

### 直接使用 LRU 缓存

```typescript
import { LRUCache, GPUResourceCache } from '@sky-canvas/render-engine/resources';

// 普通缓存
const cache = new LRUCache({
  maxMemory: 50 * 1024 * 1024, // 50MB
  maxItems: 1000,
  defaultTTL: 5 * 60 * 1000    // 5分钟
});

cache.set('user-data', userData, 1024); // 指定大小
const data = cache.get('user-data');

// GPU资源缓存（自动调用dispose）
const gpuCache = new GPUResourceCache({
  maxMemory: 128 * 1024 * 1024 // 128MB
});

gpuCache.set('webgl-texture', webglTexture);
```

## 配置选项

### EnhancedResourceManager 配置

```typescript
interface ResourceManagerConfig {
  // 缓存配置
  cacheMaxMemory?: number;        // 最大缓存内存（字节）
  cacheMaxItems?: number;         // 最大缓存项数
  cacheDefaultTTL?: number;       // 缓存项默认存活时间（毫秒）
  
  // GPU缓存配置  
  gpuCacheMaxMemory?: number;     // GPU缓存最大内存
  gpuCacheMaxItems?: number;      // GPU缓存最大项数
  
  // 加载器配置
  maxConcurrentLoads?: number;    // 最大并发加载数
  defaultTimeout?: number;        // 默认加载超时时间
  defaultRetries?: number;        // 默认重试次数
  
  // 预加载配置
  enablePreloading?: boolean;     // 启用预加载
  preloadBatchSize?: number;      // 预加载批次大小
  
  // 垃圾收集配置
  enableAutoGC?: boolean;         // 启用自动垃圾收集
  gcInterval?: number;            // 垃圾收集间隔（毫秒）
  memoryWarningThreshold?: number; // 内存警告阈值（0-1）
}
```

## 性能优化

### 内存管理
- 自动LRU驱逐策略
- GPU资源自动dispose
- 定期垃圾收集
- 内存使用监控和警告

### 加载优化
- 智能并发控制
- 优先级队列
- 自动重试机制  
- 批量加载减少开销

### 缓存优化
- 双层缓存架构
- 内存感知缓存调整
- 访问频率统计
- 自动缓存优化

## 架构设计

```
EnhancedResourceManager
├── AsyncResourceLoader     # 异步加载
│   ├── 任务队列管理
│   ├── 并发控制
│   ├── 进度跟踪
│   └── 重试机制
├── MemoryAwareLRUCache    # 内存感知缓存
│   ├── LRU 策略
│   ├── TTL 管理
│   ├── 内存监控
│   └── 自动优化
├── GPUResourceCache       # GPU专用缓存
│   ├── 资源自动释放
│   ├── 引用计数
│   └── 内存预算
└── 统计和监控
    ├── 性能指标
    ├── 事件系统
    └── 调试信息
```

## 最佳实践

1. **合理设置缓存大小**: 根据目标设备内存设置合适的缓存限制
2. **使用预加载**: 在合适时机预加载下个场景的资源
3. **及时释放引用**: 不再使用的资源应及时调用 releaseResource
4. **监听内存警告**: 响应内存警告事件，主动清理非关键资源
5. **设置资源优先级**: 重要资源设置高优先级，确保优先加载
6. **使用批量操作**: 批量加载相关资源，提高效率
7. **合理设置TTL**: 根据资源使用模式设置合适的生存时间

## 兼容性

- 支持现代浏览器（Chrome 60+, Firefox 55+, Safari 12+）
- 支持 Node.js 环境（需要适当的polyfill）
- WebGL 1.0 和 2.0 兼容
- TypeScript 4.5+ 完整类型支持

## 扩展性

资源管理系统采用插件化设计，可以轻松扩展：

- 添加新的资源类型
- 自定义缓存策略
- 实现专用加载器
- 集成第三方存储系统