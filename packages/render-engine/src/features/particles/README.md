# Particles 模块

粒子系统模块，提供高性能的粒子效果渲染功能。

## 主要组件

### ParticleManager
粒子管理器，统一管理所有粒子系统。

**主要功能：**
- 粒子系统生命周期管理
- 批量粒子更新
- 性能自动调优
- 多线程支持

### GPUParticleSystem
GPU 加速粒子系统，利用 GPU 计算能力处理大量粒子。

**特性：**
- 支持数万个粒子
- GPU 计算着色器
- 实时物理模拟
- 高效渲染管线

### ParticleEmitter
粒子发射器，控制粒子的产生和初始属性。

**发射模式：**
- 连续发射
- 爆发发射
- 自定义模式
- 条件触发

## 粒子效果

### 基础效果
- **火焰效果**：动态火焰模拟
- **烟雾效果**：体积烟雾渲染
- **爆炸效果**：粒子爆炸动画
- **雨雪效果**：天气粒子系统

### 高级效果
- **魔法效果**：炫酷法术特效
- **液体模拟**：流体粒子系统
- **布料模拟**：柔体粒子动画
- **群体行为**：鸟群、鱼群模拟

## 使用示例

```typescript
import { ParticleManager, ParticleEmitter } from './particles';

// 创建粒子管理器
const particleManager = new ParticleManager();

// 创建火焰效果
const fireEmitter = new ParticleEmitter({
  type: 'fire',
  position: { x: 100, y: 100 },
  particleCount: 500,
  lifespan: 2000,
  velocity: { min: 1, max: 3 },
  color: { start: '#ff4400', end: '#ff0000' }
});

// 添加到管理器
particleManager.addEmitter(fireEmitter);

// 更新粒子系统
function update(deltaTime: number) {
  particleManager.update(deltaTime);
}

// 渲染粒子
function render(context: RenderContext) {
  particleManager.render(context);
}
```

## 性能优化

### GPU 加速
- **计算着色器**：粒子更新计算
- **实例化渲染**：批量粒子渲染
- **纹理缓存**：粒子属性存储
- **几何着色器**：粒子形状生成

### 算法优化
- **空间分割**：近距离粒子优化
- **LOD 系统**：距离级别细节
- **动态批处理**：相似粒子合并
- **异步更新**：多线程计算

## 相关模块

- `animation` - 粒子动画
- `math` - 物理计算
- `graphics` - 渲染支持
- `webgl` - GPU 渲染