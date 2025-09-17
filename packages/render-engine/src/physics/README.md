# Physics 模块

物理模拟模块，提供实时物理效果和碰撞模拟功能。

## 主要组件

### PhysicsSync
物理同步器，协调物理模拟与渲染系统。

**主要功能：**
- 物理状态同步
- 渲染插值
- 时间步长管理
- 性能自适应

## 物理功能

### 刚体物理
- **重力模拟**：重力场效果
- **碰撞响应**：弹性/非弹性碰撞
- **摩擦力**：表面摩擦模拟
- **约束系统**：关节和连接

### 柔体物理
- **布料模拟**：织物物理
- **流体模拟**：液体动态
- **弹性体**：橡胶物理
- **粒子系统**：粒子间相互作用

## 使用示例

```typescript
import { PhysicsSync } from './physics';

// 创建物理同步器
const physicsSync = new PhysicsSync({
  gravity: { x: 0, y: 9.8 },
  timestep: 1/60,
  enableCollision: true
});

// 添加物理对象
const rigidBody = physicsSync.createRigidBody({
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 0 },
  mass: 1.0,
  restitution: 0.8
});

// 物理更新
function update(deltaTime: number) {
  physicsSync.step(deltaTime);
}
```

## 性能优化

### 算法优化
- **宽相位检测**：快速剔除不可能碰撞的对象
- **窄相位检测**：精确碰撞检测
- **空间分割**：减少检测复杂度
- **连续碰撞检测**：防止穿透

### 并行处理
- **多线程物理**：利用 Web Workers
- **SIMD 优化**：向量化计算
- **GPU 加速**：使用计算着色器
- **异步更新**：非阻塞物理计算

## 相关模块

- `math` - 物理数学计算
- `animation` - 物理动画
- `particles` - 粒子物理
- `performance` - 性能监控