# Culling 模块

视锥体裁剪模块，提供视锥体裁剪和遮挡剔除功能，优化渲染性能。

## 主要组件

### FrustumCulling
视锥体裁剪器，剔除视野范围外的对象。

**主要功能：**
- 视锥体计算
- 对象边界框测试
- 批量裁剪优化
- 层次化裁剪

### OcclusionCulling
遮挡剔除器，剔除被其他对象遮挡的对象。

**主要功能：**
- 深度缓冲分析
- 遮挡查询
- 动态遮挡检测
- 性能自适应调整

## 使用示例

```typescript
import { FrustumCulling, OcclusionCulling } from './culling';

// 创建视锥体裁剪器
const frustumCuller = new FrustumCulling(camera);

// 创建遮挡剔除器
const occlusionCuller = new OcclusionCulling(renderContext);

// 执行裁剪
const visibleObjects = frustumCuller.cull(sceneObjects);
const finalObjects = occlusionCuller.cull(visibleObjects);
```

## 性能优化

- **空间分割**：使用空间数据结构加速裁剪
- **层次化处理**：支持 LOD 层次裁剪
- **异步处理**：支持多线程裁剪计算
- **自适应算法**：根据场景复杂度调整策略

## 相关模块

- `math` - 数学计算
- `engine` - 渲染引擎
- `performance` - 性能监控