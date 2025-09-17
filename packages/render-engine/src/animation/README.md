# Animation 模块

动画系统模块提供了完整的动画功能，包括属性动画、路径动画、粒子动画、时间轴管理等。

## 模块结构

### 核心组件 (core/)
- `BaseAnimation` - 动画基类，定义动画的基本行为和生命周期

### 动画类型 (animations/)
- `PropertyAnimation` - 属性动画，用于数值属性的补间动画
- `MultiPropertyAnimation` - 多属性动画，同时控制多个属性
- `PathAnimation` - 路径动画，沿着指定路径运动

### 缓动函数 (easing/)
- `EasingFunctions` - 提供各种缓动效果（线性、二次、三次、弹性等）

### 动画组合 (groups/)
- `AnimationGroup` - 动画组，支持多种播放模式（并行、串行）

### 时间轴 (timeline/)
- `Timeline` - 时间轴管理，精确控制动画序列

### 粒子系统 (particles/)
- 粒子动画相关组件
- 粒子工厂和系统管理

### 路径系统 (paths/)
- 路径定义和计算
- 支持线性、贝塞尔、自定义路径

### 管理器
- `AnimationManager` - 动画系统管理器，统一管理所有动画

## 主要功能

### 基础动画
```typescript
import { AnimationUtils } from './animation';

// 简单属性动画
AnimationUtils.to(target, 1000, {
  x: 100,
  y: 200,
  opacity: 0.5
});

// 从指定值开始的动画
AnimationUtils.fromTo(target, 1000,
  { x: 0, y: 0 },
  { x: 100, y: 200 }
);
```

### 时间轴动画
```typescript
// 创建时间轴序列
AnimationUtils.timeline()
  .to(target1, 500, { x: 100 })
  .to(target2, 300, { y: 50 })
  .play();
```

### 循环和回弹
```typescript
// 循环动画
const animation = AnimationUtils.to(target, 1000, { rotation: 360 });
AnimationUtils.repeat(animation, 3); // 重复3次
AnimationUtils.yoyo(animation);      // 回弹效果
```

### 缓动效果
```typescript
import { EasingFunctions } from './animation';

AnimationUtils.to(target, 1000, { x: 100 }, {
  easing: EasingFunctions.easeInOutQuad
});
```

## 架构特点

- **组合式设计**：支持多种动画类型的组合使用
- **时间轴控制**：精确的时序控制和动画排序
- **缓动系统**：丰富的缓动函数库
- **事件驱动**：完整的动画生命周期事件
- **性能优化**：高效的动画计算和渲染

## 动画生命周期

1. **创建** - 初始化动画参数
2. **开始** - 启动动画播放
3. **更新** - 每帧更新动画状态
4. **完成** - 动画播放结束
5. **销毁** - 清理动画资源

## 相关模块

- `math` - 数学计算支持
- `engine` - 渲染引擎集成
- `utils` - 工具函数
- `performance` - 性能监控